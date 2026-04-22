import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getRecentActivity } from '../services/activityService.js'
import prisma from '../lib/prisma.js'

const router = express.Router()

/**
 * GET /
 * Fetch recent activities for the authenticated user's couple
 * Requires JWT authentication
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId
    const viewerUserId = req.userId

    if (!coupleId || !viewerUserId) {
      res.status(401).json({ error: 'Auth info not found in token' })
      return
    }

    const activities = await getRecentActivity(prisma, coupleId, viewerUserId)
    res.json(activities)
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch recent activity'
    res.status(500).json({ error: message })
  }
})

export default router
