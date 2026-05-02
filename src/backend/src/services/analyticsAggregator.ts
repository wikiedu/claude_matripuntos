// v2.0.3 — Analytics aggregator. PURO: ninguna llamada a Prisma; el caller
// pre-carga los datos y los pasa. Esto permite:
//   1. Tests hermetic exhaustivos con propiedades invariantes.
//   2. Una sola fuente de verdad de cómo se agregan eventos/transacciones.
//   3. Reusabilidad desde routes y desde cronjobs sin DB calls duplicadas.
//
// IMPORTANTE — Invariantes que tests verifican:
//   - sum(daily[d]) === weekly[w] cuando d ∈ w
//   - sum(weekly[w]) === monthly[m] cuando w ∈ m
//   - eventsAccepted + eventsRejected + eventsPending === eventsTotal
//   - sum(byCategory.values) === eventsTotal
//   - heatmap.sum === eventsTotal
//   - equityCurve.last === currentNetBalance
//   - mood timeline length === días en rango (incluyendo días sin mood)
//   - filtros por user no pierden ni duplican rows

export interface RawEvent {
  id: string
  dateStart: Date
  status: string  // 'accepted' | 'rejected' | 'pending' | 'forced' | etc.
  type: string
  pointsCalculated: number
  category?: string | null
  createdBy: string
}

export interface RawTransaction {
  id: string
  amount: number
  userId: string
  createdAt: Date
  type: string
}

export interface RawTaskLog {
  id: string
  status: string  // 'verified' | 'pending' | 'disputed'
  date: Date
  pointsFinal: number
  completedBy?: string | null
}

