import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import * as analyticsService from '../services/analyticsService.js'

const router = Router()

router.use(authenticateToken)

/**
 * GET /api/analytics/couple
 * Get overall couple analytics
 */
router.get('/couple', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate as string) : new Date()

    const metrics = await analyticsService.getCoupleAnalytics(coupleId, start, end)

    res.json({
      message: 'Couple analytics retrieved',
      data: metrics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve analytics'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/users
 * Get per-user analytics
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate as string) : new Date()

    const userAnalytics = await analyticsService.getUserAnalytics(coupleId, start, end)

    res.json({
      message: 'User analytics retrieved',
      data: userAnalytics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve user analytics'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/daily-activity
 * Get daily activity analytics
 */
router.get('/daily-activity', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate as string) : new Date()

    const activity = await analyticsService.getDailyActivityAnalytics(coupleId, start, end)

    res.json({
      message: 'Daily activity analytics retrieved',
      count: activity.length,
      data: activity,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve daily activity'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/negotiations
 * Get negotiation analytics
 */
router.get('/negotiations', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate as string) : new Date()

    const negotiations = await analyticsService.getNegotiationAnalytics(coupleId, start, end)

    res.json({
      message: 'Negotiation analytics retrieved',
      data: negotiations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve negotiation analytics'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/points-by-category
 * Get points distribution by category
 */
router.get('/points-by-category', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30))
    const end = endDate ? new Date(endDate as string) : new Date()

    const distribution = await analyticsService.getPointsByCategory(coupleId, start, end)

    res.json({
      message: 'Points by category retrieved',
      data: distribution,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve points by category'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/weekly-trends
 * Get weekly trends for the past N weeks
 */
router.get('/weekly-trends', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { weeks } = req.query

    const numberOfWeeks = weeks ? parseInt(weeks as string) : 8

    const trends = await analyticsService.getWeeklyTrends(coupleId, numberOfWeeks)

    res.json({
      message: 'Weekly trends retrieved',
      data: trends,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve weekly trends'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/monthly/:year/:month
 * Get monthly summary
 */
router.get('/monthly/:year/:month', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const year = parseInt(req.params.year)
    const month = parseInt(req.params.month)

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' })
    }

    const summary = await analyticsService.getMonthlySummary(coupleId, year, month)

    res.json({
      message: 'Monthly summary retrieved',
      data: summary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve monthly summary'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/yearly/:year
 * Get yearly overview
 */
router.get('/yearly/:year', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const year = parseInt(req.params.year)

    if (!year) {
      return res.status(400).json({ error: 'Invalid year' })
    }

    const overview = await analyticsService.getYearOverview(coupleId, year)

    res.json({
      message: 'Yearly overview retrieved',
      data: overview,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve yearly overview'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/daily-breakdown
 * Get daily activity breakdown for a given date range.
 * Used by the period-aware chart in the analytics dashboard.
 */
router.get('/daily-breakdown', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const start = new Date(startDate as string)
    const end = new Date(endDate as string)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' })
    }

    const breakdown = await analyticsService.getDailyBreakdown(coupleId, start, end)

    res.json({
      message: 'Daily breakdown retrieved',
      data: breakdown,
      periodDays: breakdown.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve daily breakdown'
    res.status(500).json({ error: message })
  }
})

/**
 * GET /api/analytics/time-invested
 * Horas invertidas por usuario (tareas con heurística por categoría + duración de eventos).
 * Query: ?range=week|month (default: week)
 */
router.get('/time-invested', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const range = (req.query.range as 'week' | 'month') ?? 'week'
    const data = await analyticsService.getTimeInvested(coupleId, range)
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error' })
  }
})

/**
 * GET /api/analytics/heatmap
 * Actividad por día de semana × franja horaria (7×6 grid).
 * Query: ?weeks=4 (default: 4, min: 1, max: 52)
 */
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user.coupleId
    const weeks = Math.max(1, Math.min(52, Number(req.query.weeks ?? 4)))
    const data = await analyticsService.getHeatmap(coupleId, weeks)
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error' })
  }
})

/**
 * GET /api/analytics/completion-rate
 * % de TaskLogs verificadas vs totales por usuario.
 * Query: ?range=week|month (default: month)
 */
router.get('/completion-rate', async (req, res) => {
  try {
    const coupleId = (req as any).user.coupleId
    const range = (req.query.range as 'week' | 'month') ?? 'month'
    const data = await analyticsService.getCompletionRate(coupleId, range)
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Error' })
  }
})

export default router
