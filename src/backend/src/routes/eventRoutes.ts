import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { pointsCalculator } from '../services/pointsCalculator.js'

const router = express.Router()
import prisma from '../lib/prisma.js'

// Validation schemas
const eventBaseSchema = z.object({
  type: z.string().min(1, 'Activity type is required').max(100).trim(),
  title: z.string().max(200).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  dateStart: z.string().datetime(),
  dateEnd: z.string().datetime(),
  hasChildren: z.boolean().optional().default(false),
  numChildren: z.number().int().min(0).max(10).optional().default(0),
  pointsBase: z.number().positive('Points must be positive').max(500),
  compensation: z.string().max(200).trim().optional(),
  compensationDiscount: z.number().min(0).max(1).optional().default(1.0),
})

const createEventSchema = eventBaseSchema.refine(
  d => new Date(d.dateStart) < new Date(d.dateEnd),
  { message: 'dateEnd must be after dateStart', path: ['dateEnd'] }
)

const updateEventSchema = eventBaseSchema.partial().refine(
  d => !d.dateStart || !d.dateEnd || new Date(d.dateStart) < new Date(d.dateEnd),
  { message: 'dateEnd must be after dateStart', path: ['dateEnd'] }
)

// Create event (activity request)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = createEventSchema.parse(req.body)

    // v2.5.9 audit 01 S1-R-16 — sin esta validación zod permitía
    // `numChildren=10` para una pareja sin hijos, multiplicando puntos
    // sin sentido (factor hijos × 2.2). El cap real es el menor entre
    // `couple.numChildren` y `Child.count`.
    if (data.numChildren && data.numChildren > 0) {
      const couple = await prisma.couple.findUnique({
        where: { id: req.coupleId },
        select: { numChildren: true, children: { select: { id: true } } },
      })
      const realCap = Math.max(couple?.numChildren ?? 0, couple?.children?.length ?? 0)
      if (data.numChildren > realCap) {
        res.status(400).json({
          error: `numChildren (${data.numChildren}) excede el número real de hijos de la pareja (${realCap}).`,
        })
        return
      }
    }

    // Aplica los multiplicadores canónicos (docs/PUNTOS.md) ya en la creación.
    // Antes guardábamos pointsCalculated = pointsBase, que dejaba la fórmula
    // (tipo × franja × duración × hijos) sin efecto en la ruta V1.
    // v2.4 fix audit 08 S0-2: incluimos compensationDiscount en el draft para
    // que el calculator lo aplique también en la creación (no sólo al accept).
    const draftEvent = {
      coupleId: req.coupleId,
      type: data.type,
      dateStart: new Date(data.dateStart),
      dateEnd: new Date(data.dateEnd),
      hasChildren: data.hasChildren,
      numChildren: data.numChildren,
      pointsBase: new Decimal(data.pointsBase),
      compensationDiscount: new Decimal(data.compensationDiscount),
    } as any
    const pointsCalculated = await pointsCalculator.calculateEventPoints(draftEvent, null)

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
        pointsCalculated,
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
        // createdBy / lastProposedBy are needed by the frontend to split
        // "pending for me to respond" vs "waiting for partner response".
        createdBy: e.createdBy,
        lastProposedBy: e.lastProposedBy,
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

    // Si cambia cualquier dato que afecta a la fórmula (tipo, fechas, hijos,
    // base, compensationDiscount) recalculamos pointsCalculated con los
    // multiplicadores. Antes se escribía pointsCalculated = pointsBase plano,
    // perdiendo la fórmula.
    // v2.4 fix audit 08 S0-2: incluimos compensationDiscount en merged para
    // que ediciones de compensación reflejen los puntos correctamente.
    const merged = {
      coupleId: event.coupleId,
      type: data.type ?? event.type,
      dateStart: data.dateStart ? new Date(data.dateStart) : event.dateStart,
      dateEnd: data.dateEnd ? new Date(data.dateEnd) : event.dateEnd,
      hasChildren: data.hasChildren ?? event.hasChildren,
      numChildren: data.numChildren ?? event.numChildren,
      pointsBase: data.pointsBase ? new Decimal(data.pointsBase) : event.pointsBase,
      compensationDiscount: data.compensationDiscount !== undefined
        ? new Decimal(data.compensationDiscount)
        : event.compensationDiscount,
    } as any
    const recalculated = await pointsCalculator.calculateEventPoints(merged, null)

    // v2.5.9 audit 01 S1-R-5 — `data.x && {…}` rechazaba strings vacíos y
    // ceros, así que el partner no podía limpiar `title`/`description`/
    // `compensation` ni bajar `compensationDiscount` a 0. Comparamos contra
    // `undefined` para distinguir "no enviado" de "enviado vacío".
    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.title !== undefined && { title: data.title || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.dateStart !== undefined && { dateStart: new Date(data.dateStart) }),
        ...(data.dateEnd !== undefined && { dateEnd: new Date(data.dateEnd) }),
        ...(data.hasChildren !== undefined && { hasChildren: data.hasChildren }),
        ...(data.numChildren !== undefined && { numChildren: data.numChildren }),
        ...(data.pointsBase !== undefined && { pointsBase: new Decimal(data.pointsBase) }),
        pointsCalculated: recalculated,
        ...(data.compensation !== undefined && { compensation: data.compensation || null }),
        ...(data.compensationDiscount !== undefined && { compensationDiscount: new Decimal(data.compensationDiscount) }),
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

export default router
