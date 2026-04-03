import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { achievementEngine } from '../services/achievementEngine.js'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

/**
 * Achievement Routes - FASE 4
 * Manages gamification: achievements, scores, leaderboards, weekly summaries
 */

/**
 * GET /api/achievements
 * Get all available achievements
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const achievements = await achievementEngine.getAllAchievements()

    res.json({
      success: true,
      achievements,
      total: achievements.length,
    })
  } catch (error) {
    console.error('Error getting achievements:', error)
    res.status(500).json({
      error: 'Failed to get achievements',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/achievements/user/my-achievements
 * Get current user's unlocked achievements
 */
router.get('/user/my-achievements', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const userAchievements = await achievementEngine.getUserAchievements(userId)
    const totalAchievements = await achievementEngine.getAllAchievements()

    const unlocked = userAchievements.length
    const total = totalAchievements.length
    const progress = Math.round((unlocked / total) * 100)

    res.json({
      success: true,
      achievements: userAchievements,
      progress: {
        unlocked,
        total,
        percentage: progress,
      },
    })
  } catch (error) {
    console.error('Error getting user achievements:', error)
    res.status(500).json({
      error: 'Failed to get user achievements',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/achievements/check
 * Check and unlock new achievements for user
 */
router.post('/check', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const newAchievements = await achievementEngine.checkAndUnlockAchievements(userId)

    res.json({
      success: true,
      newAchievements,
      message: `${newAchievements.length} new achievement(s) unlocked!`,
    })
  } catch (error) {
    console.error('Error checking achievements:', error)
    res.status(500).json({
      error: 'Failed to check achievements',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/achievements/couple/stats
 * Get couple statistics
 */
router.get('/couple/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    })

    if (!user?.coupleId) {
      return res.status(403).json({ error: 'User does not have a couple' })
    }

    const stats = await achievementEngine.getCoupleStats(user.coupleId)

    res.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error getting couple stats:', error)
    res.status(500).json({
      error: 'Failed to get couple stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/achievements/couple/score
 * Get couple's total score
 */
router.get('/couple/score', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    })

    if (!user?.coupleId) {
      return res.status(403).json({ error: 'User does not have a couple' })
    }

    const totalScore = await achievementEngine.getCoupleScore(user.coupleId)

    res.json({
      success: true,
      coupleId: user.coupleId,
      totalScore,
    })
  } catch (error) {
    console.error('Error getting couple score:', error)
    res.status(500).json({
      error: 'Failed to get couple score',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/achievements/leaderboard
 * Get global leaderboard (top couples by score)
 */
router.get('/leaderboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)

    const leaderboard = await achievementEngine.getLeaderboard(limit)

    res.json({
      success: true,
      leaderboard,
      total: leaderboard.length,
    })
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    res.status(500).json({
      error: 'Failed to get leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/achievements/weekly-summary
 * Get couple's weekly summary
 */
router.get('/weekly-summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    })

    if (!user?.coupleId) {
      return res.status(403).json({ error: 'User does not have a couple' })
    }

    const summary = await achievementEngine.getWeeklySummary(user.coupleId)

    res.json({
      success: true,
      summary,
    })
  } catch (error) {
    console.error('Error getting weekly summary:', error)
    res.status(500).json({
      error: 'Failed to get weekly summary',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
