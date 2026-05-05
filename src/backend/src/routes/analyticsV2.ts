// v2.0.3 — Routes /api/analytics/v2. Feature flag default ON.
// Carga eventos/transactions/taskLogs/moods con queries CONSISTENTES (mismo
// rango, sin LIMIT) y los pasa a aggregator pure → 0 chance de mismatch.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import {
  countEvents, eventsByDay, eventsByWeek, eventsByMonth, eventsByCategory,
  heatmap24x7, balanceByUser, netBalance, equityCurve, equityBand,
  taskLogStats, moodTimeline, compareCounts, dayKeysBetween,
  type RawEvent, type RawTransaction, type RawTaskLog, type RawMoodLog,
} from '../services/analyticsAggregator.js'
import { generateInsights } from '../services/insightsGenerator.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.ANALYTICS_V2_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

function parseRange(req: Request, defaultDays: number = 30): { from: Date; to: Date } {
  const parsed = rangeSchema.safeParse(req.query)
  const toCandidate = parsed.success && parsed.data.to ? new Date(parsed.data.to) : new Date()
  const fromCandidate = parsed.success && parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(toCandidate.getTime() - defaultDays * 24 * 3600 * 1000)

  // v2.7.1 audit 01 S2-R-7, S2-R-8 — validar dates parseable y from <= to.
  // Si vienen invalid o invertidos, usamos el default (sin error 400 para
  // no romper clientes legacy que pasan params raros).
  const toValid = !isNaN(toCandidate.getTime()) ? toCandidate : new Date()
  const fromValid = !isNaN(fromCandidate.getTime()) ? fromCandidate : new Date(toValid.getTime() - defaultDays * 24 * 3600 * 1000)
  if (fromValid.getTime() > toValid.getTime()) {
    // Invertido — devolvemos default (último N días).
    return {
      from: new Date(toValid.getTime() - defaultDays * 24 * 3600 * 1000),
      to: toValid,
    }
  }
  return { from: fromValid, to: toValid }
}

async function loadCoupleUsers(coupleId: string): Promise<{ user1Id: string; user2Id: string }> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: { select: { id: true }, orderBy: { createdAt: 'asc' } } },
  })
  return {
    user1Id: couple?.users[0]?.id ?? '',
    user2Id: couple?.users[1]?.id ?? '',
  }
}

/** Util — convierte Decimal/string Prisma a number. */
function toNum(x: any): number {
  if (typeof x === 'number') return x
  if (typeof x === 'string') return Number(x)
  if (x?.toNumber) return x.toNumber()
  return Number(x ?? 0)
}

// GET /summary — números agregados consistentes con el resto de endpoints.
router.get('/summary', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const { from, to } = parseRange(req)

  // v2.5.9 audit 01 S1-R-18 — `take` defensivo en findMany de hot-path
  // de analytics. Para el rango por defecto (30-90 días) un couple
  // activo no llega a 5k filas, así que el cap es transparente. En
  // caso de couples extremos protege la memoria del worker Render.
  const [evRows, txRows, lgRows] = await Promise.all([
    prisma.event.findMany({
      where: { coupleId, dateStart: { gte: from, lte: to } },
      select: { id: true, dateStart: true, status: true, type: true, pointsCalculated: true, createdBy: true },
      take: 5000,
    }),
    prisma.pointsTransaction.findMany({
      where: { coupleId, createdAt: { gte: from, lte: to } },
      select: { id: true, amount: true, userId: true, createdAt: true, type: true },
      take: 5000,
    }),
    prisma.taskLog.findMany({
      where: { coupleId, date: { gte: from, lte: to } },
      select: { id: true, status: true, date: true, pointsFinal: true, completedBy: true },
      take: 5000,
    }),
  ])

  const events: RawEvent[] = evRows.map(e => ({
    id: e.id, dateStart: e.dateStart, status: e.status, type: e.type,
    pointsCalculated: toNum(e.pointsCalculated), category: e.type, createdBy: e.createdBy ?? '',
  }))
  const txs: RawTransaction[] = txRows.map(t => ({
    id: t.id, amount: toNum(t.amount), userId: t.userId ?? '', createdAt: t.createdAt, type: t.type,
  }))
  const logs: RawTaskLog[] = lgRows.map(l => ({
    id: l.id, status: l.status, date: l.date, pointsFinal: toNum(l.pointsFinal), completedBy: l.completedBy ?? null,
  }))

  const { user1Id, user2Id } = await loadCoupleUsers(coupleId)

  res.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    events: countEvents(events),
    eventsByDay: eventsByDay(events),
    eventsByWeek: eventsByWeek(events),
    eventsByMonth: eventsByMonth(events),
    eventsByCategory: eventsByCategory(events),
    taskLogs: taskLogStats(logs),
    balanceByUser: balanceByUser(txs),
    netBalance: netBalance(txs, user1Id, user2Id),
    equityBand: equityBand(netBalance(txs, user1Id, user2Id)),
  })
})

