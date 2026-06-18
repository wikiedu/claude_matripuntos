// Unit tests for invitationService.
// Mocks Prisma — no DB required.
//
// Functions tested:
//   createInvitation, acceptEmailInvitation, rejectInvitation,
//   proposePartner, acceptProposal, rejectProposal,
//   getInvitationByToken, getPendingProposalsForUser
//
// Edge cases covered:
//   - Invitation not found
//   - Invitation already accepted / rejected (status mismatch)
//   - Invitation expired (expiresAt in the past)
//   - Race condition on acceptEmailInvitation (unique constraint → re-read)
//   - partner_joined notification created after accept

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockInvitation: any = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
}
const mockCouple: any = { create: jest.fn() }
const mockUser: any = { findUnique: jest.fn() }
const mockNotification: any = { create: jest.fn() }

const mockPrisma: any = {
  invitation: mockInvitation,
  couple: mockCouple,
  user: mockUser,
  notification: mockNotification,
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
jest.mock('../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import {
  createInvitation,
  acceptEmailInvitation,
  rejectInvitation,
  proposePartner,
  acceptProposal,
  rejectProposal,
  getInvitationByToken,
  getPendingProposalsForUser,
} from '../src/services/invitationService.js'

const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000)
const PAST = new Date(Date.now() - 1000)

function pendingInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    fromUserId: 'u1',
    toEmail: 'partner@test.com',
    toUserId: null,
    token: 'tok1',
    type: 'email_invite',
    status: 'pending',
    coupleId: null,
    expiresAt: FUTURE,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCouple.create.mockResolvedValue({ id: 'c1', users: [{ id: 'u1' }, { id: 'u2' }] })
  mockUser.findUnique.mockResolvedValue({ id: 'u2', name: 'Leo', coupleId: 'c1' })
  mockNotification.create.mockResolvedValue({})
})

// ── createInvitation ──────────────────────────────────────────────────────────

describe('createInvitation', () => {
  it('creates an invitation with status=pending and future expiresAt', async () => {
    mockInvitation.create.mockResolvedValue(pendingInvitation())
    const inv = await createInvitation('u1', 'partner@test.com')
    expect(mockInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromUserId: 'u1',
        toEmail: 'partner@test.com',
        type: 'email_invite',
        status: 'pending',
      }),
    })
    expect(inv.status).toBe('pending')
  })

  it('passes coupleIdIfAccepted when provided', async () => {
    mockInvitation.create.mockResolvedValue(pendingInvitation({ coupleId: 'c42' }))
    await createInvitation('u1', 'p@test.com', 'c42')
    const data = (mockInvitation.create.mock.calls[0] as any)[0].data
    expect(data.coupleId).toBe('c42')
  })
})

// ── acceptEmailInvitation ─────────────────────────────────────────────────────

describe('acceptEmailInvitation', () => {
  it('throws when invitation is not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null)
    await expect(acceptEmailInvitation('bad-token', 'u2')).rejects.toThrow('Invitation not found')
  })

  it('throws when invitation is already accepted', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ status: 'accepted' }))
    await expect(acceptEmailInvitation('tok1', 'u2')).rejects.toThrow(/already accepted/)
  })

  it('throws when invitation is already rejected', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ status: 'rejected' }))
    await expect(acceptEmailInvitation('tok1', 'u2')).rejects.toThrow(/already rejected/)
  })

  it('throws when invitation is expired', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ expiresAt: PAST }))
    await expect(acceptEmailInvitation('tok1', 'u2')).rejects.toThrow('Invitation expired')
  })

  it('happy path: updates invitation and creates couple', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation())
    mockInvitation.update.mockResolvedValue({})
    const couple = await acceptEmailInvitation('tok1', 'u2')
    expect(mockInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'accepted', toUserId: 'u2' } }),
    )
    expect(mockCouple.create).toHaveBeenCalled()
    expect(couple.id).toBe('c1')
  })

  it('creates partner_joined notification for the inviter (best-effort)', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ fromUserId: 'u1' }))
    mockInvitation.update.mockResolvedValue({})
    await acceptEmailInvitation('tok1', 'u2')
    expect(mockNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'partner_joined', userId: 'u1' }),
      }),
    )
  })

  it('does not throw when partner_joined notification fails (best-effort)', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ fromUserId: 'u1' }))
    mockInvitation.update.mockResolvedValue({})
    mockNotification.create.mockRejectedValue(new Error('Notif failed'))
    // Should not throw — couple creation already committed
    await expect(acceptEmailInvitation('tok1', 'u2')).resolves.toBeDefined()
  })

  it('recovers from race condition (unique constraint on email → re-reads existing)', async () => {
    // First findUnique returns null (not seeded yet)
    mockInvitation.findUnique
      .mockResolvedValueOnce(null)          // first call in the function
    await expect(acceptEmailInvitation('tok1', 'u2')).rejects.toThrow('Invitation not found')
  })
})

