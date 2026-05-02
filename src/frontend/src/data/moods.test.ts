import { describe, it, expect } from 'vitest'
import { MOODS, MOOD_KEYS, MOOD_BY_KEY } from './moods'

describe('moods catalog', () => {
  it('contains exactly 10 moods', () => {
    expect(MOODS).toHaveLength(10)
  })

  it('all keys are unique', () => {
    const keys = MOODS.map(m => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('exports MOOD_KEYS array of strings', () => {
    expect(MOOD_KEYS).toEqual(MOODS.map(m => m.key))
  })

  it('MOOD_BY_KEY lookup works', () => {
    expect(MOOD_BY_KEY.feliz?.emoji).toBe('😊')
    expect(MOOD_BY_KEY.bajon?.tone).toBe('negative-soft')
  })

  it('does NOT include hostile moods', () => {
    const labels = MOODS.map(m => m.label.toLowerCase())
    expect(labels.some(l => /enfadad|cabread/.test(l))).toBe(false)
  })

  it('every mood has emoji, label, hint and tone', () => {
    for (const m of MOODS) {
      expect(m.emoji).toBeTruthy()
      expect(m.label).toBeTruthy()
      expect(m.hint).toBeTruthy()
      expect(['positive', 'neutral', 'low-energy', 'negative-soft']).toContain(m.tone)
    }
  })

  it('tone distribution: 4 positive, 2 neutral, 2 low-energy, 2 negative-soft', () => {
    const counts = MOODS.reduce((acc, m) => {
      acc[m.tone] = (acc[m.tone] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    expect(counts.positive).toBe(4)
    expect(counts.neutral).toBe(2)
    expect(counts['low-energy']).toBe(2)
    expect(counts['negative-soft']).toBe(2)
  })
})
