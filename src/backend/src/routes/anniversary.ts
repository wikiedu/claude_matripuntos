// v2.0.5 — Anniversary timer routes.
// Flag: ANNIVERSARY_ENABLED (default ON).

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'
import { computeAnniversary } from '../services/anniversaryService.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.ANNIVERSARY_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

router.get('/', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    select: { relationshipStartDate: true },
  })
  if (!couple || !couple.relationshipStartDate) {
    return res.json({ anniversary: null })
  }
  const breakdown = computeAnniversary(couple.relationshipStartDate)
  res.json({ anniversary: breakdown })
})

const setSchema = z.object({
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Invalid ISO date'),
})

router.put('/', writeBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = setSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  const startDate = new Date(parsed.data.startDate)
  if (startDate.getTime() > Date.now()) {
    return res.status(400).json({ error: 'La fecha no puede ser futura' })
  }

  const couple = await prisma.couple.update({
    where: { id: coupleId },
    data: { relationshipStartDate: startDate },
    select: { relationshipStartDate: true },
  })
  const breakdown = computeAnniversary(couple.relationshipStartDate!)
  res.json({ anniversary: breakdown })
})

router.delete('/', writeBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  await prisma.couple.update({
    where: { id: coupleId },
    data: { relationshipStartDate: null },
  })
  res.json({ anniversary: null })
})

export default router
