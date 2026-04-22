import { Event, User } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

import prisma from '../lib/prisma.js'

/**
 * Points Calculator Service
 *
 * Fórmula canónica (fuente: docs/PUNTOS.md):
 *   Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos
 *
 * Redondeo al 0.5 más próximo. No hay factor de "día de semana" ni
 * "trabajó ese día" — si necesitamos reintroducirlos en el futuro, deben
 * documentarse primero en PUNTOS.md.
 */

export class PointsCalculator {
  /**
   * Factor Franja Horaria (PUNTOS.md)
   * 07:00-09:30 → ×1.3 (mañana rutina)
   * 09:30-17:30 → ×1.0 (día normal)
   * 17:30-21:30 → ×1.2 (tarde/cenas)
   * 21:30-01:00 → ×1.2 (noche)
   * 01:00-07:00 → ×1.5 (madrugada)
   */
  getTimeMultiplier(dateStart: Date): number {
    const d = new Date(dateStart)
    const totalMinutes = d.getHours() * 60 + d.getMinutes()

    if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 1.3
    if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 1.0
    if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 1.2
    if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 1.2
    return 1.5
  }

  /**
   * Factor Duración (PUNTOS.md)
   * 0-3h → ×1.0 · 3-8h → ×1.1 · 8-24h → ×1.25 · 24h+ → ×1.35
   * Previously absent — events created via the V1 route never paid the
   * duration premium documented in the spec.
   */
  getDurationMultiplier(dateStart: Date, dateEnd: Date): number {
    const ms = new Date(dateEnd).getTime() - new Date(dateStart).getTime()
    const hours = Math.max(0, ms / (1000 * 60 * 60))
    if (hours < 3) return 1.0
    if (hours < 8) return 1.1
    if (hours < 24) return 1.25
    return 1.35
  }

