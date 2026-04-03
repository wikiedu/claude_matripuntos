export type CalendarEntryType = 'event' | 'task' | 'service' | 'birthday' | 'holiday'

export interface CalendarEntry {
  id: string
  type: CalendarEntryType
  title: string
  date: string
  description?: string
  color?: string
  relatedEventId?: string
  relatedTaskId?: string
  createdAt: string
}

export interface CalendarMonthData {
  year: number
  month: number
  startDate: string
  endDate: string
  entries: CalendarEntry[]
  grouped: Record<string, CalendarEntry[]>
  totalDays: number
}

export interface CalendarWeekData {
  year: number
  week: number
  startDate: string
  endDate: string
  entries: CalendarEntry[]
  daysOfWeek: string[]
}

export interface CalendarDayData {
  date: string
  entries: CalendarEntry[]
  total: number
}

export interface UpcomingEvent {
  id: string
  type: CalendarEntryType
  title: string
  date: string
  description?: string
}

export interface SpecialDates {
  birthdays: CalendarEntry[]
  holidays: CalendarEntry[]
}
