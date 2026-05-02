import { describe, it, expect } from '@jest/globals'
import { computeRetrospective } from '../src/services/journalRetrospectiveService.js'

const baseInput = {
  period: 'week' as const,
  startDate: new Date('2026-05-01T00:00:00Z'),
  endDate: new Date('2026-05-07T23:59:59Z'),
  events: [],
  taskLogs: [],
  pointsTransactions: [],
  journalEntries: [],
  moodLogs: [],
}

describe('journalRetrospectiveService.computeRetrospective', () => {
  it('returns zero stats with empty input', () => {
    const r = computeRetrospective(baseInput)
    expect(r.stats.eventsAccepted).toBe(0)
    expect(r.stats.tasksVerified).toBe(0)
    expect(r.stats.netBalance).toBe(0)
    expect(r.stats.isBalanced).toBe(true)
  })

  it('counts events accepted/rejected', () => {
    const r = computeRetrospective({
      ...baseInput,
      events: [
        { pointsCalculated: 10, type: 't', status: 'accepted' },
        { pointsCalculated: 20, type: 't', status: 'accepted' },
        { pointsCalculated: 5, type: 't', status: 'rejected' },
      ],
    })
    expect(r.stats.eventsAccepted).toBe(2)
    expect(r.stats.eventsRejected).toBe(1)
  })

  it('counts tasks verified/disputed', () => {
    const r = computeRetrospective({
      ...baseInput,
      taskLogs: [
        { status: 'verified' }, { status: 'verified' }, { status: 'disputed' },
      ],
    })
    expect(r.stats.tasksVerified).toBe(2)
    expect(r.stats.tasksDisputed).toBe(1)
  })

  it('computes netBalance per user', () => {
    const r = computeRetrospective({
      ...baseInput,
      user1Id: 'u1', user2Id: 'u2',
      pointsTransactions: [
        { amount: 10, userId: 'u1' },
        { amount: 8, userId: 'u2' },
      ],
    })
    expect(r.stats.netBalance).toBe(2)
    expect(r.stats.isBalanced).toBe(true)
  })

  it('marks unbalanced if |net| > 5', () => {
    const r = computeRetrospective({
      ...baseInput,
      user1Id: 'u1', user2Id: 'u2',
      pointsTransactions: [
        { amount: 20, userId: 'u1' },
        { amount: 0, userId: 'u2' },
      ],
    })
    expect(r.stats.netBalance).toBe(20)
    expect(r.stats.isBalanced).toBe(false)
  })

  it('returns most frequent mood', () => {
    const r = computeRetrospective({
      ...baseInput,
      moodLogs: [
        { moodKey: 'feliz' }, { moodKey: 'tranquilo' }, { moodKey: 'feliz' },
      ],
    })
    expect(r.stats.moodPredominant).toBe('feliz')
  })

  it('returns null mood when no logs', () => {
    expect(computeRetrospective(baseInput).stats.moodPredominant).toBeNull()
  })

  it('extracts distinct tags from journal entries', () => {
    const r = computeRetrospective({
      ...baseInput,
      journalEntries: [
        { id: 'j1', type: 'reflection', tags: ['viaje', 'amor'], createdAt: new Date(), body: 'X' },
        { id: 'j2', type: 'reflection', tags: ['amor', 'familia'], createdAt: new Date(), body: 'Y' },
      ],
    })
    expect(r.stats.distinctTags.sort()).toEqual(['amor', 'familia', 'viaje'])
  })

  it('returns up to 3 highlights from longest entries', () => {
    const r = computeRetrospective({
      ...baseInput,
      journalEntries: [
        { id: '1', type: 'reflection', tags: [], createdAt: new Date('2026-05-01'), body: 'corto' },
        { id: '2', type: 'reflection', tags: [], createdAt: new Date('2026-05-02'), body: 'M'.repeat(100) },
        { id: '3', type: 'reflection', tags: [], createdAt: new Date('2026-05-03'), body: 'M'.repeat(200) },
        { id: '4', type: 'reflection', tags: [], createdAt: new Date('2026-05-04'), body: 'M'.repeat(150) },
      ],
    })
    expect(r.highlights.length).toBeLessThanOrEqual(3)
    expect(r.highlights[0].kind).toBe('journal')
  })

  it('returns ISO strings in dates', () => {
    const r = computeRetrospective(baseInput)
    expect(typeof r.startDate).toBe('string')
    expect(typeof r.endDate).toBe('string')
    expect(r.startDate).toContain('2026')
  })
})
