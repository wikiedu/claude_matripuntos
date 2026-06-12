import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getRecentActivity } from '../services/activityService.js'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

/**
 * GET /
 * Fetch recent activities for the authenticated user's couple
 * Requires JWT authentication
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId

    if (!coupleId) {
      res.status(401).json({ error: 'Auth info not found in token' })
      return
    }

    const activities = await getRecentActivity(prisma, coupleId)
    res.json(activities)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching recent activity')
    const message = error instanceof Error ? error.message : 'Failed to fetch recent activity'
    res.status(500).json({ error: message })
  }
})

export default router