  /**
   * Factor Hijos (PUNTOS.md)
   * 0 → ×1.0 · 1 → ×1.4 · 2 → ×1.8 · 3+ → ×2.2
   * Bonus +0.3 si alguno tiene necesidades especiales (V2 only).
   *
   * Usa `event.numChildren` como fuente principal (así un evento con 2 de 3
   * hijos puntúa como "2 hijos"). Si no hay registros V2 Child, cae a
   * Couple.numChildren para que parejas MVP no pierdan el multiplicador.
   */
  async getChildrenMultiplier(coupleId: string, event: Event): Promise<number> {
    if (!event.hasChildren) return 1.0

    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      include: { children: true },
    })
    if (!couple) return 1.0

    const eventChildren = event.numChildren ?? 0
    const registeredCount = couple.children.length
    // Preferimos el count del evento (cuántos hijos se ven afectados en esta
    // ausencia concreta). Si el evento dice 0 pero hasChildren=true y la pareja
    // tiene numChildren, usamos numChildren como último recurso para MVP.
    const effective = eventChildren > 0 ? eventChildren : registeredCount > 0 ? registeredCount : couple.numChildren ?? 0

    let multiplier = 1.0
    if (effective === 1) multiplier = 1.4
    else if (effective === 2) multiplier = 1.8
    else if (effective >= 3) multiplier = 2.2

    // Special-needs bonus solo aplica si hay registros V2 marcándolo.
    const hasSpecialNeeds = couple.children.some((c: any) => c.hasSpecialNeeds)
    if (hasSpecialNeeds && multiplier > 1.0) multiplier += 0.3

    return multiplier
  }

  /**
   * Factor Tipo / Impacto (PUNTOS.md)
   * Necesaria → ×0.7 · Salud → ×0.85 · Ocio social → ×1.0 · Alto impacto → ×1.4
   *
   * event.type suele ser slug corto (`trabajo`, `deporte`, `boda`). Antes se
   * buscaba por keywords largos tipo "viaje de trabajo" que casi nunca
   * matchean — los slugs y sinónimos cortos cubren los casos reales.
   */
  getImpactMultiplier(eventType: string): number {
    const t = (eventType ?? '').toLowerCase().trim()
    if (!t) return 1.0

    const necessary = ['medico', 'médico', 'tramite', 'trámite', 'burocrática', 'burocratica', 'trabajo', 'viaje de trabajo', 'gestion medica', 'gestión médica']
    const health = ['deporte', 'yoga', 'gym', 'gimnasio', 'bienestar', 'spa', 'masaje', 'salud']
    const highImpact = ['boda', 'despedida', 'despedida soltero', 'despedida soltera', 'comunion', 'comunión', 'viaje largo', 'escapada', 'maraton', 'maratón']

    if (necessary.some((k) => t.includes(k))) return 0.7
    if (health.some((k) => t.includes(k))) return 0.85
    if (highImpact.some((k) => t.includes(k))) return 1.4
    return 1.0
  }

  /** Redondeo al 0.5 más próximo (ver PUNTOS.md). */
  roundToHalf(value: number): number {
    return Math.round(value * 2) / 2
  }

  /**
   * Calcula los puntos finales de un evento aplicando todos los multiplicadores.
   * Cap superior: 500. Nunca devuelve negativo.
   */
  async calculateEventPoints(event: Event, _creatorUser?: User | null): Promise<Decimal> {
    try {
      const timeMultiplier = this.getTimeMultiplier(event.dateStart)
      const durationMultiplier = this.getDurationMultiplier(event.dateStart, event.dateEnd)
      const childrenMultiplier = await this.getChildrenMultiplier(event.coupleId, event)
      const impactMultiplier = this.getImpactMultiplier(event.type)

      const totalMultiplier = impactMultiplier * timeMultiplier * durationMultiplier * childrenMultiplier
      const raw = new Decimal(event.pointsBase).mul(new Decimal(totalMultiplier))
      const rounded = new Decimal(this.roundToHalf(raw.toNumber()))

      if (rounded.greaterThan(500)) return new Decimal(500)
      if (rounded.lessThan(0)) return new Decimal(0)
      return rounded
    } catch (error) {
      console.error('Error calculating points:', error)
      return event.pointsBase
    }
  }

  /** Desglose legible para UI / debug (incluye cada factor por separado). */
  async getCalculationBreakdown(event: Event, _creatorUser?: User | null): Promise<any> {
    try {
      const timeMultiplier = this.getTimeMultiplier(event.dateStart)
      const durationMultiplier = this.getDurationMultiplier(event.dateStart, event.dateEnd)
      const childrenMultiplier = await this.getChildrenMultiplier(event.coupleId, event)
      const impactMultiplier = this.getImpactMultiplier(event.type)

      const totalMultiplier = impactMultiplier * timeMultiplier * durationMultiplier * childrenMultiplier
      const raw = new Decimal(event.pointsBase).mul(new Decimal(totalMultiplier))
      const rounded = this.roundToHalf(raw.toNumber())
      const finalPoints = Math.min(500, Math.max(0, rounded))

      return {
        basePoints: Number(event.pointsBase),
        multipliers: {
          impact:   { value: impactMultiplier,   label: 'Tipo / Impacto' },
          time:     { value: timeMultiplier,     label: 'Hora del día' },
          duration: { value: durationMultiplier, label: 'Duración' },
          children: { value: childrenMultiplier, label: 'Hijos a cargo' },
        },
        totalMultiplier,
        calculatedPoints: raw.toNumber(),
        finalPoints,
      }
    } catch (error) {
      console.error('Error getting breakdown:', error)
      return null
    }
  }

  /**
   * Puntos para una tarea completada. En tareas solo aplicamos redondeo —
   * el base ya refleja el esfuerzo, no se recalcula por hora/duración.
   */
  async calculateTaskPoints(taskLog: any, _userId?: string): Promise<Decimal> {
    const base = new Decimal(taskLog.pointsBase ?? 0)
    return new Decimal(this.roundToHalf(base.toNumber()))
  }
}

export const pointsCalculator = new PointsCalculator()
