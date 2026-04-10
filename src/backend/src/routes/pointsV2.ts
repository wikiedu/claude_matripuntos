import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { pointsCalculator } from '../services/pointsCalculator.js'

const router = Router()
import prisma from '../lib/prisma.js'

// Middleware to ensure user is authenticated
router.use(authenticateToken)

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
    const { eventId } = req.params

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

    // Get creator
    const creator = event.createdBy
      ? await prisma.user.findUnique({ where: { id: event.createdBy } })
      : user

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    // Calculate new points
    const newPoints = await pointsCalculator.calculateEventPoints(event, creator)

    // Update event
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
