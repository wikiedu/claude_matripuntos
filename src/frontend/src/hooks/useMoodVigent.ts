// v1.6 — Hook que devuelve el Mood vigente del user (si fue setado en las
// últimas 24h y la key existe en el catálogo). Devuelve null si:
//  - moodKey vacío o null
//  - moodUpdatedAt vacío
//  - >=24h desde moodUpdatedAt
//  - moodKey no está en MOOD_BY_KEY (defensivo, e.g. tras migración fallida)
//
// Esta lógica es la fuente de verdad para "¿se muestra el mood en UI?".

import { useMemo } from 'react'
import { MOOD_BY_KEY, type Mood } from '../data/moods'

const MOOD_VIGENCIA_MS = 24 * 60 * 60 * 1000

export function useMoodVigent(
  moodKey: string | null | undefined,
  moodUpdatedAt: string | Date | null | undefined,
): Mood | null {
  return useMemo(() => {
    if (!moodKey || !moodUpdatedAt) return null
    const updated =
      typeof moodUpdatedAt === 'string' ? new Date(moodUpdatedAt) : moodUpdatedAt
    if (Number.isNaN(updated.getTime())) return null
    const ageMs = Date.now() - updated.getTime()
    if (ageMs >= MOOD_VIGENCIA_MS) return null
    return MOOD_BY_KEY[moodKey] ?? null
  }, [moodKey, moodUpdatedAt])
}
