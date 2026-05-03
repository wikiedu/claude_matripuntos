import { describe, it, expect } from 'vitest'
import { computeAnniversary } from '../src/services/anniversaryService.js'

describe('computeAnniversary', () => {
  it('returns null for invalid dates', () => {
    expect(computeAnniversary(new Date('not-a-date'))).toBeNull()
  })

  it('returns null for future start dates', () => {
    const future = new Date(Date.UTC(2030, 0, 1))
    const now = new Date(Date.UTC(2026, 5, 1))
    expect(computeAnniversary(future, now)).toBeNull()
  })

  it('computes 0 días the same day', () => {
    const today = new Date(Date.UTC(2026, 5, 1))
    const r = computeAnniversary(today, today)!
    expect(r.years).toBe(0)
    expect(r.months).toBe(0)
    expect(r.days).toBe(0)
    expect(r.totalDays).toBe(0)
  })

  it('computes 3 años, 4 meses y 12 días', () => {
    const start = new Date(Date.UTC(2023, 0, 20))
    const now   = new Date(Date.UTC(2026, 5, 1))  // June 1
    const r = computeAnniversary(start, now)!
    expect(r.years).toBe(3)
    expect(r.months).toBe(4)
    expect(r.days).toBe(12)
    expect(r.label).toBe('3 años, 4 meses y 12 días')
  })

  it('handles month underflow (Feb→Mar)', () => {
    const start = new Date(Date.UTC(2024, 0, 31))  // 31 jan
    const now   = new Date(Date.UTC(2024, 1, 28))  // 28 feb
    const r = computeAnniversary(start, now)!
    expect(r.years).toBe(0)
    expect(r.months).toBe(0)
    expect(r.days).toBe(28)
  })

  it('detects round milestone (5 years)', () => {
    const start = new Date(Date.UTC(2020, 0, 1))
    const now   = new Date(Date.UTC(2024, 11, 25))
    const r = computeAnniversary(start, now)!
    expect(r.nextMilestoneLabel).toContain('5 años')
    expect(r.nextMilestoneLabel).toContain('🎉')
  })

  it('next milestone after passing the anniversary', () => {
    const start = new Date(Date.UTC(2020, 0, 1))
    const now   = new Date(Date.UTC(2024, 0, 2))  // 1 día después de 4 años
    const r = computeAnniversary(start, now)!
    expect(r.years).toBe(4)
    expect(r.nextMilestoneDays).toBeGreaterThan(360)  // ~ 1 año
  })
})
