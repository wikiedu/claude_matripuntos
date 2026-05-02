// v1.7 — Catálogo de 30 logros para el achievement engine v2.
// Spec §4.2. Cada logro tiene `condition` JSON evaluado por el engine.
//
// 6 categorías × 5 logros cada una:
//   - first: primeros pasos
//   - streak: constancia (daily/weekly)
//   - balance: equilibrio
//   - collab: colaboración mutua
//   - diversity: variedad de categorías
//   - hito: milestones especiales

export interface AchievementCatalogEntry {
  id: string
  category: 'first' | 'streak' | 'balance' | 'collab' | 'diversity' | 'hito'
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  condition: {
    type: 'count' | 'streak' | 'threshold' | 'diversity' | 'absolute'
    metric: string
    threshold: number
    period?: 'session' | 'day' | 'week' | 'month' | 'year' | 'all_time'
  }
  rewardXp: number
  isHidden: boolean
}

export const ACHIEVEMENT_CATALOG: AchievementCatalogEntry[] = [
  // ── First (5) ──────────────────────────────────────────────────────────
  { id: 'first-activity', category: 'first', name: 'Primera actividad', description: 'Aceptaste tu primera actividad.', rarity: 'common', icon: '🎉', condition: { type: 'count', metric: 'events_accepted', threshold: 1 }, rewardXp: 50, isHidden: false },
  { id: 'first-task-verified', category: 'first', name: 'Primera tarea verificada', description: 'Verificasteis vuestra primera tarea mutuamente.', rarity: 'common', icon: '✅', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 1 }, rewardXp: 50, isHidden: false },
  { id: 'first-mood', category: 'first', name: 'Primer estado de ánimo', description: 'Compartiste tu primer mood.', rarity: 'common', icon: '😊', condition: { type: 'count', metric: 'moods_set', threshold: 1 }, rewardXp: 30, isHidden: false },
  { id: 'first-phrase', category: 'first', name: 'Primera frase del día', description: 'Viste vuestra primera frase del día.', rarity: 'common', icon: '📜', condition: { type: 'count', metric: 'phrases_seen', threshold: 1 }, rewardXp: 20, isHidden: false },
  { id: 'first-negotiation', category: 'first', name: 'Primera negociación', description: 'Cerrasteis vuestra primera negociación de actividad.', rarity: 'common', icon: '🤝', condition: { type: 'count', metric: 'negotiations_resolved', threshold: 1 }, rewardXp: 50, isHidden: false },

  // ── Streak (5) ─────────────────────────────────────────────────────────
  { id: 'streak-7', category: 'streak', name: 'Una semana entera', description: '7 días seguidos activos.', rarity: 'common', icon: '🔥', condition: { type: 'streak', metric: 'daily_streak', threshold: 7 }, rewardXp: 100, isHidden: false },
  { id: 'streak-30', category: 'streak', name: 'Un mes constante', description: '30 días consecutivos.', rarity: 'rare', icon: '⚡', condition: { type: 'streak', metric: 'daily_streak', threshold: 30 }, rewardXp: 300, isHidden: false },
  { id: 'streak-90', category: 'streak', name: 'Trimestre invencible', description: '90 días seguidos. Sois épicos.', rarity: 'epic', icon: '💪', condition: { type: 'streak', metric: 'daily_streak', threshold: 90 }, rewardXp: 800, isHidden: false },
  { id: 'streak-365', category: 'streak', name: 'Un año seguidos', description: '365 días sin saltaros un día. Increíble.', rarity: 'legendary', icon: '🏆', condition: { type: 'streak', metric: 'daily_streak', threshold: 365 }, rewardXp: 3000, isHidden: false },
  { id: 'streak-1000', category: 'streak', name: '1000 días — leyenda', description: 'Mil días juntos en Matripuntos.', rarity: 'legendary', icon: '👑', condition: { type: 'streak', metric: 'daily_streak', threshold: 1000 }, rewardXp: 10000, isHidden: true },

  // ── Balance (5) ────────────────────────────────────────────────────────
  { id: 'balance-week', category: 'balance', name: 'Equilibrio semanal', description: '|Saldo| ≤ 5 durante 7 días.', rarity: 'common', icon: '⚖️', condition: { type: 'threshold', metric: 'balanced_days', threshold: 7, period: 'week' }, rewardXp: 80, isHidden: false },
  { id: 'balance-month', category: 'balance', name: 'Equilibrio mensual', description: '|Saldo| ≤ 5 durante 30 días.', rarity: 'rare', icon: '⚖️', condition: { type: 'threshold', metric: 'balanced_days', threshold: 30, period: 'month' }, rewardXp: 250, isHidden: false },
  { id: 'balance-quarter', category: 'balance', name: 'Equilibrio trimestral', description: '|Saldo| ≤ 5 durante 90 días.', rarity: 'epic', icon: '⚖️', condition: { type: 'threshold', metric: 'balanced_days', threshold: 90 }, rewardXp: 600, isHidden: false },
  { id: 'balance-half-year', category: 'balance', name: 'Equilibrio semestral', description: '|Saldo| ≤ 5 durante 180 días.', rarity: 'epic', icon: '⚖️', condition: { type: 'threshold', metric: 'balanced_days', threshold: 180 }, rewardXp: 1200, isHidden: false },
  { id: 'balance-year', category: 'balance', name: 'Equilibrio anual', description: '|Saldo| ≤ 5 durante 365 días.', rarity: 'legendary', icon: '🌟', condition: { type: 'threshold', metric: 'balanced_days', threshold: 365 }, rewardXp: 3000, isHidden: false },

  // ── Collab (5) ─────────────────────────────────────────────────────────
  { id: 'collab-10', category: 'collab', name: 'Diez en pareja', description: '10 tareas verificadas mutuamente.', rarity: 'common', icon: '🤝', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 10 }, rewardXp: 80, isHidden: false },
  { id: 'collab-50', category: 'collab', name: 'Cincuenta a dúo', description: '50 verificaciones mutuas.', rarity: 'rare', icon: '🤝', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 50 }, rewardXp: 250, isHidden: false },
  { id: 'collab-100', category: 'collab', name: 'Cien colaboraciones', description: '100 tareas mutuamente verificadas.', rarity: 'rare', icon: '✨', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 100 }, rewardXp: 500, isHidden: false },
  { id: 'collab-250', category: 'collab', name: 'Equipo formado', description: '250 colaboraciones.', rarity: 'epic', icon: '⚡', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 250 }, rewardXp: 1200, isHidden: false },
  { id: 'collab-500', category: 'collab', name: 'Maestros de equipo', description: '500 verificaciones mutuas.', rarity: 'legendary', icon: '🌟', condition: { type: 'count', metric: 'tasks_verified_mutual', threshold: 500 }, rewardXp: 2500, isHidden: false },

  // ── Diversity (5) ──────────────────────────────────────────────────────
  { id: 'diversity-5-week', category: 'diversity', name: 'Variedad semanal', description: '5 categorías distintas en una semana.', rarity: 'common', icon: '🎨', condition: { type: 'diversity', metric: 'categories_distinct', threshold: 5, period: 'week' }, rewardXp: 60, isHidden: false },
  { id: 'diversity-all-month', category: 'diversity', name: 'Cuadro completo', description: 'Todas las categorías cubiertas en un mes.', rarity: 'rare', icon: '🌈', condition: { type: 'diversity', metric: 'categories_distinct', threshold: 9, period: 'month' }, rewardXp: 200, isHidden: false },
  { id: 'diversity-100-types', category: 'diversity', name: 'Cien actividades distintas', description: '100 actividades de tipos distintos.', rarity: 'epic', icon: '🎯', condition: { type: 'count', metric: 'event_types_distinct', threshold: 100 }, rewardXp: 700, isHidden: false },
  { id: 'diversity-balanced-mix', category: 'diversity', name: 'Mix equilibrado', description: 'Cocina + Limpieza + Logística por igual durante un mes.', rarity: 'rare', icon: '⚖️', condition: { type: 'diversity', metric: 'categories_balanced_3', threshold: 1, period: 'month' }, rewardXp: 250, isHidden: false },
  { id: 'diversity-explorer', category: 'diversity', name: 'Exploradores', description: '20 categorías diferentes en un trimestre.', rarity: 'epic', icon: '🗺️', condition: { type: 'diversity', metric: 'categories_distinct', threshold: 20 }, rewardXp: 600, isHidden: false },

  // ── Hito (5) ───────────────────────────────────────────────────────────
  { id: 'hito-1-year', category: 'hito', name: 'Aniversario en la app', description: 'Un año desde que creasteis la cuenta.', rarity: 'rare', icon: '🎂', condition: { type: 'absolute', metric: 'couple_age_days', threshold: 365 }, rewardXp: 500, isHidden: false },
  { id: 'hito-100-events', category: 'hito', name: 'Cien actividades', description: '100 actividades aceptadas.', rarity: 'rare', icon: '💯', condition: { type: 'count', metric: 'events_accepted', threshold: 100 }, rewardXp: 400, isHidden: false },
  { id: 'hito-500-week-points', category: 'hito', name: 'Semana intensa', description: '500 puntos a favor en una semana.', rarity: 'rare', icon: '🚀', condition: { type: 'threshold', metric: 'weekly_max_balance', threshold: 500, period: 'week' }, rewardXp: 300, isHidden: false },
  { id: 'hito-no-dispute-month', category: 'hito', name: 'Sin disputas', description: 'Un mes sin TaskLogs disputed.', rarity: 'rare', icon: '🕊️', condition: { type: 'threshold', metric: 'no_dispute_days', threshold: 30 }, rewardXp: 250, isHidden: false },
  { id: 'hito-perfect-week', category: 'hito', name: 'Semana perfecta', description: 'Equilibrio + sin disputas + 7 actividades en una semana.', rarity: 'epic', icon: '⭐', condition: { type: 'threshold', metric: 'perfect_weeks', threshold: 1 }, rewardXp: 600, isHidden: true },
]

export function findAchievementById(id: string): AchievementCatalogEntry | undefined {
  return ACHIEVEMENT_CATALOG.find(a => a.id === id)
}

export function listByCategory(category: AchievementCatalogEntry['category']): AchievementCatalogEntry[] {
  return ACHIEVEMENT_CATALOG.filter(a => a.category === category)
}
