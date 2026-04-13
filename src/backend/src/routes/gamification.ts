import express, { Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { getGamificationStatus } from '../services/gamificationService.js'

const router = express.Router()

/**
 * GET /api/gamification/status
 */
router.get('/status', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const status = await getGamificationStatus(req.coupleId)
    res.json(status)
  } catch (error) {
    console.error('Error getting gamification status:', error)
    res.status(500).json({ error: 'Failed to get gamification status' })
  }
})

export default router
