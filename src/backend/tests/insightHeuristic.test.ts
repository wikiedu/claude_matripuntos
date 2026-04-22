import { describe, it, expect } from '@jest/globals'
import { generateInsight } from '../src/services/insightHeuristic'

// Tests unitarios puros del generador de insights mensuales.
const baseInput = {
  user1Name: 'Ana',
  user2Name: 'Luis',
  topCategoryUser1: { name: 'cocina', count: 12 },
  topCategoryUser2: { name: 'limpieza', count: 10 },
  timePctUser1: 50,
  equityDelta: 5,
  worstCategory: null,
}

describe('generateInsight', () => {
  it('returns a text and bullets array', () => {
    const out = generateInsight(baseInput, 0)
    expect(typeof out.text).toBe('string')
    expect(out.text.length).toBeGreaterThan(10)
    expect(Array.isArray(out.bullets)).toBe(true)
  })

  it('includes both user names in the first template', () => {
    const out = generateInsight(baseInput, 0)
    expect(out.text).toContain('Luis')
    expect(out.text).toContain('Ana')
  })

  it('seed rotates through the 3 templates deterministically', () => {
    const a = generateInsight(baseInput, 0).text
    const b = generateInsight(baseInput, 1).text
    const c = generateInsight(baseInput, 2).text
    const aAgain = generateInsight(baseInput, 3).text
    expect(a).toBe(aAgain)
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('flags positive equity delta as success bullet', () => {
    const out = generateInsight({ ...baseInput, equityDelta: 8 }, 0)
    expect(out.bullets.some(b => b.tone === 'success' && b.text.includes('equidad'))).toBe(true)
  })

  it('flags negative equity delta as warn bullet', () => {
    const out = generateInsight({ ...baseInput, equityDelta: -4 }, 0)
    expect(out.bullets.some(b => b.tone === 'warn' && b.text.includes('equidad'))).toBe(true)
  })

  it('adds a "Reparto equilibrado" success bullet inside 45-55% window', () => {
    const balanced = generateInsight({ ...baseInput, timePctUser1: 48 }, 0)
    expect(balanced.bullets.some(b => b.text.includes('equilibrado'))).toBe(true)

    const skewed = generateInsight({ ...baseInput, timePctUser1: 70 }, 0)
    expect(skewed.bullets.some(b => b.text.includes('equilibrado'))).toBe(false)
  })

  it('flags worst category as warn bullet when provided', () => {
    const out = generateInsight({ ...baseInput, worstCategory: 'cocina' }, 0)
    expect(out.bullets.some(b => b.tone === 'warn' && b.text.includes('cocina'))).toBe(true)
  })

  it('handles null top categories gracefully without crashing', () => {
    const out = generateInsight(
      { ...baseInput, topCategoryUser1: null, topCategoryUser2: null },
      0,
    )
    expect(typeof out.text).toBe('string')
  })
})
