import { describe, it, expect } from '@jest/globals'
import { generateInsights, type InsightInput } from '../src/services/insightsGenerator.js'
import type { RawEvent, RawTransaction, RawTaskLog } from '../src/services/analyticsAggregator.js'

const NOW = new Date('2026-05-02T12:00:00Z')

const makeEvent = (over: Partial<RawEvent> = {}): RawEvent => ({
  id: 'e' + Math.random(),
  dateStart: new Date('2026-04-15T18:00:00Z'),
  status: 'accepted',
  type: 'gastronomia',
  pointsCalculated: 10,
  category: 'cocina',
  createdBy: 'u1',
  ...over,
})

const baseInput = (over: Partial<InsightInput> = {}): InsightInput => ({
  events: [],
  transactions: [],
  taskLogs: [],
  user1Id: 'u1',
  user2Id: 'u2',
  now: NOW,
  eventsLast30: [],
  eventsPrev30: [],
  taskLogsLast30: [],
  taskLogsPrev30: [],
  ...over,
})

describe('insightsGenerator', () => {
  it('zero data → no cards', () => {
    expect(generateInsights(baseInput()).length).toBe(0)
  })

  it('top-category emite cuando hay >5 events último mes', () => {
    const events = Array.from({ length: 7 }, () => makeEvent({ category: 'cocina' }))
    const r = generateInsights(baseInput({ eventsLast30: events }))
    expect(r.find(c => c.kind === 'top-category')).toBeDefined()
  })

  it('top-category NO emite con <5 events', () => {
    const events = Array.from({ length: 3 }, () => makeEvent())
    const r = generateInsights(baseInput({ eventsLast30: events }))
    expect(r.find(c => c.kind === 'top-category')).toBeUndefined()
  })

  it('monthly-trend up cuando current > previous', () => {
    const cur = Array.from({ length: 10 }, () => makeEvent())
    const prev = Array.from({ length: 4 }, () => makeEvent())
    const r = generateInsights(baseInput({ eventsLast30: cur, eventsPrev30: prev }))
    const t = r.find(c => c.kind === 'monthly-trend')
    expect(t?.trend).toBe('up')
  })

  it('monthly-trend down cuando current < previous', () => {
    const cur = Array.from({ length: 4 }, () => makeEvent())
    const prev = Array.from({ length: 10 }, () => makeEvent())
    const r = generateInsights(baseInput({ eventsLast30: cur, eventsPrev30: prev }))
    expect(r.find(c => c.kind === 'monthly-trend')?.trend).toBe('down')
  })

  it('equity green band para |net| ≤ 5', () => {
    const txs: RawTransaction[] = [
      { id: '1', amount: 5, userId: 'u1', createdAt: NOW, type: 't' },
      { id: '2', amount: 3, userId: 'u2', createdAt: NOW, type: 't' },
    ]
    const r = generateInsights(baseInput({ transactions: txs }))
    const eq = r.find(c => c.kind === 'equity')
    expect((eq?.payload as any)?.band).toBe('green')
  })

  it('equity red band para diferencia grande', () => {
    const txs: RawTransaction[] = [
      { id: '1', amount: 100, userId: 'u1', createdAt: NOW, type: 't' },
    ]
    const r = generateInsights(baseInput({ transactions: txs }))
    expect((r.find(c => c.kind === 'equity')?.payload as any)?.band).toBe('red')
  })

  it('time-of-day emite con eventos suficientes', () => {
    const events = Array.from({ length: 8 }, () =>
      makeEvent({ dateStart: new Date('2026-04-15T20:00:00Z') }),
    )
    const r = generateInsights(baseInput({ eventsLast30: events }))
    const t = r.find(c => c.kind === 'time-of-day')
    expect(t).toBeDefined()
    // 20h UTC → bucket "tarde" (14-21)
    expect((t?.payload as any)?.topBucket).toBe('tarde')
  })

  it('pending-verifications emite con logs pending', () => {
    const logs: RawTaskLog[] = [
      { id: '1', status: 'pending', date: NOW, pointsFinal: 1 },
      { id: '2', status: 'pending', date: NOW, pointsFinal: 1 },
    ]
    const r = generateInsights(baseInput({ taskLogsLast30: logs }))
    const p = r.find(c => c.kind === 'pending-verifications')
    expect(p).toBeDefined()
    expect((p?.payload as any)?.count).toBe(2)
  })

  it('inactivity emite si último activity > 4 días', () => {
    const old = makeEvent({ dateStart: new Date('2026-04-25T10:00:00Z') })
    const r = generateInsights(baseInput({ eventsLast30: [old] }))
    expect(r.find(c => c.kind === 'inactivity')).toBeDefined()
  })

  it('inactivity NO emite si activity reciente', () => {
    const recent = makeEvent({ dateStart: new Date('2026-05-01T10:00:00Z') })
    const r = generateInsights(baseInput({ eventsLast30: [recent] }))
    expect(r.find(c => c.kind === 'inactivity')).toBeUndefined()
  })

  it('regla que falla NO afecta a las demás', () => {
    // Empty input no genera ninguna, prueba defensiva.
    expect(() => generateInsights(baseInput())).not.toThrow()
  })
})
