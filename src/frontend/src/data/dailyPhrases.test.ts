import { describe, it, expect } from 'vitest'
import { PHRASES, type PhraseCategory } from './dailyPhrases'

const CATEGORIES: PhraseCategory[] = [
  'reconciliacion','animo','celebrar','agradecer','calma','animo-suave','hito','neutra-positivo',
]

describe('dailyPhrases catalog', () => {
  it('every phrase has unique id', () => {
    const ids = PHRASES.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every category has at least 10 phrases (MVP minimum)', () => {
    for (const cat of CATEGORIES) {
      const n = PHRASES.filter(p => p.category === cat).length
      expect(n, `category ${cat} should have ≥10 phrases (got ${n})`).toBeGreaterThanOrEqual(10)
    }
  })

  it('no phrase exceeds 140 characters', () => {
    for (const p of PHRASES) {
      expect(p.text.length, `phrase ${p.id} too long`).toBeLessThanOrEqual(140)
    }
  })

  it('every phrase tone is one of the allowed values', () => {
    for (const p of PHRASES) {
      expect(['warm', 'playful', 'reflective', 'celebratory']).toContain(p.tone)
    }
  })

  it('every phrase category is one of the 8 enum values', () => {
    for (const p of PHRASES) {
      expect(CATEGORIES).toContain(p.category)
    }
  })

  it('every phrase has non-empty text', () => {
    for (const p of PHRASES) {
      expect(p.text.length, `phrase ${p.id} empty`).toBeGreaterThan(0)
    }
  })
})
