// v2.0.2 — Journal routes. Feature flag JOURNAL_ENABLED default ON.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { selectPromptForDay, dayKeyUtc } from '../services/journalPromptsService.js'
import { JOURNAL_PROMPTS } from '../data/journalPrompts.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.JOURNAL_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const entryCreateSchema = z.object({
  type: z.enum(['reflection', 'photo', 'voice', 'milestone', 'letter']),
  title: z.string().max(200).nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  shared: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  promptId: z.string().nullable().optional(),
  recipientId: z.string().nullable().optional(),
})

const entryUpdateSchema = entryCreateSchema.partial()

const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
})

router.get('/entries', readBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const entries = await prisma.journalEntry.findMany({
    where: {
      coupleId,
      OR: [
        { authorId: userId },
        { shared: true },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { reactions: true },
  })
  res.json({ entries })
})

router.post('/entries', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = entryCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const data = parsed.data

  // v2.0.3.1 fix S1-1: validar que recipientId pertenece al mismo couple para
  // evitar IDOR (un user enviando journal letter a partner de otro couple).
  if (data.recipientId) {
    const recipient = await prisma.user.findFirst({
      where: { id: data.recipientId, coupleId, deletedAt: null },
      select: { id: true },
    })
    if (!recipient) return res.status(403).json({ error: 'Recipient no pertenece a tu pareja' })
  }

  const entry = await prisma.journalEntry.create({
    data: {
      coupleId,
      authorId: userId,
      type: data.type,
      title: data.title ?? null,
      body: data.body ?? null,
      shared: data.shared ?? false,
      tags: JSON.stringify(data.tags ?? []),
      promptId: data.promptId ?? null,
      recipientId: data.recipientId ?? null,
    },
  })
  res.status(201).json(entry)
})

router.put('/entries/:id', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const existing = await prisma.journalEntry.findFirst({
    where: { id: req.params.id, authorId: userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })

  const parsed = entryUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const data: any = { ...parsed.data }
  if (parsed.data.tags !== undefined) data.tags = JSON.stringify(parsed.data.tags)

  const updated = await prisma.journalEntry.update({ where: { id: req.params.id }, data })
  res.json(updated)
})

router.delete('/entries/:id', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const existing = await prisma.journalEntry.findFirst({
    where: { id: req.params.id, authorId: userId },
  })
  if (!existing) return res.status(404).json({ error: 'Not found' })
  await prisma.journalEntry.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

router.post('/entries/:id/react', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const entry = await prisma.journalEntry.findFirst({ where: { id: req.params.id, coupleId } })
  if (!entry) return res.status(404).json({ error: 'Not found' })
  if (!entry.shared && entry.authorId !== userId) return res.status(403).json({ error: 'Entry no compartida' })

  const parsed = reactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Emoji inválido' })

  const r = await prisma.journalReaction.upsert({
    where: { entryId_userId_emoji: { entryId: entry.id, userId, emoji: parsed.data.emoji } },
    create: { entryId: entry.id, userId, emoji: parsed.data.emoji },
    update: {},
  })
  res.json(r)
})

router.delete('/entries/:id/react', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const emoji = String(req.query.emoji ?? '')
  if (!emoji) return res.status(400).json({ error: 'emoji query param required' })

  await prisma.journalReaction.deleteMany({
    where: { entryId: req.params.id, userId, emoji },
  })
  res.status(204).send()
})

router.get('/prompts/today', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const today = dayKeyUtc(new Date())

  // Recent shown: prompts del couple usados en últimos 30 días.
  const recent = await prisma.journalEntry.findMany({
    where: { coupleId, promptId: { not: null }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
    select: { promptId: true },
    take: 50,
  })
  const recentIds = new Set(recent.map(r => r.promptId).filter(Boolean) as string[])

  const prompt = selectPromptForDay(coupleId, today, recentIds)
  res.json({ prompt })
})

router.get('/retrospectives', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const retros = await prisma.journalRetrospective.findMany({
    where: { coupleId },
    orderBy: { generatedAt: 'desc' },
    take: 12,
  })
  res.json({ retrospectives: retros.map(r => ({ ...r, data: JSON.parse(r.data) })) })
})

router.post('/retrospectives/:id/seen', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: { select: { id: true }, orderBy: { createdAt: 'asc' } } },
  })
  if (!couple) return res.status(404).json({ error: 'Not found' })

  const isUser1 = couple.users[0]?.id === userId
  const update = isUser1 ? { seenByUser1: true } : { seenByUser2: true }
  await prisma.journalRetrospective.update({ where: { id: req.params.id }, data: update })
  res.json({ ok: true })
})

export default router
