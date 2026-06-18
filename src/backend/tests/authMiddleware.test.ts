// Tests herméticos para middleware/authMiddleware.
// Cubren: token ausente, token inválido, usuario soft-deleted, coupleId mismatch,
// cache hit/miss, invalidateAuthCache, optionalAuthMiddleware.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type { Request, Response, NextFunction } from 'express'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockVerifyToken = jest.fn<any>()
const mockPrisma: any = {
  user: { findUnique: jest.fn(), update: jest.fn() },
}

jest.mock('../src/services/authService', () => ({
  __esModule: true,
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
}))
jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

// Import AFTER mocks are registered
import {
  authMiddleware,
  optionalAuthMiddleware,
  invalidateAuthCache,
} from '../src/middleware/authMiddleware.js'

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request
}

function makeRes(): { status: jest.Mock; json: jest.Mock } & Response {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const next: NextFunction = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  invalidateAuthCache()
  // Default: update (lastSeenAt) never fails
  mockPrisma.user.update.mockResolvedValue({})
})

// ── Missing / malformed header ────────────────────────────────────────────────

describe('authMiddleware — missing header', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const req = makeReq()
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization does not start with Bearer', async () => {
    const req = makeReq('Basic dXNlcjpwYXNz')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

// ── Invalid token ─────────────────────────────────────────────────────────────

describe('authMiddleware — invalid token', () => {
  it('returns 401 when verifyToken returns null', async () => {
    mockVerifyToken.mockReturnValue(null)
    const req = makeReq('Bearer badtoken')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }))
  })
})

// ── User not found / soft-deleted ─────────────────────────────────────────────

describe('authMiddleware — deleted / missing user', () => {
  it('returns 401 when user is not found in DB', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c1' })
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const req = makeReq('Bearer validtoken')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when user has deletedAt set (soft-deleted)', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c1' })
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      coupleId: 'c1',
      deletedAt: new Date(),
    })
    const req = makeReq('Bearer validtoken')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 401 when user has no coupleId', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c1' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', coupleId: null, deletedAt: null })
    const req = makeReq('Bearer validtoken')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

// ── coupleId mismatch ─────────────────────────────────────────────────────────

describe('authMiddleware — coupleId mismatch', () => {
  it('returns 401 when token coupleId differs from DB coupleId', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c_old' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', coupleId: 'c_new', deletedAt: null })
    const req = makeReq('Bearer validtoken')
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })
})

// ── Happy path + cache ────────────────────────────────────────────────────────

describe('authMiddleware — happy path', () => {
  it('calls next() and sets req.userId / req.coupleId / req.user on valid token', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c1' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', coupleId: 'c1', deletedAt: null })
    const req = makeReq('Bearer validtoken') as any
    const res = makeRes()
    await authMiddleware(req, res as any, next)
    expect(next).toHaveBeenCalled()
    expect(req.userId).toBe('u1')
    expect(req.coupleId).toBe('c1')
    expect(req.user).toEqual({ id: 'u1', coupleId: 'c1' })
  })

  it('uses cache on second request — findUnique called only once', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u2', coupleId: 'c2' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u2', coupleId: 'c2', deletedAt: null })

    const req1 = makeReq('Bearer tok')
    const req2 = makeReq('Bearer tok')
    const res = makeRes()

    await authMiddleware(req1, res as any, jest.fn())
    await authMiddleware(req2, res as any, jest.fn())

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1)
  })

  it('invalidateAuthCache forces DB re-lookup', async () => {
    mockVerifyToken.mockReturnValue({ userId: 'u3', coupleId: 'c3' })
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u3', coupleId: 'c3', deletedAt: null })

    await authMiddleware(makeReq('Bearer tok'), makeRes() as any, jest.fn())
    invalidateAuthCache('u3')
    await authMiddleware(makeReq('Bearer tok'), makeRes() as any, jest.fn())

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
  })
})

// ── optionalAuthMiddleware ─────────────────────────────────────────────────────

describe('optionalAuthMiddleware', () => {
  it('calls next without setting req.user when no header', () => {
    const req: any = makeReq()
    optionalAuthMiddleware(req, makeRes() as any, next)
    expect(next).toHaveBeenCalled()
    expect(req.userId).toBeUndefined()
  })

  it('sets req.userId when valid token present', () => {
    mockVerifyToken.mockReturnValue({ userId: 'u1', coupleId: 'c1' })
    const req: any = makeReq('Bearer tok')
    optionalAuthMiddleware(req, makeRes() as any, next)
    expect(req.userId).toBe('u1')
    expect(next).toHaveBeenCalled()
  })

  it('still calls next when token is invalid (optional route)', () => {
    mockVerifyToken.mockReturnValue(null)
    const req: any = makeReq('Bearer badtoken')
    optionalAuthMiddleware(req, makeRes() as any, next)
    expect(next).toHaveBeenCalled()
    expect(req.userId).toBeUndefined()
  })
})
