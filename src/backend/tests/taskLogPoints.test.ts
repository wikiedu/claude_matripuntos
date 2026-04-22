import { describe, it, expect } from '@jest/globals'
import {
  calculateTaskLogPoints,
  resolveModifier,
  TASK_MODIFIER_VALUES,
} from '../src/services/taskLogPoints'

// Audit v1.4 P1-B regression: the server is the sole authority for
// TaskLog.pointsFinal. These tests lock in the modifier lookup, the combined
// streak × weekly × pet multiplier chain, rounding to 0.5, and the 500-point
// cap that stops inflation attacks.
describe('resolveModifier', () => {
  it('maps known modifiers to their fixed multipliers', () => {
    expect(resolveModifier('none').value).toBe(1.0)
    expect(resolveModifier('extra').value).toBe(1.3)
    expect(resolveModifier('partial').value).toBe(0.7)
    expect(resolveModifier('profunda').value).toBe(1.5)
    expect(resolveModifier('complicada').value).toBe(1.5)
    expect(resolveModifier('visita').value).toBe(1.25)
  })

  it('defaults missing or unknown modifiers to 1.0 / "none"', () => {
    expect(resolveModifier(undefined)).toEqual({ name: 'none', value: 1.0 })
    expect(resolveModifier('bogus')).toEqual({ name: 'bogus', value: 1.0 })
    expect(resolveModifier('')).toEqual({ name: '', value: 1.0 })
  })

  it('exposes the modifier table verbatim (no silent renames)', () => {
    expect(TASK_MODIFIER_VALUES).toEqual({
      none: 1.0,
      extra: 1.3,
      partial: 0.7,
      profunda: 1.5,
      complicada: 1.5,
      visita: 1.25,
    })
  })
})

describe('calculateTaskLogPoints', () => {
  it('returns pointsBase unchanged when no modifier and no streaks', () => {
    const out = calculateTaskLogPoints({
      pointsBase: 10,
      streakDays: 0,
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    expect(out.modifierValue).toBe(1.0)
    expect(out.dailyMult).toBe(1.0)
    expect(out.weeklyBonus).toBe(0)
    expect(out.combinedMultiplier).toBe(1.0)
    expect(out.pointsFinal).toBe(10)
  })

  it('applies the extra modifier ×1.3', () => {
    const out = calculateTaskLogPoints({
      pointsBase: 10,
      modifier: 'extra',
      streakDays: 0,
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    // 10 * 1.3 * 1.0 * (1 + 0) * 1.0 = 13.0
    expect(out.pointsFinal).toBe(13.0)
  })

  it('applies the partial modifier ×0.7', () => {
    const out = calculateTaskLogPoints({
      pointsBase: 10,
      modifier: 'partial',
      streakDays: 0,
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    // 10 * 0.7 = 7.0
    expect(out.pointsFinal).toBe(7.0)
  })

  it('stacks streak × weekly × pets multipliers correctly', () => {
    // streakDays=7 → dailyMult=1.3
    // streakWeeks=4 → weeklyBonus=0.20 → (1 + 0.20) = 1.2
    // factorMascotas=1.2 (2+ pets)
    // combined = 1.3 * 1.2 * 1.2 = 1.872
    const out = calculateTaskLogPoints({
      pointsBase: 10,
      streakDays: 7,
      streakWeeks: 4,
      factorMascotas: 1.2,
    })
    expect(out.dailyMult).toBe(1.3)
    expect(out.weeklyBonus).toBe(0.20)
    expect(out.combinedMultiplier).toBeCloseTo(1.872, 5)
    // 10 * 1.0 * 1.872 = 18.72 → rounded to 0.5 → 18.5
    expect(out.pointsFinal).toBe(18.5)
  })

  it('rounds to the nearest 0.5', () => {
    // 10 * 1.3 * 1.1 = 14.3 → 14.5 (nearest 0.5)
    const out = calculateTaskLogPoints({
      pointsBase: 10,
      modifier: 'extra',
      streakDays: 3, // dailyMult 1.1
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    expect(out.pointsFinal).toBe(14.5)
  })

  it('caps pointsFinal at 500 regardless of multiplier chain', () => {
    // Extreme input: base 100 × extra 1.3 × daily 2.0 (90+ days) × weekly 1.2 × pets 1.2
    // = 100 * 1.3 * 2.0 * 1.2 * 1.2 = 374.4 → below cap, still valid
    // Push further to exceed cap:
    // base 100 × profunda 1.5 × daily 2.0 × weekly 1.2 × pets 1.2
    // = 100 * 1.5 * 2.0 * 1.2 * 1.2 = 432 → still below
    // Use absurd base 500 × profunda 1.5 × everything:
    const out = calculateTaskLogPoints({
      pointsBase: 500,
      modifier: 'profunda',
      streakDays: 90,
      streakWeeks: 10,
      factorMascotas: 1.2,
    })
    // Raw = 500 * 1.5 * 2.0 * 1.2 * 1.2 = 2160 → capped at 500
    expect(out.rawFinal).toBeGreaterThan(500)
    expect(out.pointsFinal).toBe(500)
  })

  it('never returns a negative pointsFinal even with zero base', () => {
    const out = calculateTaskLogPoints({
      pointsBase: 0.5,
      modifier: 'partial',
      streakDays: 0,
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    // 0.5 * 0.7 = 0.35 → rounded to 0.5
    expect(out.pointsFinal).toBe(0.5)
    expect(out.pointsFinal).toBeGreaterThanOrEqual(0)
  })

  it('clamps at 500 exactly when rawFinal just crosses the threshold', () => {
    // pointsBase chosen so raw lands at ~501
    const out = calculateTaskLogPoints({
      pointsBase: 250.5,
      modifier: 'extra',
      streakDays: 14, // dailyMult 1.5
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    // 250.5 * 1.3 * 1.5 = 488.475 → rounded to 488.5 (below cap)
    expect(out.pointsFinal).toBe(488.5)

    const overCap = calculateTaskLogPoints({
      pointsBase: 400,
      modifier: 'extra',
      streakDays: 14,
      streakWeeks: 0,
      factorMascotas: 1.0,
    })
    // 400 * 1.3 * 1.5 = 780 → capped at 500
    expect(overCap.rawFinal).toBe(780)
    expect(overCap.pointsFinal).toBe(500)
  })
})
