import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { negotiationEngine } from '../services/negotiationEngine.js'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

/**
 * Negotiation Routes - FASE 3
 * Manages 2-round event negotiation flow between partners
 */

/**
 * POST /api/events/:eventId/propose
 * Start negotiation - send event proposal to partner
 */
router.post('/:eventId/propose', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { message } = req.body
    const userId = (req as any).userId

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Verify user owns the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    if (!action || !['accept', 'reject', 'counter_propose', 'pending_conversation'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        validActions: ['accept', 'reject', 'counter_propose', 'pending_conversation'],
      })
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
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

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    // Verify event exists and user is involved
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdByUser: {
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
        creator: event.createdByUser,
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

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' })
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
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
      totalRounds: history.length > 0 ? Math.max(...history.map((n) => n.roundNumber)) : 0,
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
        createdByUser: {
          select: { id: true, name: true },
        },
        category: {
          select: { name: true, emoji: true },
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
