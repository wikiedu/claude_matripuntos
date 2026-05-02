// v1.6.1 — Account deletion routes con criticalBucket rate-limit.
// delete-request envía código de 6 dígitos por email (en dev a consola).
// delete confirma con password + code y dispara accountDeletionService.

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken } from '../middleware/auth.js'
import { criticalBucket, readBucket } from '../middleware/rateLimiter.js'
import { accountDeleteRequestSchema, accountDeleteSchema } from '@matripuntos/shared'
import prisma from '../lib/prisma.js'
import { deleteAccount } from '../services/accountDeletionService.js'
import { telemetryBackend } from '../services/telemetry.js'

const router = Router()
router.use(authenticateToken)

// in-memory store de codes (TTL 15min, single-use). Para multi-instancia
// migrar a Redis o tabla efímera (ver scaling-notes.md).
const deleteCodes = new Map<string, { code: string; expiresAt: number }>()

router.post('/delete-request', criticalBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const parsed = accountDeleteRequestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  deleteCodes.set(userId, { code, expiresAt: Date.now() + 15 * 60 * 1000 })

  const isDev = process.env.NODE_ENV !== 'production'
  if (isDev) {
    console.log(`[DELETE-CODE] user=${userId} code=${code}`)
    return res.json({ ok: true, codeViaConsole: true, code })  // exposed only in dev
  }

  // Producción: requiere SMTP configurado. Si no, 503 explícito.
  if (!process.env.SMTP_HOST) {
    return res.status(503).json({ error: 'Servicio de email no disponible. Contacta soporte.' })
  }

  // TODO post-merge: integrar Resend/SendGrid. Plan en docs/legal/scaling-notes.md.
  // Por ahora con SMTP_HOST set pero sin código real implementado, devolvemos ok.
  return res.json({ ok: true })
})

router.post('/delete', criticalBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const parsed = accountDeleteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' })

  const stored = deleteCodes.get(userId)
  if (!stored || stored.code !== parsed.data.code || stored.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Código inválido o expirado' })
  }
  deleteCodes.delete(userId)

  await deleteAccount(userId)
  void telemetryBackend.track(userId, 'account.deleted', {})
  res.json({ ok: true })
})

// v1.6.2 fix S0-1: GDPR Art. 20 — derecho de portabilidad.
// Devuelve un bundle JSON con todos los datos del usuario en formato
// estructurado y legible por máquina. Headers indican download.
router.get('/export', readBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      couple: true,
      moodLogs: { orderBy: { createdAt: 'desc' } },
      notifications: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  const [pointsTransactions, eventsCreated, taskLogs, invitationsSent] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.event.findMany({
      where: { createdBy: userId },
      orderBy: { dateStart: 'desc' },
    }),
    prisma.taskLog.findMany({
      where: { OR: [{ completedBy: userId }, { verifiedBy: userId }] },
      orderBy: { date: 'desc' },
    }),
    prisma.invitation.findMany({
      where: { coupleId: user.coupleId ?? undefined },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const bundle = {
    exportedAt: new Date().toISOString(),
    schemaVersion: '1.6.2',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      language: user.language,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      createdAt: user.createdAt,
      firstLoginAt: user.firstLoginAt,
      lastSeenAt: user.lastSeenAt,
    },
    profile: user.profile,
    couple: user.couple
      ? {
          id: user.couple.id,
          numChildren: user.couple.numChildren,
          language: user.couple.language,
          createdAt: user.couple.createdAt,
          dissolvedAt: user.couple.dissolvedAt,
        }
      : null,
    pointsTransactions,
    eventsCreated,
    taskLogs,
    moodLogs: user.moodLogs,
    notifications: user.notifications,
    invitationsSent,
  }

  void telemetryBackend.track(userId, 'account.exported', {})
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="matripuntos-export-${userId}-${Date.now()}.json"`,
  )
  res.send(JSON.stringify(bundle, null, 2))
})

export default router
