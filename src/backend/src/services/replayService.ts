// v1.7 — Replay service. Spec §4.5. Cards de re-engagement:
//   - "Hace 1 año" — actividad de la pareja en mismo día año pasado.
//   - "Vuestro mejor día" — día con más actividad equilibrada.
//   - "Récord de equilibrio" — cuando |saldo| llega a 0 o menos absoluto.
//
// Lazy + cacheable: las queries se computan al pedir (route GET) sin DB
// de fondo, pero el resultado se memoiza por (coupleId, date) para que
// llamadas repetidas en mismo día sean baratas.

export interface ReplayCard {
  key: string             // 'anniversary-2026-05-02' — único por couple+key
  type: 'anniversary' | 'best_day' | 'balance_record' | 'first_event'
  title: string
  subtitle: string
  date: string            // ISO date del evento original
  payload?: Record<string, unknown>  // datos para el render UI
}

export interface ReplayInput {
  // El consumidor pre-carga las queries necesarias para mantener el service puro.
  todayUtc: Date
  events: Array<{ id: string; dateStart: Date; pointsCalculated: number; type: string }>
  pointsTransactions: Array<{ amount: number; createdAt: Date }>
}

/**
 * computeAvailableReplays: dado el estado pre-cargado de la pareja, devuelve
 * los replays "vistosos" para mostrar HOY. El caller decide si los muestra
 * según `seenKeys`.
 */
export function computeAvailableReplays(input: ReplayInput): ReplayCard[] {
  const out: ReplayCard[] = []

  // Anniversary: ¿hay events en el mismo MM-DD del año anterior?
  const todayMonth = input.todayUtc.getUTCMonth()
  const todayDay = input.todayUtc.getUTCDate()
  const oneYearAgo = new Date(input.todayUtc)
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1)

  const anniversary = input.events.find(e => {
    const d = e.dateStart
    return d.getUTCMonth() === todayMonth
      && d.getUTCDate() === todayDay
      && d.getUTCFullYear() === oneYearAgo.getUTCFullYear()
  })

  if (anniversary) {
    out.push({
      key: `anniversary-${input.todayUtc.toISOString().slice(0, 10)}`,
      type: 'anniversary',
      title: 'Hace 1 año…',
      subtitle: `Aquel ${anniversary.dateStart.toISOString().slice(0, 10)} hicisteis "${anniversary.type}".`,
      date: anniversary.dateStart.toISOString(),
      payload: { eventId: anniversary.id, points: anniversary.pointsCalculated },
    })
  }

  // Best day: día con más activity (count) en últimos 90 días.
  const last90 = input.events.filter(e => {
    const days = (input.todayUtc.getTime() - e.dateStart.getTime()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 90
  })

  if (last90.length > 0) {
    const byDay = new Map<string, { count: number; points: number; date: Date }>()
    for (const e of last90) {
      const k = e.dateStart.toISOString().slice(0, 10)
      const cur = byDay.get(k) ?? { count: 0, points: 0, date: e.dateStart }
      cur.count += 1
      cur.points += e.pointsCalculated
      byDay.set(k, cur)
    }
    let best: { date: Date; count: number; points: number } | null = null
    for (const v of byDay.values()) {
      if (!best || v.count > best.count) best = v
    }
    if (best && best.count >= 3) {
      out.push({
        key: `best-day-${best.date.toISOString().slice(0, 10)}`,
        type: 'best_day',
        title: 'Vuestro mejor día reciente',
        subtitle: `${best.count} actividades · ${best.points} pts ese día.`,
        date: best.date.toISOString(),
        payload: { count: best.count, points: best.points },
      })
    }
  }

  // Balance record: si la suma absoluta de transacciones más reciente
  // está cerca de 0 (≤ 2), es un record que merece celebrarse.
  if (input.pointsTransactions.length >= 10) {
    const sum = input.pointsTransactions.reduce((a, t) => a + t.amount, 0)
    if (Math.abs(sum) <= 2) {
      out.push({
        key: `balance-record-${input.todayUtc.toISOString().slice(0, 10)}`,
        type: 'balance_record',
        title: 'Récord de equilibrio',
        subtitle: `Saldo neto ${sum >= 0 ? '+' : ''}${sum} con ${input.pointsTransactions.length} transacciones.`,
        date: input.todayUtc.toISOString(),
        payload: { net: sum, count: input.pointsTransactions.length },
      })
    }
  }

  // First event: si NO hay ningún replay y la pareja tiene <5 events,
  // celebra el primer event como milestone.
  if (out.length === 0 && input.events.length >= 1 && input.events.length <= 4) {
    const first = input.events.reduce((a, b) => (a.dateStart < b.dateStart ? a : b))
    out.push({
      key: `first-event-${first.id}`,
      type: 'first_event',
      title: 'Primera actividad juntos 💕',
      subtitle: `"${first.type}" · ${first.pointsCalculated} pts.`,
      date: first.dateStart.toISOString(),
      payload: { eventId: first.id },
    })
  }

  return out
}
