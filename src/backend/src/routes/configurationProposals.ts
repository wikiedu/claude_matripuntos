// v2.0.4 — Configuration proposal routes (cambios de config consensuados)
// Flag: CONFIG_PROPOSALS_ENABLED (default ON).

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import { configurationProposalService } from '../services/configurationProposalService.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.CONFIG_PROPOSALS_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const proposeSchema = z.object({
  field: z.string().min(1).max(120),
  oldValue: z.string().max(2000),
  newValue: z.string().max(2000),
  rationale: z.string().max(500).nullable().optional(),
  expiryDays: z.number().int().min(1).max(30).optional(),
})

router.get('/', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const active = await configurationProposalService.listActive(coupleId)
  res.json({ proposals: active })
})

router.get('/history', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const history = await configurationProposalService.listHistory(coupleId)
  res.json({ proposals: history })
})

router.get('/changelog', readBucket, async (req: Request, res: Response) => {
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const log = await configurationProposalService.listChangeLog(coupleId)
  res.json({ entries: log })
})

router.post('/', writeBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = proposeSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  try {
    const created = await configurationProposalService.propose({
      coupleId,
      proposedById: userId,
      ...(parsed.data as any),
    })
    res.status(201).json({ proposal: created })
  } catch (e: any) {
    if (e.code === 'DUPLICATE_PROPOSAL') return res.status(409).json({ error: e.message })
    throw e
  }
})

router.post('/:id/accept', writeBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  try {
    const result = await configurationProposalService.accept(coupleId, req.params.id, userId)
    res.json({ proposal: result })
  } catch (e: any) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
    if (e.code === 'NOT_ACTIVE') return res.status(409).json({ error: e.message })
    if (e.code === 'SELF_ACCEPT') return res.status(403).json({ error: e.message })
    if (e.code === 'EXPIRED') return res.status(410).json({ error: e.message })
    throw e
  }
})

router.post('/:id/reject', writeBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  try {
    const result = await configurationProposalService.reject(coupleId, req.params.id, userId)
    res.json({ proposal: result })
  } catch (e: any) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
    if (e.code === 'NOT_ACTIVE') return res.status(409).json({ error: e.message })
    if (e.code === 'SELF_REJECT') return res.status(403).json({ error: e.message })
    throw e
  }
})

router.post('/:id/cancel', writeBucket, async (req: Request, res: Response) => {
  const userId = req.user?.id as string
  const coupleId = req.user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  try {
    const result = await configurationProposalService.cancel(coupleId, req.params.id, userId)
    res.json({ proposal: result })
  } catch (e: any) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
    if (e.code === 'NOT_OWNER') return res.status(403).json({ error: e.message })
    throw e
  }
})

export default router