// GET /heatmap — 7×24 grid.
router.get('/heatmap', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const { from, to } = parseRange(req, 90)

  const evRows = await prisma.event.findMany({
    where: { coupleId, dateStart: { gte: from, lte: to } },
    select: { id: true, dateStart: true, status: true, type: true, pointsCalculated: true, createdBy: true },
    take: 5000, // v2.5.9 audit 01 S1-R-18
  })
  const events: RawEvent[] = evRows.map(e => ({
    id: e.id, dateStart: e.dateStart, status: e.status, type: e.type,
    pointsCalculated: toNum(e.pointsCalculated), category: e.type, createdBy: e.createdBy ?? '',
  }))
  res.json({ heatmap: heatmap24x7(events), total: events.length })
})

// GET /equity-curve — saldo neto cumulative por día.
router.get('/equity-curve', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const { from, to } = parseRange(req, 90)

  const txRows = await prisma.pointsTransaction.findMany({
    where: { coupleId, createdAt: { gte: from, lte: to } },
    select: { id: true, amount: true, userId: true, createdAt: true, type: true },
    orderBy: { createdAt: 'asc' },
    take: 5000, // v2.5.9 audit 01 S1-R-18
  })
  const txs: RawTransaction[] = txRows.map(t => ({
    id: t.id, amount: toNum(t.amount), userId: t.userId ?? '', createdAt: t.createdAt, type: t.type,
  }))
  const { user1Id, user2Id } = await loadCoupleUsers(coupleId)
  const curve = equityCurve(txs, user1Id, user2Id, from, to)
  res.json({ curve, days: curve.length, lastNet: curve[curve.length - 1]?.net ?? 0 })
})

// GET /mood-timeline
router.get('/mood-timeline', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const { from, to } = parseRange(req, 90)

  const logs = await prisma.moodLog.findMany({
    where: { coupleId, createdAt: { gte: from, lte: to } },
    select: { id: true, moodKey: true, userId: true, createdAt: true },
    take: 5000, // v2.5.9 audit 01 S1-R-18
  })
  const { user1Id, user2Id } = await loadCoupleUsers(coupleId)
  const raw: RawMoodLog[] = logs.map(l => ({ id: l.id, moodKey: l.moodKey, userId: l.userId, createdAt: l.createdAt }))
  res.json({ timeline: moodTimeline(raw, user1Id, user2Id, from, to) })
})

// GET /compare?period=month — current vs previous month.
router.get('/compare', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const period = (req.query.period as string) === 'week' ? 'week' : 'month'
  const days = period === 'week' ? 7 : 30
  const now = new Date()
  const curFrom = new Date(now.getTime() - days * 24 * 3600 * 1000)
  const prevFrom = new Date(now.getTime() - 2 * days * 24 * 3600 * 1000)

  const [curEvents, prevEvents, curLogs, prevLogs] = await Promise.all([
    prisma.event.count({ where: { coupleId, dateStart: { gte: curFrom, lte: now } } }),
    prisma.event.count({ where: { coupleId, dateStart: { gte: prevFrom, lt: curFrom } } }),
    prisma.taskLog.count({ where: { coupleId, date: { gte: curFrom, lte: now } } }),
    prisma.taskLog.count({ where: { coupleId, date: { gte: prevFrom, lt: curFrom } } }),
  ])

  res.json({
    period,
    eventsCompare: compareCounts(curEvents, prevEvents),
    taskLogsCompare: compareCounts(curLogs, prevLogs),
  })
})

// GET /insights — cards rotativas activas (no expiradas).
router.get('/insights', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const now = new Date()

  const cached = await prisma.analyticsInsight.findMany({
    where: { coupleId, validUntil: { gt: now } },
    orderBy: { generatedAt: 'desc' },
    take: 10,
  })

  res.json({
    insights: cached.map(c => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      body: c.body,
      payload: JSON.parse(c.payload),
      trend: c.trend,
      generatedAt: c.generatedAt.toISOString(),
      validUntil: c.validUntil.toISOString(),
    })),
  })
})

