import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
): Promise<AnalyticsMetrics> {
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

  return {
    totalEvents: events.length,
    totalPoints,
    averagePointsPerEvent: events.length > 0 ? totalPoints / events.length : 0,
    negotiationSuccessRate: negotiations.length > 0 ? (acceptedEvents / events.length) * 100 : 0,
    averageNegotiationRounds: avgRounds,
    mostActiveDay,
    totalAchievements: achievements.length,
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
