// v1.7 — Achievement engine v2. Reactivo: post-PointsTransaction commit
// se llama evaluate(coupleId, eventType) para chequear logros desbloqueables.
// Spec §4.2 + §7.
//
// Función evaluateAchievement es pura (sin DB) — la persistencia de
// CoupleAchievement la hacen las routes/jobs llamadores.
//
// =============================================================================
// v2.5 audit 02 S2 — Aclaración de los 3 servicios de achievements:
//
// Auditoría 2026-05-05 reportó "3 sistemas paralelos" pero tras análisis
// son 3 capas distintas, no duplicados:
//
//   1. achievementEngine.ts (V1, 504 LOC)
//      Per-user, write-side. Llamado desde routes (taskRoutes,
//      negotiationRoutes, achievements). Persiste UserAchievement.
//
//   2. achievementCheckService.ts (212 LOC)
//      Read-side. Construye el mapa de achievements (unlocked + progress)
//      para la UI. checkAllAchievements + getAchievementsMap.
//
//   3. achievementEngineV2.ts (este archivo, 82 LOC)
//      Catalog-side. PURE logic: evaluateNewUnlocks + computeProgress +
//      visibleCatalog sobre el catálogo declarativo (achievementCatalog.ts).
//      Ahora mismo NO se llama desde routes — solo está testeado aislado.
//
// PLAN UNIFICACIÓN (v2.6+): hacer que V1 use V2 internamente para evaluar
// las condiciones del catálogo declarativo en lugar de hardcodearlas.
// V2 actúa como "evaluator pure" del schema. V1 mantiene la responsabilidad
// de persistencia y notificaciones. checkService consume ambos.
//
// Ver docs/audits/2026-05-05-full-audit/02-backend-services.md S2.
// =============================================================================

import type { AchievementCatalogEntry } from '../data/achievementCatalog.js'
import { ACHIEVEMENT_CATALOG } from '../data/achievementCatalog.js'

export interface CoupleMetrics {
  events_accepted: number
  tasks_verified_mutual: number
  moods_set: number
  phrases_seen: number
  negotiations_resolved: number
  daily_streak: number
  weekly_streak: number
  balanced_days: number  // días con |saldo| ≤ 5 acumulado
  categories_distinct: number  // distinct categories en el período relevante
  categories_balanced_3: number  // 1 si Cocina+Limpieza+Logística balanced en mes, 0 sino
  event_types_distinct: number
  couple_age_days: number
  weekly_max_balance: number
  no_dispute_days: number
  perfect_weeks: number
}

export interface AchievementEvaluation {
  achievementId: string
  unlocked: boolean
  progress: number    // 0..1 (0=lejos, 1=desbloqueado)
}

/**
 * Evalúa todos los logros del catálogo dado un set de métricas. Pure.
 * Devuelve solo los que cambian de estado (locked → unlocked).
 *
 * `alreadyUnlocked` es el set de IDs ya desbloqueados — para no re-emitir.
 */
export function evaluateNewUnlocks(
  metrics: CoupleMetrics,
  alreadyUnlocked: Set<string>,
): AchievementCatalogEntry[] {
  const unlocked: AchievementCatalogEntry[] = []
  for (const def of ACHIEVEMENT_CATALOG) {
    if (alreadyUnlocked.has(def.id)) continue
    const val = (metrics as any)[def.condition.metric] ?? 0
    if (val >= def.condition.threshold) {
      unlocked.push(def)
    }
  }
  return unlocked
}

/**
 * Calcula el progreso (0..1) de cada logro no desbloqueado para mostrar
 * "Próximos logros" en UI.
 */
export function computeProgress(metrics: CoupleMetrics, alreadyUnlocked: Set<string>): AchievementEvaluation[] {
  return ACHIEVEMENT_CATALOG
    .filter(d => !alreadyUnlocked.has(d.id))
    .filter(d => !d.isHidden)  // hidden no aparecen en lista de próximos
    .map(d => {
      const val = (metrics as any)[d.condition.metric] ?? 0
      const ratio = d.condition.threshold === 0 ? 1 : Math.min(1, val / d.condition.threshold)
      return {
        achievementId: d.id,
        unlocked: ratio >= 1,
        progress: ratio,
      }
    })
    .sort((a, b) => b.progress - a.progress)  // más cercanos primero
}

/**
 * Filtra catálogo según condiciones de visibilidad: hidden solo aparece
 * si ya está desbloqueado.
 */
export function visibleCatalog(alreadyUnlocked: Set<string>): AchievementCatalogEntry[] {
  return ACHIEVEMENT_CATALOG.filter(d => !d.isHidden || alreadyUnlocked.has(d.id))
}
