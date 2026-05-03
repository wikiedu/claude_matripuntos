// v2.0.7 — Auto-seed del catálogo global de ActivityTemplate al arrancar el
// servidor. Idempotente: sólo crea templates globales (coupleId=null) que no
// existan ya. Si la tabla ya tiene los ~50 templates seed no hace nada.
//
// Esto reemplaza la necesidad de ejecutar manualmente
// `npx ts-node prisma/seedActivityTemplates.ts` contra Supabase tras cada deploy.

import prisma from '../lib/prisma.js'
import { ACTIVITY_TEMPLATES_SEED } from '../data/activityTemplatesData.js'

let alreadyRan = false

export async function bootstrapActivityCatalog(): Promise<void> {
  if (alreadyRan) return
  alreadyRan = true
  if (process.env.CATALOG_AUTOSEED === 'false') return

  try {
    let created = 0
    for (const t of ACTIVITY_TEMPLATES_SEED) {
      const existing = await prisma.activityTemplate.findFirst({
        where: { coupleId: null, name: t.name },
        select: { id: true },
      })
      if (existing) continue
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
    if (created > 0) {
      console.log(`[bootstrap] seeded ${created} activity templates`)
    }
  } catch (err) {
    console.error('[bootstrap] catálogo seed failed:', err)
    // No-bloqueante: el server arranca igual aunque falle el seed.
  }
}
