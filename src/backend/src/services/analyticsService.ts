
import prisma from '../lib/prisma.js'
import { generateInsight } from './insightHeuristic.js'

// In-memory cache — invalidación natural al reiniciar el proceso
const insightCache = new Map<string, { at: number; data: any }>()
const INSIGHT_TTL = 6 * 60 * 60 * 1000  // 6h

// Horas estimadas por categoría (heurística)
export const CATEGORY_HOURS: Record<string, number> = {
  cocina:       1.0,
  banos:        0.5,
  limpieza:     1.5,
  compra:       1.0,
  logistica:    1.0,
  cuidado:      2.0,
  mantenimiento:0.75,
  jardineria:   1.0,
  mascotas:     0.5,
  otros:        0.75,
}

export interface AnalyticsDateRange {
  startDate: Date
  endDate: Date
}

export interface AnalyticsMetrics {
  totalEvents: number
  totalPoints: number
  averagePointsPerEvent: number
  negotiationSuccessRate: number
  averageNegotiationRounds: number
  mostActiveDay: string
  totalAchievements: number
}

export interface UserAnalytics {
  userId: string
  userName: string
  totalPoints: number
  totalEvents: number
  totalCompleted: number
  totalPending: number
  successRate: number
  averagePoints: number
  achievements: number
}

export interface EventAnalytics {
  date: string
  count: number
  totalPoints: number
  types: Record<string, number>
}

export interface NegotiationAnalytics {
  totalNegotiations: number
  accepted: number
  rejected: number
  pendingRounds: number
  successRate: number
  averageRounds: number
}

/**
 * Get overall couple analytics for a date range
 */
