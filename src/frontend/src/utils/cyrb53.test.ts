import { describe, it, expect } from 'vitest'
import { cyrb53 } from './cyrb53'

describe('cyrb53', () => {
  it('returns same hash for same input', () => {
    expect(cyrb53('foo')).toBe(cyrb53('foo'))
    expect(cyrb53('Matripuntos · 2026-05-02 · neutra')).toBe(cyrb53('Matripuntos · 2026-05-02 · neutra'))
  })

  it('returns different hashes for different inputs', () => {
    expect(cyrb53('foo')).not.toBe(cyrb53('bar'))
    expect(cyrb53('couple-A-2026-05-02')).not.toBe(cyrb53('couple-B-2026-05-02'))
  })

  it('returns positive integer', () => {
    const h = cyrb53('hello')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('seed influences result', () => {
    expect(cyrb53('foo', 1)).not.toBe(cyrb53('foo', 2))
  })

  it('handles empty string', () => {
    expect(typeof cyrb53('')).toBe('number')
  })
})
