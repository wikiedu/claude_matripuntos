// v1.6.1 — Cron diario que aplica retención por tipo de dato:
//  - MoodLog > 90d → DELETE
//  - Notification > 60d → DELETE
//  - Invitation pending > 14d tras expiresAt → DELETE
//  - User soft-deleted > 30d → hard purge
//
// Modo dry-run las primeras 2 ejecuciones en producción para validar antes
// de borrar real (gestionado por el scheduler).

import prisma from '../lib/prisma.js'

export interface RetentionResult {
  moodLog: number
  notification: number
  invitation: number
  userPurged: number
}

export async function runRetention(opts: { dryRun: boolean } = { dryRun: false }): Promise<RetentionResult> {
  const now = Date.now()
  const moodCutoff = new Date(now - 90 * 86400000)
  const notifCutoff = new Date(now - 60 * 86400000)
  const inviteCutoff = new Date(now - 14 * 86400000)
  // v1.6.2 fix S1-2: usamos 31d para añadir 24h de margen y evitar borrado
  // en el segundo exacto que cumplen 30d (off-by-one con `lt`).
  const userPurgeCutoff = new Date(now - 31 * 86400000)

  if (opts.dryRun) {
    const [moodLog, notification, invitation, userPurged] = await Promise.all([
      prisma.moodLog.count({ where: { createdAt: { lt: moodCutoff } } }),
      prisma.notification.count({ where: { createdAt: { lt: notifCutoff } } }),
      prisma.invitation.count({ where: { status: 'pending', expiresAt: { lt: inviteCutoff } } }),
      prisma.user.count({ where: { deletedAt: { lt: userPurgeCutoff } } }),
    ])
    console.log('[retention DRY-RUN]', { moodLog, notification, invitation, userPurged })
    return { moodLog, notification, invitation, userPurged }
  }

  const moodLog = (await prisma.moodLog.deleteMany({ where: { createdAt: { lt: moodCutoff } } })).count
  const notification = (await prisma.notification.deleteMany({ where: { createdAt: { lt: notifCutoff } } })).count
  const invitation = (await prisma.invitation.deleteMany({ where: { status: 'pending', expiresAt: { lt: inviteCutoff } } })).count
  const userPurged = (await prisma.user.deleteMany({ where: { deletedAt: { lt: userPurgeCutoff } } })).count

  console.log('[retention]', { moodLog, notification, invitation, userPurged })
  return { moodLog, notification, invitation, userPurged }
}
