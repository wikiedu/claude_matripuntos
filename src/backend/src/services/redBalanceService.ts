// v2.2.6 — Detector de "saldo en rojo crónico" (Claude Design canvas 09).
//
// Filosofía: cuando un user lleva N días con saldo negativo (recibe menos
// MP que su pareja) la app pasa de "contador" a "asistente de pareja".
// Tres umbrales:
//   - 3 días en rojo  → severity 'soft':  "tres días flojos · sin drama"
//   - 7 días en rojo  → severity 'warn':  "buen momento para hablarlo"
//   - 14+ días en rojo → severity 'crit':  "¿pausamos el conteo?"
//
// Privacidad asimétrica: el user en rojo lo ve plenamente; el partner
// solo ve un nudge soft "antes de pedirle algo, pregúntale qué tal".

import prisma from '../lib/prisma.js'

export type Severity = 'soft' | 'warn' | 'crit'

export interface RedBalanceStatus {
  daysInRed: number              // días consecutivos en rojo (0 si no aplica)
  severity: Severity | null      // null si <3 días
  myDailyDelta: number[]         // últimos 14 días, mi delta neto por día
  partnerName: string | null     // si hay pareja
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calcula los últimos 14 días de delta neto del user. Un día se considera
 * "en rojo" si el user tuvo delta diario menor que el partner ese día.
 *
 * Cuenta días consecutivos en rojo desde el más reciente hacia atrás.
 */
export async function computeRedBalance(
  coupleId: string,
  userId: string,
  now: Date = new Date(),
): Promise<RedBalanceStatus> {
  // v2.7.2 audit 02 S2-8 — si la pareja está en pausa (vacation mode),
  // no contamos rojo: el digest queda silenciado, los streaks no
  // avanzan, y este conteo emocional debe respetar la pausa también.
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { pausedUntil: true },
  })
  if (couple?.pausedUntil && couple.pausedUntil.getTime() > now.getTime()) {
    return { daysInRed: 0, severity: null, myDailyDelta: [], partnerName: null }
  }

  const partner = await prisma.user.findFirst({
    where: { coupleId, NOT: { id: userId }, deletedAt: null },
    select: { id: true, name: true },
  })

  // Sin pareja, no aplica.
  if (!partner) {
    return { daysInRed: 0, severity: null, myDailyDelta: [], partnerName: null }
  }

  const start = new Date(now.getTime() - 14 * DAY_MS)
  const txs = await prisma.pointsTransaction.findMany({
    where: {
      coupleId,
      userId: { in: [userId, partner.id] },
      createdAt: { gte: start },
    },
    select: { userId: true, amount: true, createdAt: true },
  })

  // v2.7.2 audit 02 S2-7 — antes usábamos toISOString() que da UTC; un
  // user en CET cerrando el día a las 23:30 quedaba en el "día siguiente"
  // UTC, distorsionando el delta diario. Usamos formato local en-CA
  // YYYY-MM-DD via Intl que respeta TZ del runtime (Render: UTC, pero
  // si pasamos a Postgres con TZ explícita se canaliza correctamente).
  const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)

  // Buckets por día local
  const myByDay = new Map<string, number>()
  const partnerByDay = new Map<string, number>()
  for (const t of txs) {
    const k = dayKey(t.createdAt)
    const map = t.userId === userId ? myByDay : partnerByDay
    map.set(k, (map.get(k) ?? 0) + Number(t.amount))
  }

  const myDailyDelta: number[] = []
  let consecutive = 0
  let stillInStreak = true
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * DAY_MS)
    const k = dayKey(day)
    const mine = myByDay.get(k) ?? 0
    const theirs = partnerByDay.get(k) ?? 0
    myDailyDelta.push(mine)

    // Considera "rojo" cuando ambos hicieron algo en el día y el partner
    // hizo más; si ninguno hizo nada (0 vs 0), corta el streak para no
    // contar días vacíos como "rojo crónico".
    const dayInRed = (mine + theirs) > 0 && mine < theirs
    if (i === 0 || stillInStreak) {
      if (dayInRed) consecutive++
      else stillInStreak = false
    }
  }

  const severity: Severity | null =
    consecutive >= 14 ? 'crit'
    : consecutive >= 7 ? 'warn'
    : consecutive >= 3 ? 'soft'
    : null

  return {
    daysInRed: consecutive,
    severity,
    myDailyDelta,
    partnerName: partner.name,
  }
}
