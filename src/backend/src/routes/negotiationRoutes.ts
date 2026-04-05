import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AchievementEngine } from '../services/achievementEngine.js'

const router = express.Router()
const prisma = new PrismaClient()
const achievementEngine = new AchievementEngine(prisma)

// Validation schemas
const createNegotiationSchema = z.object({
  eventId: z.string().cuid('Invalid event ID'),
  pointsProposed: z.number().positive('Points must be positive'),
  message: z.string().optional(),
})

const respondNegotiationSchema = z.object({
  responseType: z.enum(['accepted', 'rejected', 'counter_proposed']),
  pointsProposed: z.number().positive('Points must be positive').optional(),
  message: z.string().optional(),
})

// Create initial negotiation (propose activity)
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = createNegotiationSchema.parse(req.body)

    // Verify event belongs to couple and is draft
    const event = await prisma.event.findFirst({
      where: {
        id: data.eventId,
        coupleId: req.coupleId,
        status: 'draft',
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found or not in draft status' })
      return
    }

    // Create first negotiation round
    const negotiation = await prisma.negotiation.create({
      data: {
        eventId: data.eventId,
        roundNumber: 1,
        proposedBy: req.userId,
        pointsProposed: new Decimal(data.pointsProposed),
        message: data.message,
        responseType: 'awaiting',
      },
      include: {
        proposer: true,
      },
    })

    // Update event status
    await prisma.event.update({
      where: { id: data.eventId },
      data: {
        status: 'pending',
        negotiationRound: 1,
        pointsCalculated: new Decimal(data.pointsProposed),
      },
    })

    res.status(201).json({
      message: 'Activity proposal sent',
      negotiation: {
        id: negotiation.id,
        eventId: negotiation.eventId,
        roundNumber: negotiation.roundNumber,
        pointsProposed: negotiation.pointsProposed.toString(),
        responseType: negotiation.responseType,
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
    const message = error instanceof Error ? error.message : 'Failed to create negotiation'
    res.status(400).json({ error: message })
  }
})

// Respond to negotiation
router.put('/:negotiationId/respond', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = respondNegotiationSchema.parse(req.body)

    // Verify negotiation exists and belongs to couple
    const negotiation = await prisma.negotiation.findFirst({
      where: {
        id: req.params.negotiationId,
        event: {
          coupleId: req.coupleId,
        },
      },
      include: {
        event: true,
      },
    })

    if (!negotiation) {
      res.status(404).json({ error: 'Negotiation not found' })
      return
    }

    if (negotiation.responseType !== 'awaiting') {
      res.status(400).json({ error: 'Negotiation already responded to' })
      return
    }

    // Update current negotiation
    const updated = await prisma.negotiation.update({
      where: { id: req.params.negotiationId },
      data: {
        responseType: data.responseType,
        respondedBy: req.userId,
        respondedAt: new Date(),
      },
    })

    // Handle response
    if (data.responseType === 'accepted') {
      // Accept the proposal
      await prisma.event.update({
        where: { id: negotiation.eventId },
        data: {
          status: 'accepted',
          pointsAgreed: negotiation.pointsProposed,
        },
      })

      const creatorId = negotiation.event.createdBy
      if (!creatorId) {
        res.status(400).json({ error: 'Event creator not found' })
        return
      }

      // Negative transaction for event creator (they requested the activity)
      await prisma.pointsTransaction.create({
        data: {
          coupleId: req.coupleId,
          userId: creatorId,
          type: 'event_accepted',
          relatedEventId: negotiation.eventId,
          amount: new Decimal(-negotiation.pointsProposed),
          description: `Actividad aceptada: ${negotiation.event.title || negotiation.event.type}`,
        },
      })

      // Positive transaction for the partner who accepted (they cover for the creator)
      await prisma.pointsTransaction.create({
        data: {
          coupleId: req.coupleId,
          userId: req.userId!,
          type: 'event_accepted_credit',
          relatedEventId: negotiation.eventId,
          amount: new Decimal(negotiation.pointsProposed),
          description: `Cobertura acordada: ${negotiation.event.title || negotiation.event.type}`,
        },
      })

      // Trigger achievement check
      if (negotiation.proposedBy) {
        await achievementEngine.checkAchievements(
          negotiation.proposedBy,
          req.coupleId,
          { type: 'event_accepted', eventId: negotiation.eventId }
        )
      }
    } else if (data.responseType === 'counter_proposed') {
      // Counter-propose
      if (!data.pointsProposed) {
        res.status(400).json({ error: 'Points must be provided for counter-proposal' })
        return
      }

      const nextRound = negotiation.event.negotiationRound + 1
      const canCreateFreeRound = nextRound <= negotiation.event.maxFreeRounds

      if (!canCreateFreeRound) {
        // Check if couple has premium
        const subscription = await prisma.subscription.findUnique({
          where: { coupleId: req.coupleId },
        })

        if (subscription?.plan === 'free') {
          res.status(400).json({
            error: 'Free negotiation rounds exhausted. Upgrade to premium for more rounds.',
          })
          return
        }
      }

      // Create new negotiation round
      await prisma.negotiation.create({
        data: {
          eventId: negotiation.eventId,
          roundNumber: nextRound,
          proposedBy: req.userId,
          pointsProposed: new Decimal(data.pointsProposed),
          message: data.message,
          responseType: 'awaiting',
        },
      })

      // Update event
      await prisma.event.update({
        where: { id: negotiation.eventId },
        data: {
          negotiationRound: nextRound,
          pointsCalculated: new Decimal(data.pointsProposed),
        },
      })
    } else {
      // Rejected
      await prisma.event.update({
        where: { id: negotiation.eventId },
        data: {
          status: 'rejected',
        },
      })
    }

    res.json({
      message: 'Negotiation response recorded',
      negotiation: {
        id: updated.id,
        responseType: updated.responseType,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to respond to negotiation'
    res.status(400).json({ error: message })
  }
})

// Get negotiations for event
router.get('/event/:eventId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Verify event belongs to couple
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
        coupleId: req.coupleId,
      },
    })

    if (!event) {
      res.status(404).json({ error: 'Event not found' })
      return
    }

    const negotiations = await prisma.negotiation.findMany({
      where: { eventId: req.params.eventId },
      include: {
        proposer: true,
        responder: true,
      },
      orderBy: { roundNumber: 'asc' },
    })

    res.json({
      negotiations: negotiations.map(n => ({
        id: n.id,
        roundNumber: n.roundNumber,
        pointsProposed: n.pointsProposed.toString(),
        message: n.message,
        responseType: n.responseType,
        proposer: n.proposer ? {
          id: n.proposer.id,
          name: n.proposer.name,
        } : null,
        responder: n.responder ? {
          id: n.responder.id,
          name: n.responder.name,
        } : null,
        respondedAt: n.respondedAt,
        createdAt: n.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch negotiations'
    res.status(400).json({ error: message })
  }
})

// Force agreement using matripuntos
router.post('/:negotiationId/force', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Verify negotiation exists
    const negotiation = await prisma.negotiation.findFirst({
      where: {
        id: req.params.negotiationId,
        event: {
          coupleId: req.coupleId,
        },
      },
      include: {
        event: true,
      },
    })

    if (!negotiation) {
      res.status(404).json({ error: 'Negotiation not found' })
      return
    }

    // Check user has enough points
    const userBalance = await prisma.pointsTransaction.aggregate({
      where: {
        coupleId: req.coupleId,
        userId: req.userId,
      },
      _sum: {
        amount: true,
      },
    })

    const balance = userBalance._sum.amount?.toNumber() || 0
    const requiredPoints = negotiation.pointsProposed.toNumber()

    if (balance < requiredPoints) {
      res.status(400).json({
        error: 'Insufficient matripuntos to force agreement',
        available: balance,
        required: requiredPoints,
      })
      return
    }

    // Accept the points and deduct from balance
    await prisma.event.update({
      where: { id: negotiation.eventId },
      data: {
        status: 'forced',
        pointsAgreed: negotiation.pointsProposed,
      },
    })

    // Create deduction transaction
    await prisma.pointsTransaction.create({
      data: {
        coupleId: req.coupleId,
        userId: req.userId,
        type: 'forced_payment',
        relatedEventId: negotiation.eventId,
        amount: negotiation.pointsProposed.negated(),
        description: `Forced agreement for: ${negotiation.event.type}`,
      },
    })

    res.json({
      message: 'Agreement forced',
      event: {
        id: negotiation.eventId,
        status: 'forced',
        pointsAgreed: negotiation.pointsProposed.toString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to force agreement'
    res.status(400).json({ error: message })
  }
})

export default router
