// v1.7 — Hermetic tests para replayService.

import { describe, it, expect } from '@jest/globals'
import { computeAvailableReplays } from '../src/services/replayService.js'

const TODAY = new Date('2026-05-02T12:00:00Z')

describe('replayService.computeAvailableReplays', () => {
  it('returns empty when no events and no transactions', () => {
    const r = computeAvailableReplays({ todayUtc: TODAY, events: [], pointsTransactions: [] })
    expect(r).toHaveLength(0)
  })

  it('detects anniversary 1 year ago same calendar day', () => {
    const events = [{
      id: 'e1',
      dateStart: new Date('2025-05-02T20:00:00Z'),
      pointsCalculated: 18.5,
      type: 'gastronomia',
    }]
    const r = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    expect(r.find(x => x.type === 'anniversary')).toBeDefined()
  })

  it('does NOT detect anniversary if different day', () => {
    const events = [{
      id: 'e1',
      dateStart: new Date('2025-05-03T20:00:00Z'),
      pointsCalculated: 10,
      type: 'gastronomia',
    }]
    const r = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    expect(r.find(x => x.type === 'anniversary')).toBeUndefined()
  })

  it('detects best_day when ≥3 events same day in last 90d', () => {
    const events = [
      { id: 'e1', dateStart: new Date('2026-04-15T08:00:00Z'), pointsCalculated: 10, type: 't' },
      { id: 'e2', dateStart: new Date('2026-04-15T14:00:00Z'), pointsCalculated: 12, type: 't' },
      { id: 'e3', dateStart: new Date('2026-04-15T20:00:00Z'), pointsCalculated: 15, type: 't' },
    ]
    const r = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    const best = r.find(x => x.type === 'best_day')
    expect(best).toBeDefined()
    expect(best?.payload?.count).toBe(3)
  })

  it('does NOT trigger best_day if fewer than 3 events in any single day', () => {
    const events = [
      { id: 'e1', dateStart: new Date('2026-04-15T08:00:00Z'), pointsCalculated: 10, type: 't' },
      { id: 'e2', dateStart: new Date('2026-04-16T14:00:00Z'), pointsCalculated: 12, type: 't' },
    ]
    const r = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    expect(r.find(x => x.type === 'best_day')).toBeUndefined()
  })

  it('detects balance_record when |sum| ≤ 2 with 10+ transactions', () => {
    const txs = Array.from({ length: 10 }, (_, i) => ({
      amount: i % 2 === 0 ? 5 : -5,
      createdAt: new Date('2026-05-01T00:00:00Z'),
    }))
    const r = computeAvailableReplays({ todayUtc: TODAY, events: [], pointsTransactions: txs })
    expect(r.find(x => x.type === 'balance_record')).toBeDefined()
  })

  it('does NOT trigger balance_record if too few transactions', () => {
    const txs = [{ amount: 0, createdAt: TODAY }]
    const r = computeAvailableReplays({ todayUtc: TODAY, events: [], pointsTransactions: txs })
    expect(r.find(x => x.type === 'balance_record')).toBeUndefined()
  })

  it('falls back to first_event when no other replays and ≤4 events', () => {
    const events = [
      { id: 'e1', dateStart: new Date('2026-04-15T08:00:00Z'), pointsCalculated: 10, type: 'cocina' },
    ]
    const r = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    const first = r.find(x => x.type === 'first_event')
    expect(first).toBeDefined()
    expect(first?.payload?.eventId).toBe('e1')
  })

  it('keys are deterministic per couple+date', () => {
    const events = [{
      id: 'e1',
      dateStart: new Date('2025-05-02T20:00:00Z'),
      pointsCalculated: 10,
      type: 'cena',
    }]
    const a = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    const b = computeAvailableReplays({ todayUtc: TODAY, events, pointsTransactions: [] })
    expect(a.map(x => x.key)).toEqual(b.map(x => x.key))
  })
})
