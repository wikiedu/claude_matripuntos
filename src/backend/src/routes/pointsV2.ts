import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { authenticateToken } from '../middleware/auth.js'
import { pointsCalculator } from '../services/pointsCalculator.js'

const router = Router()
import prisma from '../lib/prisma.js'

// Middleware to ensure user is authenticated
router.use(authenticateToken)

// Audit v1.4 P0-B: stateless preview — lets the UI show a live breakdown
// without pre-persisting a draft event and without shipping a duplicate
// formula to the frontend. This is the single source of truth for what
// the user will see on the created event.
const previewSchema = z.object({
  type: z.string().min(1).max(100),
  dateStart: z.string().datetime(),
  dateEnd: z.string().datetime(),
  pointsBase: z.number().positive().max(500),
  hasChildren: z.boolean().optional().default(false),
  numChildren: z.number().int().min(0).max(10).optional().default(0),
})

router.post('/preview', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const data = previewSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user?.coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const virtualEvent = {
      coupleId: user.coupleId,
      type: data.type,
      dateStart: new Date(data.dateStart),
      dateEnd: new Date(data.dateEnd),
      hasChildren: data.hasChildren,
      numChildren: data.numChildren,
      pointsBase: new Decimal(data.pointsBase),
    } as any
    const breakdown = await pointsCalculator.getCalculationBreakdown(virtualEvent, user)
    res.json({ breakdown })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors })
    }
    console.error('Error previewing points:', error)
    res.status(500).json({ error: 'Failed to preview points' })
  }
})

/**
 * Get points calculation breakdown for an event
 * POST /api/points/calculate
 *
 * This helps users understand how points are calculated with the new V2 formula
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { eventId } = req.body

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Verify user has access
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.coupleId !== event.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Get creator user
    const creator = event.createdBy
      ? await prisma.user.findUnique({ where: { id: event.createdBy } })
      : user

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    // Get breakdown
    const breakdown = await pointsCalculator.getCalculationBreakdown(event, creator)

    res.json({
      eventId: event.id,
      type: event.type,
      title: event.title,
      dateStart: event.dateStart,
      breakdown,
    })
  } catch (error) {
    console.error('Error calculating points:', error)
    res.status(500).json({ error: 'Failed to calculate points' })
  }
})

/**
 * Recalculate event points with new formula
 * POST /api/points/recalculate/:eventId
 */
router.post('/recalculate/:eventId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const coupleId = (req as any).user?.coupleId as string | undefined
    const { eventId } = req.params

    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // v2.5.9 audit 01 S1-R-3 — antes el partner podía recalcular un evento
    // ya `accepted/forced` y sobrescribir `pointsCalculated` post-acuerdo.
    // Ahora restringimos a (a) draft y (b) creator, manteniendo la
    // utilidad legítima (preview en el formulario de edición).
    const event = await prisma.event.findFirst({
      where: { id: eventId, coupleId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (event.status !== 'draft') {
      return res.status(409).json({
        error: 'Solo se puede recalcular un evento en estado draft',
      })
    }

    if (event.createdBy && event.createdBy !== userId) {
      return res.status(403).json({ error: 'Solo el creador puede recalcular el evento' })
    }

    // Get creator (puede haber sido borrado — fallback al user actual).
    const creator = event.createdBy
      ? await prisma.user.findUnique({ where: { id: event.createdBy } })
      : await prisma.user.findUnique({ where: { id: userId } })

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    const newPoints = await pointsCalculator.calculateEventPoints(event, creator)

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        pointsCalculated: newPoints,
      },
    })

    res.json({
      message: 'Points recalculated',
      oldPoints: event.pointsCalculated,
      newPoints: updated.pointsCalculated,
      event: updated,
    })
  } catch (error) {
    console.error('Error recalculating points:', error)
    res.status(500).json({ error: 'Failed to recalculate points' })
  }
})

/**
 * Get category base points
 * GET /api/points/category/:categoryId
 */
router.get('/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { categoryId } = req.params

    // Get category
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subcategories: true,
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Verify user has access
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.coupleId !== category.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    res.json({
      category: category.name,
      type: category.type,
      basePoints: category.basePoints,
      description: category.description,
      subcategories: category.subcategories.map((sub: any) => ({
        name: sub.name,
        modifier: sub.basePointsModifier,
        note: sub.basePointsModifier > 0
          ? `+${sub.basePointsModifier} puntos`
          : `${sub.basePointsModifier} puntos`,
      })),
      info: {
        multiplied_by: '15+ multiplicadores (hora, día, trabajo, hijos, etc)',
        max_points: '500 puntos por evento',
        formula: 'basePoints × multiplicadores = puntos finales',
      },
    })
  } catch (error) {
    console.error('Error fetching category points:', error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

export default router
