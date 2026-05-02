// v2.0.1 — Hermetic tests recurrenceService.

import { describe, it, expect } from '@jest/globals'
import { parseRRule, expandRecurrence } from '../src/services/recurrenceService.js'

describe('parseRRule', () => {
  it('parses minimum DAILY', () => {
    expect(parseRRule('FREQ=DAILY')).toEqual({ freq: 'DAILY', interval: 1 })
  })

  it('parses INTERVAL=2', () => {
    expect(parseRRule('FREQ=DAILY;INTERVAL=2').interval).toBe(2)
  })

  it('parses UNTIL with date-only', () => {
    const r = parseRRule('FREQ=DAILY;UNTIL=20260601')
    expect(r.until?.getUTCFullYear()).toBe(2026)
    expect(r.until?.getUTCMonth()).toBe(5)
    expect(r.until?.getUTCDate()).toBe(1)
  })

  it('parses BYDAY MO,WE,FR', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')
    expect(r.byday).toEqual([1, 3, 5])
  })

  it('parses COUNT=10', () => {
    expect(parseRRule('FREQ=DAILY;COUNT=10').count).toBe(10)
  })

  it('throws on bad FREQ', () => {
    expect(() => parseRRule('FREQ=BOGUS')).toThrow()
  })

  it('throws on COUNT out of range', () => {
    expect(() => parseRRule('FREQ=DAILY;COUNT=9999')).toThrow()
  })
})

describe('expandRecurrence', () => {
  const start = new Date('2026-05-04T08:00:00Z')  // Monday

  it('DAILY for 7 days', () => {
    const dates = expandRecurrence('FREQ=DAILY;COUNT=7', start, 30)
    expect(dates).toHaveLength(7)
    expect(dates[0].toISOString()).toBe('2026-05-04T08:00:00.000Z')
    expect(dates[6].toISOString()).toBe('2026-05-10T08:00:00.000Z')
  })

  it('WEEKLY MO,WE,FR limited to 30 days', () => {
    const dates = expandRecurrence('FREQ=WEEKLY;BYDAY=MO,WE,FR', start, 30)
    expect(dates.length).toBeGreaterThan(10)  // ~3 per week × 4-5 weeks
    expect(dates.length).toBeLessThan(20)
    // primer item es lunes
    expect(dates[0].getUTCDay()).toBe(1)
  })

  it('UNTIL caps the expansion', () => {
    const dates = expandRecurrence('FREQ=DAILY;UNTIL=20260510', start, 365)
    // Empieza 5/4, hasta 5/10 inclusive = 7 días
    expect(dates.length).toBeLessThanOrEqual(7)
    expect(dates.every(d => d.getTime() <= new Date('2026-05-10T23:59:59Z').getTime())).toBe(true)
  })

  it('MONTHLY 1 año = 12 ocurrencias', () => {
    const dates = expandRecurrence('FREQ=MONTHLY', start, 365)
    expect(dates.length).toBeGreaterThanOrEqual(11)
    expect(dates.length).toBeLessThanOrEqual(13)
  })

  it('YEARLY anniversary', () => {
    const dates = expandRecurrence('FREQ=YEARLY;COUNT=3', start, 365 * 5)
    expect(dates).toHaveLength(3)
    expect(dates[0].getUTCFullYear()).toBe(2026)
    expect(dates[2].getUTCFullYear()).toBe(2028)
  })

  it('caps at MAX_OCCURRENCES (365)', () => {
    const dates = expandRecurrence('FREQ=DAILY', start, 730)
    expect(dates.length).toBeLessThanOrEqual(365)
  })

  it('respects window even without UNTIL', () => {
    const dates = expandRecurrence('FREQ=DAILY', start, 7)
    expect(dates.length).toBeLessThanOrEqual(8)
  })

  it('throws windowDays out of range', () => {
    expect(() => expandRecurrence('FREQ=DAILY', start, 9999)).toThrow()
    expect(() => expandRecurrence('FREQ=DAILY', start, 0)).toThrow()
  })
})
