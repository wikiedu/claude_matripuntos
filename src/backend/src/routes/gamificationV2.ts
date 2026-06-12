// v1.7 — Routes de gamification v2. Todas requieren auth + readBucket.
// v2.1.0 — el endpoint /level ahora consulta el sistema unificado
// (gamificationService.LEVELS) en vez del retirado levelService/levelTable.
// Streak/challenge/replay se mantienen igual.

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { parseJsonField } from '../lib/jsonField.js'
import { LEVELS, getLevelInfo } from '../services/gamificationService.js'
import { computeAvailableReplays } from '../services/replayService.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.GAMIFICATION_V2_ENABLED !== 'false'
}

router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

// GET /api/gamification-v2/level
// v2.1.0 — devuelve el nivel del sistema unificado de 10 niveles
// (Encuentro/Confianza/...). Ya no usa CoupleLevel separado: lee Couple.xp.
router.get('/level', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { xp: true },
  })
  const xp = couple?.xp ?? 0
  const info = getLevelInfo(xp)
  const ordinal = LEVELS.findIndex((l) => l.level === info.current.level) + 1
  res.json({
    xp,
    level: info.current.level,
    levelOrdinal: ordinal,
    name: info.current.name,
    emoji: info.current.emoji,
    threshold: info.current.minXp,
    nextThreshold: info.next.minXp,
    xpToNext: info.xpToNext,
    progressPct: info.xpProgress,
  })
})

// GET /api/gamification-v2/streak
router.get('/streak', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const row = await prisma.coupleStreak.findUnique({ where: { coupleId } })
  res.json({
    daily: row?.dailyStreak ?? 0,
    weekly: row?.weeklyStreak ?? 0,
    longestDaily: row?.longestDaily ?? 0,
    longestWeekly: row?.longestWeekly ?? 0,
    lastActivityAt: row?.lastActivityAt ?? null,
  })
})

// GET /api/gamification-v2/challenge
router.get('/challenge', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const challenge = await prisma.coupleChallenge.findFirst({
    where: { coupleId, status: 'active' },
    orderBy: { weekStart: 'desc' },
  })
  if (!challenge) return res.json({ challenge: null })

  res.json({
    challenge: {
      id: challenge.id,
      type: challenge.type,
      progress: challenge.progress,
      goal: challenge.goal,
      rewardXp: challenge.rewardXp,
      weekStart: challenge.weekStart,
      config: parseJsonField(challenge.config, {}),
    },
  })
})

// GET /api/gamification-v2/replay
router.get('/replay', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const todayUtc = new Date()
  const events = await prisma.event.findMany({
    where: { coupleId },
    select: { id: true, dateStart: true, pointsCalculated: true, type: true },
    orderBy: { dateStart: 'desc' },
    take: 500,
  })
  const txs = await prisma.pointsTransaction.findMany({
    where: { coupleId },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const replays = computeAvailableReplays({
    todayUtc,
    events: events.map(e => ({ ...e, pointsCalculated: Number(e.pointsCalculated) })),
    pointsTransactions: txs.map(t => ({ amount: Number(t.amount), createdAt: t.createdAt })),
  })

  const seenRows = await prisma.coupleReplaySeen.findMany({
    where: { coupleId, replayKey: { in: replays.map(r => r.key) } },
    select: { replayKey: true },
  })
  const seenSet = new Set(seenRows.map(r => r.replayKey))
  const fresh = replays.filter(r => !seenSet.has(r.key))

  res.json({ replays: fresh })
})

// v2.7.1 audit 01 S2-R-21 — replayKey debe ajustarse a un formato
// canónico (slug + opcional sufijo numérico). Antes el path param se
// aceptaba sin validar, lo que permitía a un user crear infinitas
// filas en CoupleReplaySeen con keys arbitrarias (DoS minor).
const REPLAY_KEY_RE = /^[a-z0-9_-]{1,40}$/

router.post('/replay/:key/seen', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const replayKey = req.params.key

  if (!REPLAY_KEY_RE.test(replayKey)) {
    return res.status(400).json({ error: 'replayKey con formato inválido' })
  }

  await prisma.coupleReplaySeen.upsert({
    where: { coupleId_replayKey: { coupleId, replayKey } },
    create: { coupleId, replayKey },
    update: { seenAt: new Date() },
  })
  res.json({ ok: true })
})

export default router
