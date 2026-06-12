// Tests herméticos para NegotiationEngine.
// Prioridad CRÍTICA: máquina de estados, invariante de saldo, anti-loop guard.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Decimal } from '@prisma/client/runtime/library'

// ── Mock Prisma ──────────────────────────────────────────────────────────────

const mockTx = {
  event: {
    updateMany: jest.fn<any>(),
    findUniqueOrThrow: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  negotiation: { create: jest.fn<any>() },
  pointsTransaction: { create: jest.fn<any>() },
}

const mockPrisma: any = {
  event: { findUnique: jest.fn<any>(), update: jest.fn<any>() },
  user: { findUnique: jest.fn<any>() },
  couple: { findUnique: jest.fn<any>() },
  negotiation: { findFirst: jest.fn<any>(), create: jest.fn<any>() },
  notification: { create: jest.fn<any>() },
  $transaction: jest.fn<any>((fn: any) => fn(mockTx)),
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { NegotiationEngine } from '../src/services/negotiationEngine.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

const draftEvent = (overrides: Partial<any> = {}) => ({
  id: 'ev1',
  coupleId: 'c1',
  createdBy: 'u1',
  status: 'draft',
  title: 'Test event',
  type: 'ocio',
  pointsCalculated: new Decimal(10),
  currentNegotiationRound: 0,
  ...overrides,
})

const proposedEvent = (overrides: Partial<any> = {}) => ({
  ...draftEvent(),
  status: 'proposed',
  currentNegotiationRound: 1,
  lastProposedBy: 'u1',
  lastProposedPoints: new Decimal(10),
  ...overrides,
})

const user1 = { id: 'u1', coupleId: 'c1', name: 'Ana' }
const user2 = { id: 'u2', coupleId: 'c1', name: 'Carlos' }
const couple = { id: 'c1', users: [user1, user2] }

function resetMocks() {
  Object.values(mockPrisma).forEach((v: any) =>
    typeof v?.mockReset === 'function' ? v.mockReset() : Object.values(v).forEach((fn: any) => fn?.mockReset?.())
  )
  Object.values(mockTx).forEach((v: any) =>
    Object.values(v).forEach((fn: any) => fn?.mockReset?.())
  )
  mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
  mockPrisma.notification.create.mockResolvedValue({})
}

// ── proposeEvent ─────────────────────────────────────────────────────────────

describe('NegotiationEngine.proposeEvent', () => {
  let engine: NegotiationEngine

  beforeEach(() => {
    resetMocks()
    engine = new NegotiationEngine()
  })

  it('transitions draft → proposed and creates negotiation record', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(draftEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user1)
    const updated = { ...proposedEvent() }
    mockPrisma.event.update.mockResolvedValue(updated)
    mockPrisma.negotiation.create.mockResolvedValue({})
    mockPrisma.couple.findUnique.mockResolvedValue(couple)

    const result = await engine.proposeEvent('ev1', 'u1')

    expect(result.status).toBe('proposed')
    expect(mockPrisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'proposed', currentNegotiationRound: 1 }),
      })
    )
    expect(mockPrisma.negotiation.create).toHaveBeenCalled()
  })

  it('notifies partner when partner exists', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(draftEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user1)
    mockPrisma.event.update.mockResolvedValue(proposedEvent())
    mockPrisma.negotiation.create.mockResolvedValue({})
    mockPrisma.couple.findUnique.mockResolvedValue(couple)

    await engine.proposeEvent('ev1', 'u1')

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u2', type: 'event_proposed' }),
      })
    )
  })

  it('throws if event not found', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null)
    await expect(engine.proposeEvent('ev1', 'u1')).rejects.toThrow('Event not found')
  })

  it('throws if proposer is not the creator', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(draftEvent({ createdBy: 'u1' }))
    await expect(engine.proposeEvent('ev1', 'u2')).rejects.toThrow('Only event creator can propose')
  })

  it('throws (v2.6.3 loop guard) if event is not in draft state', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(draftEvent({ status: 'proposed' }))
    await expect(engine.proposeEvent('ev1', 'u1')).rejects.toThrow('No se puede proponer')
  })

  it('skips notification if couple has no partner', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(draftEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user1)
    mockPrisma.event.update.mockResolvedValue(proposedEvent())
    mockPrisma.negotiation.create.mockResolvedValue({})
    mockPrisma.couple.findUnique.mockResolvedValue({ id: 'c1', users: [user1] })

    await engine.proposeEvent('ev1', 'u1')
    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
  })
})

// ── respondToProposal: accept ────────────────────────────────────────────────

