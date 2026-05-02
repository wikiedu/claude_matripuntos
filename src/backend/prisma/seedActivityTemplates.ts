/**
 * v2.0.4 — Seed del catálogo global de actividades.
 *
 * Idempotente: usa upsert por nombre+coupleId=null. Re-ejecutable sin duplicar.
 *
 * Uso:
 *   cd src/backend
 *   npx ts-node prisma/seedActivityTemplates.ts
 *
 * En producción se debe ejecutar una sola vez tras `prisma migrate deploy`
 * para poblar las plantillas globales.
 */

import { PrismaClient } from '@prisma/client'
import { ACTIVITY_TEMPLATES_SEED } from './activityTemplates.seed.js'

const prisma = new PrismaClient()

async function main() {
  console.log(`🌱 Seeding ${ACTIVITY_TEMPLATES_SEED.length} global activity templates...`)
  let created = 0
  let updated = 0

  for (const t of ACTIVITY_TEMPLATES_SEED) {
    // Buscar por (coupleId=null, name) — único en la práctica para globales
    const existing = await prisma.activityTemplate.findFirst({
      where: { coupleId: null, name: t.name },
    })
    if (existing) {
      await prisma.activityTemplate.update({
        where: { id: existing.id },
        data: {
          category: t.category,
          subcategory: t.subcategory ?? null,
          description: t.description ?? null,
          pointsBaseSuggested: t.pointsBaseSuggested,
          defaultDurationMinutes: t.defaultDurationMinutes ?? null,
          defaultImpact: t.defaultImpact ?? null,
          emoji: t.emoji ?? null,
          isActive: true,
        },
      })
      updated++
    } else {
      await prisma.activityTemplate.create({
        data: {
          coupleId: null,
          category: t.category,
          subcategory: t.subcategory ?? null,
          name: t.name,
          description: t.description ?? null,
          pointsBaseSuggested: t.pointsBaseSuggested,
          defaultDurationMinutes: t.defaultDurationMinutes ?? null,
          defaultImpact: t.defaultImpact ?? null,
          emoji: t.emoji ?? null,
        },
      })
      created++
    }
  }

  console.log(`✅ Done. Created: ${created} · Updated: ${updated}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
