// v2.0.4 — ActivityTemplate routes (catálogo de actividades)
// Flag: CATALOG_ENABLED (default ON).

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket, writeBucket } from '../middleware/rateLimiter.js'
import { activityTemplateService } from '../services/activityTemplateService.js'
import { configurationProposalService } from '../services/configurationProposalService.js'
import prisma from '../lib/prisma.js'

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
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = templateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  const created = await activityTemplateService.create(coupleId, parsed.data as any)

  // v2.1.1: dispara propuesta de puntos para que el partner los apruebe.
  // No-bloqueante (try/catch) — si falla la propuesta el template queda
  // creado igual con pointsApproved=false; el usuario lo verá como pendiente.
  try {
    await configurationProposalService.propose({
      coupleId,
      proposedById: userId,
      field: `activity_template:${created.id}:points`,
      oldValue: '0',
      newValue: String(Number(created.pointsBaseSuggested)),
      rationale: `Puntos sugeridos para la nueva actividad "${created.name}"`,
    })
  } catch (e) {
    console.warn('[v2.1.1] propose template points failed:', e)
  }

  res.status(201).json({ template: created })
})

router.put('/:id', writeBucket, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id as string
  const coupleId = (req as any).user?.coupleId as string | undefined
  if (!coupleId) return res.status(400).json({ error: 'No couple' })

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })

  try {
    const before = await prisma.activityTemplate.findUnique({
      where: { id: req.params.id },
      select: { pointsBaseSuggested: true },
    })
    const updated = await activityTemplateService.update(coupleId, req.params.id, parsed.data)

    // v2.1.1: si los puntos cambiaron, lanzamos propuesta para el partner.
    const oldPoints = before ? Number(before.pointsBaseSuggested) : 0
    const newPoints = Number(updated.pointsBaseSuggested)
    if (oldPoints !== newPoints) {
      try {
        await configurationProposalService.propose({
          coupleId,
          proposedById: userId,
          field: `activity_template:${updated.id}:points`,
          oldValue: String(oldPoints),
          newValue: String(newPoints),
          rationale: `Cambio de puntos sugeridos en "${updated.name}"`,
        })
      } catch (e) {
        console.warn('[v2.1.1] propose template points (update) failed:', e)
      }
    }

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
