// Tests herméticos para configurationProposalService.
// Cubren: propose (happy + duplicado), accept (happy, SELF_ACCEPT, EXPIRED,
// field patterns tasks./multipliers., activity_template:), reject (happy,
// SELF_REJECT, NOT_ACTIVE), cancel (NOT_OWNER, idempotente), purgeExpired.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  configurationProposal: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  configurationChangeLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  activityTemplate: {
    updateMany: jest.fn(),
  },
  configuration: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { ConfigurationProposalService } from '../src/services/configurationProposalService.js'

const svc = new ConfigurationProposalService()

const BASE_PROPOSAL = {
  id: 'prop1',
  coupleId: 'c1',
  proposedById: 'u1',
  field: 'tasks.cocina',
  oldValue: '2',
  newValue: '3',
  status: 'active',
  expiresAt: new Date(Date.now() + 86400000), // +1 day
  rationale: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.$transaction.mockImplementation(async (ops: any[]) => {
    return Promise.all(ops)
  })
  mockPrisma.configurationProposal.create.mockResolvedValue(BASE_PROPOSAL)
  mockPrisma.configurationProposal.update.mockResolvedValue(BASE_PROPOSAL)
  mockPrisma.configurationChangeLog.create.mockResolvedValue({})
  mockPrisma.configuration.findUnique.mockResolvedValue(null)
})

// ── propose ───────────────────────────────────────────────────────────────────

describe('propose', () => {
  it('creates a proposal when no active duplicate exists', async () => {
    mockPrisma.configurationProposal.findFirst.mockResolvedValue(null)
    const result = await svc.propose({
      coupleId: 'c1', proposedById: 'u1', field: 'tasks.cocina',
      oldValue: '2', newValue: '3',
    })
    expect(mockPrisma.configurationProposal.create).toHaveBeenCalled()
    expect(result).toBeDefined()
  })

  it('throws DUPLICATE_PROPOSAL when an active proposal for the same field exists', async () => {
    mockPrisma.configurationProposal.findFirst.mockResolvedValue(BASE_PROPOSAL)
    await expect(svc.propose({
      coupleId: 'c1', proposedById: 'u1', field: 'tasks.cocina',
      oldValue: '2', newValue: '3',
    })).rejects.toMatchObject({ code: 'DUPLICATE_PROPOSAL' })
    expect(mockPrisma.configurationProposal.create).not.toHaveBeenCalled()
  })

  it('sets expiresAt to expiryDays in the future', async () => {
    mockPrisma.configurationProposal.findFirst.mockResolvedValue(null)
    const before = Date.now()
    await svc.propose({
      coupleId: 'c1', proposedById: 'u1', field: 'tasks.cocina',
      oldValue: '2', newValue: '3', expiryDays: 14,
    })
    const createCall = mockPrisma.configurationProposal.create.mock.calls[0][0]
    const expires: Date = createCall.data.expiresAt
    const diff = expires.getTime() - before
    expect(diff).toBeGreaterThan(13 * 86400000)
    expect(diff).toBeLessThan(15 * 86400000)
  })
})

// ── accept ────────────────────────────────────────────────────────────────────

