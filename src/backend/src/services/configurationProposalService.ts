import prisma from '../lib/prisma.js'
import { parseJsonField } from '../lib/jsonField.js'

/**
 * v2.0.4 — ConfigurationProposal service
 *
 * Cualquier cambio en `Configuration.tasksConfig` / `multipliersConfig` /
 * `activityTypes` se propone primero a la pareja. Si la pareja acepta dentro
 * de `expiresAt`, se aplica y se logea en `ConfigurationChangeLog`.
 *
 * MVP: rechazar simplemente cierra la propuesta. Más adelante, contraoferta.
 */

const DEFAULT_EXPIRY_DAYS = 7

export type ProposalInput = {
  coupleId: string
  proposedById: string
  field: string         // ej: 'multipliersConfig.children.2'
  oldValue: string      // siempre serializado (JSON.stringify para no-strings)
  newValue: string
  rationale?: string | null
  expiryDays?: number
}

export class ConfigurationProposalService {
  /** Crea una propuesta. Rechaza duplicados activos para el mismo campo. */
  async propose(input: ProposalInput) {
    // Detectar duplicado activo (mismo coupleId + field + status='active')
    const existing = await prisma.configurationProposal.findFirst({
      where: {
        coupleId: input.coupleId,
        field: input.field,
        status: 'active',
      },
    })
    if (existing) {
      throw Object.assign(
        new Error('Ya hay una propuesta activa para este campo'),
        { code: 'DUPLICATE_PROPOSAL' }
      )
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (input.expiryDays ?? DEFAULT_EXPIRY_DAYS))

    return prisma.configurationProposal.create({
      data: {
        coupleId: input.coupleId,
        proposedById: input.proposedById,
        field: input.field,
        oldValue: input.oldValue,
        newValue: input.newValue,
        rationale: input.rationale ?? null,
        expiresAt,
      },
    })
  }

  async listActive(coupleId: string) {
    // Limpia las que expiraron antes de devolver
    await this.purgeExpired(coupleId)
    return prisma.configurationProposal.findMany({
      where: { coupleId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        proposedBy: { select: { id: true, name: true } },
      },
    })
  }

