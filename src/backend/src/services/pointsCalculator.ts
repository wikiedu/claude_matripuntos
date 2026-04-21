import { PrismaClient, Event, User } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

import prisma from '../lib/prisma.js'

/**
 * Points Calculator Service
 * Implements the complex V2 points formula with 15+ multipliers
 *
 * Formula: basePoints × timeMultiplier × dayMultiplier × workMultiplier ×
 *          childrenMultiplier × impactMultiplier
 */

interface PointsContext {
  event: Event
  user: User
  couple: any // Couple with children
  creatorUser: User | null
}

export class PointsCalculator {
  /**
   * Get time-of-day multiplier (Lote 4 rebalance)
   * 07:00-09:30 → ×1.3 (mañana rutina)
   * 09:30-17:30 → ×1.0 (horario normal)
   * 17:30-21:30 → ×1.2 (tarde/cenas)
   * 21:30-01:00 → ×1.2 (noche)
   * 01:00-07:00 → ×1.5 (madrugada)
   */
  private getTimeMultiplier(dateStart: Date): number {
    const d = new Date(dateStart)
    const hours = d.getHours()
    const minutes = d.getMinutes()
    const totalMinutes = hours * 60 + minutes

    if (totalMinutes >= 7*60 && totalMinutes < 9*60+30) return 1.3   // 07:00-09:30 mañana rutina
    if (totalMinutes >= 9*60+30 && totalMinutes < 17*60+30) return 1.0 // 09:30-17:30 horario normal
    if (totalMinutes >= 17*60+30 && totalMinutes < 21*60+30) return 1.2 // 17:30-21:30 tarde/cenas
    if (totalMinutes >= 21*60+30 || totalMinutes < 1*60) return 1.2   // 21:30-01:00 noche
    return 1.5 // 01:00-07:00 madrugada
  }

  /**
   * Get day-of-week multiplier
   * Weekday: ×1.0
   * Saturday: ×1.15
   * Sunday: ×1.2
   */
  private getDayMultiplier(dateStart: Date): number {
    const day = new Date(dateStart).getDay()

    if (day === 0) return 1.2  // Sunday
    if (day === 6) return 1.15 // Saturday
    return 1.0                 // Weekday
  }

  /**
   * Check if user worked that day
   * If yes: ×1.2
   * If no: ×1.0
   */
  private async getWorkMultiplier(userId: string, eventDate: Date): Promise<number> {
    // Check if user has any work-related events that day
    const dayStart = new Date(eventDate)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(eventDate)
    dayEnd.setHours(23, 59, 59, 999)

    const workEvents = await prisma.event.count({
      where: {
        createdBy: userId,
        dateStart: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    })

    return workEvents > 0 ? 1.2 : 1.0
  }

  /**
   * Get children multiplier based on number of children and if caring for them
   * No children: ×1.0
   * 1 child: ×1.4
   * 2 children: ×1.8
   * 3+ children: ×2.2
   * With special needs: +0.3
   */
  private async getChildrenMultiplier(
    coupleId: string,
    event: Event,
  ): Promise<number> {
    if (!event.hasChildren) return 1.0

    const childCount = event.numChildren || 0
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      include: { children: true },
    })

    if (!couple || couple.children.length === 0) return 1.0

    let baseMultiplier = 1.0
    if (childCount === 1) baseMultiplier = 1.4
    else if (childCount === 2) baseMultiplier = 1.8
    else if (childCount >= 3) baseMultiplier = 2.2

    // Add for special needs
    const hasSpecialNeeds = couple.children.some((c: any) => c.hasSpecialNeeds)
    if (hasSpecialNeeds) baseMultiplier += 0.3