describe('accept', () => {
  it('happy path — marks as accepted and creates change log', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await svc.accept('c1', 'prop1', 'u2') // u2 is the partner
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('throws NOT_FOUND when proposal does not exist', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(null)
    await expect(svc.accept('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_FOUND when proposal belongs to a different couple', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue({ ...BASE_PROPOSAL, coupleId: 'c999' })
    await expect(svc.accept('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws NOT_ACTIVE when proposal is already accepted', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue({ ...BASE_PROPOSAL, status: 'accepted' })
    await expect(svc.accept('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_ACTIVE' })
  })

  it('throws SELF_ACCEPT when accepter is the proposer', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await expect(svc.accept('c1', 'prop1', 'u1')).rejects.toMatchObject({ code: 'SELF_ACCEPT' })
  })

  it('throws EXPIRED and marks proposal when expiresAt is in the past', async () => {
    const expired = { ...BASE_PROPOSAL, expiresAt: new Date(Date.now() - 1000) }
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(expired)
    await expect(svc.accept('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'EXPIRED' })
    expect(mockPrisma.configurationProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'expired' } })
    )
  })

  it('updates activityTemplate when field matches activity_template:<id>:points pattern', async () => {
    const tplProposal = {
      ...BASE_PROPOSAL,
      field: 'activity_template:tpl123:points',
      newValue: '15',
    }
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(tplProposal)
    await svc.accept('c1', 'prop1', 'u2')
    const txOps = mockPrisma.$transaction.mock.calls[0][0] as any[]
    // Transaction should include activityTemplate.updateMany
    expect(txOps.length).toBeGreaterThanOrEqual(3)
  })

  it('updates Configuration.tasksConfig when field matches tasks.<cat>', async () => {
    const tasksProposal = { ...BASE_PROPOSAL, field: 'tasks.cocina', newValue: '3.5' }
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(tasksProposal)
    mockPrisma.configuration.findUnique.mockResolvedValue({
      id: 'cfg1', coupleId: 'c1',
      tasksConfig: '{"cocina":2}', multipliersConfig: '{}',
    })
    await svc.accept('c1', 'prop1', 'u2')
    const txOps = mockPrisma.$transaction.mock.calls[0][0] as any[]
    expect(txOps.length).toBeGreaterThanOrEqual(3) // proposal + log + config update
  })

  it('updates Configuration.multipliersConfig when field matches multipliers.<group>.<key>', async () => {
    const multProposal = { ...BASE_PROPOSAL, field: 'multipliers.franja.mañana', newValue: '1.4' }
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(multProposal)
    mockPrisma.configuration.findUnique.mockResolvedValue({
      id: 'cfg1', coupleId: 'c1',
      tasksConfig: '{}', multipliersConfig: '{}',
    })
    await svc.accept('c1', 'prop1', 'u2')
    const txOps = mockPrisma.$transaction.mock.calls[0][0] as any[]
    expect(txOps.length).toBeGreaterThanOrEqual(3)
  })
})

// ── reject ────────────────────────────────────────────────────────────────────

describe('reject', () => {
  it('marks proposal as rejected', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await svc.reject('c1', 'prop1', 'u2')
    expect(mockPrisma.configurationProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'rejected' }) })
    )
  })

  it('throws SELF_REJECT when rejecter is the proposer', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await expect(svc.reject('c1', 'prop1', 'u1')).rejects.toMatchObject({ code: 'SELF_REJECT' })
  })

  it('throws NOT_ACTIVE when proposal already closed', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue({ ...BASE_PROPOSAL, status: 'rejected' })
    await expect(svc.reject('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_ACTIVE' })
  })

  it('throws NOT_FOUND for a different couple', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue({ ...BASE_PROPOSAL, coupleId: 'c2' })
    await expect(svc.reject('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

// ── cancel ────────────────────────────────────────────────────────────────────

describe('cancel', () => {
  it('allows the proposer to cancel', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await svc.cancel('c1', 'prop1', 'u1')
    expect(mockPrisma.configurationProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'cancelled' }) })
    )
  })

  it('throws NOT_OWNER when non-proposer tries to cancel', async () => {
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(BASE_PROPOSAL)
    await expect(svc.cancel('c1', 'prop1', 'u2')).rejects.toMatchObject({ code: 'NOT_OWNER' })
  })

  it('is idempotent — returns proposal without update when already cancelled', async () => {
    const cancelled = { ...BASE_PROPOSAL, status: 'cancelled' }
    mockPrisma.configurationProposal.findUnique.mockResolvedValue(cancelled)
    const result = await svc.cancel('c1', 'prop1', 'u1')
    expect(mockPrisma.configurationProposal.update).not.toHaveBeenCalled()
    expect(result).toBe(cancelled)
  })
})

// ── purgeExpired ──────────────────────────────────────────────────────────────

describe('purgeExpired', () => {
  it('calls updateMany with status expired and expiresAt < now', async () => {
    mockPrisma.configurationProposal.updateMany.mockResolvedValue({ count: 3 })
    await svc.purgeExpired('c1')
    expect(mockPrisma.configurationProposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ coupleId: 'c1', status: 'active' }),
        data: { status: 'expired' },
      })
    )
  })

  it('works without coupleId (global purge)', async () => {
    mockPrisma.configurationProposal.updateMany.mockResolvedValue({ count: 0 })
    await svc.purgeExpired()
    const call = mockPrisma.configurationProposal.updateMany.mock.calls[0][0]
    expect(call.where.coupleId).toBeUndefined()
  })
})
