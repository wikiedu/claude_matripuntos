import { PrismaClient, Achievement, UserAchievement } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Achievement Engine Service
 * Manages achievements, tracking, and gamification logic
 */

export interface AchievementCondition {
  type: 'events_accepted' | 'points_earned' | 'negotiation_rounds' | 'consecutive_days' | 'custom'
  threshold: number
  description: string
}

export interface UserAchievementWithDetails extends UserAchievement {
  achievement?: Achievement
}

export class AchievementEngine {
  /**
   * Get all achievements available
   */
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      return await prisma.achievement.findMany({
        orderBy: { rarity: 'asc' },
      })
    } catch (error) {
      console.error('Error getting achievements:', error)
      throw error
    }
  }

  /**
   * Get user's unlocked achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievementWithDetails[]> {
    try {
      const achievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      })
      return achievements
    } catch (error) {
      console.error('Error getting user achievements:', error)
      throw error
    }
  }

  /**
   * Check if user qualifies for any new achievements
   */
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { couple: { include: { events: true } } },
      })

      if (!user?.couple) return []

      const unlockedAchievements: Achievement[] = []
      const allAchievements = await this.getAllAchievements()

      for (const achievement of allAchievements) {
        // Check if already unlocked
        const existing = await prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
        })

        if (existing) continue

        // Check condition
        const qualifies = await this.checkAchievementCondition(userId, achievement.condition as string)

        if (qualifies) {
          await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
              unlockedAt: new Date(),
            },
          })

          unlockedAchievements.push(achievement)
        }
      }

      return unlockedAchievements
    } catch (error) {
      console.error('Error checking achievements:', error)
      throw error
    }
  }

  /**
   * Check if user meets achievement condition
   */
  private async checkAchievementCondition(userId: string, condition: string): Promise<boolean> {
    try {
      const conditionObj = JSON.parse(condition)

      switch (conditionObj.type) {
        case 'events_accepted':
          return await this.checkEventsAccepted(userId, conditionObj.threshold)

        case 'points_earned':
          return await this.checkPointsEarned(userId, conditionObj.threshold)

        case 'negotiation_rounds':
          return await this.checkNegotiationRounds(userId, conditionObj.threshold)

        case 'consecutive_days':
          return await this.checkConsecutiveDays(userId, conditionObj.threshold)

        default:
          return false
      }
    } catch (error) {
      console.error('Error checking achievement condition:', error)
      return false
    }
  }

  /**
   * Check: User has accepted N events
   */
  private async checkEventsAccepted(userId: string, threshold: number): Promise<boolean> {
    const count = await prisma.event.count({
      where: {
        couple: { users: { some: { id: userId } } },
        status: 'accepted',
      },
    })
    return count >= threshold
  }

  /**
   * Check: User has earned N total points
   */
  private async checkPointsEarned(userId: string, threshold: number): Promise<boolean> {
    const result = await prisma.event.aggregate({
      where: {
        couple: { users: { some: { id: userId } } },
        status: 'accepted',
      },
      _sum: { pointsAgreed: true },
    })
    return (result._sum.pointsAgreed || 0) >= threshold
  }

  /**
   * Check: User has participated in N negotiation rounds
   */
  private async checkNegotiationRounds(userId: string, threshold: number): Promise<boolean> {
    const count = await prisma.negotiation.count({
      where: {
        OR: [{ proposedBy: userId }, { respondedBy: userId }],
      },
    })
    return count >= threshold
  }

  /**
   * Check: User has been active N consecutive days
   */
  private async checkConsecutiveDays(userId: string, threshold: number): Promise<boolean> {
    const events = await prisma.event.findMany({
      where: { couple: { users: { some: { id: userId } } } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    if (events.length === 0) return false

    let consecutiveDays = 1
    let currentDate = new Date(events[0].createdAt)
    currentDate.setHours(0, 0, 0, 0)

    for (let i = 1; i < events.length; i++) {
      const eventDate = new Date(events[i].createdAt)
      eventDate.setHours(0, 0, 0, 0)

      const diffTime = currentDate.getTime() - eventDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        consecutiveDays++
        currentDate = eventDate
      } else if (diffDays > 1) {
        break
      }
    }

    return consecutiveDays >= threshold
  }

  /**
   * Get couple score (total points agreed)
   */
  async getCoupleScore(coupleId: string): Promise<number> {
    try {
      const result = await prisma.event.aggregate({
        where: {
          coupleId,
          status: 'accepted',
        },
        _sum: { pointsAgreed: true },
      })
      return result._sum.pointsAgreed || 0
    } catch (error) {
      console.error('Error getting couple score:', error)
      throw error
    }
  }

  /**
   * Get couple stats for dashboard
   */
  async getCoupleStats(coupleId: string): Promise<{
    totalScore: number
    eventsAccepted: number
    eventsRejected: number
    eventsNegotiated: number
    avgPointsPerEvent: number
  }> {
    try {
      const couple = await prisma.couple.findUnique({
        where: { id: coupleId },
        include: {
          events: {
            where: { status: { in: ['accepted', 'rejected'] } },
          },
        },
      })

      if (!couple) {
        return {
          totalScore: 0,
          eventsAccepted: 0,
          eventsRejected: 0,
          eventsNegotiated: 0,
          avgPointsPerEvent: 0,
        }
      }

      const accepted = couple.events.filter((e) => e.status === 'accepted')
      const rejected = couple.events.filter((e) => e.status === 'rejected')
      const totalScore = accepted.reduce((sum, e) => sum + (e.pointsAgreed || 0), 0)

      return {
        totalScore,
        eventsAccepted: accepted.length,
        eventsRejected: rejected.length,
        eventsNegotiated: couple.events.length,
        avgPointsPerEvent: accepted.length > 0 ? Math.round(totalScore / accepted.length) : 0,
      }
    } catch (error) {
      console.error('Error getting couple stats:', error)
      throw error
    }
  }

  /**
   * Get leaderboard (top couples by score)
   */
  async getLeaderboard(limit: number = 10): Promise<
    Array<{
      coupleId: string
      coupleName: string
      totalScore: number
      eventsAccepted: number
      rank: number
    }>
  > {
    try {
      const couples = await prisma.couple.findMany({
        select: {
          id: true,
          name: true,
          events: {
            where: { status: 'accepted' },
            select: { pointsAgreed: true },
          },
        },
        take: limit,
      })

      const leaderboard = couples
        .map((couple) => ({
          coupleId: couple.id,
          coupleName: couple.name || 'Sin nombre',
          totalScore: couple.events.reduce((sum, e) => sum + (e.pointsAgreed || 0), 0),
          eventsAccepted: couple.events.length,
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))

      return leaderboard
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      throw error
    }
  }

  /**
   * Get weekly summary
   */
  async getWeeklySummary(coupleId: string): Promise<{
    week: string
    eventsCreated: number
    eventsAccepted: number
    pointsEarned: number
    avgPointsPerEvent: number
  }> {
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const events = await prisma.event.findMany({
        where: {
          coupleId,
          createdAt: { gte: weekStart, lte: weekEnd },
        },
      })

      const accepted = events.filter((e) => e.status === 'accepted')
      const pointsEarned = accepted.reduce((sum, e) => sum + (e.pointsAgreed || 0), 0)

      return {
        week: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        eventsCreated: events.length,
        eventsAccepted: accepted.length,
        pointsEarned,
        avgPointsPerEvent: accepted.length > 0 ? Math.round(pointsEarned / accepted.length) : 0,
      }
    } catch (error) {
      console.error('Error getting weekly summary:', error)
      throw error
    }
  }
}

export const achievementEngine = new AchievementEngine()
