// v2.2.5 — Notification digest scheduler (cierra canvas 10).
//
// Cron cada minuto: detecta users cuyo `digestHour` matchea la hora local
// actual en su `timezone`, agrega sus notifs `isRead=false` del último día y
// les manda 1 sola push consolidada.
//
// Filosofía del handoff: 1 noti/día con totales y lo importante; nunca dos
// notifs seguidas en <5 min. Los tiers `digest` se acumulan aquí en lugar de
// llegar al momento.

import prisma from '../lib/prisma.js'
import { parsePreferences, NotificationPreferences } from './notificationPreferencesService.js'
import { sendPushToSubscription } from './webPushService.js'

interface DigestUser {
  id: string
  name: string
  email: string
  timezone: string
  prefs: NotificationPreferences
}

function currentHourMinute(timezone: string, now: Date = new Date()): string {
  // Devuelve "HH:MM" en la timezone del user. Defensivo si tz inválida → UTC.
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now)
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now)
  }
}

export async function runDigestForCurrentMinute(now: Date = new Date()): Promise<{
  matched: number
  sent: number
  skipped: number
}> {
  // Cargamos users con notificationsPush=true. notificationPreferences es un
  // string JSON, parseamos en memoria.
  const users = await prisma.user.findMany({
    where: { notificationsPush: true },
    select: {
      id: true,
      name: true,
      email: true,
      timezone: true,
      notificationPreferences: true,
    },
  })

  let matched = 0
  let sent = 0
  let skipped = 0

  for (const u of users) {
    const prefs = parsePreferences(u.notificationPreferences)
    if (!prefs.digestEnabled) continue
    const tz = u.timezone || 'Europe/Madrid'
    const hm = currentHourMinute(tz, now)
    if (hm !== prefs.digestHour) continue

    matched++
    try {
      const payload = await buildDigestPayload({
        id: u.id, name: u.name, email: u.email, timezone: tz, prefs,
      })
      if (!payload) {
        skipped++
        continue
      }
      const subs = await prisma.pushSubscription.findMany({ where: { userId: u.id } })
      if (subs.length === 0) {
        skipped++
        continue
      }
      let anyOk = false
      for (const sub of subs) {
        const result = await sendPushToSubscription(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        )
        if (result.ok) anyOk = true
        else if (result.statusCode === 410 || result.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        }
      }
      if (anyOk) sent++
      else skipped++
    } catch (err) {
      console.error(`[digest] user ${u.id} failed:`, err)
      skipped++
    }
  }

  if (matched > 0) {
    console.log(`[digest] matched=${matched} sent=${sent} skipped=${skipped}`)
  }
  return { matched, sent, skipped }
}

/**
 * Construye el payload del digest. Devuelve null si no hay nada relevante
 * que reportar (cero actividad → no spameamos).
 */
async function buildDigestPayload(user: DigestUser): Promise<
  | { title: string; body: string; url: string; tag: string }
  | null
> {
  // Ventana del día local: medianoche en su tz hasta ahora.
  const now = new Date()
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const couple = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coupleId: true },
  })
  if (!couple?.coupleId) return null

  // Notifs unread del user en el último día
  const unread = await prisma.notification.count({
    where: {
      userId: user.id,
      isRead: false,
      createdAt: { gte: dayStart },
    },
  })

  // Saldo del día: suma de transactions de hoy del user
  const txAgg = await prisma.pointsTransaction.aggregate({
    where: { userId: user.id, createdAt: { gte: dayStart } },
    _sum: { amount: true },
  })
  const myDelta = txAgg._sum.amount?.toNumber() ?? 0

  // Saldo del partner del día
  const partner = await prisma.user.findFirst({
    where: { coupleId: couple.coupleId, NOT: { id: user.id } },
    select: { id: true, name: true },
  })
  let partnerDelta = 0
  if (partner) {
    const pAgg = await prisma.pointsTransaction.aggregate({
      where: { userId: partner.id, createdAt: { gte: dayStart } },
      _sum: { amount: true },
    })
    partnerDelta = pAgg._sum.amount?.toNumber() ?? 0
  }

  // Si nada se movió y no hay unread, no spameamos.
  if (unread === 0 && myDelta === 0 && partnerDelta === 0) return null

  // Body conciso siguiendo el handoff: "Resumen del día — Tú +4.5 · Blanca +2"
  const myStr = `${myDelta >= 0 ? '+' : ''}${myDelta.toFixed(1)}`
  const parts: string[] = []
  parts.push(`Tú ${myStr}`)
  if (partner) {
    const partnerStr = `${partnerDelta >= 0 ? '+' : ''}${partnerDelta.toFixed(1)}`
    parts.push(`${partner.name} ${partnerStr}`)
  }
  let body = parts.join(' · ')
  if (unread > 0) {
    body += ` · ${unread} ${unread === 1 ? 'aviso' : 'avisos'} en la app`
  }

  return {
    title: 'Resumen del día',
    body,
    url: '/dashboard',
    tag: 'daily-digest',
  }
}
