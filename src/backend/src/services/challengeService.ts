// v1.7 — Challenge service. Genera y evalúa retos semanales para parejas.
// Spec §4.4. 5 tipos de challenge con dificultad escalada por nivel.

export type ChallengeType =
  | 'balance'        // Mantener |saldo neto| ≤ N puntos durante la semana.
  | 'verify'         // Verificar N tareas mutuamente.
  | 'diversity'      // Probar N categorías nuevas (no usadas última 4 semanas).
  | 'no_dispute'     // Cero TaskLogs en estado 'disputed' la semana.
  | 'high_impact'    // Una actividad de tipo 'alto impacto' aceptada por ambos.

export interface ChallengeTemplate {
  type: ChallengeType
  goal: number
  rewardXp: number
  config: Record<string, unknown>
}

/**
 * Genera el challenge de la semana basado en el nivel pareja.
 * Usa coupleId + weekStart como semilla determinista para que tests sean
 * reproducibles. En producción es 1 challenge por pareja-semana (UNIQUE en
 * schema), por lo que no hay race conditions.
 */
export function generateChallengeForLevel(level: number, seed: string): ChallengeTemplate {
  const types: ChallengeType[] = ['balance', 'verify', 'diversity', 'no_dispute', 'high_impact']
  const idx = simpleHash(seed) % types.length
  const type = types[idx]

  // Dificultad escala con nivel (Lv 1 → más fácil; Lv 10 → más exigente).
  const difficulty = Math.max(1, Math.min(level, 10))

  switch (type) {
    case 'balance':
      return {
        type,
        goal: Math.max(2, 8 - difficulty),  // |neto| ≤ 7 a Lv1, ≤ 2 a Lv6+
        rewardXp: 50 + difficulty * 10,
        config: { metric: 'abs_net_balance' },
      }
    case 'verify':
      return {
        type,
        goal: 5 + difficulty * 2,  // 7 a Lv1, 25 a Lv10
        rewardXp: 60 + difficulty * 12,
        config: { metric: 'mutual_verifications' },
      }
    case 'diversity':
      return {
        type,
        goal: Math.min(5, 2 + Math.floor(difficulty / 2)),  // 2 a Lv1, max 5
        rewardXp: 70 + difficulty * 8,
        config: { metric: 'new_categories_4w' },
      }
    case 'no_dispute':
      return {
        type,
        goal: 0,
        rewardXp: 80,
        config: { metric: 'disputed_count', invertedTarget: true },
      }
    case 'high_impact':
      return {
        type,
        goal: 1,
        rewardXp: 100 + difficulty * 5,
        config: { metric: 'high_impact_accepted' },
      }
  }
}

/**
 * Devuelve el inicio (lunes 00:00) de la semana ISO en TZ dada.
 * En backend usamos UTC para consistencia interna; el frontend hace UI
 * en la TZ del user.
 */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()  // 0=domingo, 1=lunes...
  const diff = day === 0 ? 6 : day - 1  // días hacia el lunes
  d.setUTCDate(d.getUTCDate() - diff)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Computa progreso del challenge dadas las métricas actuales.
 * Devuelve {progress, completed} sin mutar la BD — la persistencia se hace
 * en routes/services llamadores.
 */
export function evaluateProgress(
  template: { type: ChallengeType; goal: number; config: Record<string, unknown> },
  metrics: {
    absNetBalance?: number
    mutualVerifications?: number
    newCategories4w?: number
    disputedCount?: number
    highImpactAccepted?: number
  },
): { progress: number; completed: boolean } {
  let progress = 0

  switch (template.type) {
    case 'balance':
      // Para balance: progress = goal si |saldo| ≤ goal, sino 0.
      progress = (metrics.absNetBalance ?? 999) <= template.goal ? template.goal : Math.max(0, template.goal - (metrics.absNetBalance ?? 999) + template.goal)
      break
    case 'verify':
      progress = Math.min(template.goal, metrics.mutualVerifications ?? 0)
      break
    case 'diversity':
      progress = Math.min(template.goal, metrics.newCategories4w ?? 0)
      break
    case 'no_dispute':
      // Goal = 0 disputed. Progress = goal si count == 0, 0 si hay disputes.
      progress = (metrics.disputedCount ?? 0) === 0 ? template.goal : 0
      // Edge: si goal=0 y count=0, considera completado.
      if (template.goal === 0) {
        return { progress: 1, completed: (metrics.disputedCount ?? 0) === 0 }
      }
      break
    case 'high_impact':
      progress = Math.min(template.goal, metrics.highImpactAccepted ?? 0)
      break
  }

  return { progress, completed: progress >= template.goal }
}

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}
