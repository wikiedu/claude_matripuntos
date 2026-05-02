// v1.7 — Hermetic tests para levelService. Pure logic, sin Prisma.

import { describe, it, expect } from '@jest/globals'
import { computeLevel, xpToNext, crossedLevel } from '../src/services/levelService.js'

describe('levelService.computeLevel', () => {
  it('returns level 1 for xp=0', () => {
    expect(computeLevel(0).level).toBe(1)
    expect(computeLevel(0).name).toBe('Vecinos')
  })

  it('returns level 1 just below first threshold (xp=99)', () => {
    expect(computeLevel(99).level).toBe(1)
  })

  it('returns level 2 at first threshold (xp=100)', () => {
    expect(computeLevel(100).level).toBe(2)
    expect(computeLevel(100).name).toBe('Amigos')
  })

  it('returns level 5 (Aliados) at xp=1500', () => {
    expect(computeLevel(1500).level).toBe(5)
    expect(computeLevel(1500).name).toBe('Aliados')
  })

  it('caps at level 10 (Vida)', () => {
    expect(computeLevel(99999).level).toBe(9)
    expect(computeLevel(100000).level).toBe(10)
    expect(computeLevel(100000).name).toBe('Vida')
    expect(computeLevel(500000).level).toBe(10)
  })

  it('exposes perks for the level', () => {
    expect(computeLevel(0).perks).toEqual([])
    expect(computeLevel(100).perks).toContain('theme:tribe')
    expect(computeLevel(100000).perks).toContain('phrases:legendary')
  })

  it('rejects negative xp (defensive — treats as 0)', () => {
    expect(computeLevel(-50).level).toBe(1)
  })
})

describe('levelService.xpToNext', () => {
  it('returns 0 at max level', () => {
    expect(xpToNext(100000)).toBe(0)
    expect(xpToNext(500000)).toBe(0)
  })

  it('returns delta to next threshold', () => {
    expect(xpToNext(50)).toBe(50)   // level 1, need 100 → 50 missing
    expect(xpToNext(150)).toBe(150) // level 2, next at 300 → 150 missing
    expect(xpToNext(99999)).toBe(1) // level 9, next at 100000 → 1 missing
  })
})

describe('levelService.crossedLevel', () => {
  it('returns false for same-level xp gain', () => {
    expect(crossedLevel(50, 80)).toBe(false)
  })

  it('returns true crossing single threshold', () => {
    expect(crossedLevel(99, 100)).toBe(true)
    expect(crossedLevel(2900, 3000)).toBe(true)
  })

  it('returns true crossing multiple thresholds in single jump', () => {
    expect(crossedLevel(50, 1500)).toBe(true)
  })

  it('returns false at max level both sides', () => {
    expect(crossedLevel(150000, 200000)).toBe(false)
  })
})
