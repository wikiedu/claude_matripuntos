// v1.8-prep — Tests hermetic para refreshTokenService. Mocked Prisma.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  // $transaction(callback) ejecuta el callback con el mismo mockPrisma como tx.
  $transaction: jest.fn((cb: any) => cb(mockPrisma)),
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { generateRefreshToken, hashRefreshToken, issueRefresh, rotateRefresh, revokeAllForUser, purgeExpired } from '../src/services/refreshTokenService.js'

describe('refreshTokenService', () => {
  beforeEach(() => {
    Object.values(mockPrisma.refreshToken).forEach((fn: any) => fn.mockReset?.())
  })

  it('generateRefreshToken returns 64-char hex', () => {
    const t = generateRefreshToken()
    expect(t).toMatch(/^[a-f0-9]{64}$/)
  })

  it('hashRefreshToken is deterministic', () => {
    const t = 'sample'
    expect(hashRefreshToken(t)).toBe(hashRefreshToken(t))
  })

  it('hashRefreshToken differs for different inputs', () => {
    expect(hashRefreshToken('a')).not.toBe(hashRefreshToken('b'))
  })

  it('issueRefresh creates row + returns plaintext + expiry ~30d', async () => {
    mockPrisma.refreshToken.create.mockResolvedValueOnce({})
    const r = await issueRefresh('u1')
    expect(r.plaintext).toMatch(/^[a-f0-9]{64}$/)
    const days = (r.expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000)
    expect(days).toBeGreaterThan(29.5)
    expect(days).toBeLessThan(30.5)
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled()
  })

  it('rotateRefresh: not_found if hash unknown', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce(null)
    const r = await rotateRefresh('plaintext')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not_found')
  })

  it('rotateRefresh: expired branch', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })
    const r = await rotateRefresh('plaintext')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('expired')
  })

  it('rotateRefresh: revoked → reuse_detected + revokeAll', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1',
      revokedAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 86400000),
    })
    mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 3 })
    const r = await rotateRefresh('plaintext')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('reuse_detected')
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalled()
  })

  it('rotateRefresh: success rotates token (atomic revoke + creates new)', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    })
    // Guard atómico gana la carrera: count===1.
    mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 })
    mockPrisma.refreshToken.create.mockResolvedValueOnce({})
    const r = await rotateRefresh('plaintext')
    expect(r.ok).toBe(true)
    expect(r.userId).toBe('u1')
    expect(r.newPlaintext).toMatch(/^[a-f0-9]{64}$/)
    // Revocación atómica con guard revokedAt:null dentro de la transacción.
    expect(mockPrisma.$transaction).toHaveBeenCalled()
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 't1', revokedAt: null }),
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    }))
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled()
  })

  it('rotateRefresh: lost race (concurrent rotation) → reuse_detected, no new token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    })
    // Otra petición concurrente ya revocó este token: el guard devuelve count===0.
    mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 })
    // revokeAllForUser (fuera de la tx) revoca la chain restante.
    mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 1 })
    const r = await rotateRefresh('plaintext')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('reuse_detected')
    // No se emite token nuevo si se pierde la carrera.
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
  })

  it('revokeAllForUser updates all non-revoked', async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 5 })
    expect(await revokeAllForUser('u1')).toBe(5)
  })

  it('purgeExpired deletes old', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValueOnce({ count: 12 })
    expect(await purgeExpired()).toBe(12)
  })
})
