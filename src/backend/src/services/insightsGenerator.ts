// v2.0.3 — Insights generator. Reglas server-side TRANSPARENTES (no AI).
// Cada regla recibe métricas pre-calculadas y decide si emite una card.
// El user puede ver "¿Por qué veo esto?" → la regla expone su lógica.

import { compareCounts, equityBand, type RawEvent, type RawTransaction, type RawTaskLog } from './analyticsAggregator.js'

export interface InsightDraft {
  kind: string
  title: string
  body: string
  trend: 'up' | 'down' | 'flat' | null
  payload: Record<string, unknown>
  /** Hours hasta que la card expira y se regenera. */
  validForHours: number
}

export interface InsightInput {
  events: RawEvent[]
  transactions: RawTransaction[]
  taskLogs: RawTaskLog[]
  user1Id: string
  user2Id: string
  now: Date
  // Para comparaciones temporales pre-cargadas:
  eventsLast30: RawEvent[]
  eventsPrev30: RawEvent[]
  taskLogsLast30: RawTaskLog[]
  taskLogsPrev30: RawTaskLog[]
}

export function generateInsights(input: InsightInput): InsightDraft[] {
  const out: InsightDraft[] = []
  for (const rule of RULES) {
    try {
      const r = rule(input)
      if (r) out.push(r)
    } catch {
      // Una regla falla, las demás siguen.
    }
  }
  return out
}

// ─── REGLAS ────────────────────────────────────────────────────────────────

type Rule = (input: InsightInput) => InsightDraft | null

/** R1: Top categoría del último mes. */
const ruleTopCategory: Rule = (input) => {
  const events = input.eventsLast30
  if (events.length < 5) return null
  const counts: Record<string, number> = {}
  for (const e of events) {
    const k = e.category ?? '(otra)'
    counts[k] = (counts[k] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  const [cat, count] = top
  const pct = Math.round((count / events.length) * 100)
  return {
    kind: 'top-category',
    title: `Vuestro foco: ${cat}`,
    body: `${cat} representa el ${pct}% de vuestras actividades del último mes (${count} de ${events.length}).`,
    trend: null,
    payload: { category: cat, count, total: events.length, pct },
    validForHours: 24 * 7,
  }
}

/** R2: Tendencia mensual de actividades. */
const ruleMonthlyTrend: Rule = (input) => {
  const cmp = compareCounts(input.eventsLast30.length, input.eventsPrev30.length)
  if (cmp.previous === 0 && cmp.current === 0) return null

  let title = ''
  let body = ''
  if (cmp.trend === 'up') {
    title = `Más activos este mes ↑`
    body = cmp.pctChange === null
      ? `Habéis hecho ${cmp.current} actividades este mes.`
      : `Habéis hecho ${cmp.current} actividades este mes (+${cmp.pctChange}% vs mes anterior).`
  } else if (cmp.trend === 'down') {
    title = `Mes más tranquilo ↓`
    body = `Habéis hecho ${cmp.current} actividades este mes (${cmp.pctChange}% vs anterior).`
  } else {
    title = `Mes estable`
    body = `Mismo nivel de actividad que el mes pasado.`
  }
  return {
    kind: 'monthly-trend',
    title,
    body,
    trend: cmp.trend,
    payload: { current: cmp.current, previous: cmp.previous, diff: cmp.diff, pctChange: cmp.pctChange },
    validForHours: 24,
  }
}

/** R3: Equilibrio actual del saldo. */
const ruleEquity: Rule = (input) => {
  if (input.transactions.length === 0) return null
  let bal1 = 0, bal2 = 0
  for (const t of input.transactions) {
    if (t.userId === input.user1Id) bal1 += t.amount
    else if (t.userId === input.user2Id) bal2 += t.amount
  }
  const net = bal1 - bal2
  const band = equityBand(net)

  let title = '', body = ''
  if (band === 'green') {
    title = 'Saldo equilibrado ✓'
    body = `La diferencia es de ${Math.abs(net)} puntos. Buena coordinación.`
  } else if (band === 'yellow') {
    title = 'Diferencia moderada'
    body = `Hay ${Math.abs(net)} puntos de diferencia. Una semana podéis nivelar.`
  } else {
    title = 'Diferencia alta'
    body = `Hay ${Math.abs(net)} puntos de diferencia. Vale la pena hablar de qué tareas hay pendientes.`
  }
  return {
    kind: 'equity',
    title,
    body,
    trend: null,
    payload: { net, band, bal1, bal2 },
    validForHours: 12,
  }
}

/** R4: Hora del día predominante. */
const ruleTimeOfDay: Rule = (input) => {
  const events = input.eventsLast30
  if (events.length < 5) return null
  const buckets = { madrugada: 0, mañana: 0, tarde: 0, noche: 0 }
  for (const e of events) {
    const h = e.dateStart.getUTCHours()
    if (h < 6) buckets.madrugada++
    else if (h < 14) buckets.mañana++
    else if (h < 21) buckets.tarde++
    else buckets.noche++
  }
  const top = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0]
  const [label, count] = top
  if (count === 0) return null
  const pct = Math.round((count / events.length) * 100)
  return {
    kind: 'time-of-day',
    title: `${label.charAt(0).toUpperCase() + label.slice(1)} es vuestro momento`,
    body: `${pct}% de vuestras actividades del último mes ocurren por la ${label}.`,
    trend: null,
    payload: { topBucket: label, count, total: events.length, pct, distribution: buckets },
    validForHours: 24 * 3,
  }
}

/** R5: Tareas pendientes de verificación del partner. */
const rulePendingVerifications: Rule = (input) => {
  const pending = input.taskLogsLast30.filter(l => l.status === 'pending').length
  if (pending === 0) return null
  return {
    kind: 'pending-verifications',
    title: `${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de verificar`,
    body: `Hay actividad reciente que tu pareja aún no ha verificado. Recordadle desde Tareas.`,
    trend: null,
    payload: { count: pending },
    validForHours: 24,
  }
}

/** R6: Inactividad reciente. */
const ruleInactivity: Rule = (input) => {
  const last = [...input.eventsLast30, ...input.taskLogsLast30.map(l => ({ dateStart: l.date }) as any)]
    .sort((a: any, b: any) => b.dateStart.getTime() - a.dateStart.getTime())[0]
  if (!last) return null
  const daysSince = Math.floor((input.now.getTime() - last.dateStart.getTime()) / (24 * 3600 * 1000))
  if (daysSince < 4) return null
  return {
    kind: 'inactivity',
    title: `Hace ${daysSince} días sin actividad`,
    body: `Volved cuando os apetezca. No hay prisa.`,
    trend: null,
    payload: { daysSince },
    validForHours: 24,
  }
}

const RULES: Rule[] = [
  ruleTopCategory,
  ruleMonthlyTrend,
  ruleEquity,
  ruleTimeOfDay,
  rulePendingVerifications,
  ruleInactivity,
]
