// v1.6.1 — Contract tests for /api/auth schemas. Hermetic: no DB, no app.
// Mirror schemas in routes/authRoutes.ts.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(40),
  joinCode: z.string().optional(),
  coupleSecretKey: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

describe('POST /api/auth/register — registerSchema', () => {
  it('accepts minimum valid payload', () => {
    expect(() =>
      registerSchema.parse({ email: 'a@b.io', password: '12345678', name: 'X' }),
    ).not.toThrow()
  })

  it('accepts joinCode optional', () => {
    expect(() =>
      registerSchema.parse({ email: 'a@b.io', password: '12345678', name: 'X', joinCode: 'ABC' }),
    ).not.toThrow()
  })

  it('rejects short password', () => {
    expect(() =>
      registerSchema.parse({ email: 'a@b.io', password: 'short', name: 'X' }),
    ).toThrow()
  })

  it('rejects missing name', () => {
    expect(() =>
      registerSchema.parse({ email: 'a@b.io', password: '12345678' } as any),
    ).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() =>
      registerSchema.parse({ email: 'not-email', password: '12345678', name: 'X' }),
    ).toThrow()
  })
})

describe('POST /api/auth/login — loginSchema', () => {
  it('accepts valid payload', () => {
    expect(() => loginSchema.parse({ email: 'a@b.io', password: 'pwd' })).not.toThrow()
  })

  it('rejects empty password', () => {
    expect(() => loginSchema.parse({ email: 'a@b.io', password: '' })).toThrow()
  })

  it('rejects missing email', () => {
    expect(() => loginSchema.parse({ password: 'pwd' } as any)).toThrow()
  })
})