describe('NegotiationEngine.respondToProposal — accept', () => {
  let engine: NegotiationEngine

  beforeEach(() => {
    resetMocks()
    engine = new NegotiationEngine()
    mockPrisma.event.findUnique.mockResolvedValue(proposedEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg1', roundNumber: 1, proposedBy: 'u1', pointsProposed: new Decimal(10),
    })
    mockTx.event.updateMany.mockResolvedValue({ count: 1 })
    mockTx.event.findUniqueOrThrow.mockResolvedValue({ ...proposedEvent(), status: 'accepted' })
    mockTx.negotiation.create.mockResolvedValue({})
    mockTx.pointsTransaction.create.mockResolvedValue({})
    mockPrisma.user.findUnique.mockResolvedValue(user1)
    mockPrisma.notification.create.mockResolvedValue({})
  })

  it('sets status to accepted and creates a negative pointsTransaction', async () => {
    // Re-set user mock to return user2 for first call (responder lookup)
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user2) // responderId lookup
      .mockResolvedValueOnce(user1) // creator lookup for notification

    const result = await engine.respondToProposal('ev1', 'u2', { action: 'accept' })

    expect(result.status).toBe('accepted')
    expect(mockTx.pointsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'event_accepted',
          userId: 'u1',
          amount: new Decimal(-10),
        }),
      })
    )
  })

  it('(concurrency guard) throws "Event already resolved" when updateMany returns 0', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockTx.event.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      engine.respondToProposal('ev1', 'u2', { action: 'accept' })
    ).rejects.toThrow('Event already resolved')
  })

  it('pointsTransaction amount equals the last proposed points (not base)', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user2)
      .mockResolvedValueOnce(user1)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg1', roundNumber: 1, proposedBy: 'u1', pointsProposed: new Decimal(7.5),
    })
    mockTx.event.updateMany.mockResolvedValue({ count: 1 })
    mockTx.event.findUniqueOrThrow.mockResolvedValue({ ...proposedEvent(), pointsAgreed: 7.5 })

    await engine.respondToProposal('ev1', 'u2', { action: 'accept' })

    expect(mockTx.pointsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: new Decimal(-7.5) }),
      })
    )
  })
})

// ── respondToProposal: reject ────────────────────────────────────────────────

describe('NegotiationEngine.respondToProposal — reject', () => {
  let engine: NegotiationEngine

  beforeEach(() => {
    resetMocks()
    engine = new NegotiationEngine()
    mockPrisma.event.findUnique.mockResolvedValue(proposedEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg1', roundNumber: 1, proposedBy: 'u1', pointsProposed: new Decimal(10),
    })
    mockTx.event.update.mockResolvedValue({ ...proposedEvent(), status: 'rejected' })
    mockTx.negotiation.create.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
  })

  it('sets status to rejected and does NOT create a pointsTransaction', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user2)
      .mockResolvedValueOnce(user1)

    const result = await engine.respondToProposal('ev1', 'u2', { action: 'reject' })

    expect(result.status).toBe('rejected')
    expect(mockTx.pointsTransaction.create).not.toHaveBeenCalled()
  })
})

// ── respondToProposal: counter_propose ──────────────────────────────────────

describe('NegotiationEngine.respondToProposal — counter_propose', () => {
  let engine: NegotiationEngine

  beforeEach(() => {
    resetMocks()
    engine = new NegotiationEngine()
    mockPrisma.event.findUnique.mockResolvedValue(proposedEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg1', roundNumber: 1, proposedBy: 'u1', pointsProposed: new Decimal(10),
    })
    mockTx.event.updateMany.mockResolvedValue({ count: 1 })
    mockTx.event.findUniqueOrThrow.mockResolvedValue({
      ...proposedEvent(), status: 'counter_proposal', currentNegotiationRound: 2,
    })
    mockTx.negotiation.create.mockResolvedValue({})
    mockPrisma.notification.create.mockResolvedValue({})
  })

  it('transitions to counter_proposal on round 1', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(user2)
      .mockResolvedValueOnce(user1)

    const result = await engine.respondToProposal('ev1', 'u2', {
      action: 'counter_propose',
      pointsProposed: 8,
    })

    expect(result.status).toBe('counter_proposal')
    expect(mockTx.event.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentNegotiationRound: 2, lastProposedPoints: 8 }),
      })
    )
  })

  it('throws when round >= 2 (max rounds exhausted)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg2', roundNumber: 2, proposedBy: 'u1', pointsProposed: new Decimal(8),
    })

    await expect(
      engine.respondToProposal('ev1', 'u2', { action: 'counter_propose', pointsProposed: 7 })
    ).rejects.toThrow('Maximum 2 negotiation rounds allowed')
  })

  it('(v2.6.3 loop guard) throws when last proposal was already by the responder', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue({
      id: 'neg1', roundNumber: 1,
      proposedBy: 'u2', // ← same as responder
      pointsProposed: new Decimal(8),
    })

    await expect(
      engine.respondToProposal('ev1', 'u2', { action: 'counter_propose', pointsProposed: 7 })
    ).rejects.toThrow('Ya hiciste la última propuesta')
  })

  it('throws if pointsProposed is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user2)

    await expect(
      engine.respondToProposal('ev1', 'u2', { action: 'counter_propose' })
    ).rejects.toThrow('Points must be provided')
  })

  it('throws "Event already resolved" when concurrent counter wins first (updateMany count=0)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockTx.event.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      engine.respondToProposal('ev1', 'u2', { action: 'counter_propose', pointsProposed: 8 })
    ).rejects.toThrow('Event already resolved')
  })
})

// ── respondToProposal: guards ────────────────────────────────────────────────

describe('NegotiationEngine.respondToProposal — guards', () => {
  let engine: NegotiationEngine

  beforeEach(() => {
    resetMocks()
    engine = new NegotiationEngine()
  })

  it('throws if event not found', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null)
    await expect(engine.respondToProposal('ev1', 'u2', { action: 'reject' })).rejects.toThrow('Event not found')
  })

  it('throws if responder is the event creator', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(proposedEvent({ createdBy: 'u2' }))
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    await expect(engine.respondToProposal('ev1', 'u2', { action: 'reject' })).rejects.toThrow('Creator cannot respond')
  })

  it('throws if no negotiation record exists', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(proposedEvent())
    mockPrisma.user.findUnique.mockResolvedValue(user2)
    mockPrisma.negotiation.findFirst.mockResolvedValue(null)

    await expect(engine.respondToProposal('ev1', 'u2', { action: 'reject' })).rejects.toThrow('No negotiation found')
  })
})
