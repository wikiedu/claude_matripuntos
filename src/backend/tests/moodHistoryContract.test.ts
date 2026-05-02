// v1.6 — Hermetic contract test for GET /api/profile/mood-history.
// Verifica el schema de query params (days + tz) sin levantar express.
// Mirrors routes/profile.ts:moodHistoryQuerySchema.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const moodHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  tz: z.string().default('Europe/Madrid'),
})

describe('GET /api/profile/mood-history — moodHistoryQuerySchema contract', () => {
  it('accepts empty query (defaults applied)', () => {
    const r = moodHistoryQuerySchema.parse({})
    expect(r.days).toBe(7)
    expect(r.tz).toBe('Europe/Madrid')
  })

  it('coerces "days" string to number', () => {
    const r = moodHistoryQuerySchema.parse({ days: '14' })
    expect(r.days).toBe(14)
  })

  it('rejects days = 0', () => {
    expect(() => moodHistoryQuerySchema.parse({ days: 0 })).toThrow()
  })

  it('rejects days > 30', () => {
    expect(() => moodHistoryQuerySchema.parse({ days: 31 })).toThrow()
  })

  it('accepts custom tz string', () => {
    const r = moodHistoryQuerySchema.parse({ tz: 'America/Mexico_City' })
    expect(r.tz).toBe('America/Mexico_City')
  })

  it('rejects non-integer days', () => {
    expect(() => moodHistoryQuerySchema.parse({ days: 7.5 })).toThrow()
  })
})

describe('Intl TZ validation logic (mirrors handler)', () => {
  const isValid = (tz: string) => {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
  }
  it('valid TZs pass', () => {
    expect(isValid('Europe/Madrid')).toBe(true)
    expect(isValid('UTC')).toBe(true)
    expect(isValid('America/New_York')).toBe(true)
  })
  it('invalid TZs fail', () => {
    expect(isValid('Foo/Bar')).toBe(false)
    expect(isValid('NotATZ')).toBe(false)
  })
})

describe('day grouping in TZ (mirrors handler logic)', () => {
  it('en-CA format gives YYYY-MM-DD', () => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    })
    const out = fmt.format(new Date('2026-05-02T15:00:00Z'))
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
