// Unit tests for demoService.
// Mocks Prisma and authService — no DB required.
//
// Key scenarios:
//   - isDemoEnabled: reads DEMO_MODE_ENABLED env var
//   - demoLogin: happy path (existing demo user), first-time provisioning
//   - ensureDemoCouple: race-condition recovery (unique constraint on email)
//   - demoLogin: throws when provisioning fails entirely

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

const mockUserCreate: any = jest.fn()
const mockUserFindUnique: any = jest.fn()
const mockCoupleCreate: any = jest.fn()
const mockPointsTransaction: any = { createMany: jest.fn() }
const mockGenerateToken: any = jest.fn()
const mockHashPassword: any = jest.fn()
const mockGenerateUniqueJoinCode: any = jest.fn()

const mockPrisma: any = {
  user: { create: mockUserCreate, findUnique: mockUserFindUnique },
  couple: { create: mockCoupleCreate },
  pointsTransaction: mockPointsTransaction,
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
jest.mock('../src/services/authService', () => ({
  __esModule: true,
  generateToken: (...a: any[]) => mockGenerateToken(...a),
  hashPassword: (...a: any[]) => mockHashPassword(...a),
}))
jest.mock('../src/utils/joinCode', () => ({
  __esModule: true,
  generateUniqueJoinCode: (...a: any[]) => mockGenerateUniqueJoinCode(...a),
}))

// Import AFTER mocks
import { isDemoEnabled, demoLogin } from '../src/services/demoService.js'

const DEMO_USER = {
  id: 'demo-u1',
  email: 'demo@matripuntos.app',
  name: 'Ana (demo)',
  coupleId: 'demo-c1',
}
const DEMO_COUPLE = {
  id: 'demo-c1',
  users: [
    { id: 'demo-u1' },
    { id: 'demo-u2' },
  ],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGenerateToken.mockReturnValue('fake-jwt')
  mockHashPassword.mockResolvedValue('$2b$12$hashed')
  mockGenerateUniqueJoinCode.mockResolvedValue('ABC123')
  mockPointsTransaction.createMany.mockResolvedValue({ count: 3 })
})

afterEach(() => {
  delete process.env.DEMO_MODE_ENABLED
})

// ── isDemoEnabled ─────────────────────────────────────────────────────────────

describe('isDemoEnabled', () => {
  it('returns true when DEMO_MODE_ENABLED=true', () => {
    process.env.DEMO_MODE_ENABLED = 'true'
    expect(isDemoEnabled()).toBe(true)
  })

  it('returns false when DEMO_MODE_ENABLED is absent', () => {
    expect(isDemoEnabled()).toBe(false)
  })

  it('returns false when DEMO_MODE_ENABLED=false', () => {
    process.env.DEMO_MODE_ENABLED = 'false'
    expect(isDemoEnabled()).toBe(false)
  })

  it('returns false when DEMO_MODE_ENABLED=1 (only "true" is truthy)', () => {
    process.env.DEMO_MODE_ENABLED = '1'
    expect(isDemoEnabled()).toBe(false)
  })
})

// ── demoLogin — existing user ─────────────────────────────────────────────────

describe('demoLogin — existing demo user', () => {
  beforeEach(() => {
    // ensureDemoCouple: existing user found
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'demo-u1', coupleId: 'demo-c1' })  // findUnique by email (ensureDemoCouple)
      .mockResolvedValueOnce(DEMO_USER)                                  // findUnique by id (demoLogin)
  })

  it('returns a token and user object', async () => {
    const result = await demoLogin()
    expect(result.token).toBe('fake-jwt')
    expect(result.user.email).toBe('demo@matripuntos.app')
    expect(result.user.coupleId).toBe('demo-c1')
  })

  it('does NOT create a couple when user already exists', async () => {
    await demoLogin()
    expect(mockCoupleCreate).not.toHaveBeenCalled()
  })
})

// ── demoLogin — first-time provisioning ──────────────────────────────────────

describe('demoLogin — first provisioning', () => {
  beforeEach(() => {
    // ensureDemoCouple: no existing user → creates couple + users
    mockUserFindUnique
      .mockResolvedValueOnce(null)           // initial check (no user)
      .mockResolvedValueOnce(DEMO_USER)      // re-read after provision (demoLogin)
    mockCoupleCreate.mockResolvedValue(DEMO_COUPLE)
    mockUserCreate
      .mockResolvedValueOnce({ id: 'demo-u1', coupleId: 'demo-c1' })
      .mockResolvedValueOnce({ id: 'demo-u2', coupleId: 'demo-c1' })
  })

  it('creates couple, two users, and seed transactions', async () => {
    const result = await demoLogin()
    expect(mockCoupleCreate).toHaveBeenCalledTimes(1)
    expect(mockUserCreate).toHaveBeenCalledTimes(2)
    expect(mockPointsTransaction.createMany).toHaveBeenCalledTimes(1)
    expect(result.token).toBe('fake-jwt')
  })

  it('seeds 3 initial transactions for a non-empty dashboard feel', async () => {
    await demoLogin()
    const txData = (mockPointsTransaction.createMany.mock.calls[0] as any)[0].data
    expect(txData).toHaveLength(3)
  })
})

// ── demoLogin — race condition recovery ───────────────────────────────────────

describe('demoLogin — race condition on first provisioning', () => {
  it('re-reads user when couple.create throws unique constraint error', async () => {
    const uniqueError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    // First findUnique: no user (triggers creation path)
    mockUserFindUnique
      .mockResolvedValueOnce(null)                                          // no user, triggers create
      .mockResolvedValueOnce({ id: 'demo-u1', coupleId: 'demo-c1' })      // recovery re-read
      .mockResolvedValueOnce(DEMO_USER)                                     // demoLogin re-read
    // couple.create fails with unique constraint (concurrent request already created it)
    mockCoupleCreate.mockRejectedValue(uniqueError)
    // The recovery in recoverExistingOrRethrow finds the now-existing user

    const result = await demoLogin()
    expect(result.token).toBe('fake-jwt')
  })

  it('rethrows non-unique-constraint errors', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)  // no user
    mockCoupleCreate.mockRejectedValue(new Error('DB connection failed'))
    // Recovery findUnique also fails to find user
    mockUserFindUnique.mockResolvedValueOnce(null)

    await expect(demoLogin()).rejects.toThrow('DB connection failed')
  })
})

// ── demoLogin — provisioning failure ─────────────────────────────────────────

describe('demoLogin — provisioning failure (user exists but no coupleId)', () => {
  it('throws "Demo user provisioning failed"', async () => {
    // ensureDemoCouple returns a userId/coupleId correctly
    mockUserFindUnique
      .mockResolvedValueOnce({ id: 'demo-u1', coupleId: 'demo-c1' })   // ensureDemoCouple OK
      .mockResolvedValueOnce(null)                                         // but findUnique by id fails
    await expect(demoLogin()).rejects.toThrow('Demo user provisioning failed')
  })
})
