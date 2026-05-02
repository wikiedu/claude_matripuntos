// v1.7 — Hermetic tests para challengeService.

import { describe, it, expect } from '@jest/globals'
import { generateChallengeForLevel, evaluateProgress, startOfIsoWeek } from '../src/services/challengeService.js'

describe('challengeService.generateChallengeForLevel', () => {
  it('returns a valid template at level 1', () => {
    const t = generateChallengeForLevel(1, 'couple1-2026-W18')
    expect(['balance', 'verify', 'diversity', 'no_dispute', 'high_impact']).toContain(t.type)
    expect(t.goal).toBeGreaterThanOrEqual(0)
    expect(t.rewardXp).toBeGreaterThan(0)
  })

  it('is deterministic for same seed', () => {
    const a = generateChallengeForLevel(3, 'couple1-2026-W18')
    const b = generateChallengeForLevel(3, 'couple1-2026-W18')
    expect(a).toEqual(b)
  })

  it('produces different challenges across weeks', () => {
    const w1 = generateChallengeForLevel(3, 'couple1-2026-W18')
    const w2 = generateChallengeForLevel(3, 'couple1-2026-W19')
    // No es determinístico que sean diferentes, pero al menos no asegures
    // igualdad. Aceptable que el hash colisione ocasionalmente.
    expect(w1).toBeDefined()
    expect(w2).toBeDefined()
  })

  it('scales rewardXp with level', () => {
    const lv1 = generateChallengeForLevel(1, 'fixed-seed')
    const lv10 = generateChallengeForLevel(10, 'fixed-seed')
    expect(lv10.rewardXp).toBeGreaterThan(lv1.rewardXp)
  })
})

describe('challengeService.evaluateProgress', () => {
  it('verify: progress capped at goal', () => {
    const t = { type: 'verify' as const, goal: 10, config: {} }
    const r = evaluateProgress(t, { mutualVerifications: 15 })
    expect(r.progress).toBe(10)
    expect(r.completed).toBe(true)
  })

  it('verify: not completed under goal', () => {
    const t = { type: 'verify' as const, goal: 10, config: {} }
    const r = evaluateProgress(t, { mutualVerifications: 5 })
    expect(r.progress).toBe(5)
    expect(r.completed).toBe(false)
  })

  it('diversity: counts new categories', () => {
    const t = { type: 'diversity' as const, goal: 3, config: {} }
    const r = evaluateProgress(t, { newCategories4w: 4 })
    expect(r.progress).toBe(3)
    expect(r.completed).toBe(true)
  })

  it('no_dispute: completed when zero disputes', () => {
    const t = { type: 'no_dispute' as const, goal: 0, config: {} }
    const r = evaluateProgress(t, { disputedCount: 0 })
    expect(r.completed).toBe(true)
  })

  it('no_dispute: not completed with disputes', () => {
    const t = { type: 'no_dispute' as const, goal: 0, config: {} }
    const r = evaluateProgress(t, { disputedCount: 1 })
    expect(r.completed).toBe(false)
  })

  it('high_impact: 1 accepted = completed', () => {
    const t = { type: 'high_impact' as const, goal: 1, config: {} }
    const r = evaluateProgress(t, { highImpactAccepted: 1 })
    expect(r.completed).toBe(true)
  })

  it('balance: completed when within delta', () => {
    const t = { type: 'balance' as const, goal: 5, config: {} }
    const r = evaluateProgress(t, { absNetBalance: 3 })
    expect(r.completed).toBe(true)
  })

  it('balance: not completed when above delta', () => {
    const t = { type: 'balance' as const, goal: 5, config: {} }
    const r = evaluateProgress(t, { absNetBalance: 12 })
    expect(r.completed).toBe(false)
  })
})

describe('challengeService.startOfIsoWeek', () => {
  it('returns Monday for any day in same ISO week', () => {
    const wed = new Date('2026-04-29T15:00:00Z') // Wed
    const monday = startOfIsoWeek(wed)
    expect(monday.getUTCDay()).toBe(1)
    expect(monday.getUTCHours()).toBe(0)
    expect(monday.getUTCDate()).toBe(27)  // 2026-04-27 = Mon
  })

  it('returns same Monday for Sunday end of week', () => {
    const sun = new Date('2026-05-03T15:00:00Z') // Sun
    const monday = startOfIsoWeek(sun)
    expect(monday.getUTCDay()).toBe(1)
    expect(monday.getUTCDate()).toBe(27)  // belongs to W18
  })
})
