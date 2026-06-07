// STATUS: deprecación aplazada. Pendiente de migración a V1 (/api/negotiations)
// o reescritura completa del flujo de negociación en Fase 1 (EventNegotiationCard
// sigue vivo en Calendar.tsx). IDOR cerrado en commit f8229d7. Ver TODO_REFACTOR.md.
import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { negotiationEngine } from '../services/negotiationEngine.js'

const router = Router()
import prisma from '../lib/prisma.js'

/**
 * Negotiation Routes - FASE 3
 * Manages 2-round event negotiation flow between partners
 *
 * Audit v1.4 P0-D: canonical negotiation engine is /api/negotiations in
 * negotiationRoutes.ts (round counter, max-rounds, force). These V2 routes
 * are kept live for EventNegotiationCard.tsx (used on Calendar page) but
 * will be retired in v1.5 after the frontend migrates. All responses emit
 * a `Deprecation` header so callers can detect the migration window.
 */
router.use((_req, res, next) => {
  res.set('Deprecation', 'true')
  res.set('Sunset', 'Mon, 01 Jun 2026 00:00:00 GMT')
  next()
})

/**
 * POST /api/events/:eventId/propose
 * Start negotiation - send event proposal to partner
 */
router.post('/:eventId/propose', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { message } = req.body
    const userId = (req as any).userId
    const coupleId = (req as any).coupleId

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Verify user owns the event. Scoped to the authed user's couple to prevent
    // cross-couple IDOR (Fase 0 saneamiento 2026-06-07): an event from another
    // couple resolves to null → 404, never reaching the createdBy check.
    const event = await prisma.event.findFirst({
      where: { id: eventId, coupleId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    if (event.createdBy !== userId) {
      return res.status(403).json({ error: 'Only event creator can propose' })
    }

    // Check event is in draft status
    if (event.status !== 'draft') {
      return res.status(400).json({
        error: 'Event must be in draft status to propose',
        currentStatus: event.status,
      })
    }

    const updatedEvent = await negotiationEngine.proposeEvent(eventId, userId, message)

    res.json({
      success: true,
      event: updatedEvent,
      message: 'Event proposal sent to partner',
    })
  } catch (error) {
    console.error('Error proposing event:', error)
    res.status(500).json({
      error: 'Failed to propose event',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * POST /api/events/:eventId/respond
 * Respond to event proposal (accept, reject, counter-propose, pending_conversation)
 */
router.post('/:eventId/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { action, pointsProposed, message } = req.body
    const userId = (req as any).userId
    const coupleId = (req as any).coupleId

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    if (!action || !['accept', 'reject', 'counter_propose', 'pending_conversation'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        validActions: ['accept', 'reject', 'counter_propose', 'pending_conversation'],
      })
    }

    // Verify event exists within the authed user's couple. Scoping by coupleId
    // closes the cross-couple IDOR (Fase 0 saneamiento 2026-06-07): previously a
    // user from another couple passed the `createdBy !== userId` check and could
    // accept/reject/counter a foreign event, corrupting cross-couple balances.
    const event = await prisma.event.findFirst({
      where: { id: eventId, coupleId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Check event is in proposed or counter_proposal status
    if (!['proposed', 'counter_proposal'].includes(event.status)) {
      return res.status(400).json({
        error: 'Event must be in proposed or counter_proposal status to respond',
        currentStatus: event.status,
      })
    }

    // Verify responder is not creator
    if (event.createdBy === userId) {
      return res.status(403).json({ error: 'Creator cannot respond to own proposal' })
    }

    const response = {
      action: action as 'accept' | 'reject' | 'counter_propose' | 'pending_conversation',
      pointsProposed: action === 'counter_propose' ? pointsProposed : undefined,
      message: message || undefined,
    }

    // Validate counter_propose has points
    if (action === 'counter_propose' && !pointsProposed) {
      return res.status(400).json({
        error: 'pointsProposed is required for counter_propose action',
      })
    }

    const updatedEvent = await negotiationEngine.respondToProposal(eventId, userId, response)

    res.json({
      success: true,
      event: updatedEvent,
      message: `Event proposal ${action}`,
    })
  } catch (error) {
    console.error('Error responding to proposal:', error)
    res.status(500).json({
      error: 'Failed to respond to proposal',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/events/:eventId/negotiation
 * Get current negotiation status and full history
 */
router.get('/:eventId/negotiation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const userId = (req as any).userId
    const coupleId = (req as any).coupleId

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Verify event exists within the authed user's couple (cross-couple IDOR fix,
    // Fase 0 2026-06-07): reading another couple's negotiation status/history is
    // also an information-disclosure IDOR, so scope the load by coupleId.
    const event = await prisma.event.findFirst({
      where: { id: eventId, coupleId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Get partner's ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    })

    if (!user?.coupleId) {
      return res.status(403).json({ error: 'User does not have a couple' })
    }

    // Get partner info
    const couple = await prisma.couple.findUnique({
      where: { id: user.coupleId },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    const partner = couple?.users.find((u) => u.id !== userId)

    const status = await negotiationEngine.getNegotiationStatus(eventId)
    const history = await negotiationEngine.getNegotiationHistory(eventId)

    res.json({
      success: true,
      eventId,
      status,
      history,
      participants: {
        creator: event.creator,
        partner: partner,
      },
    })
  } catch (error) {
    console.error('Error getting negotiation status:', error)
    res.status(500).json({
      error: 'Failed to get negotiation status',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/events/:eventId/negotiation/history
 * Get detailed negotiation history with all rounds
 */
router.get('/:eventId/negotiation/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const coupleId = (req as any).coupleId

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Scope by coupleId to prevent cross-couple history disclosure (IDOR fix,
    // Fase 0 2026-06-07).
    const event = await prisma.event.findFirst({
      where: { id: eventId, coupleId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const history = await negotiationEngine.getNegotiationHistory(eventId)

    res.json({
      success: true,
      eventId,
      eventTitle: event.title || event.type,
      eventStatus: event.status,
      negotiations: history,
      totalRounds: history.length > 0 ? Math.max(...history.map((n: { roundNumber: number }) => n.roundNumber)) : 0,
    })
  } catch (error) {
    console.error('Error getting negotiation history:', error)
    res.status(500).json({
      error: 'Failed to get negotiation history',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

/**
 * GET /api/negotiations/pending
 * Get all pending negotiations for current user (as responder)
 */
router.get('/user/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coupleId: true },
    })

    if (!user?.coupleId) {
      return res.status(403).json({ error: 'User does not have a couple' })
    }

    // Get all events from partner that are in proposed or counter_proposal status
    const pendingEvents = await prisma.event.findMany({
      where: {
        coupleId: user.coupleId,
        createdBy: { not: userId },
        status: { in: ['proposed', 'counter_proposal'] },
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({
      success: true,
      count: pendingEvents.length,
      events: pendingEvents,
    })
  } catch (error) {
    console.error('Error getting pending negotiations:', error)
    res.status(500).json({
      error: 'Failed to get pending negotiations',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
