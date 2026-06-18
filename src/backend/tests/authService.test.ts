// Unit tests for authService pure functions.
// signAccessToken / verifyToken are tested without Prisma (no DB needed).
// hashPassword / verifyPassword only exercise bcrypt, also no DB.
// signupUser / loginUser need a Prisma mock — see integration tests below.

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals'

// ── Pure-function tests (no mocks required) ───────────────────────────────────

// authService reads JWT_SECRET at module load — must be set before import.
const FAKE_SECRET = 'supersecretjwtkey1234567890abcdef'
process.env.JWT_SECRET = FAKE_SECRET

import {
  signAccessToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  generateToken,
  BCRYPT_ROUNDS,
  JWT_ACCESS_EXPIRY,
} from '../src/services/authService.js'

describe('signAccessToken / verifyToken', () => {
  it('round-trips: a token signed for (userId, coupleId) decodes to the same values', () => {
    const token = signAccessToken('u1', 'c1')
    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.userId).toBe('u1')
    expect(decoded!.coupleId).toBe('c1')
  })

  it('returns null for a tampered token', () => {
    const token = signAccessToken('u1', 'c1')
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(verifyToken(tampered)).toBeNull()
  })

  it('returns null for a completely invalid string', () => {
    expect(verifyToken('not.a.token')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(verifyToken('')).toBeNull()
  })

  it('coupleId null is preserved (solo user before partner links)', () => {
    const token = signAccessToken('u1', null as unknown as string)
    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.coupleId).toBeNull()
  })
})

describe('generateToken', () => {
  it('delegates to signAccessToken — produces verifiable token', () => {
    const token = generateToken('u2', 'c2')
    const decoded = verifyToken(token)
    expect(decoded?.userId).toBe('u2')
    expect(decoded?.coupleId).toBe('c2')
  })
})

describe('hashPassword / verifyPassword', () => {
  it('produces a bcrypt hash that verifies against the original password', async () => {
    const hash = await hashPassword('myS3cr3tP@ss')
    const ok = await verifyPassword('myS3cr3tP@ss', hash)
    expect(ok).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct')
    const ok = await verifyPassword('wrong', hash)
    expect(ok).toBe(false)
  })

  it('different hashes for same password (salt randomness)', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    expect(h1).not.toBe(h2)
    // both still verify
    expect(await verifyPassword('same', h1)).toBe(true)
    expect(await verifyPassword('same', h2)).toBe(true)
  })
})

describe('constants', () => {
  it('BCRYPT_ROUNDS is ≥ 12 (audit requirement)', () => {
    expect(BCRYPT_ROUNDS).toBeGreaterThanOrEqual(12)
  })

  it('JWT_ACCESS_EXPIRY is a non-empty string', () => {
    expect(typeof JWT_ACCESS_EXPIRY).toBe('string')
    expect(JWT_ACCESS_EXPIRY.length).toBeGreaterThan(0)
  })
})

// ── signupUser (integration — Prisma mock) ────────────────────────────────────

// TODO: extend with Prisma mock following the authMiddleware.test.ts pattern.
// Key scenarios to cover:
//   1. Happy path: new email → creates solo couple + user, returns token
//   2. Duplicate email (active user) → throws 'Email already registered'
//   3. Soft-deleted user with same email → re-registration allowed
//   4. Pending email invitation exists → auto-links to inviter's couple
//   5. Password length validation (Zod schema, not here — route-level)
