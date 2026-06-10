// v1.6.1 — Couple lifecycle routes (leave). criticalBucket aplica.

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken } from '../middleware/auth.js'
import { criticalBucket } from '../middleware/rateLimiter.js'
import { coupleLeaveSchema } from '../../../../packages/shared/dist/index.js'
import prisma from '../lib/prisma.js'
import { dissolveCouple } from '../services/coupleLifecycleService.js'
import { telemetryBackend } from '../services/telemetry.js'

const router = Router()
router.use(authenticateToken)

router.post('/leave', criticalBucket, async (req: Request, res: Response) => {
  const userId = req.user.id
  const coupleId = req.user.coupleId

  const parsed = coupleLeaveSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' })

  await dissolveCouple(coupleId)
  void telemetryBackend.track(userId, 'couple.left', {})

  // Frontend usa newCoupleId para renovar token (pasarela: el front re-loguea o
  // pide /auth/me).
  const updated = await prisma.user.findUnique({ where: { id: userId } })
  res.json({ ok: true, newCoupleId: updated?.coupleId })
})

// v2.2.8 — Modo pausa (Claude Design canvas 14). Mientras pausedUntil > now:
// streaks no se incrementan, digest no se manda, dashboard muestra banner.
// El saldo se congela tal cual.
router.post('/pause', async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId
  if (!coupleId) return res.status(401).json({ error: 'Authentication required' })
  const days = Number(req.body?.days)
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return res.status(400).json({ error: 'days debe estar entre 1 y 90' })
  }
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : null
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await prisma.couple.update({
    where: { id: coupleId },
    data: { pausedUntil: until, pausedReason: reason },
  })
  res.json({ ok: true, pausedUntil: until, pausedReason: reason })
})

router.post('/resume', async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId
  if (!coupleId) return res.status(401).json({ error: 'Authentication required' })
  await prisma.couple.update({
    where: { id: coupleId },
    data: { pausedUntil: null, pausedReason: null },
  })
  res.json({ ok: true })
})

router.get('/pause-status', async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId
  if (!coupleId) return res.status(401).json({ error: 'Authentication required' })
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { pausedUntil: true, pausedReason: true },
  })
  const isPaused = couple?.pausedUntil && couple.pausedUntil > new Date()
  res.json({
    isPaused,
    pausedUntil: couple?.pausedUntil ?? null,
    pausedReason: couple?.pausedReason ?? null,
  })
})

export default router
