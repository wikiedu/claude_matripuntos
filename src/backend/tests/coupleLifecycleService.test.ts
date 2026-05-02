// v1.7 — Tests hermetic para coupleLifecycleService.dissolveCouple.
// Mocked Prisma — verifican idempotencia + creación de couples individuales
// con secretKey aleatoria + reasignación de users.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  couple: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
}

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}))

import { dissolveCouple } from '../src/services/coupleLifecycleService.js'

describe('coupleLifecycleService.dissolveCouple', () => {
  let tx: any

  beforeEach(() => {
    tx = {
      couple: {
        update: jest.fn().mockReturnValue(Promise.resolve({})),
        create: jest.fn(),
      },
      user: { update: jest.fn().mockReturnValue(Promise.resolve({})) },
    }
    mockPrisma.couple.findUnique.mockReset()
    mockPrisma.couple.update.mockReset()
    mockPrisma.$transaction.mockReset()
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx))
  })

  it('throws if couple not found', async () => {
    mockPrisma.couple.findUnique.mockResolvedValueOnce(null)
    await expect(dissolveCouple('missing')).rejects.toThrow('Couple not found')
  })

  it('is idempotent if couple already dissolved', async () => {
    mockPrisma.couple.findUnique.mockResolvedValueOnce({
      id: 'c1', dissolvedAt: new Date(), users: [], language: 'es',
    })
    await dissolveCouple('c1')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('marks couple dissolved + creates individual couple per active user', async () => {
    mockPrisma.couple.findUnique.mockResolvedValueOnce({
      id: 'c1',
      dissolvedAt: null,
      language: 'es',
      users: [
        { id: 'u1', deletedAt: null },
        { id: 'u2', deletedAt: null },
      ],
    })
    tx.couple.create
      .mockResolvedValueOnce({ id: 'new-c-u1' })
      .mockResolvedValueOnce({ id: 'new-c-u2' })

    await dissolveCouple('c1')

    expect(tx.couple.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { dissolvedAt: expect.any(Date) },
    })
    expect(tx.couple.create).toHaveBeenCalledTimes(2)
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { coupleId: 'new-c-u1' },
    })
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u2' },
      data: { coupleId: 'new-c-u2' },
    })
  })

  it('uses cryptographically random secretKey per new couple', async () => {
    mockPrisma.couple.findUnique.mockResolvedValueOnce({
      id: 'c1',
      dissolvedAt: null,
      language: 'es',
      users: [{ id: 'u1', deletedAt: null }],
    })
    tx.couple.create.mockResolvedValueOnce({ id: 'new-c' })
    await dissolveCouple('c1')
    const call = tx.couple.create.mock.calls[0][0]
    expect(call.data.secretKey).toMatch(/^[a-f0-9]{32}$/) // 16 bytes hex
  })

  it('preserves language from original couple in new individual couples', async () => {
    mockPrisma.couple.findUnique.mockResolvedValueOnce({
      id: 'c1',
      dissolvedAt: null,
      language: 'en',
      users: [{ id: 'u1', deletedAt: null }],
    })
    tx.couple.create.mockResolvedValueOnce({ id: 'new-c' })
    await dissolveCouple('c1')
    expect(tx.couple.create.mock.calls[0][0].data.language).toBe('en')
  })

  it('does not reassign already-deleted users (filtered upstream)', async () => {
    // The findUnique mock filters users with deletedAt:null already (the
    // service requests this in its include). Here we pass empty users.
    mockPrisma.couple.findUnique.mockResolvedValueOnce({
      id: 'c1',
      dissolvedAt: null,
      language: 'es',
      users: [],
    })
    await dissolveCouple('c1')
    expect(tx.couple.create).not.toHaveBeenCalled()
    expect(tx.user.update).not.toHaveBeenCalled()
  })
})
