import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AchievementEngine } from '../services/achievementEngine.js'
import { updateDailyStreak, calculateAndSaveXP } from '../services/gamificationService.js'
import { checkAllAchievements } from '../services/achievementCheckService.js'
import { notifyEventResponded } from '../services/notificationService.js'

const router = express.Router()
import prisma from '../lib/prisma.js'
const achievementEngine = new AchievementEngine(prisma)

// Sentinel error used inside $transaction blocks to roll back with a specific
// HTTP status. Throwing aborts the transaction; the outer catch maps it back
// to an HTTP response.
class RespondError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'RespondError'
  }
}

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
        lastProposedBy: req.userId,
        lastProposedPoints: new Decimal(data.pointsProposed),
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

    // Validate counter-proposal inputs BEFORE any writes. Previously the
    // state transition was flipped first and only then validated, which left
    // events stuck in a broken intermediate state on validation failure
    // (responseType !== 'awaiting' but no new round created).
    if (data.responseType === 'counter_proposed' && !data.pointsProposed) {
      res.status(400).json({ error: 'Points must be provided for counter-proposal' })
      return
    }

    // Atomic state transition: only the first request to flip responseType off
    // 'awaiting' proceeds. Prevents concurrent responses from double-awarding points.
    // Downstream writes are wrapped in $transaction so any failure rolls back
    // the transition and leaves the negotiation in its original 'awaiting' state.
    try {
      await prisma.$transaction(async (tx) => {
        const transition = await tx.negotiation.updateMany({
          where: { id: req.params.negotiationId, responseType: 'awaiting' },
          data: {
            responseType: data.responseType,
            respondedBy: req.userId!,
            respondedAt: new Date(),
          },
        })
        if (transition.count === 0) {
          throw new RespondError(409, 'Negotiation already responded to')
        }

        if (data.responseType === 'accepted') {
          // Accept the proposal — guarded on event.status so a concurrent force
          // on the same event cannot be overwritten (and vice versa).
          const acceptTransition = await tx.event.updateMany({
            where: {
              id: negotiation.eventId,
              status: { in: ['draft', 'pending'] },
            },
            data: {
              status: 'accepted',
              pointsAgreed: negotiation.pointsProposed,
            },
          })
          if (acceptTransition.count === 0) {
            throw new RespondError(409, 'Event already resolved')
          }

          const creatorId = negotiation.event.createdBy
          if (!creatorId) {
            throw new RespondError(400, 'Event creator not found')
          }

          await tx.pointsTransaction.create({
            data: {
              coupleId: req.coupleId!,
              userId: creatorId,
              type: 'event_accepted',
              relatedEventId: negotiation.eventId,
              amount: new Decimal(-negotiation.pointsProposed),
              description: `Actividad aceptada: ${negotiation.event.title || negotiation.event.type}`,
            },
          })
        } else if (data.responseType === 'counter_proposed') {
          const nextRound = negotiation.event.negotiationRound + 1

          // MVP: no premium plan implementation yet, so we do not enforce the
          // maxFreeRounds cap. The schema column + lifecycle are preserved for
          // when premium ships. The default was bumped to a large value so that
          // existing rows never trip the check either.

          await tx.negotiation.create({
            data: {
              eventId: negotiation.eventId,
              roundNumber: nextRound,
              proposedBy: req.userId!,
              pointsProposed: new Decimal(data.pointsProposed!),
              message: data.message,
              responseType: 'awaiting',
            },
          })

          await tx.event.update({
            where: { id: negotiation.eventId },
            data: {
              negotiationRound: nextRound,
              pointsCalculated: new Decimal(data.pointsProposed!),
              lastProposedBy: req.userId!,
              lastProposedPoints: new Decimal(data.pointsProposed!),
            },
          })
        } else {
          await tx.event.update({
            where: { id: negotiation.eventId },
            data: { status: 'rejected' },
          })
        }
      })
    } catch (txErr) {
      if (txErr instanceof RespondError) {
        res.status(txErr.status).json({ error: txErr.message })
        return
      }
      throw txErr
    }

    // Side effects that must run AFTER the transaction has committed.
    // These are non-fatal for the response itself: on failure we log and
    // continue so the user still sees success.
    if (data.responseType === 'accepted') {
      if (negotiation.proposedBy) {
        try {
          await achievementEngine.checkAchievements(
            negotiation.proposedBy,
            req.coupleId,
            { type: 'event_accepted', eventId: negotiation.eventId }
          )
        } catch (achErr) {
          console.error('Achievement check error (non-fatal):', achErr)
        }
      }
      try {
        await updateDailyStreak(req.coupleId)
        await calculateAndSaveXP(req.coupleId)
        await checkAllAchievements(req.coupleId)
      } catch (gamErr) {
        console.error('Gamification update error (non-fatal):', gamErr)
      }
    }

    // Notify the event creator about the partner's response
    try {
      await notifyEventResponded(
        negotiation.eventId,
        req.coupleId,
        req.userId,
        data.responseType as 'accepted' | 'rejected' | 'counter_proposed',
        negotiation.event?.title || negotiation.event?.type || 'Actividad'
      )
    } catch (notifError) {
      // Non-fatal: log but don't fail the request
      console.error('Failed to send response notification:', notifError)
    }

    res.json({
      message: 'Negotiation response recorded',
      negotiation: {
        id: req.params.negotiationId,
        responseType: data.responseType,
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

    // Atomic state transition: event must still be in a pre-resolved state.
    // If another request accepted/rejected/forced concurrently, updateMany returns
    // count=0 and we bail out — no duplicate forced_payment transaction is created.
    const eventTransition = await prisma.event.updateMany({
      where: {
        id: negotiation.eventId,
        status: { in: ['draft', 'pending'] },
      },
      data: {
        status: 'forced',
        pointsAgreed: negotiation.pointsProposed,
      },
    })
    if (eventTransition.count === 0) {
      res.status(409).json({ error: 'Event already resolved' })
      return
    }

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
