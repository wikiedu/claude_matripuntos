import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
import prisma from '../lib/prisma.js'

// Validation schemas
const createEventSchema = z.object({
  type: z.string().min(1, 'Activity type is required'),
  title: z.string().optional(),
  description: z.string().optional(),
  dateStart: z.string().datetime(),
  dateEnd: z.string().datetime(),
  hasChildren: z.boolean().optional().default(false),
  numChildren: z.number().optional().default(0),
  pointsBase: z.number().positive('Points must be positive'),
  compensation: z.string().optional(),
  compensationDiscount: z.number().optional().default(1.0),
})

const updateEventSchema = createEventSchema.partial()

// Create event (activity request)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = createEventSchema.parse(req.body)

    const event = await prisma.event.create({
      data: {
        coupleId: req.coupleId,
        createdBy: req.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        dateStart: new Date(data.dateStart),
        dateEnd: new Date(data.dateEnd),
        hasChildren: data.hasChildren,
        numChildren: data.numChildren,
        pointsBase: new Decimal(data.pointsBase),
        pointsCalculated: new Decimal(data.pointsBase),
        compensation: data.compensation,
        compensationDiscount: new Decimal(data.compensationDiscount),
        status: 'draft',
      },
      include: {
        creator: true,
        negotiations: true,
      },
    })

    res.status(201).json({
      message: 'Activity request created',
      event: {
        id: event.id,
        type: event.type,
        title: event.title,
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        pointsBase: event.pointsBase.toString(),
        pointsCalculated: event.pointsCalculated.toString(),
        status: event.status,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to create event'
    res.status(400).json({ error: message })
  }
})

// Get all events for couple
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const status = req.query.status as string | undefined
    const where: any = { coupleId: req.coupleId }
    if (status) where.status = status

    const events = await prisma.event.findMany({
      where,
      include: {
        creator: true,
        negotiations: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({
      events: events.map(e => ({
        id: e.id,
        type: e.type,
        title: e.title,
        dateStart: e.dateStart,
        dateEnd: e.dateEnd,
        hasChildren: e.hasChildren,
        numChildren: e.numChildren,
        pointsBase: e.pointsBase.toString(),
        pointsCalculated: e.pointsCalculated.toString(),
        pointsAgreed: e.pointsAgreed?.toString() || null,
        status: e.status,
        negotiationRound: e.negotiationRound,
        creator: e.creator ? {
          id: e.creator.id,
          name: e.creator.name,
        } : null,
        negotiations: (e.negotiations || []).map((n: any) => ({
          id: n.id,
          roundNumber: n.roundNumber,
          pointsProposed: n.pointsProposed.toString(),
          message: n.message,
          responseType: n.responseType,
          proposedBy: n.proposedBy,
          respondedAt: n.respondedAt,
        })),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch events'
    res.status(400).json({ error: message })
  }
})

// Get single event
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        coupleId: req.coupleId,
      },
      include: {
        creator: true,
        negotiations: {
          include: {
            proposer: true,
            responder: true,
          },
          orderBy: { roundNumber: 'asc' },
        },
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    res.json({
      event: {
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
        hasChildren: event.hasChildren,
        numChildren: event.numChildren,
        pointsBase: event.pointsBase.toString(),
        pointsCalculated: event.pointsCalculated.toString(),
        pointsAgreed: event.pointsAgreed?.toString() || null,
        status: event.status,
        negotiationRound: event.negotiationRound,
        maxFreeRounds: event.maxFreeRounds,
        compensation: event.compensation,
        compensationDiscount: event.compensationDiscount.toString(),
        creator: event.creator ? {
          id: event.creator.id,
          name: event.creator.name,
          email: event.creator.email,
        } : null,
        negotiations: event.negotiations.map(n => ({
          id: n.id,
          roundNumber: n.roundNumber,
          pointsProposed: n.pointsProposed.toString(),
          message: n.message,
          responseType: n.responseType,
          proposedBy: n.proposedBy,  // needed for isMyTurn check in RequestInbox
          proposer: n.proposer ? { id: n.proposer.id, name: n.proposer.name } : null,
          responder: n.responder ? { id: n.responder.id, name: n.responder.name } : null,
          respondedAt: n.respondedAt,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    res.status(400).json({ error: message })
  }
})

// Update event
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = updateEventSchema.parse(req.body)

    // Verify ownership
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        coupleId: req.coupleId,
        createdBy: req.userId,
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found or you do not have permission to update it' })
      return
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...(data.type && { type: data.type }),
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.dateStart && { dateStart: new Date(data.dateStart) }),
        ...(data.dateEnd && { dateEnd: new Date(data.dateEnd) }),
        ...(data.hasChildren !== undefined && { hasChildren: data.hasChildren }),
        ...(data.numChildren !== undefined && { numChildren: data.numChildren }),
        ...(data.pointsBase && { pointsCalculated: new Decimal(data.pointsBase) }),
        ...(data.compensation && { compensation: data.compensation }),
        ...(data.compensationDiscount && { compensationDiscount: new Decimal(data.compensationDiscount) }),
      },
    })

    res.json({ message: 'Event updated', event: { id: updated.id } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to update event'
    res.status(400).json({ error: message })
  }
})

// Delete event (only draft events)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const event = await prisma.event.findFirst({
      where: {
        id: req.params.id,
        coupleId: req.coupleId,
        createdBy: req.userId,
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    if (event.status !== 'draft') {
      res.status(400).json({ error: 'Can only delete draft events' })
      return
    }

    await prisma.event.delete({
      where: { id: req.params.id },
    })

    res.json({ message: 'Event deleted' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete event'
    res.status(400).json({ error: message })
  }
})

import { Decimal } from '@prisma/client/runtime/library'

export default router
