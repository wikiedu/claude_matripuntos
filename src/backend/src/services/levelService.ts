// v1.7 — LevelService: computa nivel desde XP. Reads-friendly (puro,
// sin DB). El persistir en CoupleLevel se hace en routes con upsert.

import { LEVEL_THRESHOLDS, LEVEL_NAMES, LEVEL_PERKS, MAX_LEVEL } from '../data/levelTable.js'

export interface LevelInfo {
  level: number
  name: string
  perks: string[]
  threshold: number
  nextThreshold: number
}

export function computeLevel(xp: number): LevelInfo {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
      break
    }
  }
  level = Math.min(level, MAX_LEVEL)
  const name = LEVEL_NAMES[level - 1]
  const perks = LEVEL_PERKS[level] ?? []
  const threshold = LEVEL_THRESHOLDS[level - 1]
  const nextThreshold = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level] : threshold
  return { level, name, perks, threshold, nextThreshold }
}

export function xpToNext(xp: number): number {
  const info = computeLevel(xp)
  if (info.level === MAX_LEVEL) return 0
  return Math.max(0, info.nextThreshold - xp)
}

// crossedLevel returns true if going from `prevXp` to `nextXp` crosses
// any threshold (i.e. levels up). Útil para trigger animaciones y events.
export function crossedLevel(prevXp: number, nextXp: number): boolean {
  return computeLevel(prevXp).level !== computeLevel(nextXp).level
}
