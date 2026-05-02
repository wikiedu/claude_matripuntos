// v1.6.1 — Couple lifecycle routes (leave). criticalBucket aplica.

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { authenticateToken } from '../middleware/auth.js'
import { criticalBucket } from '../middleware/rateLimiter.js'
import { coupleLeaveSchema } from '@matripuntos/shared'
import prisma from '../lib/prisma.js'
import { dissolveCouple } from '../services/coupleLifecycleService.js'
import { telemetryBackend } from '../services/telemetry.js'

const router = Router()
router.use(authenticateToken)

router.post('/leave', criticalBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user.id
  const coupleId = (req as any).user.coupleId

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

export default router