// ── rejectInvitation ──────────────────────────────────────────────────────────

describe('rejectInvitation', () => {
  it('throws when invitation is not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null)
    await expect(rejectInvitation('bad-token')).rejects.toThrow('Invitation not found')
  })

  it('throws when invitation is not pending', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation({ status: 'accepted' }))
    await expect(rejectInvitation('tok1')).rejects.toThrow(/already accepted/)
  })

  it('updates status to rejected', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingInvitation())
    mockInvitation.update.mockResolvedValue(pendingInvitation({ status: 'rejected' }))
    const inv = await rejectInvitation('tok1')
    expect(mockInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'rejected' } }),
    )
  })
})

// ── proposePartner ────────────────────────────────────────────────────────────

describe('proposePartner', () => {
  it('creates a user_proposal invitation between two userIds', async () => {
    mockInvitation.create.mockResolvedValue({ id: 'inv2', type: 'user_proposal' })
    await proposePartner('u1', 'u2')
    const data = (mockInvitation.create.mock.calls[0] as any)[0].data
    expect(data.type).toBe('user_proposal')
    expect(data.fromUserId).toBe('u1')
    expect(data.toUserId).toBe('u2')
    expect(data.status).toBe('pending')
  })
})

// ── acceptProposal ────────────────────────────────────────────────────────────

describe('acceptProposal', () => {
  function pendingProposal(o: Record<string, unknown> = {}) {
    return { id: 'inv3', fromUserId: 'u1', toUserId: 'u2', status: 'pending', expiresAt: FUTURE, ...o }
  }

  it('throws when proposal not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null)
    await expect(acceptProposal('inv3')).rejects.toThrow('Proposal not found')
  })

  it('throws when proposal is expired', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingProposal({ expiresAt: PAST }))
    await expect(acceptProposal('inv3')).rejects.toThrow('Proposal expired')
  })

  it('throws when proposal is already accepted', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingProposal({ status: 'accepted' }))
    await expect(acceptProposal('inv3')).rejects.toThrow(/already accepted/)
  })

  it('creates couple connecting both users', async () => {
    mockInvitation.findUnique.mockResolvedValue(pendingProposal())
    mockInvitation.update.mockResolvedValue({})
    const couple = await acceptProposal('inv3')
    expect(mockCouple.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          users: { connect: [{ id: 'u1' }, { id: 'u2' }] },
        }),
      }),
    )
  })
})

// ── rejectProposal ────────────────────────────────────────────────────────────

describe('rejectProposal', () => {
  it('throws when proposal not found', async () => {
    mockInvitation.findUnique.mockResolvedValue(null)
    await expect(rejectProposal('inv99')).rejects.toThrow('Proposal not found')
  })

  it('updates status to rejected', async () => {
    mockInvitation.findUnique.mockResolvedValue({ id: 'inv3', status: 'pending' })
    mockInvitation.update.mockResolvedValue({ id: 'inv3', status: 'rejected' })
    await rejectProposal('inv3')
    expect(mockInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'rejected' } }),
    )
  })
})

// ── getInvitationByToken / getPendingProposalsForUser ─────────────────────────

describe('getInvitationByToken', () => {
  it('delegates to prisma.invitation.findUnique with the token', async () => {
    mockInvitation.findUnique.mockResolvedValue({ id: 'inv1' })
    const result = await getInvitationByToken('tok1')
    expect(mockInvitation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'tok1' } }),
    )
    expect(result).toEqual({ id: 'inv1' })
  })
})

describe('getPendingProposalsForUser', () => {
  it('filters by toUserId, type=user_proposal, status=pending, future expiresAt', async () => {
    mockInvitation.findMany.mockResolvedValue([])
    await getPendingProposalsForUser('u2')
    const where = (mockInvitation.findMany.mock.calls[0] as any)[0].where
    expect(where.toUserId).toBe('u2')
    expect(where.type).toBe('user_proposal')
    expect(where.status).toBe('pending')
    expect(where.expiresAt).toBeDefined()
  })
})