// POST /insights/regenerate — fuerza regen para QA + diagnostico.
router.post('/insights/regenerate', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const now = new Date()

  // Cargar datos
  const last30From = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
  const prev30From = new Date(now.getTime() - 60 * 24 * 3600 * 1000)
  // v2.5.9 audit 01 S1-R-18 — añadimos `take: 5000` también en estas
  // queries que antes no tenían cap. Los rangos son acotados (60d) pero
  // un couple muy activo puede ir cerca y esto blinda el endpoint.
  const [evLast, evPrev, lgLast, lgPrev, txAll] = await Promise.all([
    prisma.event.findMany({ where: { coupleId, dateStart: { gte: last30From, lte: now } }, take: 5000 }),
    prisma.event.findMany({ where: { coupleId, dateStart: { gte: prev30From, lt: last30From } }, take: 5000 }),
    prisma.taskLog.findMany({ where: { coupleId, date: { gte: last30From, lte: now } }, take: 5000 }),
    prisma.taskLog.findMany({ where: { coupleId, date: { gte: prev30From, lt: last30From } }, take: 5000 }),
    // v2.5.5 audit 01 — LIMIT defensivo: couples con histórico largo
    // (años) podrían cargar miles de transactions y reventar memoria del
    // worker en Render. Solo necesitamos el rango previo 60d para
    // analytics, así que filtramos.
    prisma.pointsTransaction.findMany({
      where: { coupleId, createdAt: { gte: prev30From } },
      take: 5000,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const mapEvent = (e: any): RawEvent => ({
    id: e.id, dateStart: e.dateStart, status: e.status, type: e.type,
    pointsCalculated: toNum(e.pointsCalculated), category: e.type ?? null, createdBy: e.createdBy ?? '',
  })
  const mapLog = (l: any): RawTaskLog => ({
    id: l.id, status: l.status, date: l.date, pointsFinal: toNum(l.pointsFinal), completedBy: l.completedBy ?? null,
  })
  const mapTx = (t: any): RawTransaction => ({
    id: t.id, amount: toNum(t.amount), userId: t.userId ?? '', createdAt: t.createdAt, type: t.type,
  })

  const { user1Id, user2Id } = await loadCoupleUsers(coupleId)

  const drafts = generateInsights({
    events: evLast.map(mapEvent),
    transactions: txAll.map(mapTx),
    taskLogs: lgLast.map(mapLog),
    user1Id, user2Id, now,
    eventsLast30: evLast.map(mapEvent),
    eventsPrev30: evPrev.map(mapEvent),
    taskLogsLast30: lgLast.map(mapLog),
    taskLogsPrev30: lgPrev.map(mapLog),
  })

  // Limpiar viejas + insertar nuevas (transacción).
  await prisma.$transaction(async (tx) => {
    await tx.analyticsInsight.deleteMany({ where: { coupleId } })
    for (const d of drafts) {
      await tx.analyticsInsight.create({
        data: {
          coupleId,
          kind: d.kind,
          title: d.title,
          body: d.body,
          payload: JSON.stringify(d.payload),
          trend: d.trend,
          validUntil: new Date(now.getTime() + d.validForHours * 3600 * 1000),
        },
      })
    }
  })

  res.json({ regenerated: drafts.length })
})

// POST /insights/:id/seen
router.post('/insights/:id/seen', readBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  // v2.7.1 audit 01 S2-R-20 — IDOR fix. Antes hacíamos `update` por id
  // sin verificar pertenencia al couple. updateMany con WHERE compuesto
  // (id + coupleId) hace que un id ajeno devuelva count=0 → 404, sin
  // mutar nada en otra couple.
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: { select: { id: true }, orderBy: { createdAt: 'asc' } } },
  })
  if (!couple) return res.status(404).json({ error: 'Not found' })

  const isUser1 = couple.users[0]?.id === userId
  const update = isUser1 ? { seenByUser1: true } : { seenByUser2: true }
  const result = await prisma.analyticsInsight.updateMany({
    where: { id: req.params.id, coupleId },
    data: update,
  })
  if (result.count === 0) return res.status(404).json({ error: 'Insight not found' })
  res.json({ ok: true })
})

export default router
