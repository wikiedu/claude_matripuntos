// v1.7 — Hermetic tests para streakService.recordActivity (función pura).

import { describe, it, expect } from '@jest/globals'
import { recordActivity, type StreakState } from '../src/services/streakService.js'

const ZERO: StreakState = {
  dailyStreak: 0,
  weeklyStreak: 0,
  lastActivityAt: null,
  longestDaily: 0,
  longestWeekly: 0,
}

function hours(n: number): number {
  return n * 3600 * 1000
}

describe('streakService.recordActivity (daily)', () => {
  it('starts streak at 1 from zero state', () => {
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(ZERO, now, 0)
    expect(r.dailyStreak).toBe(1)
    expect(r.dailyChanged).toBe(true)
    expect(r.longestDaily).toBe(1)
  })

  it('is idempotent within same calendar day', () => {
    const last = new Date('2026-05-02T08:00:00Z')
    const now = new Date('2026-05-02T20:00:00Z')
    const prev: StreakState = { ...ZERO, dailyStreak: 5, lastActivityAt: last, longestDaily: 5 }
    const r = recordActivity(prev, now, 0)
    expect(r.dailyStreak).toBe(5)
    expect(r.dailyChanged).toBe(false)
  })

  it('increments by 1 on next calendar day within 24h+grace', () => {
    const last = new Date('2026-05-02T20:00:00Z')
    const now = new Date('2026-05-03T08:00:00Z')  // ~12h after, next day
    const prev: StreakState = { ...ZERO, dailyStreak: 7, lastActivityAt: last, longestDaily: 7 }
    const r = recordActivity(prev, now, 0)
    expect(r.dailyStreak).toBe(8)
    expect(r.dailyChanged).toBe(true)
    expect(r.longestDaily).toBe(8)
  })

  it('resets to 1 if gap >= 24h+30min', () => {
    const last = new Date('2026-05-01T12:00:00Z')
    const now = new Date('2026-05-03T13:00:00Z')  // 49h gap
    const prev: StreakState = { ...ZERO, dailyStreak: 12, lastActivityAt: last, longestDaily: 12 }
    const r = recordActivity(prev, now, 0)
    expect(r.dailyStreak).toBe(1)
    expect(r.dailyChanged).toBe(true)
    // Longest se preserva
    expect(r.longestDaily).toBe(12)
  })

  it('preserves longest when current resets', () => {
    const last = new Date('2026-05-01T12:00:00Z')
    const now = new Date('2026-05-04T12:00:00Z')  // 72h gap
    const prev: StreakState = { ...ZERO, dailyStreak: 100, lastActivityAt: last, longestDaily: 100 }
    const r = recordActivity(prev, now, 0)
    expect(r.dailyStreak).toBe(1)
    expect(r.longestDaily).toBe(100)
  })

  it('grace window of 30min after 24h still counts as next day', () => {
    const last = new Date('2026-05-02T08:00:00Z')
    const now = new Date('2026-05-03T08:20:00Z')  // 24h20m later, within grace
    const prev: StreakState = { ...ZERO, dailyStreak: 3, lastActivityAt: last, longestDaily: 3 }
    const r = recordActivity(prev, now, 0)
    expect(r.dailyStreak).toBe(4)
  })
})

describe('streakService.recordActivity (weekly)', () => {
  it('starts weekly at 1 if first activity has weeklyActiveDays >= 3', () => {
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(ZERO, now, 3)
    expect(r.weeklyStreak).toBe(1)
    expect(r.weeklyChanged).toBe(true)
  })

  it('does not start weekly if weeklyActiveDays < 3', () => {
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(ZERO, now, 1)
    expect(r.weeklyStreak).toBe(0)
  })

  it('increments weekly when crossing into a new week with enough activity', () => {
    const last = new Date('2026-04-25T12:00:00Z')  // 7d ago
    const prev: StreakState = { ...ZERO, weeklyStreak: 4, lastActivityAt: last, longestWeekly: 4 }
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(prev, now, 4)
    expect(r.weeklyStreak).toBe(5)
    expect(r.weeklyChanged).toBe(true)
    expect(r.longestWeekly).toBe(5)
  })

  it('resets weekly when crossing into new week with < 3 active days', () => {
    const last = new Date('2026-04-25T12:00:00Z')  // 7d ago
    const prev: StreakState = { ...ZERO, weeklyStreak: 8, lastActivityAt: last, longestWeekly: 8 }
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(prev, now, 1)
    expect(r.weeklyStreak).toBe(0)
    expect(r.longestWeekly).toBe(8)  // preservado
  })

  it('does not increment weekly within same week', () => {
    const last = new Date('2026-05-01T12:00:00Z')  // ayer
    const prev: StreakState = { ...ZERO, weeklyStreak: 3, lastActivityAt: last, longestWeekly: 3 }
    const now = new Date('2026-05-02T12:00:00Z')
    const r = recordActivity(prev, now, 4)
    expect(r.weeklyStreak).toBe(3)
    expect(r.weeklyChanged).toBe(false)
  })
})
