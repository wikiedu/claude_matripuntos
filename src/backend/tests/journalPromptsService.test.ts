import { describe, it, expect } from '@jest/globals'
import { selectPromptForDay, dayKeyUtc } from '../src/services/journalPromptsService.js'
import { JOURNAL_PROMPTS } from '../src/data/journalPrompts.js'

describe('journalPromptsService', () => {
  it('catalog has at least 30 prompts', () => {
    expect(JOURNAL_PROMPTS.length).toBeGreaterThanOrEqual(30)
  })

  it('all prompts have unique ids', () => {
    const ids = JOURNAL_PROMPTS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('selectPromptForDay is deterministic for same coupleId+day', () => {
    const a = selectPromptForDay('couple1', '2026-05-02')
    const b = selectPromptForDay('couple1', '2026-05-02')
    expect(a.id).toBe(b.id)
  })

  it('different couples can get different prompts same day', () => {
    const seen = new Set<string>()
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) {
      seen.add(selectPromptForDay(id, '2026-05-02').id)
    }
    expect(seen.size).toBeGreaterThan(1)  // al menos 2 distintos en 5 couples
  })

  it('skips recently shown prompts when possible', () => {
    const allIds = new Set(JOURNAL_PROMPTS.map(p => p.id))
    // Excluir todos menos 1 → debe devolver ese
    const last = JOURNAL_PROMPTS[0]
    allIds.delete(last.id)
    const r = selectPromptForDay('couple1', '2026-05-02', allIds)
    expect(r.id).toBe(last.id)
  })

  it('falls back to full pool if recent set is exhaustive', () => {
    const allIds = new Set(JOURNAL_PROMPTS.map(p => p.id))
    const r = selectPromptForDay('couple1', '2026-05-02', allIds)
    expect(JOURNAL_PROMPTS.find(p => p.id === r.id)).toBeDefined()
  })

  it('dayKeyUtc returns YYYY-MM-DD', () => {
    expect(dayKeyUtc(new Date('2026-05-02T15:00:00Z'))).toBe('2026-05-02')
  })

  it('honors weight (higher weight prompts appear more)', () => {
    // Sample over many couples, count weight-1 vs weight-3.
    const counts = new Map<string, number>()
    for (let i = 0; i < 1000; i++) {
      const id = selectPromptForDay(`couple${i}`, '2026-05-02').id
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const weight3 = JOURNAL_PROMPTS.filter(p => p.weight === 3)
    const weight1 = JOURNAL_PROMPTS.filter(p => p.weight === 1)
    if (weight3.length > 0 && weight1.length > 0) {
      const avg3 = weight3.reduce((s, p) => s + (counts.get(p.id) ?? 0), 0) / weight3.length
      const avg1 = weight1.reduce((s, p) => s + (counts.get(p.id) ?? 0), 0) / weight1.length
      expect(avg3).toBeGreaterThan(avg1)  // weight 3 aparece más que weight 1
    }
  })
})
