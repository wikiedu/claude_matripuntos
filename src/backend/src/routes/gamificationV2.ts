// v1.7 — Routes de gamification v2. Todas requieren auth + readBucket.
// Si feature flag GAMIFICATION_V2_ENABLED=false, devolvemos 404 → frontend
// renderiza vista pre-v1.7. El v1.2 routes/gamification.ts se mantiene
// intacto para legacy compat.

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { computeLevel, xpToNext } from '../services/levelService.js'
import { computeAvailableReplays } from '../services/replayService.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.GAMIFICATION_V2_ENABLED === 'true'
}

router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

// GET /api/gamification-v2/level
router.get('/level', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const row = await prisma.coupleLevel.findUnique({ where: { coupleId } })
  const xp = row?.xp ?? 0
  const info = computeLevel(xp)
  res.json({
    xp,
    level: info.level,
    name: info.name,
    perks: info.perks,
    threshold: info.threshold,
    nextThreshold: info.nextThreshold,
    xpToNext: xpToNext(xp),
  })
})

// GET /api/gamification-v2/streak
router.get('/streak', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
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
  const coupleId = (req as any).user?.coupleId as string | undefined
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
      config: JSON.parse(challenge.config),
    },
  })
})

// GET /api/gamification-v2/replay
router.get('/replay', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
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

// POST /api/gamification-v2/replay/:key/seen
router.post('/replay/:key/seen', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const replayKey = req.params.key

  await prisma.coupleReplaySeen.upsert({
    where: { coupleId_replayKey: { coupleId, replayKey } },
    create: { coupleId, replayKey },
    update: { seenAt: new Date() },
  })
  res.json({ ok: true })
})

export default router
