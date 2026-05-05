import prisma from '../lib/prisma.js'
import { createCoupleNotification } from './notificationService.js'

// v2.1.0 — sistema unificado de 10 niveles (opción C aprobada 2026-05-03).
// Reemplaza tanto al "Nido/Brote/..." legacy de v1.2 como al "Vecinos/Amigos/..."
// del intento abortado en v1.7. Una sola fuente de verdad. Migración SQL en
// 20261105000000_v2_1_0_levels_rename mapea Couple.level del esquema viejo al
// nuevo (nido→encuentro, brote→confianza, hogar→refugio, raices→raices,
// diamante→legado, leyenda→eterno, eterno→mito).
export const LEVELS = [
  { level: 'encuentro',   emoji: '🌱', name: 'Encuentro',    minXp: 0 },
  { level: 'confianza',   emoji: '🌿', name: 'Confianza',    minXp: 100 },
  { level: 'compania',    emoji: '🤝', name: 'Compañía',     minXp: 300 },
  { level: 'complicidad', emoji: '💫', name: 'Complicidad',  minXp: 700 },
  { level: 'refugio',     emoji: '🏡', name: 'Refugio',      minXp: 1500 },
  { level: 'raices',      emoji: '🌳', name: 'Raíces',       minXp: 3000 },
  { level: 'tribu',       emoji: '🔥', name: 'Tribu',        minXp: 6000 },
  { level: 'legado',      emoji: '💎', name: 'Legado',       minXp: 12000 },
  { level: 'eterno',      emoji: '♾️', name: 'Eterno',       minXp: 24000 },
  { level: 'mito',        emoji: '⭐', name: 'Mito',         minXp: 100000 },
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

  // v2.5.3 audit 08 S1-3 — XP reflejaba sólo transacciones positivas, así
  // que eventos `event_accepted`/`forced_payment` (que llegan con amount
  // negativo porque el proposer paga) NO sumaban XP. La gamificación de
  // niveles estaba parcialmente rota.
  //
  // Fix: sumar el valor absoluto de TODAS las transacciones excepto
  // `donation` (redistribución entre users del couple → ya contada en la
  // task/event que la generó; doble-contarla infla XP injustamente).
  const ptResult = await prisma.pointsTransaction.findMany({
    where: { coupleId, type: { not: 'donation' } },
    select: { amount: true },
  })
  const puntosHistoricos = ptResult.reduce(
    (sum, t) => sum + Math.abs(t.amount.toNumber()),
    0,
  )

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

/**
 * v2.5.1 audit 02 S1 — fix TZ local de la pareja.
 * Antes: `today.setHours(0,0,0,0)` rodaba al midnight del SERVER (UTC en
 * Render). Una user de Madrid completando una tarea a 23:30 local podía
 * ver la racha cuenta como "ayer ya cubierto" en lugar de "hoy nuevo".
 *
 * Ahora: usamos el timezone del primer user del couple (proxy del couple
 * timezone) y comparamos fechas como YYYY-MM-DD en esa TZ con
 * Intl.DateTimeFormat. Cuando se desee Couple.timezone como campo propio,
 * actualizar este helper.
 */
function dateKeyInTz(date: Date, tz: string): string {
  // YYYY-MM-DD en la zona horaria dada.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export async function updateDailyStreak(coupleId: string): Promise<void> {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) return

  // v2.2.8 — modo pausa: si la pareja está en pausa, no se mueve la racha.
  if (couple.pausedUntil && couple.pausedUntil > new Date()) return

  // v2.5.1 — TZ del primer user (creador) como proxy del couple timezone.
  // Si Couple gana un campo `timezone` propio, sustituir aquí.
  const firstUser = await prisma.user.findFirst({
    where: { coupleId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { timezone: true },
  })
  const tz = firstUser?.timezone || 'Europe/Madrid'

  const now = new Date()
  const todayStr = dateKeyInTz(now, tz)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = dateKeyInTz(yesterday, tz)
  const lastStr = couple.lastActivityDate
    ? dateKeyInTz(new Date(couple.lastActivityDate), tz)
    : null

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

function getCurrentWeekStart(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0, 0))
}

// Evaluates the PREVIOUS week's CoupleScore. Never inflates the streak based on a
// freshly created score of the current week (which is seeded with equilibrium=50).
// If no previous score exists, streak stays untouched.
export async function updateWeeklyStreak(coupleId: string): Promise<void> {
  const couple = await prisma.couple.findUnique({ where: { id: coupleId } })
  if (!couple) return

  const currentWeekStart = getCurrentWeekStart()

  const previousScore = await prisma.coupleScore.findFirst({
    where: { coupleId, weekStartDate: { lt: currentWeekStart } },
    orderBy: { weekStartDate: 'desc' }
  })

  if (!previousScore) return

  const equilibrium = previousScore.equilibrium
    ? (typeof previousScore.equilibrium === 'object'
        ? (previousScore.equilibrium as any).toNumber()
        : Number(previousScore.equilibrium))
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

  // v2.2.12 — bug fix: tras la migración v2.1.0 (mapeo defensivo de slugs
  // viejos a nuevos), Couple.level puede quedar desfasado vs el calculado
  // por XP. Si XP=736 y los thresholds nuevos lo ponen en Complicidad pero
  // el slug en BD sigue siendo 'confianza', el frontend pinta
  // "Lv 2 Complicidad · Próximo: Complicidad" (ordinal vs name de fuentes
  // distintas). Reconciliamos en el momento.
  const expectedLevel = levelInfo.current.level
  if (couple.level !== expectedLevel) {
    await prisma.couple.update({
      where: { id: coupleId },
      data: { level: expectedLevel },
    }).catch((e) => console.warn('[getGamificationStatus] level reconcile failed:', e))
  }

  return {
    xp: couple.xp,
    level: expectedLevel,                         // ← consistente con XP
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
