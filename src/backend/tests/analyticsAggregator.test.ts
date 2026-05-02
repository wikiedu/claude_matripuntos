// v2.0.3 — Tests hermetic con énfasis en INVARIANTES MATEMÁTICAS.
// Cada bloque verifica una propiedad que el user pidió: "las cifras coinciden,
// no errores de adquisición ni muestreo".

import { describe, it, expect } from '@jest/globals'
import {
  toDayKey, toWeekKey, toMonthKey, dayKeysBetween,
  countEvents, eventsByDay, eventsByWeek, eventsByMonth, eventsByCategory, heatmap24x7,
  balanceByUser, netBalance, equityCurve, equityBand,
  taskLogStats, moodTimeline, compareCounts,
  type RawEvent, type RawTransaction, type RawTaskLog, type RawMoodLog,
} from '../src/services/analyticsAggregator.js'

const ev = (over: Partial<RawEvent>): RawEvent => ({
  id: `e-${Math.random()}`,
  dateStart: new Date('2026-04-15T10:00:00Z'),
  status: 'accepted',
  type: 'gastronomia',
  pointsCalculated: 10,
  category: 'cocina',
  createdBy: 'u1',
  ...over,
})

const tx = (over: Partial<RawTransaction>): RawTransaction => ({
  id: `t-${Math.random()}`,
  amount: 10,
  userId: 'u1',
  createdAt: new Date('2026-04-15T10:00:00Z'),
  type: 'event_accepted',
  ...over,
})

// ───────────────────────────────────────────────────────────────────────────
// 1. KEYS UTC determinismo
// ───────────────────────────────────────────────────────────────────────────

