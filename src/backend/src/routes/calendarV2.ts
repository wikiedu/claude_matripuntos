// v2.0.1 — Routes /api/calendar/v2. Feature flag CALENDAR_360_ENABLED.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
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

const entryCreateSchema = z.object({
  type: z.enum(['event', 'task', 'service', 'birthday', 'holiday', 'external', 'manual']),
  title: z.string().min(1).max(280),
  date: z.string(),
  endDate: z.string().nullable().optional(),
  allDay: z.boolean().optional().default(true),
  category: z.string().max(40).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  recurrence: z.string().max(500).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const entryUpdateSchema = entryCreateSchema.partial()

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  types: z.string().optional(),
})

router.get('/entries', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: 'Bad query' })

  const where: any = { coupleId }
  if (parsed.data.from || parsed.data.to) {
    where.date = {}
    if (parsed.data.from) where.date.gte = new Date(parsed.data.from)
    if (parsed.data.to) where.date.lte = new Date(parsed.data.to)
  }
  if (parsed.data.types) {
    where.type = { in: parsed.data.types.split(',').map(s => s.trim()).filter(Boolean) }
  }

  const entries = await prisma.calendarEntry.findMany({
    where,
    orderBy: { date: 'asc' },
    take: 1000,
  })
  res.json({ entries })
})

router.post('/entries', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const parsed = entryCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos', issues: parsed.error.issues })

  const data = parsed.data
  const entry = await prisma.calendarEntry.create({
    data: {
      coupleId,
      type: data.type,
      title: data.title,
      date: new Date(data.date),
      endDate: data.endDate ? new Date(data.endDate) : null,
      allDay: data.allDay ?? true,
      category: data.category ?? null,
      description: data.description ?? null,
      color: data.color ?? null,
      recurrence: data.recurrence ?? null,
      externalSource: 'manual',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  })
  res.status(201).json(entry)
})

router.put('/entries/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const parsed = entryUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const existing = await prisma.calendarEntry.findFirst({ where: { id: req.params.id, coupleId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.externalSource === 'google_calendar') {
    return res.status(403).json({ error: 'Las entries de Google Calendar son read-only' })
  }

  const data: any = { ...parsed.data }
  if (parsed.data.date) data.date = new Date(parsed.data.date)
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
  if (parsed.data.metadata !== undefined) data.metadata = parsed.data.metadata ? JSON.stringify(parsed.data.metadata) : null

  const updated = await prisma.calendarEntry.update({ where: { id: req.params.id }, data })
  res.json(updated)
})

router.delete('/entries/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const existing = await prisma.calendarEntry.findFirst({ where: { id: req.params.id, coupleId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.externalSource === 'google_calendar') {
    return res.status(403).json({ error: 'Las entries de Google Calendar son read-only' })
  }
  await prisma.calendarEntry.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

// Service providers CRUD
const providerSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['limpieza', 'jardineria', 'cuidado_ninos', 'mantenimiento', 'otro']),
  recurrence: z.string().max(500).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
})

router.get('/service-providers', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const list = await prisma.serviceProvider.findMany({ where: { coupleId } })
  res.json({ providers: list })
})

router.post('/service-providers', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const parsed = providerSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
  const created = await prisma.serviceProvider.create({
    data: {
      coupleId,
      name: parsed.data.name,
      type: parsed.data.type,
      recurrence: parsed.data.recurrence ?? null,
      color: parsed.data.color ?? null,
      notes: parsed.data.notes ?? null,
      active: parsed.data.active ?? true,
    },
  })
  res.status(201).json(created)
})

router.put('/service-providers/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const parsed = providerSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
  const existing = await prisma.serviceProvider.findFirst({ where: { id: req.params.id, coupleId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.serviceProvider.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(updated)
})

router.delete('/service-providers/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const existing = await prisma.serviceProvider.findFirst({ where: { id: req.params.id, coupleId } })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.serviceProvider.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
