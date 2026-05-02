// v1.7 — Tests hermetic para accountDeletionService.
// Mocked Prisma — verifican el flow de FK reassignment + idempotencia
// + race-safe ghost user (v1.6.2 fix S1-3).

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

type MockTx = {
  user: {
    findFirst: jest.Mock<any>
    create: jest.Mock<any>
    update: jest.Mock<any>
    count: jest.Mock<any>
    findFirstOrThrow: jest.Mock<any>
  }
  couple: { update: jest.Mock<any> }
  pointsTransaction: { updateMany: jest.Mock<any> }
  taskLog: { updateMany: jest.Mock<any> }
  event: { updateMany: jest.Mock<any> }
  negotiation: { updateMany: jest.Mock<any> }
  moodLog: { deleteMany: jest.Mock<any> }
  notification: { deleteMany: jest.Mock<any> }
  userProfile: { deleteMany: jest.Mock<any> }
}

function makeTx(): MockTx {
  return {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockReturnValue(Promise.resolve({})),
      count: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    couple: { update: jest.fn().mockReturnValue(Promise.resolve({})) },
    pointsTransaction: { updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    taskLog: { updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    event: { updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    negotiation: { updateMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    moodLog: { deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    notification: { deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
    userProfile: { deleteMany: jest.fn().mockReturnValue(Promise.resolve({ count: 0 })) },
  }
}

const mockPrisma = {
  user: { findUnique: jest.fn<any>(), delete: jest.fn<any>() },
  $transaction: jest.fn<any>(),
}

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}))

import { deleteAccount } from '../src/services/accountDeletionService.js'

describe('accountDeletionService.deleteAccount', () => {
  let tx: MockTx
  beforeEach(() => {
    tx = makeTx()
    mockPrisma.user.findUnique.mockReset()
    mockPrisma.user.delete.mockReset()
    mockPrisma.$transaction.mockReset()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx))
  })

  it('throws if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    await expect(deleteAccount('missing')).rejects.toThrow('User not found')
  })

  it('is idempotent if user already has deletedAt set', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', coupleId: 'c1', deletedAt: new Date(),
    })
    await deleteAccount('u1')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('hard-deletes user without coupleId', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: null, deletedAt: null })
    mockPrisma.user.delete.mockResolvedValueOnce({})
    await deleteAccount('u1')
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } })
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('reuses existing ghost user for the couple (no duplicate creation)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce({ id: 'ghost1', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(1)  // partner sigue activo
    await deleteAccount('u1')
    expect(tx.user.create).not.toHaveBeenCalled()
    expect(tx.pointsTransaction.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' }, data: { userId: 'ghost1' },
    })
  })

  it('creates ghost with deterministic email when none exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce(null)
    tx.user.create.mockResolvedValueOnce({ id: 'ghost-new', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(1)
    await deleteAccount('u1')
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ghost-c1@deleted.local',
          name: 'Usuario eliminado',
        }),
      }),
    )
  })

  it('recovers via findFirstOrThrow when ghost create races', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce(null)
    tx.user.create.mockRejectedValueOnce(new Error('Unique constraint failed'))
    tx.user.findFirstOrThrow.mockResolvedValueOnce({ id: 'ghost-existing', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(1)
    await deleteAccount('u1')
    expect(tx.user.findFirstOrThrow).toHaveBeenCalled()
    expect(tx.pointsTransaction.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' }, data: { userId: 'ghost-existing' },
    })
  })

  it('rewrites self email to deleted-{userId}@deleted.local (frees unique)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce({ id: 'ghost1', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(1)
    await deleteAccount('u1')
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        email: 'deleted-u1@deleted.local',
        passwordHash: '',
        name: 'Usuario eliminado',
        deletedAt: expect.any(Date),
      }),
    })
  })

  it('marks couple dissolved when last active user leaves', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce({ id: 'ghost1', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(0)  // no active users left
    await deleteAccount('u1')
    expect(tx.couple.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: expect.objectContaining({ dissolvedAt: expect.any(Date) }),
    })
  })

  it('does NOT dissolve couple if partner is still active', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', coupleId: 'c1', deletedAt: null })
    tx.user.findFirst.mockResolvedValueOnce({ id: 'ghost1', coupleId: 'c1' })
    tx.user.count.mockResolvedValueOnce(1)  // partner still here
    await deleteAccount('u1')
    expect(tx.couple.update).not.toHaveBeenCalled()
  })
})