  async listHistory(coupleId: string, limit = 50) {
    return prisma.configurationProposal.findMany({
      where: { coupleId, status: { not: 'active' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        proposedBy: { select: { id: true, name: true } },
      },
    })
  }

  /** Acepta una propuesta — solo el partner del proposer puede. */
  async accept(coupleId: string, proposalId: string, accepterId: string) {
    const proposal = await prisma.configurationProposal.findUnique({
      where: { id: proposalId },
    })
    if (!proposal || proposal.coupleId !== coupleId) {
      throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
    }
    if (proposal.status !== 'active') {
      throw Object.assign(new Error('Propuesta no activa'), { code: 'NOT_ACTIVE' })
    }
    if (proposal.proposedById === accepterId) {
      throw Object.assign(
        new Error('No puedes aceptar tu propia propuesta'),
        { code: 'SELF_ACCEPT' }
      )
    }
    if (proposal.expiresAt < new Date()) {
      await prisma.configurationProposal.update({
        where: { id: proposalId },
        data: { status: 'expired' },
      })
      throw Object.assign(new Error('Propuesta expirada'), { code: 'EXPIRED' })
    }

    // Aplicar cambio + cerrar propuesta + log, todo en transacción.
    // v2.1.1: cuando el field empieza por 'activity_template:<id>:points',
    // marcamos pointsApproved=true en el template como side-effect.
    const txOps: any[] = [
      prisma.configurationProposal.update({
        where: { id: proposalId },
        data: {
          status: 'accepted',
          respondedById: accepterId,
          respondedAt: new Date(),
        },
      }),
      prisma.configurationChangeLog.create({
        data: {
          coupleId,
          field: proposal.field,
          oldValue: proposal.oldValue,
          newValue: proposal.newValue,
          appliedById: accepterId,
          proposalId,
        },
      }),
    ]

    const tplPointsMatch = proposal.field.match(/^activity_template:([a-z0-9]+):points$/i)
    if (tplPointsMatch) {
      const templateId = tplPointsMatch[1]
      txOps.push(
        prisma.activityTemplate.updateMany({
          where: { id: templateId, coupleId },
          data: {
            pointsApproved: true,
            pointsApprovedAt: new Date(),
            pointsBaseSuggested: Number(proposal.newValue),
          },
        }),
      )
    }

    // v2.2.1: si el field empieza por 'tasks.<cat>' o 'multipliers.<grupo>.<key>'
    // aplicamos el cambio al Configuration de la pareja. Esto convierte el
    // sistema de propuestas en algo que sí afecta al cálculo real de puntos
    // (antes solo registraba acuerdos sin aplicarlos — el banner WARN de v2.0.7).
    const tasksMatch = proposal.field.match(/^tasks\.(.+)$/)
    const multMatch = proposal.field.match(/^multipliers\.([a-zA-Z]+)\.(.+)$/)
    if (tasksMatch || multMatch) {
      const config = await prisma.configuration.findUnique({ where: { coupleId } })
      if (config) {
        const tasksConfig = parseJsonField<Record<string, any>>(config.tasksConfig, {})
        const multipliersConfig = parseJsonField<Record<string, any>>(config.multipliersConfig, {})
        const newNum = Number(proposal.newValue)

        if (tasksMatch && !Number.isNaN(newNum)) {
          tasksConfig[tasksMatch[1]] = newNum
        }
        if (multMatch && !Number.isNaN(newNum)) {
          const [, group, key] = multMatch
          if (!multipliersConfig[group]) multipliersConfig[group] = {}
          multipliersConfig[group][key] = newNum
        }

        txOps.push(
          prisma.configuration.update({
            where: { id: config.id },
            data: {
              tasksConfig: JSON.stringify(tasksConfig),
              multipliersConfig: JSON.stringify(multipliersConfig),
            },
          }),
        )
      }
    }

    const result = await prisma.$transaction(txOps)
    return result[0]
  }

  /** Rechaza — el partner del proposer puede. MVP: sin contraoferta. */
  async reject(coupleId: string, proposalId: string, rejecterId: string) {
    const proposal = await prisma.configurationProposal.findUnique({
      where: { id: proposalId },
    })
    if (!proposal || proposal.coupleId !== coupleId) {
      throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
    }
    if (proposal.status !== 'active') {
      throw Object.assign(new Error('Propuesta no activa'), { code: 'NOT_ACTIVE' })
    }
    if (proposal.proposedById === rejecterId) {
      throw Object.assign(
        new Error('No puedes rechazar tu propia propuesta'),
        { code: 'SELF_REJECT' }
      )
    }

    return prisma.configurationProposal.update({
      where: { id: proposalId },
      data: {
        status: 'rejected',
        respondedById: rejecterId,
        respondedAt: new Date(),
      },
    })
  }

  /** El proposer puede cancelar antes de respuesta. */
  async cancel(coupleId: string, proposalId: string, requesterId: string) {
    const proposal = await prisma.configurationProposal.findUnique({
      where: { id: proposalId },
    })
    if (!proposal || proposal.coupleId !== coupleId) {
      throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
    }
    if (proposal.proposedById !== requesterId) {
      throw Object.assign(
        new Error('Solo el proponente puede cancelar'),
        { code: 'NOT_OWNER' }
      )
    }
    if (proposal.status !== 'active') return proposal

    return prisma.configurationProposal.update({
      where: { id: proposalId },
      data: { status: 'cancelled', respondedAt: new Date() },
    })
  }

  /** Marca como `expired` las propuestas pasadas. Idempotente. */
  async purgeExpired(coupleId?: string) {
    return prisma.configurationProposal.updateMany({
      where: {
        ...(coupleId && { coupleId }),
        status: 'active',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    })
  }

  async listChangeLog(coupleId: string, limit = 100) {
    return prisma.configurationChangeLog.findMany({
      where: { coupleId },
      orderBy: { appliedAt: 'desc' },
      take: limit,
      include: {
        appliedBy: { select: { id: true, name: true } },
      },
    })
  }
}

export const configurationProposalService = new ConfigurationProposalService()
