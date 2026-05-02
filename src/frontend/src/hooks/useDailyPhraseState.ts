// v1.6 — Hook que recoge inputs del estado de la cascada desde el store global.
// Diseño defensivo: si una señal no está disponible (queries que no existen aún),
// degrada a `false` para no romper. Con todo a false → fallback neutra-positivo.
//
// Por simplicidad MVP usa solo señales fácilmente accesibles desde useAppStore:
//  - dayKey y isMonday/weekendDay derivados de TZ del navegador
//  - el resto comienza en false; futuras tasks pueden enriquecerlo cuando los
//    queries (events, taskLogs, achievements, streak) estén listos para alimentarlo.

import { useMemo } from 'react'
import type { PhraseState } from '../utils/dailyPhrase'

interface Args {
  coupleId: string
  tz?: string
}

function todayKey(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function dayOfWeek(tz: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(new Date())
}

export function useDailyPhraseState({ coupleId, tz = 'Europe/Madrid' }: Args): PhraseState {
  return useMemo<PhraseState>(() => {
    const dow = dayOfWeek(tz)
    return {
      coupleId,
      dayKey: todayKey(tz),
      hasOpenDisputeRecent: false,    // TODO: enriquecer con useActivities cuando se valide
      streakBrokenLast24h: false,     // TODO: usar useGamificationStatus
      recentMilestone: false,         // TODO: usar useAchievementsMap
      weekendDay: dow === 'Sat' || dow === 'Sun',
      heavyWeekDetected: false,       // TODO: derivar de events últimos 7d
      partnerHighContribLastWeek: false, // TODO: derivar de pointsTransactions
      isMonday: dow === 'Mon',
    }
  }, [coupleId, tz])
}