export interface RawMoodLog {
  id: string
  moodKey: string
  userId: string
  createdAt: Date
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Devuelve el ISO date YYYY-MM-DD UTC. Idempotente. */
export function toDayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Lunes 00:00 UTC de la semana ISO. d puede ser cualquier día de esa semana. */
export function toWeekKey(d: Date): string {
  const x = new Date(d)
  const day = x.getUTCDay()  // 0=domingo
  const diff = day === 0 ? 6 : day - 1
  x.setUTCDate(x.getUTCDate() - diff)
  x.setUTCHours(0, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

/** YYYY-MM UTC. */
export function toMonthKey(d: Date): string {
  return d.toISOString().slice(0, 7)
}

/** Genera array de YYYY-MM-DD entre from..to inclusive (ambos UTC). */
export function dayKeysBetween(from: Date, to: Date): string[] {
  const out: string[] = []
  const c = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()))
  while (c.getTime() <= end.getTime()) {
    out.push(toDayKey(c))
    c.setUTCDate(c.getUTCDate() + 1)
  }
  return out
}

// ─── EVENT AGGREGATIONS ────────────────────────────────────────────────────

export interface EventCounts {
  total: number
  accepted: number
  rejected: number
  pending: number
  other: number
}

export function countEvents(events: RawEvent[]): EventCounts {
  let accepted = 0, rejected = 0, pending = 0, other = 0
  for (const e of events) {
    switch (e.status) {
      case 'accepted': case 'forced': accepted++; break
      case 'rejected': rejected++; break
      case 'pending': case 'draft': pending++; break
      default: other++
    }
  }
  return { total: events.length, accepted, rejected, pending, other }
}

/** Eventos por dayKey UTC. INVARIANTE: sum de values === events.length. */
export function eventsByDay(events: RawEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) {
    const k = toDayKey(e.dateStart)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Eventos por weekKey UTC. */
export function eventsByWeek(events: RawEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) {
    const k = toWeekKey(e.dateStart)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Eventos por monthKey UTC. */
export function eventsByMonth(events: RawEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) {
    const k = toMonthKey(e.dateStart)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Eventos por categoría. INVARIANTE: sum === events.length (con bucket null). */
export function eventsByCategory(events: RawEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) {
    const k = e.category ?? '(sin categoría)'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Heatmap [dayOfWeek 0-6 lunes][hour 0-23] = count. INVARIANTE total. */
export function heatmap24x7(events: RawEvent[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const e of events) {
    const d = new Date(e.dateStart)
    const dow = d.getUTCDay()  // 0=domingo
    const row = dow === 0 ? 6 : dow - 1  // 0=lunes...6=domingo
    const hour = d.getUTCHours()
    grid[row][hour]++
  }
  return grid
}

// ─── TRANSACTION / EQUITY ─────────────────────────────────────────────────

/** Saldos por user. INVARIANTE: sum(values) === sum(transactions.amount). */
export function balanceByUser(txs: RawTransaction[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of txs) {
    out[t.userId] = (out[t.userId] ?? 0) + t.amount
  }
  return out
}

/** Saldo neto user1 - user2. */
export function netBalance(txs: RawTransaction[], user1Id: string, user2Id: string): number {
  const b = balanceByUser(txs)
  return (b[user1Id] ?? 0) - (b[user2Id] ?? 0)
}

/** Evolución del saldo neto por día. Cumulative. INVARIANTE: last === netBalance(all). */
export function equityCurve(
  txs: RawTransaction[],
  user1Id: string,
  user2Id: string,
  from: Date,
  to: Date,
): Array<{ date: string; net: number }> {
  const days = dayKeysBetween(from, to)
  const sortedTxs = [...txs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const out: Array<{ date: string; net: number }> = []
  let cumulative = 0
  let txIdx = 0

  for (const day of days) {
    while (txIdx < sortedTxs.length) {
      const t = sortedTxs[txIdx]
      const tDay = toDayKey(t.createdAt)
      if (tDay > day) break
      if (tDay === day || tDay < day) {
        if (t.userId === user1Id) cumulative += t.amount
        else if (t.userId === user2Id) cumulative -= t.amount
        txIdx++
      } else {
        break
      }
    }
    out.push({ date: day, net: cumulative })
  }
  return out
}

/** Banda de equilibrio: 'green' (≤5), 'yellow' (≤15), 'red' (>15). */
export function equityBand(absNet: number): 'green' | 'yellow' | 'red' {
  const a = Math.abs(absNet)
  if (a <= 5) return 'green'
  if (a <= 15) return 'yellow'
  return 'red'
}

// ─── TASK LOGS ──────────────────────────────────────────────────────────────

export interface TaskLogStats {
  total: number
  verified: number
  pending: number
  disputed: number
}

export function taskLogStats(logs: RawTaskLog[]): TaskLogStats {
  let verified = 0, pending = 0, disputed = 0
  for (const l of logs) {
    if (l.status === 'verified') verified++
    else if (l.status === 'pending') pending++
    else if (l.status === 'disputed') disputed++
  }
  return { total: logs.length, verified, pending, disputed }
}

// ─── MOOD TIMELINE ──────────────────────────────────────────────────────────

export interface MoodTimelinePoint {
  date: string
  user1Mood: string | null
  user2Mood: string | null
}

/** Mood timeline: para CADA día en rango, devuelve mood vigente del día.
 *  Si hay múltiples logs en un día, gana el último.
 *  Si no hay log en un día, valor null (no se inventa).
 *  INVARIANTE: length === days(from, to) inclusive.
 */
export function moodTimeline(
  logs: RawMoodLog[],
  user1Id: string,
  user2Id: string,
  from: Date,
  to: Date,
): MoodTimelinePoint[] {
  const days = dayKeysBetween(from, to)
  const byDayUser1 = new Map<string, { mood: string; ts: number }>()
  const byDayUser2 = new Map<string, { mood: string; ts: number }>()

  for (const l of logs) {
    const k = toDayKey(l.createdAt)
    const ts = l.createdAt.getTime()
    if (l.userId === user1Id) {
      const cur = byDayUser1.get(k)
      if (!cur || cur.ts < ts) byDayUser1.set(k, { mood: l.moodKey, ts })
    } else if (l.userId === user2Id) {
      const cur = byDayUser2.get(k)
      if (!cur || cur.ts < ts) byDayUser2.set(k, { mood: l.moodKey, ts })
    }
  }

  return days.map(d => ({
    date: d,
    user1Mood: byDayUser1.get(d)?.mood ?? null,
    user2Mood: byDayUser2.get(d)?.mood ?? null,
  }))
}

// ─── COMPARISONS (this period vs previous) ─────────────────────────────────

export interface PeriodCompare {
  current: number
  previous: number
  diff: number
  trend: 'up' | 'down' | 'flat'
  pctChange: number | null  // null si previous === 0
}

export function compareCounts(current: number, previous: number): PeriodCompare {
  const diff = current - previous
  const trend: 'up' | 'down' | 'flat' = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const pctChange = previous === 0 ? null : Math.round((diff / previous) * 100)
  return { current, previous, diff, trend, pctChange }
}
