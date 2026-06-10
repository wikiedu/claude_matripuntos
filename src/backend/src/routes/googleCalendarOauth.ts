// v2.0.1 — Google Calendar OAuth read-only flow. Feature flag CALENDAR_360_ENABLED.
// Esqueleto de routes — la integración real con googleapis SDK se completa en
// hotfix v2.0.1.x con env vars GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET.

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'

const router = Router()
router.use(authenticateToken)

// v2.0.x — default ON. Solo se desactiva con env var = 'false'.
function isFlagEnabled(): boolean {
  return process.env.CALENDAR_360_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

// GET /api/calendar/google/status — devuelve si el user está conectado.
router.get('/status', readBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined
  if (!userId) return res.status(400).json({ error: 'No user' })
  const sync = await prisma.googleCalendarSync.findUnique({ where: { userId } })
  res.json({
    connected: !!sync,
    syncEnabled: sync?.syncEnabled ?? false,
    lastSyncedAt: sync?.lastSyncedAt ?? null,
    syncWindow: sync?.syncWindow ?? 90,
    filters: sync?.filters ? JSON.parse(sync.filters) : [],
  })
})

// GET /api/calendar/google/auth — devuelve URL de OAuth a Google.
// Esqueleto: cliente real con `googleapis` se añade en v2.0.1.x.
router.get('/auth', readBucket, async (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const redirect = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !redirect) {
    return res.status(503).json({ error: 'Google OAuth no configurado' })
  }
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')
  const url = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code&scope=${scope}&access_type=offline&prompt=consent`
  res.json({ url })
})

// POST /api/calendar/google/callback — intercambia code → tokens. Stub.
router.post('/callback', writeBucket, async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Pendiente integración googleapis (v2.0.1.x)' })
})

// POST /api/calendar/google/sync — trigger manual. Stub.
router.post('/sync', writeBucket, async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Pendiente integración googleapis (v2.0.1.x)' })
})

// DELETE /api/calendar/google/disconnect — borra sync row.
router.delete('/disconnect', writeBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string | undefined
  if (!userId) return res.status(400).json({ error: 'No user' })
  await prisma.googleCalendarSync.deleteMany({ where: { userId } })
  // Opcional: borrar entries externas. Por ahora dejamos las que ya están.
  res.json({ ok: true })
})

export default router
