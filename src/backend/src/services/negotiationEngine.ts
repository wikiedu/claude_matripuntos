import { PrismaClient, Event, Negotiation } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

import prisma from '../lib/prisma.js'

/**
 * Negotiation Engine Service
 * Manages the 2-round negotiation flow for events
 *
 * States:
 * - draft: created, not sent
 * - proposed: awaiting response
 * - counter: counter-proposal made
 * - pending_conv: marked to discuss in person
 * - accepted: agreement reached
 * - rejected: no agreement
 */

export interface NegotiationResponse {
  action: 'accept' | 'reject' | 'counter_propose' | 'pending_conversation'
  pointsProposed?: number
  message?: string
}

export class NegotiationEngine {
  /**
   * Start negotiation (send event to partner)
   */
  async proposeEvent(
    eventId: string,
    proposerUserId: string,
    message?: string
  ): Promise<Event> {
    try {
      // Get event
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      })

      if (!event) {
        throw new Error('Event not found')
      }

      // Verify proposer is creator
      if (event.createdBy !== proposerUserId) {
        throw new Error('Only event creator can propose')
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: proposerUserId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Update event status
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: 'proposed',
          currentNegotiationRound: 1,
          lastProposedBy: proposerUserId,
          lastProposedPoints: event.pointsCalculated,
        },
      })

      // Create negotiation record
      await prisma.negotiation.create({
        data: {
          eventId,
          roundNumber: 1,
          proposedBy: proposerUserId,
          pointsProposed: event.pointsCalculated,
          message: message || null,
        },
      })

      // Create notification for partner
      const couple = await prisma.couple.findUnique({
        where: { id: user.coupleId ?? undefined },
        include: { users: true },
      })

      const partner = couple?.users.find((u: { id: string }) => u.id !== proposerUserId)

      if (partner) {
        await prisma.notification.create({
          data: {
            coupleId: user.coupleId ?? '',
            userId: partner.id,
            type: 'event_proposed',
            title: `${user.name} propuso una actividad`,
            message: `${event.title || event.type} - ${event.pointsCalculated} puntos`,
            relatedEventId: eventId,
          },
        })
      }

      return updatedEvent
    } catch (error) {
      console.error('Error proposing event:', error)
      throw error
    }
  }

  /**
   * Respond to event proposal
   */
  async respondToProposal(
    eventId: string,
    responderId: string,
    response: NegotiationResponse
  ): Promise<Event> {
    try {
      // Get event
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      })

      if (!event) {
        throw new Error('Event not found')
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: responderId },
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Verify responder is not creator
      if (event.createdBy === responderId) {
        throw new Error('Creator cannot respond to own proposal')
      }

      // Get last negotiation
      const lastNegotiation = await prisma.negotiation.findFirst({
        where: { eventId },
        orderBy: { roundNumber: 'desc' },
      })

      if (!lastNegotiation) {
        throw new Error('No negotiation found')
      }

      // v2.4 audit 02 S0 — todas las mutaciones de respond viven en una sola
      // $transaction. Antes el accept hacía updateMany→find→negotiation.create→
      // pointsTransaction.create fuera de transaction; un crash a mitad dejaba
      // el evento accepted SIN saldo, rompiendo la invariante "saldo == suma
      // transactions". Con $transaction o todo se aplica o nada.
      const updatedEvent: Event = await prisma.$transaction(async (tx) => {
        let result: Event
        switch (response.action) {
          case 'accept': {
            // Atomic state transition: only the first concurrent accept succeeds.
            const accepted = await tx.event.updateMany({
              where: {
                id: eventId,
                status: { in: ['draft', 'pending', 'proposed', 'counter_proposal'] },
              },
              data: {
                status: 'accepted',
                pointsAgreed: lastNegotiation.pointsProposed,
              },
            })
            if (accepted.count === 0) {
              throw new Error('Event already resolved')
            }
            result = await tx.event.findUniqueOrThrow({ where: { id: eventId } })

            await tx.negotiation.create({
              data: {
                eventId,
                roundNumber: lastNegotiation.roundNumber,
                respondedBy: responderId,
                responseType: 'accepted',
                respondedAt: new Date(),
                pointsProposed: lastNegotiation.pointsProposed,
              },
            })

            // Proposer loses points (negative transaction). Si esta línea falla
            // por cualquier motivo (ej. constraint UNIQUE en relatedEventId),
            // toda la $transaction hace rollback y el evento queda como estaba.
            await tx.pointsTransaction.create({
              data: {
                coupleId: user.coupleId ?? '',
                userId: event.createdBy!,
                type: 'event_accepted',
                relatedEventId: eventId,
                amount: new Decimal(-lastNegotiation.pointsProposed!),
                description: `Actividad aceptada: ${event.title || event.type}`,
              },
            })
            return result
          }

          case 'reject':
            result = await tx.event.update({
              where: { id: eventId },
              data: { status: 'rejected' },
            })
            await tx.negotiation.create({
              data: {
                eventId,
                roundNumber: lastNegotiation.roundNumber,
                respondedBy: responderId,
                responseType: 'rejected',
                respondedAt: new Date(),
                message: response.message || null,
                pointsProposed: lastNegotiation.pointsProposed,
              },
            })
            return result

          case 'counter_propose':
            if (lastNegotiation.roundNumber >= 2) {
              throw new Error('Maximum 2 negotiation rounds allowed')
            }
            if (!response.pointsProposed) {
              throw new Error('Points must be provided for counter proposal')
            }
            // v2.5.4 audit 12 S1-Q-4 — lock optimista: dos counter_propose
            // simultáneos sobre el mismo evento eran race (last write wins).
            // updateMany con status guard hace que solo el primero gane y
            // el segundo reciba 409 'Event already resolved'.
            const counterTransition = await tx.event.updateMany({
              where: {
                id: eventId,
                status: { in: ['draft', 'pending', 'proposed'] },
              },
              data: {
                status: 'counter_proposal',
                currentNegotiationRound: 2,
                lastProposedBy: responderId,
                lastProposedPoints: response.pointsProposed,
                justification: response.message || null,
              },
            })
            if (counterTransition.count === 0) {
              throw new Error('Event already resolved')
            }
            result = await tx.event.findUniqueOrThrow({ where: { id: eventId } })
            await tx.negotiation.create({
              data: {
                eventId,
                roundNumber: 2,
                proposedBy: responderId,
                pointsProposed: response.pointsProposed,
                message: response.message || null,
                responseType: 'counter_proposed',
                respondedAt: new Date(),
              },
            })
            return result

          case 'pending_conversation':
            result = await tx.event.update({
              where: { id: eventId },
              data: { status: 'pending_conversation' },
            })
            await tx.negotiation.create({
              data: {
                eventId,
                roundNumber: lastNegotiation.roundNumber,
                respondedBy: responderId,
                responseType: 'pending_conversation',
                respondedAt: new Date(),
                message: response.message || null,
                pointsProposed: lastNegotiation.pointsProposed,
              },
            })
            return result

          default:
            throw new Error('Invalid response action')
        }
      })

      // Notify creator of response
      const creator = await prisma.user.findUnique({
        where: { id: event.createdBy! },
      })

      if (creator) {
        const actionLabels = {
          accept: 'aceptó',
          reject: 'rechazó',
          counter_propose: 'contra-propuso',
          pending_conversation: 'quiere hablar en persona sobre',
        }

        await prisma.notification.create({
          data: {
            coupleId: user.coupleId ?? '',
            userId: creator.id,
            type: 'event_response',
            title: `${user.name} ${actionLabels[response.action]} la actividad`,
            message:
              response.pointsProposed && response.action === 'counter_propose'
                ? `Nuevos puntos propuestos: ${response.pointsProposed}`
                : event.title || event.type,
            relatedEventId: eventId,
          },
        })
      }

      return updatedEvent
    } catch (error) {
      console.error('Error responding to proposal:', error)
      throw error
    }
  }

  /**
   * Get full negotiation history
   */
  async getNegotiationHistory(eventId: string): Promise<any> {
    try {
      const negotiations = await prisma.negotiation.findMany({
        where: { eventId },
        include: {
          proposer: {
            select: { id: true, name: true, email: true },
          },
          responder: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { roundNumber: 'asc' },
      })

      return negotiations
    } catch (error) {
      console.error('Error getting negotiation history:', error)
      throw error
    }
  }

  /**
   * Get negotiation summary
   */
  async getNegotiationStatus(eventId: string): Promise<any> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      })

      if (!event) {
        throw new Error('Event not found')
      }

      const negotiations = await this.getNegotiationHistory(eventId)

      return {
        eventId,
        status: event.status,
        currentRound: event.currentNegotiationRound,
        maxRounds: 2,
        proposedPoints: event.lastProposedPoints,
        agreedPoints: event.pointsAgreed,
        negotiationHistory: negotiations,
        canCounterPropose: event.currentNegotiationRound === 1,
        isFinalized:
          event.status === 'accepted' ||
          event.status === 'rejected' ||
          event.status === 'pending_conversation',
      }
    } catch (error) {
      console.error('Error getting negotiation status:', error)
      throw error
    }
  }
}

export const negotiationEngine = new NegotiationEngine()
