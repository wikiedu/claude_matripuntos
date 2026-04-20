import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { optionalAuthMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

const interestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Demasiadas peticiones. Inténtalo en 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const interestSchema = z.object({
  email: z.string().email('Email no válido').max(200),
  source: z.enum(['analytics_advanced_overlay', 'settings_premium_cta', 'onboarding']),
})

router.post(
  '/interest',
  interestLimiter,
  optionalAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = interestSchema.safeParse(req.body)
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.errors[0]?.message ?? 'Datos no válidos' })
      return
    }

    const { email, source } = parsed.data
    const userId = req.userId ?? null
    const coupleId = req.coupleId ?? null

    try {
      const existing = await prisma.premiumInterest.findFirst({
        where: { email, source },
      })
      if (existing) {
        res.status(409).json({ error: 'Ya estás apuntada/o 💕' })
        return
      }

      const created = await prisma.premiumInterest.create({
        data: { email, source, userId, coupleId },
      })

      res.status(201).json({ id: created.id, message: '¡Listo! Te avisaremos 💕' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      res.status(500).json({ error: msg })
    }
  }
)

export default router
