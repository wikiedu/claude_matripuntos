import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import * as calendarService from '../services/calendarService.js'

const router = Router()

// Middleware to ensure user is authenticated
router.use(authenticateToken)

/**
 * GET /api/calendar/month/:year/:month
 * Get calendar entries for a specific month
 */
router.get('/month/:year/:month', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' })
    }

    const calendar = await calendarService.getMonthCalendar(coupleId, year, month)

    res.json({
      message: 'Month calendar retrieved',
      data: calendar,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve month calendar'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/calendar/week/:year/:week
 * Get calendar entries for a specific week
 */
router.get('/week/:year/:week', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const year = parseInt(req.params.year)
    const week = parseInt(req.params.week)

    if (!year || !week || week < 1 || week > 53) {
      return res.status(400).json({ error: 'Invalid year or week' })
    }

    const calendar = await calendarService.getWeekCalendar(coupleId, year, week)

    res.json({
      message: 'Week calendar retrieved',
      data: calendar,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve week calendar'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/calendar/day/:date
 * Get calendar entries for a specific day
 */
router.get('/day/:date', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { date } = req.params

    const calendar = await calendarService.getDayCalendar(coupleId, date)

    res.json({
      message: 'Day calendar retrieved',
      data: calendar,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve day calendar'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/calendar/upcoming
 * Get upcoming events (next 30 days)
 */
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId

    const entries = await calendarService.getUpcomingEvents(coupleId)

    res.json({
      message: 'Upcoming events retrieved',
      count: entries.length,
      data: entries,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve upcoming events'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/calendar/special-dates
 * Get all birthdays and holidays
 */
router.get('/special-dates', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId

    const specialDates = await calendarService.getSpecialDates(coupleId)

    res.json({
      message: 'Special dates retrieved',
      data: specialDates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve special dates'
    res.status(500).json({ error: message })
  }
})

/**
 * POST /api/calendar/entry
 * Create a calendar entry
 */
router.post('/entry', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { type, title, date, description, color, relatedEventId, relatedTaskId } = req.body

    if (!type || !title || !date) {
      return res.status(400).json({ error: 'Missing required fields: type, title, date' })
    }

    const entry = await calendarService.createCalendarEntry(coupleId, {
      type,
      title,
      date,
      description,
      color,
      relatedEventId,
      relatedTaskId,
    })

    res.status(201).json({
      message: 'Calendar entry created',
      data: entry,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create calendar entry'
    res.status(500).json({ error: message })
  }
})

/**
 * PUT /api/calendar/entry/:entryId
 * Update a calendar entry
 */
router.put('/entry/:entryId', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { entryId } = req.params
    const updateData = req.body

    const entry = await calendarService.updateCalendarEntry(entryId, coupleId, updateData)

    res.json({
      message: 'Calendar entry updated',
      data: entry,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update calendar entry'
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({ error: message })
  }
})

/**
 * DELETE /api/calendar/entry/:entryId
 * Delete a calendar entry
 */
router.delete('/entry/:entryId', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { entryId } = req.params

    const result = await calendarService.deleteCalendarEntry(entryId, coupleId)

    res.json({
      message: 'Calendar entry deleted',
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete calendar entry'
    res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({ error: message })
  }
})

/**
 * GET /api/calendar/by-type/:type
 * Get entries by type (event, task, birthday, holiday, service)
 */
router.get('/by-type/:type', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { type } = req.params
    const { startDate, endDate } = req.query

    const entries = await calendarService.getEventsByType(
      coupleId,
      type,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )

    res.json({
      message: `Calendar entries of type '${type}' retrieved`,
      count: entries.length,
      data: entries,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve entries by type'
    res.status(500).json({ error: message })
  }
})

export default router
