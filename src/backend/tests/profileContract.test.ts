// v1.6 — Contract-level tests for PUT /api/profile/me. Hermetic: no DB,
// no express app. Validates the zod schema directly. Mirrors routes/profile.ts.
// If these tests break, the wire contract with the frontend is broken too.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'
import { MOOD_KEYS } from '../src/data/moodKeys.js'

// Re-declared on purpose. Must match routes/profile.ts:profileUpdateSchema.
const profileUpdateSchema = z.object({
  surname: z.string().max(80).optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  weeklyWorkHours: z.number().int().min(0).max(80).optional(),
  workMode: z.enum(['presencial', 'remoto', 'hibrido']).optional(),
  avatarEmoji: z.string().max(8).optional(),
  avatarColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currentMood: z.enum(MOOD_KEYS).nullable().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
})

describe('PUT /api/profile/me — profileUpdateSchema contract', () => {
  it('accepts empty payload (all fields optional)', () => {
    expect(() => profileUpdateSchema.parse({})).not.toThrow()
  })

  it('accepts a valid mood key', () => {
    const r = profileUpdateSchema.parse({ currentMood: 'feliz' })
    expect(r.currentMood).toBe('feliz')
  })

  it('accepts every mood in MOOD_KEYS', () => {
    for (const k of MOOD_KEYS) {
      expect(() => profileUpdateSchema.parse({ currentMood: k })).not.toThrow()
    }
  })

  it('accepts currentMood: null (clearing)', () => {
    const r = profileUpdateSchema.parse({ currentMood: null })
    expect(r.currentMood).toBeNull()
  })

  it('rejects an unknown mood', () => {
    expect(() =>
      profileUpdateSchema.parse({ currentMood: 'enfadado' }),
    ).toThrow()
  })

  it('rejects emojis as mood (legacy values now rejected)', () => {
    expect(() =>
      profileUpdateSchema.parse({ currentMood: '😊' }),
    ).toThrow()
  })

  it('rejects mood with non-string value', () => {
    expect(() =>
      profileUpdateSchema.parse({ currentMood: 42 as any }),
    ).toThrow()
  })

  it('accepts valid avatar fields', () => {
    const r = profileUpdateSchema.parse({
      avatarEmoji: '🦊',
      avatarColor: '#7c3aed',
    })
    expect(r.avatarEmoji).toBe('🦊')
    expect(r.avatarColor).toBe('#7c3aed')
  })

  it('rejects malformed color', () => {
    expect(() =>
      profileUpdateSchema.parse({ avatarColor: 'red' }),
    ).toThrow()
    expect(() =>
      profileUpdateSchema.parse({ avatarColor: '#abc' }),
    ).toThrow()
  })

  it('accepts hasCompletedOnboarding boolean', () => {
    const r = profileUpdateSchema.parse({ hasCompletedOnboarding: true })
    expect(r.hasCompletedOnboarding).toBe(true)
  })

  it('rejects weeklyWorkHours outside [0, 80]', () => {
    expect(() => profileUpdateSchema.parse({ weeklyWorkHours: -1 })).toThrow()
    expect(() => profileUpdateSchema.parse({ weeklyWorkHours: 100 })).toThrow()
  })

  it('rejects unknown workMode', () => {
    expect(() => profileUpdateSchema.parse({ workMode: 'nights' })).toThrow()
  })
})
