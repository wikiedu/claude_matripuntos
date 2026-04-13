import prisma from '../lib/prisma.js'
import { createCoupleNotification } from './notificationService.js'

export const LEVELS = [
  { level: 'nido',     emoji: '🪺', name: 'Nido',     minXp: 0 },
  { level: 'brote',    emoji: '🌿', name: 'Brote',    minXp: 300 },
  { level: 'hogar',    emoji: '🏡', name: 'Hogar',    minXp: 2000 },
  { level: 'raices',   emoji: '🌳', name: 'Raíces',   minXp: 6000 },
  { level: 'diamante', emoji: '💎', name: 'Diamante', minXp: 15000 },
  { level: 'leyenda',  emoji: '⭐', name: 'Leyenda',  minXp: 35000 },
  { level: 'eterno',   emoji: '♾️', name: 'Eterno',   minXp: 80000 },
]

export function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || LEVELS[LEVELS.length - 1]
    }
  }
  const xpToNext = next.minXp - xp
  const rangeSize = next.minXp - current.minXp
  const xpProgress = rangeSize > 0 ? Math.min(100, Math.round(((xp - current.minXp) / rangeSize) * 100)) : 100
  return { current, next, xpToNext: Math.max(0, xpToNext), xpProgress }
}

export function getDailyMultiplier(streakDays: number): number {
  if (streakDays >= 90) return 2.0
  if (streakDays >= 30) return 1.75
  if (streakDays >= 14) return 1.5
  if (streakDays >= 7)  return 1.3
  if (streakDays >= 3)  return 1.1
  return 1.0
}

export function getWeeklyBonus(streakWeeks: number): number {
  return parseFloat(Math.min(0.20, streakWeeks * 0.05).toFixed(2))
}

export async function getFactorMascotas(coupleId: string): Promise<number> {
  const pets = await prisma.pet.findMany({ where: { coupleId } })
  const totalPets = pets.reduce((sum, p) => sum + p.quantity, 0)
  if (totalPets === 0) return 1.0
  if (totalPets === 1) return 1.1
  return 1.2
}

export async function calculateAndSaveXP(coupleId: string): Promise<number> {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) throw new Error('Couple not found')

  const ptResult = await prisma.pointsTransaction.aggregate({
    where: { coupleId, amount: { gt: 0 } },
    _sum: { amount: true }
  })
  const puntosHistoricos = ptResult._sum.amount?.toNumber() || 0

  const unlocked = await prisma.coupleAchievement.findMany({
    where: { coupleId, unlockedAt: { not: null } },
    include: { definition: true }
  })
  const logrosXP = unlocked.reduce((sum, ca) => sum + ca.definition.xpReward, 0)

  const semanasActivas = await prisma.coupleScore.count({
    where: { coupleId, overallScore: { gt: 0 } }
  })

  const xp = Math.round(
    (puntosHistoricos * 0.5) +
    logrosXP +
    (couple.dailyStreakDays * 2) +
    (semanasActivas * 10)
  )

  const oldLevelInfo = getLevelInfo(couple.xp)
  const newLevelInfo = getLevelInfo(xp)
  const leveledUp = newLevelInfo.current.level !== oldLevelInfo.current.level

  await prisma.couple.update({
    where: { id: coupleId },
    data: { xp, level: newLevelInfo.current.level }
  })

  if (leveledUp) {
    const { emoji, name } = newLevelInfo.current
    await createCoupleNotification(
      coupleId,
      'level_up',
      `¡Habéis subido de nivel! ${emoji}`,
      `¡Habéis alcanzado el nivel ${name}! ${emoji}`
    )
  }

  return xp
}

export async function updateDailyStreak(coupleId: string): Promise<void> {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) return

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const lastActivity = couple.lastActivityDate
    ? new Date(couple.lastActivityDate)
    : null

  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0)
  }

  const todayStr = today.toISOString().slice(0, 10)
  const lastStr = lastActivity?.toISOString().slice(0, 10)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  if (lastStr === todayStr) {
    // Already counted today
    return
  }

  if (lastStr === yesterdayStr) {
    // Continuing streak
    await prisma.couple.update({
      where: { id: coupleId },
      data: {
        dailyStreakDays: couple.dailyStreakDays + 1,
        lastActivityDate: new Date()
      }
    })
  } else if (lastStr !== null && lastStr !== undefined) {
    // Gap detected
    if (!couple.dailyStreakFreezerUsed) {
      await prisma.couple.update({
        where: { id: coupleId },
        data: {
          dailyStreakFreezerUsed: true,
          lastActivityDate: new Date()
        }
      })
      await createCoupleNotification(
        coupleId,
        'streak_frozen',
        '🧊 Racha protegida',
        `Hemos protegido vuestra racha de ${couple.dailyStreakDays} días. Próximo congelador el lunes.`
      )
    } else {
      await prisma.couple.update({
        where: { id: coupleId },
        data: {
          dailyStreakDays: 1,
          lastActivityDate: new Date()
        }
      })
      await createCoupleNotification(
        coupleId,
        'streak_broken',
        '💔 Racha rota',
        '¡La racha diaria se ha roto. ¡A empezar de nuevo!'
      )
    }
  } else {
    // First activity ever
    await prisma.couple.update({
      where: { id: coupleId },
      data: {
        dailyStreakDays: 1,
        lastActivityDate: new Date()
      }
    })
  }
}

export async function resetFreezersOnMonday(): Promise<void> {
  const today = new Date()
  if (today.getUTCDay() !== 1) return
  await prisma.couple.updateMany({
    where: { dailyStreakFreezerUsed: true },
    data: { dailyStreakFreezerUsed: false }
  })
}

export async function updateWeeklyStreak(coupleId: string): Promise<void> {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) return

  const lastScore = await prisma.coupleScore.findFirst({
    where: { coupleId },
    orderBy: { weekStartDate: 'desc' }
  })

  const equilibrium = lastScore?.equilibrium
    ? (typeof lastScore.equilibrium === 'object'
        ? (lastScore.equilibrium as any).toNumber()
        : Number(lastScore.equilibrium))
    : 0

  if (equilibrium >= 40) {
    await prisma.couple.update({
      where: { id: coupleId },
      data: { weeklyStreakWeeks: couple.weeklyStreakWeeks + 1 }
    })
  } else {
    await prisma.couple.update({
      where: { id: coupleId },
      data: { weeklyStreakWeeks: 0 }
    })
  }
}

export async function getGamificationStatus(coupleId: string) {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) throw new Error('Couple not found')

  const levelInfo = getLevelInfo(couple.xp)
  const dailyMultiplier = getDailyMultiplier(couple.dailyStreakDays)
  const weeklyBonus = getWeeklyBonus(couple.weeklyStreakWeeks)

  return {
    xp: couple.xp,
    level: couple.level,
    levelEmoji: levelInfo.current.emoji,
    levelName: levelInfo.current.name,
    nextLevel: levelInfo.next.name,
    nextLevelEmoji: levelInfo.next.emoji,
    xpToNext: levelInfo.xpToNext,
    xpProgress: levelInfo.xpProgress,
    dailyStreak: couple.dailyStreakDays,
    weeklyStreak: couple.weeklyStreakWeeks,
    dailyMultiplier,
    weeklyBonus,
    combinedMultiplier: parseFloat((dailyMultiplier * (1 + weeklyBonus)).toFixed(3)),
    freezerAvailable: !couple.dailyStreakFreezerUsed,
    lastActivityDate: couple.lastActivityDate
  }
}
