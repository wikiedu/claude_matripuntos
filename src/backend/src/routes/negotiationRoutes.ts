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
import { logger } from '../lib/logger.js'
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
  // v1.6.2 fix S1-7: límite contra DoS por payload gigante.
  message: z.string().max(2000).optional(),
})

const respondNegotiationSchema = z.object({
  responseType: z.enum(['accepted', 'rejected', 'counter_proposed']),
  pointsProposed: z.number().positive('Points must be positive').optional(),
  // v1.6.2 fix S1-7: límite contra DoS por payload gigante.
  message: z.string().max(2000).optional(),
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

    // The proposer of a round cannot resolve it themselves: accepting/rejecting
    // a round triggers a PointsTransaction against event.createdBy without the
    // partner's consent. Consensus requires the *other* user to respond.
    // Mirrors ruleProposals.ts and configurationProposalService.ts.
    if (negotiation.proposedBy === req.userId) {
      res.status(403).json({ error: 'No puedes responder a tu propia propuesta' })
      return
    }

    if (negotiation.responseType !== 'awaiting') {
      // Stale/stuck states happen for two reasons:
      //   a) Another tab already responded — a newer round may now be awaiting.
      //   b) An old partial failure left event.status='pending' with no
      //      awaiting negotiation at all (pre-migration data).
      // For (a) we tell the client which round to retry against. For (b) we
      // auto-heal by flipping the latest round back to 'awaiting', same logic
      // as migration 20260422000000_actividades_negotiation_fixes, so the user
      // can respond without needing a manual DB repair.
      if (negotiation.event.status !== 'pending') {
        res.status(400).json({ error: 'Negotiation already responded to' })
        return
      }

      const existingAwaiting = await prisma.negotiation.findFirst({
        where: { eventId: negotiation.eventId, responseType: 'awaiting' },
      })
      if (existingAwaiting) {
        res.status(409).json({
          error: 'Esta ronda ya fue respondida. Hay una ronda más reciente pendiente.',
          awaitingNegotiationId: existingAwaiting.id,
        })
        return
      }

      const latest = await prisma.negotiation.findFirst({
        where: { eventId: negotiation.eventId },
        orderBy: { roundNumber: 'desc' },
      })
      if (!latest || latest.id !== req.params.negotiationId) {
        res.status(400).json({ error: 'Negotiation already responded to' })
        return
      }

      await prisma.negotiation.update({
        where: { id: latest.id },
        data: { responseType: 'awaiting', respondedBy: null, respondedAt: null },
      })
      // Sync the in-memory copy so downstream reads and the transaction guard
      // see the repaired state.
      negotiation.responseType = 'awaiting'
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

          // v2.4 fix audit 08 S0-3: enforce maxFreeRounds para planes free.
          // Antes el cap estaba en schema pero nunca se chequeaba → rondas
          // ilimitadas para todos. Ahora: lee Subscription de la pareja, y si
          // no es premium/pro, lanza 403 cuando nextRound > maxFreeRounds.
          const subscription = await tx.subscription.findUnique({
            where: { coupleId: negotiation.event.coupleId },
            select: { plan: true, endsAt: true },
          })
          const isActivePremium =
            subscription &&
            (subscription.plan === 'premium' || subscription.plan === 'pro') &&
            (!subscription.endsAt || subscription.endsAt > new Date())
          const maxFreeRounds = negotiation.event.maxFreeRounds ?? 2
          if (!isActivePremium && nextRound > maxFreeRounds) {
            // Throwing aborta la $transaction. RespondError lo mapea a 403.
            throw new RespondError(
              403,
              `Has agotado las ${maxFreeRounds} rondas gratuitas de negociación. ` +
              `Actualiza a Premium para rondas ilimitadas, o usa "Forzar" para cerrar el evento.`,
            )
          }

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
    // v2.8.0 audit 02 S2-11 · Fase 2 C.2 — V1 engine detrás de feature flag,
    // ahora OPT-IN (mismo patrón que taskRoutes). El sistema canónico es V2
    // (checkAllAchievements llamado abajo); el frontend ya no consume V1.
    // Rollback: LEGACY_ACHIEVEMENTS_ENABLED=true en Render.
    if (data.responseType === 'accepted') {
      if (negotiation.proposedBy && process.env.LEGACY_ACHIEVEMENTS_ENABLED === 'true') {
        try {
          await achievementEngine.checkAchievements(
            negotiation.proposedBy,
            req.coupleId,
            { type: 'event_accepted', eventId: negotiation.eventId }
          )
        } catch (achErr) {
          logger.error({ err: achErr }, 'Achievement check error (non-fatal)')
        }
      }
      try {
        await updateDailyStreak(req.coupleId)
        await calculateAndSaveXP(req.coupleId)
        await checkAllAchievements(req.coupleId)
      } catch (gamErr) {
        logger.error({ err: gamErr }, 'Gamification update error (non-fatal)')
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
      logger.error({ err: notifError }, 'Failed to send response notification')
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

    // v2.4 audit 08 S0-5: solo el creador del evento puede forzar.
    // Antes cualquier user del couple podía forzar el evento de su pareja,
    // pagando de su propio saldo — semánticamente incorrecto y útil sólo
    // como vector de abuso.
    if (negotiation.event.createdBy !== req.userId) {
      res.status(403).json({
        error: 'Solo el creador del evento puede forzar la aceptación',
      })
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

    // v2.4 audit 08 S0-5: el cambio de estado y la creación de la
    // pointsTransaction viven en una sola $transaction. Antes el create
    // estaba fuera y un crash a mitad dejaba evento `forced` SIN cargo —
    // ledger roto.
    try {
      await prisma.$transaction(async (tx) => {
        const eventTransition = await tx.event.updateMany({
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
          throw new RespondError(409, 'Event already resolved')
        }

        await tx.pointsTransaction.create({
          data: {
            coupleId: req.coupleId!,
            userId: req.userId!,
            type: 'forced_payment',
            relatedEventId: negotiation.eventId,
            amount: negotiation.pointsProposed.negated(),
            description: `Forced agreement for: ${negotiation.event.type}`,
          },
        })
      })
    } catch (txErr) {
      if (txErr instanceof RespondError) {
        res.status(txErr.status).json({ error: txErr.message })
        return
      }
      throw txErr
    }

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
