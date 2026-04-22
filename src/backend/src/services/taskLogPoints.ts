// Pure, testable math for TaskLog final points. Extracted from the POST
// /api/tasks/:taskId/log handler so regression tests can exercise the cap
// and modifier lookup without a running server or a DB.
//
// Audit v1.4 P1-B/P1-F: the server is the sole authority for pointsFinal —
// the client only submits `pointsBase` plus a named modifier. Everything
// else (streak, weekly, pet bonus) is resolved here and the result is
// rounded to 0.5 and capped at 500 to stop inflation.

import { getDailyMultiplier, getWeeklyBonus } from './gamificationService.js'

export const TASK_MODIFIER_VALUES: Record<string, number> = {
  none: 1.0,
  extra: 1.3,
  partial: 0.7,
  profunda: 1.5,
  complicada: 1.5,
  visita: 1.25,
}

export type TaskLogModifier = keyof typeof TASK_MODIFIER_VALUES

export interface TaskLogPointsInput {
  pointsBase: number
  modifier?: string
  streakDays: number
  streakWeeks: number
  factorMascotas: number
}

export interface TaskLogPointsBreakdown {
  modifierName: string
  modifierValue: number
  dailyMult: number
  weeklyBonus: number
  factorMascotas: number
  combinedMultiplier: number
  rawFinal: number
  pointsFinal: number
}

const MAX_POINTS = 500

export function resolveModifier(modifier?: string): {
  name: string
  value: number
} {
  const name = modifier ?? 'none'
  const value = TASK_MODIFIER_VALUES[name] ?? 1.0
  return { name, value }
}

export function calculateTaskLogPoints(input: TaskLogPointsInput): TaskLogPointsBreakdown {
  const { name: modifierName, value: modifierValue } = resolveModifier(input.modifier)
  const dailyMult = getDailyMultiplier(input.streakDays)
  const weeklyBonus = getWeeklyBonus(input.streakWeeks)
  const combinedMultiplier = dailyMult * (1 + weeklyBonus) * input.factorMascotas
  const rawFinal = input.pointsBase * modifierValue * combinedMultiplier
  const pointsFinal = Math.min(MAX_POINTS, Math.max(0, Math.round(rawFinal * 2) / 2))

  return {
    modifierName,
    modifierValue,
    dailyMult,
    weeklyBonus,
    factorMascotas: input.factorMascotas,
    combinedMultiplier,
    rawFinal,
    pointsFinal,
  }
}
