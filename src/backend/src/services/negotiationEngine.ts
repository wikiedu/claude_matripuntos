import { PrismaClient, Event, Negotiation } from '@prisma/client'

const prisma = new PrismaClient()

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
        where: { id: user.coupleId },
        include: { users: true },
      })

      const partner = couple?.users.find((u) => u.id !== proposerUserId)

      if (partner) {
        await prisma.notification.create({
          data: {
            coupleId: user.coupleId,
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

      let updatedEvent: Event

      switch (response.action) {
        case 'accept':
          updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: {
              status: 'accepted',
              pointsAgreed: lastNegotiation.pointsProposed,
            },
          })

          // Record acceptance
          await prisma.negotiation.create({
            data: {
              eventId,
              roundNumber: lastNegotiation.roundNumber,
              respondedBy: responderId,
              responseType: 'accepted',
              respondedAt: new Date(),
            },
          })
          break

        case 'reject':
          updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: {
              status: 'rejected',
            },
          })

          await prisma.negotiation.create({
            data: {
              eventId,
              roundNumber: lastNegotiation.roundNumber,
              respondedBy: responderId,
              responseType: 'rejected',
              respondedAt: new Date(),
              message: response.message || null,
            },
          })
          break

        case 'counter_propose':
          // Check if we're on round 1 (can go to round 2)
          if (lastNegotiation.roundNumber >= 2) {
            throw new Error('Maximum 2 negotiation rounds allowed')
          }

          if (!response.pointsProposed) {
            throw new Error('Points must be provided for counter proposal')
          }

          updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: {
              status: 'counter_proposal',
              currentNegotiationRound: 2,
              lastProposedBy: responderId,
              lastProposedPoints: response.pointsProposed,
              justification: response.message || null,
            },
          })

          // Record counter proposal
          await prisma.negotiation.create({
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
          break

        case 'pending_conversation':
          updatedEvent = await prisma.event.update({
            where: { id: eventId },
            data: {
              status: 'pending_conversation',
            },
          })

          await prisma.negotiation.create({
            data: {
              eventId,
              roundNumber: lastNegotiation.roundNumber,
              respondedBy: responderId,
              responseType: 'pending_conversation',
              respondedAt: new Date(),
              message: response.message || null,
            },
          })
          break

        default:
          throw new Error('Invalid response action')
      }

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
            coupleId: user.coupleId,
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
