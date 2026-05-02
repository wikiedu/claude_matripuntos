// v1.6 — Selección determinista de frase del día con cascada por urgencia
// emocional. La fuente de verdad de las frases está en data/dailyPhrases.ts.
// Determinismo: hash(coupleId + dayKey + category) → ambos miembros de la
// pareja ven la misma frase el mismo día.
//
// Orden de prioridad (cascada):
//  1. disputa abierta o evento rejected reciente → reconciliacion
//  2. racha rota en últimas 24h → animo
//  3. logro reciente / nivel subido en últimas 24h → hito
//  4. fin de semana → celebrar
//  5. semana cargada (≥4 eventos largos o >25h en 7d) → calma
//  6. partner aportó >60% últimos 7 días → agradecer
//  7. lunes → animo-suave
//  8. fallback → neutra-positivo
//
// Si dos condiciones aplican, gana la primera del orden (no es ranking dinámico).

import { PHRASES, type Phrase, type PhraseCategory } from '../data/dailyPhrases'
import { cyrb53 } from './cyrb53'

export interface PhraseState {
  coupleId: string
  dayKey: string  // YYYY-MM-DD en TZ local
  hasOpenDisputeRecent: boolean
  streakBrokenLast24h: boolean
  recentMilestone: boolean
  weekendDay: boolean
  heavyWeekDetected: boolean
  partnerHighContribLastWeek: boolean
  isMonday: boolean
}

export function pickPhraseCategory(state: PhraseState): PhraseCategory {
  if (state.hasOpenDisputeRecent) return 'reconciliacion'
  if (state.streakBrokenLast24h) return 'animo'
  if (state.recentMilestone) return 'hito'
  if (state.weekendDay) return 'celebrar'
  if (state.heavyWeekDetected) return 'calma'
  if (state.partnerHighContribLastWeek) return 'agradecer'
  if (state.isMonday) return 'animo-suave'
  return 'neutra-positivo'
}

export function getDailyPhrase(state: PhraseState): Phrase {
  const category = pickPhraseCategory(state)
  const pool = PHRASES.filter(p => p.category === category)
  if (pool.length === 0) {
    // Safety net: el catálogo siempre tiene neutra-positivo, pero por si acaso.
    return PHRASES[0]
  }
  const seed = cyrb53(`${state.coupleId}-${state.dayKey}-${category}`)
  return pool[seed % pool.length]
}
