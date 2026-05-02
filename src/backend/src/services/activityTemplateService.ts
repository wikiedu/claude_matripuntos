import prisma from '../lib/prisma.js'

/**
 * v2.0.4 — ActivityTemplate service
 *
 * Catálogo global (coupleId=null) + custom por pareja (coupleId set).
 * Cuando un user crea un evento desde un template, incrementamos
 * `instancesThisMonth` y refrescamos `lastInstanceAt` para personalizar
 * la lista (templates más usados primero).
 */

export type TemplateInput = {
  category: string
  subcategory?: string | null
  name: string
  description?: string | null
  pointsBaseSuggested: number
  defaultDurationMinutes?: number | null
  defaultImpact?: string | null
  emoji?: string | null
}

export type TemplateCreateInput = TemplateInput

export class ActivityTemplateService {
  /** Catálogo visible para una pareja: globales + propios. */
  async listForCouple(coupleId: string) {
    return prisma.activityTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ coupleId: null }, { coupleId }],
      },
      orderBy: [
        { lastInstanceAt: 'desc' },
        { instancesThisMonth: 'desc' },
        { category: 'asc' },
        { name: 'asc' },
      ],
    })
  }

  /** Lista agrupada por categoría — cómoda para el picker. */
  async groupedForCouple(coupleId: string) {
    const items = await this.listForCouple(coupleId)
    const groups: Record<string, typeof items> = {}
    for (const t of items) {
      if (!groups[t.category]) groups[t.category] = []
      groups[t.category].push(t)
    }
    return groups
  }

  async create(coupleId: string, input: TemplateCreateInput) {
    return prisma.activityTemplate.create({
      data: {
        coupleId,
        category: input.category,
        subcategory: input.subcategory ?? null,
        name: input.name,
        description: input.description ?? null,
        pointsBaseSuggested: input.pointsBaseSuggested,
        defaultDurationMinutes: input.defaultDurationMinutes ?? null,
        defaultImpact: input.defaultImpact ?? null,
        emoji: input.emoji ?? null,
      },
    })
  }

  async update(coupleId: string, id: string, input: Partial<TemplateInput>) {
    const existing = await prisma.activityTemplate.findUnique({ where: { id } })
    if (!existing || existing.coupleId !== coupleId) {
      throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
    }
    return prisma.activityTemplate.update({
      where: { id },
      data: {
        ...(input.category !== undefined && { category: input.category }),
        ...(input.subcategory !== undefined && { subcategory: input.subcategory ?? null }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.pointsBaseSuggested !== undefined && { pointsBaseSuggested: input.pointsBaseSuggested }),
        ...(input.defaultDurationMinutes !== undefined && { defaultDurationMinutes: input.defaultDurationMinutes ?? null }),
        ...(input.defaultImpact !== undefined && { defaultImpact: input.defaultImpact ?? null }),
        ...(input.emoji !== undefined && { emoji: input.emoji ?? null }),
      },
    })
  }

  async deactivate(coupleId: string, id: string) {
    const existing = await prisma.activityTemplate.findUnique({ where: { id } })
    if (!existing || existing.coupleId !== coupleId) {
      throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
    }
    return prisma.activityTemplate.update({
      where: { id },
      data: { isActive: false },
    })
  }

  /** Llamar al crear un Event desde un template (instrumentación de uso). */
  async recordUse(templateId: string) {
    return prisma.activityTemplate.update({
      where: { id: templateId },
      data: {
        instancesThisMonth: { increment: 1 },
        lastInstanceAt: new Date(),
      },
    })
  }
}

export const activityTemplateService = new ActivityTemplateService()
