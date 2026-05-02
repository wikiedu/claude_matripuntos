// v2.0.4 — ActivityTemplate routes (catálogo de actividades)
// Flag: CATALOG_ENABLED (default ON).

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import { activityTemplateService } from '../services/activityTemplateService.js'

const router = Router()
router.use(authenticateToken)

function isFlagEnabled(): boolean {
  return process.env.CATALOG_ENABLED !== 'false'
}
router.use((_req, res, next) => {
  if (!isFlagEnabled()) return res.status(404).json({ error: 'Not found' })
  next()
})

const templateSchema = z.object({
  category: z.string().min(1).max(40),
  subcategory: z.string().max(40).nullable().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  pointsBaseSuggested: z.number().min(0).max(500),
  defaultDurationMinutes: z.number().int().min(0).max(60 * 24 * 14).nullable().optional(),
  defaultImpact: z.enum(['necessary', 'health', 'leisure', 'high']).nullable().optional(),
  emoji: z.string().max(8).nullable().optional(),
})

const updateSchema = templateSchema.partial()

router.get('/', readBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  const grouped = (req.query.grouped ?? 'false') === 'true'
  if (grouped) {
    const data = await activityTemplateService.groupedForCouple(coupleId)
    return res.json({ groups: data })
  }
  const items = await activityTemplateService.listForCouple(coupleId)
  res.json({ templates: items })
})

router.post('/', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  const created = await activityTemplateService.create(coupleId, parsed.data as any)
  res.status(201).json({ template: created })
})

router.put('/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  try {
    const updated = await activityTemplateService.update(coupleId, req.params.id, parsed.data)
    res.json({ template: updated })
  } catch (e: any) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
    throw e
  }
})

router.delete('/:id', writeBucket, async (req: Request, res: Response) => {
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })
  try {
    await activityTemplateService.deactivate(coupleId, req.params.id)
    res.status(204).end()
  } catch (e: any) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
    throw e
  }
})

router.post('/:id/use', writeBucket, async (req: Request, res: Response) => {
  // Llamado por el frontend al crear un evento desde un template para
  // alimentar la lista personalizada. No bloqueante: si falla, no afecta
  // a la creación del evento real.
  try {
    const updated = await activityTemplateService.recordUse(req.params.id)
    res.json({ template: updated })
  } catch {
    res.json({ ok: false })
  }
})

export default router