    return baseMultiplier
  }

  /**
   * Get impact category multiplier (Lote 4 rebalance · opción C)
   * Necesaria (medical, taxes): ×0.7
   * Health/wellness (sport, yoga): ×0.85
   * Normal social: ×1.0
   * High impact (long trip, farewell, wedding): ×1.4
   */
  private getImpactMultiplier(eventType: string): number {
    const necessaryTypes = ['gestión médica', 'burocrática', 'viaje de trabajo']
    const healthTypes = ['yoga', 'deporte', 'bienestar', 'spa', 'masaje']
    const highImpactTypes = ['viaje largo', 'despedida', 'boda', 'comunión']

    if (necessaryTypes.some((t) => eventType.toLowerCase().includes(t))) return 0.7
    if (healthTypes.some((t) => eventType.toLowerCase().includes(t))) return 0.85
    if (highImpactTypes.some((t) => eventType.toLowerCase().includes(t))) return 1.4

    return 1.0
  }

  /**
   * Calculate total points for an event using formula
   */
  async calculateEventPoints(event: Event, creatorUser: User): Promise<Decimal> {
    try {
      const couple = await prisma.couple.findUnique({
        where: { id: event.coupleId },
        include: { children: true },
      })

      if (!couple) {
        console.error('Couple not found')
        return event.pointsBase
      }

      // Get all multipliers
      const timeMultiplier = this.getTimeMultiplier(event.dateStart)
      const dayMultiplier = this.getDayMultiplier(event.dateStart)
      const workMultiplier = await this.getWorkMultiplier(creatorUser.id, event.dateStart)
      const childrenMultiplier = await this.getChildrenMultiplier(event.coupleId, event)
      const impactMultiplier = this.getImpactMultiplier(event.type)

      // Apply all multipliers
      const totalMultiplier = timeMultiplier * dayMultiplier * workMultiplier *
                             childrenMultiplier * impactMultiplier

      const calculatedPoints = new Decimal(event.pointsBase).mul(new Decimal(totalMultiplier))

      // Cap at 500 points max
      const finalPoints = calculatedPoints.greaterThan(500)
        ? new Decimal(500)
        : calculatedPoints.lessThan(0)
        ? new Decimal(0)
        : calculatedPoints

      return finalPoints
    } catch (error) {
      console.error('Error calculating points:', error)
      return event.pointsBase
    }
  }

  /**
   * Get calculation breakdown for an event (for debugging/UI)
   */
  async getCalculationBreakdown(event: Event, creatorUser: User): Promise<any> {
    try {
      const timeMultiplier = this.getTimeMultiplier(event.dateStart)
      const dayMultiplier = this.getDayMultiplier(event.dateStart)
      const workMultiplier = await this.getWorkMultiplier(creatorUser.id, event.dateStart)
      const childrenMultiplier = await this.getChildrenMultiplier(event.coupleId, event)
      const impactMultiplier = this.getImpactMultiplier(event.type)

      const totalMultiplier = timeMultiplier * dayMultiplier * workMultiplier *
                             childrenMultiplier * impactMultiplier

      const calculatedPoints = new Decimal(event.pointsBase).mul(new Decimal(totalMultiplier))
      const finalPoints = calculatedPoints.greaterThan(500)
        ? new Decimal(500)
        : calculatedPoints

      return {
        basePoints: event.pointsBase,
        multipliers: {
          time: { value: timeMultiplier, label: 'Hora del día' },
          day: { value: dayMultiplier, label: 'Día de la semana' },
          work: { value: workMultiplier, label: 'Trabajó ese día' },
          children: { value: childrenMultiplier, label: 'Hijos a cargo' },
          impact: { value: impactMultiplier, label: 'Impacto/Categoría' },
        },
        totalMultiplier,
        calculatedPoints: calculatedPoints.toNumber(),
        finalPoints: finalPoints.toNumber(),
      }
    } catch (error) {
      console.error('Error getting breakdown:', error)
      return null
    }
  }

  /**
   * Calculate points for a task completion
   * Tasks use simpler formula: basePoints × dayMultiplier × workMultiplier
   */
  async calculateTaskPoints(taskLog: any, userId: string): Promise<Decimal> {
    try {
      const dayMultiplier = this.getDayMultiplier(taskLog.date)
      const workMultiplier = await this.getWorkMultiplier(userId, taskLog.date)

      const totalMultiplier = dayMultiplier * workMultiplier
      const calculatedPoints = new Decimal(taskLog.pointsBase).mul(new Decimal(totalMultiplier))

      return calculatedPoints
    } catch (error) {
      console.error('Error calculating task points:', error)
      return new Decimal(taskLog.pointsBase)
    }
  }
}

export const pointsCalculator = new PointsCalculator()
