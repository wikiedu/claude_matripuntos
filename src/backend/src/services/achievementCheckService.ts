import prisma from '../lib/prisma.js'
import { createCoupleNotification } from './notificationService.js'

interface AchievementCondition {
  type: string
  threshold?: number
  days?: number
  weeks?: number
}

async function evaluateCondition(
  condition: AchievementCondition,
  coupleId: string
): Promise<{ met: boolean; current: number; target: number }> {
  const target = condition.threshold || condition.days || condition.weeks || 1

  switch (condition.type) {
    case 'tasks_completed': {
      const count = await prisma.taskLog.count({
        where: { coupleId, status: { in: ['verified', 'pending'] } }
      })
      return { met: count >= target, current: count, target }
    }
    case 'daily_streak': {
      const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
      const current = couple?.dailyStreakDays || 0
      return { met: current >= target, current, target }
    }
    case 'weekly_streak': {
      const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
      const current = couple?.weeklyStreakWeeks || 0
      return { met: current >= target, current, target }
    }
    case 'equilibrium_week': {
      const lastScore = await prisma.coupleScore.findFirst({
        where: { coupleId },
        orderBy: { weekStartDate: 'desc' }
      })
      const current = lastScore?.equilibrium ? Number(lastScore.equilibrium) : 0
      return { met: current >= target, current, target }
    }
    case 'equilibrium_consecutive_weeks': {
      const scores = await prisma.coupleScore.findMany({
        where: { coupleId },
        orderBy: { weekStartDate: 'desc' },
        take: target
      })
      if (scores.length < target) return { met: false, current: scores.length, target }
      const allEquilibrated = scores.every(s => Number(s.equilibrium) >= 40)
      return { met: allEquilibrated, current: allEquilibrated ? target : scores.length, target }
    }
    case 'negotiations_without_force': {
      const events = await prisma.event.findMany({
        where: { coupleId, status: 'accepted' },
        orderBy: { updatedAt: 'desc' },
        take: target
      })
      if (events.length < target) return { met: false, current: events.length, target }
      const noneForced = events.every(e => e.status !== 'forced')
      return { met: noneForced, current: noneForced ? target : events.length, target }
    }
    case 'no_forced_events_days': {
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - target)
      const forcedCount = await prisma.event.count({
        where: { coupleId, status: 'forced', updatedAt: { gte: daysAgo } }
      })
      return { met: forcedCount === 0, current: forcedCount === 0 ? target : 0, target }
    }
    case 'level_reached': {
      const levelOrder = ['nido', 'brote', 'hogar', 'raices', 'diamante', 'leyenda', 'eterno']
      const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
      const currentIdx = levelOrder.indexOf(couple?.level || 'nido')
      return { met: currentIdx >= target, current: currentIdx, target }
    }
    default:
      return { met: false, current: 0, target }
  }
}

export async function checkAllAchievements(coupleId: string): Promise<string[]> {
  const definitions = await prisma.achievementDefinition.findMany({
    orderBy: { orderIndex: 'asc' }
  })

  const existing = await prisma.coupleAchievement.findMany({
    where: { coupleId }
  })
  const existingMap = new Map(existing.map((ca) => [ca.achievementDefinitionId, ca]))

  const newlyUnlocked: string[] = []

  for (const def of definitions) {
    const ca = existingMap.get(def.id)
    if (ca?.unlockedAt) continue // already unlocked

    let condition: AchievementCondition
    try {
      condition = JSON.parse(def.condition)
    } catch {
      continue
    }

    const { met, current, target } = await evaluateCondition(condition, coupleId)
    const progressJson = JSON.stringify({ current, target })

    if (met) {
      await prisma.coupleAchievement.upsert({
        where: { coupleId_achievementDefinitionId: { coupleId, achievementDefinitionId: def.id } },
        create: {
          coupleId,
          achievementDefinitionId: def.id,
          progress: progressJson,
          unlockedAt: new Date()
        },
        update: {
          progress: progressJson,
          unlockedAt: new Date()
        }
      })
      newlyUnlocked.push(def.id)

      await createCoupleNotification(
        coupleId,
        'achievement_unlocked',
        `🏆 ¡Nuevo logro desbloqueado!`,
        `¡Habéis conseguido '${def.name}'! +${def.xpReward} XP`
      )
    } else {
      await prisma.coupleAchievement.upsert({
        where: { coupleId_achievementDefinitionId: { coupleId, achievementDefinitionId: def.id } },
        create: { coupleId, achievementDefinitionId: def.id, progress: progressJson },
        update: { progress: progressJson }
      })
    }
  }

  return newlyUnlocked
}

export async function getAchievementsMap(coupleId: string) {
  const definitions = await prisma.achievementDefinition.findMany({
    orderBy: { orderIndex: 'asc' }
  })

  const coupleAchievements = await prisma.coupleAchievement.findMany({
    where: { coupleId }
  })
  const caMap = new Map(coupleAchievements.map((ca) => [ca.achievementDefinitionId, ca]))

  return definitions.map((def, index) => {
    const ca = caMap.get(def.id)
    const isUnlocked = !!ca?.unlockedAt
    const previousUnlocked = index === 0 || !!caMap.get(definitions[index - 1].id)?.unlockedAt

    let status: 'unlocked' | 'in_progress' | 'locked'
    if (isUnlocked) {
      status = 'unlocked'
    } else if (previousUnlocked) {
      status = 'in_progress'
    } else {
      status = 'locked'
    }

    const isSecret = def.category === 'secretos'
    const progress = ca?.progress ? JSON.parse(ca.progress) : null

    return {
      id: def.id,
      name: isSecret && !isUnlocked ? '???' : def.name,
      description: isSecret && !isUnlocked ? 'Logro secreto' : def.description,
      icon: def.icon,
      rarity: def.rarity,
      category: def.category,
      xpReward: def.xpReward,
      orderIndex: def.orderIndex,
      status,
      unlockedAt: ca?.unlockedAt || null,
      progress: progress ? {
        current: progress.current,
        target: progress.target,
        percentage: progress.target > 0 ? Math.round((progress.current / progress.target) * 100) : 0
      } : null
    }
  })
}
