import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export class AchievementEngine {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async checkAchievements(
    userId: string,
    coupleId: string,
    trigger: { type: 'event_accepted' | 'task_verified' | 'manual_check'; eventId?: string; taskLogId?: string }
  ): Promise<any[]> {
    const newAchievements: any[] = []
    const pointAchievements = await this.checkPointMilestones(userId, coupleId)
    newAchievements.push(...pointAchievements)
    const behaviorAchievements = await this.checkBehaviorAchievements(userId, coupleId, trigger)
    newAchievements.push(...behaviorAchievements)
    if (trigger.type === 'manual_check') {
      const streakAchievements = await this.checkStreakAchievements(userId, coupleId)
      newAchievements.push(...streakAchievements)
    }
    for (const achievement of newAchievements) {
      await this.updateCoupleScore(coupleId, achievement)
    }
    return newAchievements
  }

  async checkPointMilestones(userId: string, coupleId: string): Promise<any[]> {
    const newAchievements: any[] = []
    const totalPoints = await this.prisma.pointsTransaction.aggregate({
      where: { userId, coupleId },
      _sum: { amount: true }
    })
    const points = totalPoints._sum.amount?.toNumber() || 0
    const milestones = [
      { threshold: 50, name: 'Primeros pasos' },
      { threshold: 250, name: 'Centinela' },
      { threshold: 500, name: 'Maestro de equilibrio' }
    ]
    for (const milestone of milestones) {
      if (points >= milestone.threshold) {
        const achievement = await this.prisma.achievement.findFirst({
          where: { coupleId, name: milestone.name }
        })
        if (achievement) {
          const already = await this.prisma.userAchievement.findUnique({
            where: { userId_achievementId: { userId, achievementId: achievement.id } }
          })
          if (!already) {
            await this.prisma.userAchievement.create({
              data: { userId, achievementId: achievement.id }
            })
            newAchievements.push(achievement)
          }
        }
      }
    }
    return newAchievements
  }

  async checkBehaviorAchievements(userId: string, coupleId: string, trigger: any): Promise<any[]> {
    const newAchievements: any[] = []
    // Pacifista check
    if (trigger.type === 'event_accepted' && trigger.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: trigger.eventId },
        include: { negotiations: true }
      })
      if (event && event.negotiations.length === 0) {
        const achievement = await this.prisma.achievement.findFirst({
          where: { coupleId, name: 'Pacifista' }
        })
        if (achievement) {
          const already = await this.prisma.userAchievement.findUnique({
            where: { userId_achievementId: { userId, achievementId: achievement.id } }
          })
          if (!already) {
            await this.prisma.userAchievement.create({
              data: { userId, achievementId: achievement.id }
            })
            newAchievements.push(achievement)
          }
        }
      }
    }

    // Consenso perfecto check: 5 consecutive accepted events without counter proposals
    const recentEvents = await this.prisma.event.findMany({
      where: {
        coupleId,
        status: 'accepted'
      },
      include: { negotiations: true },
      orderBy: { dateStart: 'desc' },
      take: 5
    })

    if (recentEvents.length >= 5) {
      // Check if ALL recent events have no counter_proposed negotiations
      const allWithoutCounter = recentEvents.every(e =>
        !e.negotiations.some(n => n.responseType === 'counter_proposed')
      )

      if (allWithoutCounter) {
        const achievement = await this.prisma.achievement.findFirst({
          where: { coupleId, name: 'Consenso perfecto' }
        })
        if (achievement) {
          const already = await this.prisma.userAchievement.findUnique({
            where: { userId_achievementId: { userId, achievementId: achievement.id } }
          })
          if (!already) {
            await this.prisma.userAchievement.create({
              data: { userId, achievementId: achievement.id }
            })
            newAchievements.push(achievement)
          }
        }
      }
    }

    // Velocidad check
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const tasksThisWeek = await this.prisma.taskLog.count({
      where: {
        coupleId,
        completedBy: userId,
        date: { gte: weekAgo }
      }
    })
    if (tasksThisWeek >= 10) {
      const achievement = await this.prisma.achievement.findFirst({
        where: { coupleId, name: 'Velocidad' }
      })
      if (achievement) {
        const already = await this.prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } }
        })
        if (!already) {
          await this.prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id }
          })
          newAchievements.push(achievement)
        }
      }
    }

    // Confianza check
    const verifiedTasks = await this.prisma.taskLog.count({
      where: {
        coupleId,
        verifiedBy: userId,
        status: 'verified',
        disputeReason: null
      }
    })
    if (verifiedTasks >= 20) {
      const achievement = await this.prisma.achievement.findFirst({
        where: { coupleId, name: 'Confianza' }
      })
      if (achievement) {
        const already = await this.prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } }
        })
        if (!already) {
          await this.prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id }
          })
          newAchievements.push(achievement)
        }
      }
    }

    return newAchievements
  }

  async checkStreakAchievements(userId: string, coupleId: string): Promise<any[]> {
    const newAchievements: any[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const disputesLast7 = await this.prisma.taskLog.count({
      where: {
        coupleId,
        date: { gte: sevenDaysAgo },
        status: 'disputed'
      }
    })
    if (disputesLast7 === 0) {
      const achievement = await this.prisma.achievement.findFirst({
        where: { coupleId, name: 'Semana tranquila' }
      })
      if (achievement) {
        const already = await this.prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } }
        })
        if (!already) {
          await this.prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id }
          })
          newAchievements.push(achievement)
        }
      }
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const disputesLast30 = await this.prisma.taskLog.count({
      where: {
        coupleId,
        date: { gte: thirtyDaysAgo },
        status: 'disputed'
      }
    })
    if (disputesLast30 === 0) {
      const achievement = await this.prisma.achievement.findFirst({
        where: { coupleId, name: 'Mes armonioso' }
      })
      if (achievement) {
        const already = await this.prisma.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: achievement.id } }
        })
        if (!already) {
          await this.prisma.userAchievement.create({
            data: { userId, achievementId: achievement.id }
          })
          newAchievements.push(achievement)
        }
      }
    }
    return newAchievements
  }

  private async updateCoupleScore(coupleId: string, achievement: any): Promise<void> {
    const weekStart = this.getWeekStart(new Date())
    let coupleScore = await this.prisma.coupleScore.findUnique({
      where: { coupleId_weekStartDate: { coupleId, weekStartDate: weekStart } }
    })
    if (!coupleScore) {
      coupleScore = await this.prisma.coupleScore.create({
        data: {
          coupleId,
          weekStartDate: weekStart,
          user1Score: new Decimal(0),
          user2Score: new Decimal(0),
          equilibrium: new Decimal(50),
          activity: new Decimal(50),
          consensus: new Decimal(50),
          constancy: new Decimal(50)
        }
      })
    }

    // Rarity boost configuration: Uses flat points based on rarity level
    // common: +1pt, rare: +2pts, epic: +3pts, legendary: +5pts (on all 4 dimensions)
    const rarityBoosts: { [key: string]: number } = {
      'common': 1,
      'rare': 2,
      'epic': 3,
      'legendary': 5
    }
    const boost = rarityBoosts[achievement.rarity] || 1
    const updates: any = {}

    const equil = typeof coupleScore.equilibrium === 'object' ? coupleScore.equilibrium.toNumber() : coupleScore.equilibrium
    const activ = typeof coupleScore.activity === 'object' ? coupleScore.activity.toNumber() : coupleScore.activity
    const cons = typeof coupleScore.consensus === 'object' ? coupleScore.consensus.toNumber() : coupleScore.consensus
    const const_ = typeof coupleScore.constancy === 'object' ? coupleScore.constancy.toNumber() : coupleScore.constancy

    if (achievement.rarity === 'legendary') {
      // Legendary achievements boost all dimensions equally
      updates.equilibrium = Math.min(100, equil + boost)
      updates.activity = Math.min(100, activ + boost)
      updates.consensus = Math.min(100, cons + boost)
      updates.constancy = Math.min(100, const_ + boost)
    } else {
      // Other rarities target specific dimensions
      if (['Primeros pasos', 'Centinela', 'Pacifista', 'Velocidad'].includes(achievement.name)) {
        updates.activity = Math.min(100, activ + boost)
      } else if (['Consenso perfecto', 'Confianza', 'Generoso'].includes(achievement.name)) {
        updates.consensus = Math.min(100, cons + boost)
      } else {
        updates.constancy = Math.min(100, const_ + boost)
      }
    }

    await this.prisma.coupleScore.update({
      where: { id: coupleScore.id },
      data: updates
    })
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getUTCDay()
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0))
  }

  /**
   * Get all available achievements for a couple
   */
  async getAllAchievements(coupleId?: string): Promise<any[]> {
    if (!coupleId) {
      return this.prisma.achievement.findMany({
        orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
      })
    }

    return this.prisma.achievement.findMany({
      where: { coupleId },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
    })
  }

  /**
   * Get user's unlocked achievements
   */
  async getUserAchievements(userId: string): Promise<any[]> {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' }
    })
  }

  /**
   * Check and unlock new achievements for a user (with manual_check trigger)
   */
  async checkAndUnlockAchievements(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true }
    })

    if (!user?.coupleId) {
      throw new Error('User does not have a couple associated')
    }

    return this.checkAchievements(userId, user.coupleId, { type: 'manual_check' })
  }

  /**
   * Get comprehensive statistics for a couple
   */
  async getCoupleStats(coupleId: string): Promise<any> {
    const couple = await this.prisma.couple.findUnique({
      where: { id: coupleId },
      include: { users: true }
    })

    if (!couple) {
      throw new Error('Couple not found')
    }

    const totalAchievementsUnlocked = await this.prisma.userAchievement.count({
      where: { user: { coupleId } }
    })

    const user1Points = await this.prisma.pointsTransaction.aggregate({
      where: { coupleId, userId: couple.users[0]?.id },
      _sum: { amount: true }
    })

    const user2Points = await this.prisma.pointsTransaction.aggregate({
      where: { coupleId, userId: couple.users[1]?.id },
      _sum: { amount: true }
    })

    const totalTasksCompleted = await this.prisma.taskLog.count({
      where: { coupleId }
    })

    const weekStart = this.getWeekStart(new Date())
    const currentScore = await this.prisma.coupleScore.findUnique({
      where: { coupleId_weekStartDate: { coupleId, weekStartDate: weekStart } }
    })

    return {
      coupleId,
      totalAchievementsUnlocked,
      user1Points: user1Points._sum.amount?.toNumber() || 0,
      user2Points: user2Points._sum.amount?.toNumber() || 0,
      totalTasksCompleted,
      currentScore: currentScore || {
        equilibrium: 50,
        activity: 50,
        consensus: 50,
        constancy: 50
      }
    }
  }

  /**
   * Get couple's current total score
   */
  async getCoupleScore(coupleId: string): Promise<any> {
    const weekStart = this.getWeekStart(new Date())
    const coupleScore = await this.prisma.coupleScore.findUnique({
      where: { coupleId_weekStartDate: { coupleId, weekStartDate: weekStart } }
    })

    if (!coupleScore) {
      return {
        equilibrium: 50,
        activity: 50,
        consensus: 50,
        constancy: 50,
        overallScore: 50
      }
    }

    const equil = typeof coupleScore.equilibrium === 'object' ? coupleScore.equilibrium.toNumber() : coupleScore.equilibrium
    const activ = typeof coupleScore.activity === 'object' ? coupleScore.activity.toNumber() : coupleScore.activity
    const cons = typeof coupleScore.consensus === 'object' ? coupleScore.consensus.toNumber() : coupleScore.consensus
    const const_ = typeof coupleScore.constancy === 'object' ? coupleScore.constancy.toNumber() : coupleScore.constancy

    const overallScore = Math.round((equil + activ + cons + const_) / 4)

    return {
      equilibrium: equil,
      activity: activ,
      consensus: cons,
      constancy: const_,
      overallScore
    }
  }

  /**
   * Get global leaderboard of top couples by score
   */
  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const weekStart = this.getWeekStart(new Date())

    const scores = await this.prisma.coupleScore.findMany({
      where: { weekStartDate: weekStart },
      orderBy: [{ overallScore: 'desc' }, { activity: 'desc' }],
      take: limit,
      include: {
        couple: {
          select: {
            id: true,
            users: { select: { name: true, email: true } }
          }
        }
      }
    })

    return scores.map((score, index) => ({
      rank: index + 1,
      coupleId: score.coupleId,
      coupleNames: score.couple.users.map(u => u.name).join(' & '),
      overallScore: typeof score.overallScore === 'object' ? score.overallScore.toNumber() : score.overallScore,
      equilibrium: typeof score.equilibrium === 'object' ? score.equilibrium.toNumber() : score.equilibrium,
      activity: typeof score.activity === 'object' ? score.activity.toNumber() : score.activity,
      consensus: typeof score.consensus === 'object' ? score.consensus.toNumber() : score.consensus,
      constancy: typeof score.constancy === 'object' ? score.constancy.toNumber() : score.constancy
    }))
  }

  /**
   * Get couple's weekly summary
   */
  async getWeeklySummary(coupleId: string): Promise<any> {
    const weekStart = this.getWeekStart(new Date())
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const pointsTransactions = await this.prisma.pointsTransaction.findMany({
      where: { coupleId, createdAt: { gte: weekStart, lt: weekEnd } },
      include: { user: { select: { name: true } } }
    })

    const tasksCompleted = await this.prisma.taskLog.findMany({
      where: { coupleId, date: { gte: weekStart, lt: weekEnd } },
      include: {
        task: { select: { name: true } },
        completedByUser: { select: { name: true } }
      }
    })

    const coupleScore = await this.prisma.coupleScore.findUnique({
      where: { coupleId_weekStartDate: { coupleId, weekStartDate: weekStart } }
    })

    const achievementsThisWeek = await this.prisma.userAchievement.findMany({
      where: { user: { coupleId }, unlockedAt: { gte: weekStart, lt: weekEnd } },
      include: { achievement: true }
    })

    return {
      weekStart,
      weekEnd,
      pointsTransactions: pointsTransactions.length,
      tasksCompleted: tasksCompleted.length,
      achievementsUnlocked: achievementsThisWeek.length,
      score: coupleScore || { equilibrium: 50, activity: 50, consensus: 50, constancy: 50 },
      achievements: achievementsThisWeek.map(ua => ({
        name: ua.achievement.name,
        unlockedAt: ua.unlockedAt,
        rarity: ua.achievement.rarity
      }))
    }
  }
}

export const achievementEngine = new AchievementEngine(new PrismaClient())
