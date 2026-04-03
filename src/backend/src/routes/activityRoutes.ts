import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getRecentActivity } from '../services/activityService.js'

const router = express.Router()

/**
 * GET /
 * Fetch recent activities for the authenticated user's couple
 * Requires JWT authentication
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  let prisma: PrismaClient | null = null
  try {
    const coupleId = req.coupleId

    if (!coupleId) {
      res.status(401).json({ error: 'Couple ID not found in token' })
      return
    }

    prisma = new PrismaClient()
    const activities = await getRecentActivity(prisma, coupleId)
    res.json(activities)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch recent activity'
    res.status(500).json({ error: message })
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
})

export default router