export async function getCoupleAnalytics(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsMetrics & { equilibrium: number; equityDelta: number; hasEquityData: boolean }> {
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
  })

  const negotiations = await prisma.negotiation.findMany({
    where: {
      event: { coupleId, dateStart: { gte: startDate, lte: endDate } },
    },
  })

  const achievements = await prisma.userAchievement.findMany({
    where: {
      unlockedAt: { gte: startDate, lte: endDate },
    },
  })

  const totalPoints = events.reduce((sum, e) => sum + Number(e.pointsCalculated), 0)
  const acceptedEvents = events.filter(e => e.status === 'accepted').length
  const negotiationsByEvent = negotiations.reduce((acc, n) => {
    acc[n.eventId] = (acc[n.eventId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgRounds = Object.values(negotiationsByEvent).length > 0
    ? Object.values(negotiationsByEvent).reduce((a, b) => a + b, 0) / Object.keys(negotiationsByEvent).length
    : 0

  const eventsByDay = events.reduce((acc, e) => {
    const day = e.dateStart.toLocaleDateString('es-ES', { weekday: 'long' })
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostActiveDay = Object.entries(eventsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // B6: include equity gauge data from the CoupleScore table so the Advanced
  // Analytics "Índice de Equidad" gauge has something to render.
  const latest = await prisma.coupleScore.findFirst({
    where: { coupleId },
    orderBy: { weekStartDate: 'desc' },
  })
  const previous = latest
    ? await prisma.coupleScore.findFirst({
        where: { coupleId, weekStartDate: { lt: latest.weekStartDate } },
        orderBy: { weekStartDate: 'desc' },
      })
    : null
  const equilibrium = latest ? Number(latest.equilibrium) : 0
  const equityDelta = latest && previous
    ? Math.round(Number(latest.equilibrium) - Number(previous.equilibrium))
    : 0

  return {
    totalEvents: events.length,
    totalPoints,
    averagePointsPerEvent: events.length > 0 ? totalPoints / events.length : 0,
    negotiationSuccessRate: negotiations.length > 0 ? (acceptedEvents / events.length) * 100 : 0,
    averageNegotiationRounds: avgRounds,
    mostActiveDay,
    totalAchievements: achievements.length,
    equilibrium,
    equityDelta,
    hasEquityData: Boolean(latest),
  }
}

/**
 * Get per-user analytics
 */
export async function getUserAnalytics(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<UserAnalytics[]> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: true,
      events: {
        where: {
          dateStart: { gte: startDate, lte: endDate },
        },
      },
    },
  })

  if (!couple) throw new Error('Couple not found')

  const userAnalytics = await Promise.all(
    couple.users.map(async user => {
      const userEvents = couple.events.filter(e => e.createdBy === user.id)
      const completed = userEvents.filter(e => e.status === 'accepted').length
      const pending = userEvents.filter(e => e.status === 'pending').length
      const totalPoints = userEvents.reduce((sum, e) => sum + Number(e.pointsCalculated), 0)

      const achievements = await prisma.userAchievement.count({
        where: { userId: user.id },
      })

      return {
        userId: user.id,
        userName: user.name,
        totalPoints,
        totalEvents: userEvents.length,
        totalCompleted: completed,
        totalPending: pending,
        successRate: userEvents.length > 0 ? (completed / userEvents.length) * 100 : 0,
        averagePoints: userEvents.length > 0 ? totalPoints / userEvents.length : 0,
        achievements,
      }
    })
  )

  return userAnalytics
}

/**
 * Get daily activity analytics
 */
export async function getDailyActivityAnalytics(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<EventAnalytics[]> {
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
  })

  const grouped: Record<string, EventAnalytics> = {}

  events.forEach(event => {
    const dateStr = event.dateStart.toISOString().split('T')[0]

    if (!grouped[dateStr]) {
      grouped[dateStr] = {
        date: dateStr,
        count: 0,
        totalPoints: 0,
        types: {},
      }
    }

    grouped[dateStr].count++
    grouped[dateStr].totalPoints += Number(event.pointsCalculated)
    grouped[dateStr].types[event.type] = (grouped[dateStr].types[event.type] || 0) + 1
  })

  return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Get negotiation analytics
 */
export async function getNegotiationAnalytics(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<NegotiationAnalytics> {
  const negotiations = await prisma.negotiation.findMany({
    where: {
      event: {
        coupleId,
        dateStart: { gte: startDate, lte: endDate },
      },
    },
  })

  const events = await prisma.event.findMany({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
  })

  const accepted = events.filter(e => e.status === 'accepted').length
  const rejected = events.filter(e => e.status === 'rejected').length
  const pending = events.filter(e => e.status === 'pending').length

  const roundsByEvent = negotiations.reduce((acc, n) => {
    acc[n.eventId] = (acc[n.eventId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const uniqueEvents = Object.keys(roundsByEvent).length
  const avgRounds = uniqueEvents > 0
    ? Object.values(roundsByEvent).reduce((a, b) => a + b, 0) / uniqueEvents
    : 0

  return {
    totalNegotiations: negotiations.length,
    accepted,
    rejected,
    pendingRounds: pending,
    successRate: events.length > 0 ? (accepted / events.length) * 100 : 0,
    averageRounds: avgRounds,
  }
}

/**
 * Get points distribution by category
 */
export async function getPointsByCategory(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<Record<string, number>> {
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
  })

  return events.reduce((acc, event) => {
    const type = event.type || 'other'
    acc[type] = (acc[type] || 0) + Number(event.pointsCalculated)
    return acc
  }, {} as Record<string, number>)
}

/**
 * Get points distribution by category, split by user (you/partner).
 * Uses TaskLogs (not events) and returns { [category]: { you, partner } }.
 */
export async function getPointsByCategoryGrouped(coupleId: string, start?: Date, end?: Date) {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  })
  if (!couple) return {}
  const [u1, u2] = couple.users
  const where: any = { coupleId }
  if (start) where.date = { ...(where.date ?? {}), gte: start }
  if (end)   where.date = { ...(where.date ?? {}), lte: end }

  const logs = await prisma.taskLog.findMany({
    where,
    include: { task: true },
  })
  const byCat: Record<string, { you: number; partner: number }> = {}
  for (const l of logs) {
    const cat = l.task.category
    if (!byCat[cat]) byCat[cat] = { you: 0, partner: 0 }
    const pts = Number(l.pointsFinal ?? 0)
    if (l.completedBy === u1.id) byCat[cat].you += pts
    else if (u2 && l.completedBy === u2.id) byCat[cat].partner += pts
  }
  return byCat
}

/**
 * Get weekly trends
 */
export async function getWeeklyTrends(
  coupleId: string,
  numberOfWeeks: number = 8
): Promise<Array<{ label: string; events: number; points: number }>> {
  const today = new Date()
  const trends = []

  for (let i = numberOfWeeks - 1; i >= 0; i--) {
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() - (i * 7))
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)

    const events = await prisma.event.findMany({
      where: {
        coupleId,
        dateStart: { gte: weekStart, lte: weekEnd },
      },
    })

    const points = events.reduce((sum, e) => sum + Number(e.pointsCalculated), 0)
    const label = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

    trends.push({
      label,
      events: events.length,
      points,
    })
  }

  return trends
}

/**
 * Get monthly summary
 */
export async function getMonthlySummary(
  coupleId: string,
  year: number,
  month: number
): Promise<{
  month: number
  year: number
  events: number
  points: number
  negotiations: number
  achievements: number
}> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const events = await prisma.event.count({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
  })

  const pointsData = await prisma.event.findMany({
    where: {
      coupleId,
      dateStart: { gte: startDate, lte: endDate },
    },
    select: { pointsCalculated: true },
  })

  const points = pointsData.reduce((sum, e) => sum + Number(e.pointsCalculated), 0)

  const negotiations = await prisma.negotiation.count({
    where: {
      event: {
        coupleId,
        dateStart: { gte: startDate, lte: endDate },
      },
    },
  })

  const achievements = await prisma.userAchievement.count({
    where: {
      unlockedAt: { gte: startDate, lte: endDate },
    },
  })

  return {
    month,
    year,
    events,
    points,
    negotiations,
    achievements,
  }
}

/**
 * Get year overview
 */
export async function getYearOverview(coupleId: string, year: number) {
  const months = []

  for (let month = 1; month <= 12; month++) {
    const summary = await getMonthlySummary(coupleId, year, month)
    months.push(summary)
  }

  return {
    year,
    totalEvents: months.reduce((sum, m) => sum + m.events, 0),
    totalPoints: months.reduce((sum, m) => sum + m.points, 0),
    totalNegotiations: months.reduce((sum, m) => sum + m.negotiations, 0),
    totalAchievements: months.reduce((sum, m) => sum + m.achievements, 0),
    months,
  }
}

// ============ HELPER FUNCTIONS ============

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export interface DailyBreakdownPoint {
  date: string      // ISO date "2026-04-01"
  label: string     // "lun 1"
  events: number
  points: number
  tasks: number
}

/**
 * Get daily activity breakdown for a date range.
 * Returns one entry per day (including days with 0 activity).
 */
export async function getDailyBreakdown(
  coupleId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyBreakdownPoint[]> {
  const [events, taskLogs] = await Promise.all([
    prisma.event.findMany({
      where: {
        coupleId,
        dateStart: { gte: startDate, lte: endDate },
        status: { in: ['accepted', 'forced'] },
      },
    }),
    prisma.taskLog.findMany({
      where: {
        coupleId,
        date: { gte: startDate, lte: endDate },
        status: 'verified',
      },
    }),
  ])

  // Aggregate by ISO date
  const byDay: Record<string, { events: number; points: number; tasks: number }> = {}

  for (const e of events) {
    const key = e.dateStart.toISOString().split('T')[0]
    if (!byDay[key]) byDay[key] = { events: 0, points: 0, tasks: 0 }
    byDay[key].events++
    byDay[key].points += Number(e.pointsCalculated)
  }

  for (const t of taskLogs) {
    const key = t.date.toISOString().split('T')[0]
    if (!byDay[key]) byDay[key] = { events: 0, points: 0, tasks: 0 }
    byDay[key].tasks++
    byDay[key].points += Number(t.pointsFinal)
  }

  // Generate one entry per day in the range (including 0-activity days)
  const result: DailyBreakdownPoint[] = []
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  let cursor = new Date(startDateStr)
  while (cursor.toISOString().split('T')[0] <= endDateStr) {
    const key = cursor.toISOString().split('T')[0]
    const label = cursor.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
    const data = byDay[key] ?? { events: 0, points: 0, tasks: 0 }
    result.push({ date: key, label, ...data })
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  }

  return result
}

/**
 * Get time invested (in hours) per user for the given range.
 * Uses CATEGORY_HOURS heuristic for tasks and actual duration for events.
 */
export async function getTimeInvested(coupleId: string, range: 'week' | 'month') {
  const days = range === 'week' ? 7 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  })
  if (!couple || couple.users.length === 0) return { you: { hours: 0 }, partner: { hours: 0 } }

  const [user1, user2] = couple.users
  const logs = await prisma.taskLog.findMany({
    where: { coupleId, date: { gte: since }, status: 'verified' },
    include: { task: true },
  })
  const events = await prisma.event.findMany({
    where: { coupleId, dateStart: { gte: since }, status: { in: ['accepted', 'forced'] } },
  })

  function hoursFor(userId: string) {
    const taskHours = logs
      .filter(l => l.completedBy === userId)
      .reduce((sum, l) => sum + (CATEGORY_HOURS[l.task.category] ?? 1.0), 0)
    const eventHours = events
      .filter(e => e.createdBy === userId)
      .reduce((sum, e) => {
        const ms = new Date(e.dateEnd).getTime() - new Date(e.dateStart).getTime()
        return sum + ms / (1000 * 60 * 60)
      }, 0)
    return Math.round((taskHours + eventHours) * 10) / 10
  }

  return {
    you:     { id: user1.id, name: user1.name, hours: hoursFor(user1.id) },
    partner: user2 ? { id: user2.id, name: user2.name, hours: hoursFor(user2.id) } : null,
  }
}

// Franjas horarias: 6-9, 9-12, 12-15, 15-18, 18-21, 21-24
const HOUR_BUCKETS = [6, 9, 12, 15, 18, 21]

function bucketForHour(h: number): number {
  if (h < 6) return 21
  for (let i = HOUR_BUCKETS.length - 1; i >= 0; i--) {
    if (h >= HOUR_BUCKETS[i]) return HOUR_BUCKETS[i]
  }
  return HOUR_BUCKETS[0]
}

/**
 * Get activity heatmap: 7 days (Mon-Sun) × 6 hour buckets.
 * Combines TaskLogs and accepted/forced Events.
 */
export async function getHeatmap(coupleId: string, weeks: number = 4) {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const logs = await prisma.taskLog.findMany({
    where: { coupleId, date: { gte: since } },
  })
  const events = await prisma.event.findMany({
    where: { coupleId, dateStart: { gte: since }, status: { in: ['accepted', 'forced'] } },
  })

  // key = `${dow}-${bucket}`, value = count
  const map = new Map<string, number>()
  function add(date: Date) {
    const dow = (date.getDay() + 6) % 7 // L=0, D=6
    const bucket = bucketForHour(date.getHours())
    const key = `${dow}-${bucket}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  logs.forEach(l => add(new Date(l.date)))
  events.forEach(e => add(new Date(e.dateStart)))

  const max = Math.max(1, ...Array.from(map.values()))
  const grid: { dow: number; bucket: number; count: number; norm: number }[] = []
  for (let dow = 0; dow < 7; dow++) {
    for (const bucket of HOUR_BUCKETS) {
      const count = map.get(`${dow}-${bucket}`) ?? 0
      grid.push({ dow, bucket, count, norm: Math.round((count / max) * 4) })
    }
  }
  return { grid, buckets: HOUR_BUCKETS }
}

/**
 * Get completion rate (% verified vs total TaskLogs) per user for the given range.
 */
export async function getCompletionRate(coupleId: string, range: 'week' | 'month') {
  const days = range === 'week' ? 7 : 30
  const since = new Date()
  since.setDate(since.getDate() - days)

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  })
  if (!couple || couple.users.length === 0) return { you: 0, partner: 0 }

  const [user1, user2] = couple.users

  async function rateFor(userId: string) {
    const total = await prisma.taskLog.count({
      where: { coupleId, completedBy: userId, date: { gte: since } },
    })
    if (total === 0) return 0
    const verified = await prisma.taskLog.count({
      where: { coupleId, completedBy: userId, date: { gte: since }, status: 'verified' },
    })
    return Math.round((verified / total) * 100)
  }

  return {
    you:     { id: user1.id, name: user1.name, pct: await rateFor(user1.id) },
    partner: user2 ? { id: user2.id, name: user2.name, pct: await rateFor(user2.id) } : null,
  }
}

/**
 * Get monthly insight (heurístico, con templates + cache 6h).
 */
export async function getMonthlyInsight(coupleId: string, month: number, year: number) {
  const key = `${coupleId}-${year}-${month}`
  const cached = insightCache.get(key)
  if (cached && Date.now() - cached.at < INSIGHT_TTL) return cached.data

  // Métricas del mes
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month,   1)
  const prevStart = new Date(year, month - 2, 1)
  const prevEnd   = new Date(year, month - 1, 1)

  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: { users: true },
  })
  if (!couple || couple.users.length < 1) {
    return { text: 'Aún no hay datos suficientes este mes.', bullets: [] }
  }
  const [u1, u2] = couple.users

  // Top category por user
  async function topCat(userId: string) {
    const logs = await prisma.taskLog.findMany({
      where: { coupleId, completedBy: userId, date: { gte: start, lt: end } },
      include: { task: true },
    })
    const counts = new Map<string, number>()
    logs.forEach(l => counts.set(l.task.category, (counts.get(l.task.category) ?? 0) + 1))
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    return sorted[0] ? { name: sorted[0][0], count: sorted[0][1] } : null
  }

  // Time split
  const time = await getTimeInvested(coupleId, 'month')
  const totalH = (time.you?.hours ?? 0) + (time.partner?.hours ?? 0)
  const timePctUser1 = totalH > 0 ? Math.round(((time.you?.hours ?? 0) / totalH) * 100) : 50

  // Equity current vs prev
  const curr = await prisma.coupleScore.findFirst({
    where: { coupleId, weekStartDate: { gte: start, lt: end } },
    orderBy: { weekStartDate: 'desc' },
  })
  const prev = await prisma.coupleScore.findFirst({
    where: { coupleId, weekStartDate: { gte: prevStart, lt: prevEnd } },
    orderBy: { weekStartDate: 'desc' },
  })
  const equityDelta = curr && prev ? Math.round(Number(curr.equilibrium) - Number(prev.equilibrium)) : 0

  // Worst category
  const allLogs = await prisma.taskLog.findMany({
    where: { coupleId, date: { gte: start, lt: end } },
    include: { task: true },
  })
  const byCat = new Map<string, { u1: number; u2: number }>()
  allLogs.forEach(l => {
    const cur = byCat.get(l.task.category) ?? { u1: 0, u2: 0 }
    if (l.completedBy === u1.id) cur.u1++
    else if (u2 && l.completedBy === u2.id) cur.u2++
    byCat.set(l.task.category, cur)
  })
  let worst: string | null = null
  let worstDiff = 0
  byCat.forEach((v, k) => {
    const diff = Math.abs(v.u1 - v.u2)
    if (diff > worstDiff) { worstDiff = diff; worst = k }
  })
  if (worstDiff < 3) worst = null

  const result = generateInsight({
    user1Name: u1.name,
    user2Name: u2?.name ?? 'tu pareja',
    topCategoryUser1: await topCat(u1.id),
    topCategoryUser2: u2 ? await topCat(u2.id) : null,
    timePctUser1,
    equityDelta,
    worstCategory: worst,
  }, month)

  insightCache.set(key, { at: Date.now(), data: result })
  return result
}
