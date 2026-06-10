// v1.7 — Routes web push: subscribe, unsubscribe, send-test. Auth required.
// Feature flag GAMIFICATION_V2_ENABLED gate (incluye gamification + push).

import { Router, Request, Response } from 'express'
import { requireAuth } from '../lib/requireAuth.js'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { writeBucket, readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { sendPushToSubscription, getPublicVapidKey } from '../services/webPushService.js'

const router = Router()
router.use(authenticateToken)

// v2.0.x — default ON. Solo se desactiva con env var = 'false'.
function isFlagEnabled(): boolean {
  return process.env.GAMIFICATION_V2_ENABLED !== 'false'
}

router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(200),
  }),
  userAgent: z.string().max(500).optional(),
})

// GET /api/notifications/push/vapid-key — pública pero ofrecida vía API
// para que el frontend la cargue dinámicamente.
router.get('/vapid-key', readBucket, (_req: Request, res: Response) => {
  const key = getPublicVapidKey()
  if (!key) return res.status(503).json({ error: 'Push not configured' })
  res.json({ publicKey: key })
})

// POST /api/notifications/push/subscribe
router.post('/subscribe', writeBucket, async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId
  const coupleId = requireAuth(req).coupleId
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = subscribeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const { endpoint, keys, userAgent } = parsed.data
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, coupleId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId, coupleId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  })

  res.json({ ok: true })
})

// POST /api/notifications/push/unsubscribe
router.post('/unsubscribe', writeBucket, async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId
  const coupleId = requireAuth(req).coupleId
  const endpointSchema = z.object({ endpoint: z.string().url().max(2000) })
  const parsed = endpointSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  // v2.0.3.1 fix S1-2: incluir coupleId en where para que un user no pueda
  // borrar push subscriptions del partner si conoce su endpoint.
  await prisma.pushSubscription.deleteMany({
    where: { userId, coupleId, endpoint: parsed.data.endpoint },
  })
  res.json({ ok: true })
})

// POST /api/notifications/push/test — envía un push de prueba al user actual.
router.post('/test', writeBucket, async (req: Request, res: Response) => {
  const userId = requireAuth(req).userId
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return res.status(404).json({ error: 'Sin suscripciones' })

  // audit §4 #7 — antes los envíos eran secuenciales (for await). Ahora en
  // paralelo: cada device es independiente y la latencia de red dominaba.
  const settled = await Promise.all(
    subs.map(async (sub) => {
      const r = await sendPushToSubscription(sub, {
        title: 'Notificación de prueba',
        body: 'Si ves esto, las notificaciones funcionan ✅',
        url: '/dashboard',
      })
      return { endpoint: sub.endpoint, ok: r.ok, statusCode: r.statusCode }
    }),
  )
  const results = settled
  const expired = settled
    .filter((r) => r.statusCode === 410 || r.statusCode === 404)
    .map((r) => r.endpoint)
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } })
  }
  res.json({ sent: results.length, expired: expired.length, results })
})

export default router
