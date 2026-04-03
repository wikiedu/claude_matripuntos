import { PrismaClient } from '@prisma/client'

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

    // Consenso perfecto check
    const recentEvents = await this.prisma.event.findMany({
      where: {
        coupleId,
        createdBy: userId,
        status: 'accepted',
        negotiations: { none: { responseType: 'counter_proposed' } }
      },
      orderBy: { dateStart: 'desc' },
      take: 5
    })
    if (recentEvents.length >= 5) {
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
          user1Score: 0,
          user2Score: 0,
          equilibrium: 50,
          activity: 50,
          consensus: 50,
          constancy: 50
        }
      })
    }
    const rarityBoosts: { [key: string]: number } = {
      'common': 1,
      'rare': 2,
      'epic': 3,
      'legendary': 5
    }
    const boost = rarityBoosts[achievement.rarity] || 1
    const updates: any = {}
    if (achievement.rarity === 'legendary') {
      const equil = coupleScore.equilibrium instanceof Object ? Number(coupleScore.equilibrium) : coupleScore.equilibrium
      const activ = coupleScore.activity instanceof Object ? Number(coupleScore.activity) : coupleScore.activity
      const cons = coupleScore.consensus instanceof Object ? Number(coupleScore.consensus) : coupleScore.consensus
      const const_ = coupleScore.constancy instanceof Object ? Number(coupleScore.constancy) : coupleScore.constancy
      updates.equilibrium = Math.min(100, equil + boost)
      updates.activity = Math.min(100, activ + boost)
      updates.consensus = Math.min(100, cons + boost)
      updates.constancy = Math.min(100, const_ + boost)
    } else {
      const activ = coupleScore.activity instanceof Object ? Number(coupleScore.activity) : coupleScore.activity
      const cons = coupleScore.consensus instanceof Object ? Number(coupleScore.consensus) : coupleScore.consensus
      const const_ = coupleScore.constancy instanceof Object ? Number(coupleScore.constancy) : coupleScore.constancy
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
}

export const achievementEngine = new AchievementEngine(new PrismaClient())
