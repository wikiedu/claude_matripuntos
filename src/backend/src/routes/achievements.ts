import express, { Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { achievementEngine } from '../services/achievementEngine.js'

const router = express.Router()
import prisma from '../lib/prisma.js'

/**
 * GET /api/achievements
 * Get all achievements (desbloqueados + futuros) for couple
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Couple ID not found in token' })
      return
    }

    const achievements = await prisma.achievement.findMany({
      where: { coupleId: req.coupleId },
      include: {
        userAchievements: true
      },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
    })

    const userAchievementIds = new Set(
      achievements
        .flatMap(a => a.userAchievements.filter(ua => ua.userId === req.userId))
        .map(ua => ua.achievementId)
    )

    const enriched = achievements.map(ach => ({
      id: ach.id,
      name: ach.name,
      description: ach.description,
      icon: ach.icon,
      rarity: ach.rarity,
      type: ach.type,
      unlockedAt: ach.userAchievements.find(ua => ua.userId === req.userId)?.unlockedAt || null,
      isUnlocked: userAchievementIds.has(ach.id),
      progress: null
    }))

    res.json({
      success: true,
      achievements: enriched,
      stats: {
        unlocked: userAchievementIds.size,
        total: achievements.length,
        percentage: achievements.length > 0 ? Math.round((userAchievementIds.size / achievements.length) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Error getting achievements:', error)
    res.status(500).json({
      error: 'Failed to get achievements',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/achievements/user
 * Get current user's unlocked achievements only
 */
router.get('/user', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: req.userId },
      include: {
        achievement: true
      },
      orderBy: { unlockedAt: 'desc' }
    })

    const achievements = userAchievements
      .filter(ua => ua.achievement.coupleId === req.coupleId)
      .map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        rarity: ua.achievement.rarity,
        type: ua.achievement.type,
        unlockedAt: ua.unlockedAt
      }))

    const allCount = await prisma.achievement.count({
      where: { coupleId: req.coupleId }
    })

    res.json({
      success: true,
      achievements,
      progress: {
        unlocked: achievements.length,
        total: allCount,
        percentage: allCount > 0 ? Math.round((achievements.length / allCount) * 100) : 0
      }
    })
  } catch (error) {
    console.error('Error getting user achievements:', error)
    res.status(500).json({
      error: 'Failed to get user achievements',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * POST /api/achievements/check
 * Manually check and unlock new achievements
 */
router.post('/check', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const newAchievements = await achievementEngine.checkAchievements(
      req.userId,
      req.coupleId,
      { type: 'manual_check' }
    )

    const totalUnlocked = await prisma.userAchievement.count({
      where: { userId: req.userId }
    })

    res.json({
      success: true,
      newAchievements: newAchievements.map((ach: any) => ({
        id: ach.id,
        name: ach.name,
        description: ach.description,
        icon: ach.icon,
        rarity: ach.rarity,
        type: ach.type,
        unlockedAt: new Date().toISOString(),
        message: `¡Desbloqueaste '${ach.name}'!`
      })),
      totalUnlocked
    })
  } catch (error) {
    console.error('Error checking achievements:', error)
    res.status(500).json({
      error: 'Failed to check achievements',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

/**
 * GET /api/achievements/couple-score
 * Get this week's CoupleScore
 */
router.get('/couple-score', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Couple ID not found in token' })
      return
    }

    const weekStart = getWeekStart(new Date())

    let coupleScore = await prisma.coupleScore.findUnique({
      where: { coupleId_weekStartDate: { coupleId: req.coupleId, weekStartDate: weekStart } }
    })

    if (!coupleScore) {
      coupleScore = await prisma.coupleScore.create({
        data: {
          coupleId: req.coupleId,
          weekStartDate: weekStart,
          user1Score: 0,
          user2Score: 0,
          equilibrium: 50,
          activity: 50,
          consensus: 50,
          constancy: 50
        }
      })
    }

    res.json({
      success: true,
      coupleScore: {
        weekStartDate: coupleScore.weekStartDate,
        user1Score: coupleScore.user1Score,
        user2Score: coupleScore.user2Score,
        equilibrium: coupleScore.equilibrium,
        activity: coupleScore.activity,
        consensus: coupleScore.consensus,
        constancy: coupleScore.constancy
      }
    })
  } catch (error) {
    console.error('Error getting couple score:', error)
    res.status(500).json({
      error: 'Failed to get couple score',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0))
}

export default router
