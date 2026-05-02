// v1.7 — Streak service. Decisión brainstorm: streaks "blandos".
// Daily: gap > 24h+30min de gracia → reset. Mismo día = +0 (idempotente).
// Weekly: ≥3 días con actividad en ventana 7d → semana cuenta. Sino, reset.
// longestDaily/Weekly se preservan aunque la racha actual se rompa.

import type { CoupleStreak } from '@prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000
const GRACE_MS = 30 * 60 * 1000  // 30min ventana de gracia
const STREAK_GAP_THRESHOLD = DAY_MS + GRACE_MS

export interface StreakState {
  dailyStreak: number
  weeklyStreak: number
  lastActivityAt: Date | null
  longestDaily: number
  longestWeekly: number
}

export interface StreakUpdate {
  dailyStreak: number
  weeklyStreak: number
  lastActivityAt: Date
  longestDaily: number
  longestWeekly: number
  dailyChanged: boolean
  weeklyChanged: boolean
}

/**
 * recordActivity: dado el estado anterior y la fecha de una nueva actividad,
 * computa el nuevo estado del streak. Función pura — testeable sin DB.
 *
 * Reglas:
 *   - Si lastActivityAt es null → daily = 1, weekly = 1.
 *   - Si gap >= 24h+30min → reset daily a 1.
 *   - Si gap < 24h+30min y mismo día calendar → idempotente (no incrementa).
 *   - Si gap < 24h+30min y nuevo día calendar → daily +1.
 *
 *   - Weekly se evalúa con `weeklyActiveDays`: número de días distintos con
 *     actividad en los últimos 7 días incluyendo hoy. Si >=3 → weekly +1
 *     respecto al lunes anterior, si ya estamos en semana nueva. Sino reset.
 *
 * Nota: la lógica de weekly se simplifica si pasamos `currentWeekActiveDays`
 * pre-calculado (count distinct DATE(timestamp) últimos 7 días). El service
 * llama esto desde la capa de routes, no aquí.
 */
export function recordActivity(
  prev: StreakState,
  now: Date,
  weeklyActiveDays: number,
): StreakUpdate {
  const last = prev.lastActivityAt

  let newDaily: number
  let dailyChanged = false

  if (!last) {
    newDaily = 1
    dailyChanged = true
  } else {
    const gap = now.getTime() - last.getTime()
    if (gap >= STREAK_GAP_THRESHOLD) {
      newDaily = 1
      dailyChanged = true
    } else if (sameLocalDay(last, now)) {
      newDaily = prev.dailyStreak  // idempotente
      dailyChanged = false
    } else {
      newDaily = prev.dailyStreak + 1
      dailyChanged = true
    }
  }

  // Weekly: counter sube cuando weeklyActiveDays >= 3 y la semana anterior
  // también tuvo >=3 (continuous). Simplificación: usamos el contador como
  // "esta semana tiene >=3 actividades" → suma 1 vez por semana. Reset
  // si la semana actual tiene <3 días Y el último activity fue >7d atrás.
  let newWeekly = prev.weeklyStreak
  let weeklyChanged = false

  if (last) {
    const weeksSinceLast = Math.floor((now.getTime() - last.getTime()) / (7 * DAY_MS))
    if (weeksSinceLast >= 1 && weeklyActiveDays < 3) {
      newWeekly = 0
      weeklyChanged = newWeekly !== prev.weeklyStreak
    } else if (weeksSinceLast >= 1 && weeklyActiveDays >= 3) {
      newWeekly = prev.weeklyStreak + 1
      weeklyChanged = true
    }
  } else if (weeklyActiveDays >= 3) {
    newWeekly = 1
    weeklyChanged = true
  }

  return {
    dailyStreak: newDaily,
    weeklyStreak: newWeekly,
    lastActivityAt: now,
    longestDaily: Math.max(prev.longestDaily, newDaily),
    longestWeekly: Math.max(prev.longestWeekly, newWeekly),
    dailyChanged,
    weeklyChanged,
  }
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function streakStateFromRow(row: CoupleStreak | null): StreakState {
  if (!row) return { dailyStreak: 0, weeklyStreak: 0, lastActivityAt: null, longestDaily: 0, longestWeekly: 0 }
  return {
    dailyStreak: row.dailyStreak,
    weeklyStreak: row.weeklyStreak,
    lastActivityAt: row.lastActivityAt,
    longestDaily: row.longestDaily,
    longestWeekly: row.longestWeekly,
  }
}
