
import prisma from '../lib/prisma.js'

/**
 * FASE 5: Calendar Service
 * Manages calendar entries, events, tasks, and special dates
 */

export interface CalendarEntryInput {
  type: 'event' | 'task' | 'service' | 'birthday' | 'holiday'
  title: string
  date: Date | string
  description?: string
  color?: string
  relatedEventId?: string
  relatedTaskId?: string
}

export interface CalendarFilter {
  type?: string
  startDate?: Date | string
  endDate?: Date | string
}

/**
 * Get calendar entries for a specific month
 * @param coupleId - Couple ID
 * @param year - Year (2026)
 * @param month - Month (1-12)
 */
export async function getMonthCalendar(coupleId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startDate, lte: endDate } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startDate, endDate).catch(err => {
      console.error('[calendarService] taskLog query failed:', err)
      return []
    }),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const grouped = groupByDay(allEntries)

  return {
    year,
    month,
    startDate,
    endDate,
    entries: allEntries,
    grouped,
    totalDays: getDaysInMonth(year, month),
  }
}

/**
 * Get calendar entries for a specific week
 * @param coupleId - Couple ID
 * @param year - Year
 * @param week - Week number (1-53)
 */
export async function getWeekCalendar(coupleId: string, year: number, week: number) {
  const [startDate, endDate] = getWeekDates(year, week)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startDate, lte: endDate } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startDate, endDate).catch(err => {
      console.error('[calendarService] taskLog query failed:', err)
      return []
    }),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    year,
    week,
    startDate,
    endDate,
    entries: allEntries,
    daysOfWeek: getDaysOfWeek(startDate),
  }
}

/**
 * Get calendar entries for a specific day
 * @param coupleId - Couple ID
 * @param date - Date
 */
export async function getDayCalendar(coupleId: string, date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startOfDay, lte: endOfDay } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startOfDay, endOfDay).catch(err => {
      console.error('[calendarService] taskLog query failed:', err)
      return []
    }),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    date: startOfDay,
    entries: allEntries,
    total: allEntries.length,
  }
}

/**
 * Create a calendar entry
 */
export async function createCalendarEntry(
  coupleId: string,
  data: CalendarEntryInput
) {
  const entry = await prisma.calendarEntry.create({
    data: {
      coupleId,
      type: data.type,
      title: data.title,
      date: typeof data.date === 'string' ? new Date(data.date) : data.date,
      description: data.description,
      color: data.color,
      relatedEventId: data.relatedEventId,
      relatedTaskId: data.relatedTaskId,
    },
    include: {
      couple: true,
    },
  })

  return entry
}

/**
 * Update a calendar entry
 */
export async function updateCalendarEntry(
  entryId: string,
  coupleId: string,
  data: Partial<CalendarEntryInput>
) {
  // Verify entry belongs to couple
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: entryId, coupleId },
  })

  if (!entry) {
    throw new Error('Calendar entry not found')
  }

  const updated = await prisma.calendarEntry.update({
    where: { id: entryId },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.title && { title: data.title }),
      ...(data.date && { date: typeof data.date === 'string' ? new Date(data.date) : data.date }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.relatedEventId !== undefined && { relatedEventId: data.relatedEventId }),
      ...(data.relatedTaskId !== undefined && { relatedTaskId: data.relatedTaskId }),
    },
    include: {
      couple: true,
    },
  })

  return updated
}

/**
 * Delete a calendar entry
 */
export async function deleteCalendarEntry(entryId: string, coupleId: string) {
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: entryId, coupleId },
  })

  if (!entry) {
    throw new Error('Calendar entry not found')
  }

  await prisma.calendarEntry.delete({
    where: { id: entryId },
  })

  return { success: true, deletedId: entryId }
}

/**
 * Get upcoming events (next 30 days)
 */
export async function getUpcomingEvents(coupleId: string) {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const entries = await prisma.calendarEntry.findMany({
    where: {
      coupleId,
      date: {
        gte: now,
        lte: thirtyDaysLater,
      },
    },
    include: {
      couple: true,
    },
    orderBy: { date: 'asc' },
    take: 20,
  })

  return entries
}

/**
 * Get events by type (event, task, birthday, holiday, etc)
 */
export async function getEventsByType(
  coupleId: string,
  type: string,
  startDate?: Date,
  endDate?: Date
) {
  const entries = await prisma.calendarEntry.findMany({
    where: {
      coupleId,
      type,
      ...(startDate && endDate && {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }),
    },
    include: {
      couple: true,
    },
    orderBy: { date: 'asc' },
  })

  return entries
}

/**
 * Sync events from Event table to CalendarEntry
 * (When an event is created/updated, add it to calendar)
 */
export async function syncEventToCalendar(
  coupleId: string,
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  eventDescription?: string
) {
  // Check if already in calendar
  const existing = await prisma.calendarEntry.findFirst({
    where: {
      coupleId,
      relatedEventId: eventId,
    },
  })

  if (existing) {
    return updateCalendarEntry(existing.id, coupleId, {
      title: eventTitle,
      date: eventDate,
      description: eventDescription,
    })
  }

  return createCalendarEntry(coupleId, {
    type: 'event',
    title: eventTitle,
    date: eventDate,
    description: eventDescription,
    color: '#3B82F6', // Blue for events
    relatedEventId: eventId,
  })
}

/**
 * Get all birthdays and holidays for a couple
 */
export async function getSpecialDates(coupleId: string) {
  const entries = await prisma.calendarEntry.findMany({
    where: {
      coupleId,
      type: {
        in: ['birthday', 'holiday'],
      },
    },
    include: {
      couple: true,
    },
    orderBy: { date: 'asc' },
  })

  return {
    birthdays: entries.filter(e => e.type === 'birthday'),
    holidays: entries.filter(e => e.type === 'holiday'),
  }
}

// ============ HELPER FUNCTIONS ============

function groupByDay(entries: any[]) {
  const grouped: { [key: string]: any[] } = {}

  entries.forEach(entry => {
    const dateStr = entry.date.toISOString().split('T')[0]
    if (!grouped[dateStr]) {
      grouped[dateStr] = []
    }
    grouped[dateStr].push(entry)
  })

  return grouped
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getWeekDates(year: number, week: number): [Date, Date] {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())

  const startDate = new Date(ISOweekStart)
  const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
  endDate.setHours(23, 59, 59)

  return [startDate, endDate]
}

function getDaysOfWeek(startDate: Date): string[] {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    days.push(date.toISOString().split('T')[0])
  }
  return days
}

async function getTaskLogsInRange(coupleId: string, startDate: Date, endDate: Date) {
  const logs = await prisma.taskLog.findMany({
    where: {
      coupleId,
      date: { gte: startDate, lte: endDate },
    },
    include: { task: true },
    orderBy: { date: 'asc' },
  })

  return logs.map(log => ({
    id: `tasklog-${log.id}`,
    coupleId: log.coupleId,
    type: 'task' as const,
    title: log.task?.name ?? 'Tarea',
    date: log.date,
    description: `${log.pointsFinal} pts · ${log.status}`,
    color: '#22C55E',
    relatedEventId: null,
    relatedTaskId: log.taskId,
    couple: null,
    createdAt: log.date,
    updatedAt: log.date,
  }))
}