describe('date keys', () => {
  it('toDayKey is YYYY-MM-DD', () => {
    expect(toDayKey(new Date('2026-04-15T23:59:59Z'))).toBe('2026-04-15')
    expect(toDayKey(new Date('2026-04-15T00:00:00Z'))).toBe('2026-04-15')
  })

  it('toWeekKey returns Monday for any day in same ISO week', () => {
    // 2026-04-15 = miércoles
    expect(toWeekKey(new Date('2026-04-15T15:00:00Z'))).toBe('2026-04-13')
    // 2026-04-19 = domingo (último día semana)
    expect(toWeekKey(new Date('2026-04-19T23:00:00Z'))).toBe('2026-04-13')
    // 2026-04-13 = lunes
    expect(toWeekKey(new Date('2026-04-13T00:00:00Z'))).toBe('2026-04-13')
  })

  it('toMonthKey is YYYY-MM', () => {
    expect(toMonthKey(new Date('2026-04-30T23:59:59Z'))).toBe('2026-04')
    expect(toMonthKey(new Date('2026-05-01T00:00:00Z'))).toBe('2026-05')
  })

  it('dayKeysBetween includes both endpoints', () => {
    const k = dayKeysBetween(new Date('2026-04-15T10:00:00Z'), new Date('2026-04-17T20:00:00Z'))
    expect(k).toEqual(['2026-04-15', '2026-04-16', '2026-04-17'])
  })

  it('dayKeysBetween length matches calendar days', () => {
    const k = dayKeysBetween(new Date('2026-04-01T00:00:00Z'), new Date('2026-04-30T00:00:00Z'))
    expect(k.length).toBe(30)
  })

  it('dayKeysBetween from === to → single day', () => {
    const d = new Date('2026-04-15T12:00:00Z')
    expect(dayKeysBetween(d, d)).toEqual(['2026-04-15'])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 2. EVENT COUNTS — invariantes de partition
// ───────────────────────────────────────────────────────────────────────────

describe('countEvents (partition invariant)', () => {
  it('accepted + rejected + pending + other === total', () => {
    const events = [
      ev({ status: 'accepted' }), ev({ status: 'accepted' }),
      ev({ status: 'rejected' }),
      ev({ status: 'pending' }), ev({ status: 'pending' }), ev({ status: 'pending' }),
      ev({ status: 'forced' }),
      ev({ status: 'unknown_state' }),
    ]
    const c = countEvents(events)
    expect(c.total).toBe(events.length)
    expect(c.accepted + c.rejected + c.pending + c.other).toBe(c.total)
  })

  it('forced cuenta como accepted', () => {
    const c = countEvents([ev({ status: 'forced' })])
    expect(c.accepted).toBe(1)
  })

  it('draft cuenta como pending', () => {
    const c = countEvents([ev({ status: 'draft' })])
    expect(c.pending).toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 3. INVARIANTE CRÍTICA: sum(byDay) = sum(byWeek) = sum(byMonth) = total
// ───────────────────────────────────────────────────────────────────────────

describe('aggregation invariants — sums match across granularity', () => {
  const events: RawEvent[] = [
    ev({ id: '1', dateStart: new Date('2026-04-13T10:00:00Z') }),  // L
    ev({ id: '2', dateStart: new Date('2026-04-14T10:00:00Z') }),  // M
    ev({ id: '3', dateStart: new Date('2026-04-14T15:00:00Z') }),  // M (mismo día)
    ev({ id: '4', dateStart: new Date('2026-04-19T10:00:00Z') }),  // D (misma semana)
    ev({ id: '5', dateStart: new Date('2026-04-20T10:00:00Z') }),  // L (siguiente semana)
    ev({ id: '6', dateStart: new Date('2026-05-01T10:00:00Z') }),  // siguiente mes
  ]

  function sumValues(o: Record<string, number>): number {
    return Object.values(o).reduce((a, b) => a + b, 0)
  }

  it('sum(eventsByDay) === total', () => {
    expect(sumValues(eventsByDay(events))).toBe(events.length)
  })

  it('sum(eventsByWeek) === total', () => {
    expect(sumValues(eventsByWeek(events))).toBe(events.length)
  })

  it('sum(eventsByMonth) === total', () => {
    expect(sumValues(eventsByMonth(events))).toBe(events.length)
  })

  it('sum(eventsByCategory) === total', () => {
    expect(sumValues(eventsByCategory(events))).toBe(events.length)
  })

  it('sum(heatmap rows) === total', () => {
    const grid = heatmap24x7(events)
    const sum = grid.reduce((a, row) => a + row.reduce((aa, v) => aa + v, 0), 0)
    expect(sum).toBe(events.length)
  })

  it('week aggregation: 4 events in W2026-04-13, 1 in W2026-04-20, 1 in W2026-04-27', () => {
    const weeks = eventsByWeek(events)
    expect(weeks['2026-04-13']).toBe(4)
    expect(weeks['2026-04-20']).toBe(1)
    expect(weeks['2026-04-27']).toBe(1)
  })

  it('day count consistency: events in same day grouped', () => {
    const days = eventsByDay(events)
    expect(days['2026-04-14']).toBe(2)  // 2 eventos mismo día
    expect(days['2026-04-13']).toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 4. CATEGORY BREAKDOWN — null bucket
// ───────────────────────────────────────────────────────────────────────────

describe('eventsByCategory', () => {
  it('agrupa categorías iguales', () => {
    const r = eventsByCategory([ev({ category: 'cocina' }), ev({ category: 'cocina' }), ev({ category: 'limpieza' })])
    expect(r['cocina']).toBe(2)
    expect(r['limpieza']).toBe(1)
  })

  it('null/undefined van a "(sin categoría)"', () => {
    const r = eventsByCategory([ev({ category: null }), ev({ category: undefined as any }), ev({ category: 'cocina' })])
    expect(r['(sin categoría)']).toBe(2)
    expect(r['cocina']).toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 5. HEATMAP 24×7
// ───────────────────────────────────────────────────────────────────────────

describe('heatmap24x7', () => {
  it('returns 7×24 grid', () => {
    const g = heatmap24x7([])
    expect(g.length).toBe(7)
    g.forEach(row => expect(row.length).toBe(24))
  })

  it('zero events → all zero', () => {
    const g = heatmap24x7([])
    expect(g.every(row => row.every(v => v === 0))).toBe(true)
  })

  it('single event lunes 10:00 → grid[0][10]=1', () => {
    const g = heatmap24x7([ev({ dateStart: new Date('2026-04-13T10:00:00Z') })])
    expect(g[0][10]).toBe(1)
    // Resto = 0
    let sum = 0
    g.forEach(row => row.forEach(v => sum += v))
    expect(sum).toBe(1)
  })

  it('domingo 23:00 → grid[6][23]', () => {
    const g = heatmap24x7([ev({ dateStart: new Date('2026-04-19T23:00:00Z') })])
    expect(g[6][23]).toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 6. BALANCES + EQUITY
// ───────────────────────────────────────────────────────────────────────────

describe('balanceByUser + netBalance', () => {
  it('sum(balanceByUser) === sum(amounts)', () => {
    const txs = [tx({ userId: 'u1', amount: 10 }), tx({ userId: 'u1', amount: -3 }), tx({ userId: 'u2', amount: 5 })]
    const b = balanceByUser(txs)
    const sum = Object.values(b).reduce((a, v) => a + v, 0)
    expect(sum).toBe(12)
    expect(b['u1']).toBe(7)
    expect(b['u2']).toBe(5)
  })

  it('netBalance(u1, u2) = b[u1] - b[u2]', () => {
    const txs = [tx({ userId: 'u1', amount: 20 }), tx({ userId: 'u2', amount: 12 })]
    expect(netBalance(txs, 'u1', 'u2')).toBe(8)
    expect(netBalance(txs, 'u2', 'u1')).toBe(-8)
  })

  it('netBalance handles missing users (treats as 0)', () => {
    expect(netBalance([], 'u1', 'u2')).toBe(0)
  })
})

describe('equityCurve', () => {
  it('last point === netBalance(all)', () => {
    const txs = [
      tx({ userId: 'u1', amount: 10, createdAt: new Date('2026-04-13T10:00:00Z') }),
      tx({ userId: 'u2', amount: 6, createdAt: new Date('2026-04-15T10:00:00Z') }),
      tx({ userId: 'u1', amount: 4, createdAt: new Date('2026-04-17T10:00:00Z') }),
    ]
    const curve = equityCurve(txs, 'u1', 'u2', new Date('2026-04-13'), new Date('2026-04-17'))
    expect(curve.length).toBe(5)  // 13 → 17 inclusive
    expect(curve[curve.length - 1].net).toBe(netBalance(txs, 'u1', 'u2'))
  })

  it('cumulative monotonic w/ sign of new tx', () => {
    const txs = [
      tx({ userId: 'u1', amount: 10, createdAt: new Date('2026-04-13T10:00:00Z') }),
      tx({ userId: 'u1', amount: 5, createdAt: new Date('2026-04-14T10:00:00Z') }),
      tx({ userId: 'u1', amount: 3, createdAt: new Date('2026-04-15T10:00:00Z') }),
    ]
    const curve = equityCurve(txs, 'u1', 'u2', new Date('2026-04-13'), new Date('2026-04-15'))
    expect(curve[0].net).toBe(10)
    expect(curve[1].net).toBe(15)
    expect(curve[2].net).toBe(18)
  })

  it('length === days(from, to) inclusive', () => {
    const c = equityCurve([], 'u1', 'u2', new Date('2026-04-01'), new Date('2026-04-30'))
    expect(c.length).toBe(30)
    expect(c.every(p => p.net === 0)).toBe(true)
  })

  it('multiple txs same day acumulan en ese día', () => {
    const txs = [
      tx({ userId: 'u1', amount: 10, createdAt: new Date('2026-04-13T08:00:00Z') }),
      tx({ userId: 'u1', amount: 5, createdAt: new Date('2026-04-13T20:00:00Z') }),
    ]
    const c = equityCurve(txs, 'u1', 'u2', new Date('2026-04-13'), new Date('2026-04-13'))
    expect(c[0].net).toBe(15)
  })
})

describe('equityBand', () => {
  it('green ≤5', () => {
    expect(equityBand(0)).toBe('green')
    expect(equityBand(5)).toBe('green')
    expect(equityBand(-5)).toBe('green')
  })
  it('yellow 6-15', () => {
    expect(equityBand(6)).toBe('yellow')
    expect(equityBand(15)).toBe('yellow')
    expect(equityBand(-12)).toBe('yellow')
  })
  it('red >15', () => {
    expect(equityBand(16)).toBe('red')
    expect(equityBand(-100)).toBe('red')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 7. TASK LOG STATS partition
// ───────────────────────────────────────────────────────────────────────────

describe('taskLogStats partition', () => {
  it('verified + pending + disputed = total (con bucket implícito other=0)', () => {
    const logs: RawTaskLog[] = [
      { id: '1', status: 'verified', date: new Date(), pointsFinal: 1 },
      { id: '2', status: 'verified', date: new Date(), pointsFinal: 1 },
      { id: '3', status: 'pending', date: new Date(), pointsFinal: 1 },
      { id: '4', status: 'disputed', date: new Date(), pointsFinal: 1 },
    ]
    const s = taskLogStats(logs)
    expect(s.total).toBe(4)
    expect(s.verified + s.pending + s.disputed).toBe(s.total)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 8. MOOD TIMELINE — 1 punto por día sin perder días vacíos
// ───────────────────────────────────────────────────────────────────────────

describe('moodTimeline', () => {
  it('length === days inclusive (incluyendo días sin mood)', () => {
    const r = moodTimeline([], 'u1', 'u2', new Date('2026-04-01'), new Date('2026-04-07'))
    expect(r.length).toBe(7)
    expect(r.every(p => p.user1Mood === null && p.user2Mood === null)).toBe(true)
  })

  it('último mood del día gana cuando hay múltiples', () => {
    const logs: RawMoodLog[] = [
      { id: '1', moodKey: 'feliz', userId: 'u1', createdAt: new Date('2026-04-15T08:00:00Z') },
      { id: '2', moodKey: 'cansado', userId: 'u1', createdAt: new Date('2026-04-15T20:00:00Z') },
    ]
    const r = moodTimeline(logs, 'u1', 'u2', new Date('2026-04-15'), new Date('2026-04-15'))
    expect(r[0].user1Mood).toBe('cansado')
  })

  it('user1 y user2 separados en el mismo día', () => {
    const logs: RawMoodLog[] = [
      { id: '1', moodKey: 'feliz', userId: 'u1', createdAt: new Date('2026-04-15T08:00:00Z') },
      { id: '2', moodKey: 'tranquilo', userId: 'u2', createdAt: new Date('2026-04-15T09:00:00Z') },
    ]
    const r = moodTimeline(logs, 'u1', 'u2', new Date('2026-04-15'), new Date('2026-04-15'))
    expect(r[0].user1Mood).toBe('feliz')
    expect(r[0].user2Mood).toBe('tranquilo')
  })

  it('logs de user fuera de couple se ignoran (no contaminan)', () => {
    const logs: RawMoodLog[] = [
      { id: '1', moodKey: 'feliz', userId: 'u1', createdAt: new Date('2026-04-15T08:00:00Z') },
      { id: '2', moodKey: 'X', userId: 'other-couple', createdAt: new Date('2026-04-15T09:00:00Z') },
    ]
    const r = moodTimeline(logs, 'u1', 'u2', new Date('2026-04-15'), new Date('2026-04-15'))
    expect(r[0].user1Mood).toBe('feliz')
    expect(r[0].user2Mood).toBeNull()
  })
})

// ───────────────────────────────────────────────────────────────────────────
// 9. COMPARE COUNTS
// ───────────────────────────────────────────────────────────────────────────

describe('compareCounts', () => {
  it('up trend cuando current > previous', () => {
    const c = compareCounts(15, 10)
    expect(c.diff).toBe(5)
    expect(c.trend).toBe('up')
    expect(c.pctChange).toBe(50)
  })

  it('down trend cuando current < previous', () => {
    const c = compareCounts(8, 10)
    expect(c.diff).toBe(-2)
    expect(c.trend).toBe('down')
    expect(c.pctChange).toBe(-20)
  })

  it('flat trend cuando iguales', () => {
    const c = compareCounts(10, 10)
    expect(c.trend).toBe('flat')
    expect(c.pctChange).toBe(0)
  })

  it('previous=0 → pctChange null (división protegida)', () => {
    const c = compareCounts(5, 0)
    expect(c.pctChange).toBeNull()
    expect(c.trend).toBe('up')
  })
})
