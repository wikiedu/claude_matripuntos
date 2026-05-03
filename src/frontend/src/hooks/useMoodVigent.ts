// v1.6 — Hook que devuelve el Mood vigente del user.
// v2.0.7 fix: ANTES era "vigente si <24h desde moodUpdatedAt", lo que mantenía
// el mood visible al cambiar de día (ej: lo pusiste ayer 22:00 y a las 10:00
// del día siguiente seguía válido). El usuario espera que el mood SE RESETEE
// al cambiar de día — por eso ahora exigimos que `moodUpdatedAt` sea HOY en
// la zona horaria local.
//
// Devuelve null si:
//  - moodKey vacío o null
//  - moodUpdatedAt vacío
//  - moodUpdatedAt no es hoy (en local time)
//  - moodKey no está en MOOD_BY_KEY (defensivo, e.g. tras migración fallida)

import { useMemo } from 'react'
import { MOOD_BY_KEY, type Mood } from '../data/moods'

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function useMoodVigent(
  moodKey: string | null | undefined,
  moodUpdatedAt: string | Date | null | undefined,
): Mood | null {
  return useMemo(() => {
    if (!moodKey || !moodUpdatedAt) return null
    const updated =
      typeof moodUpdatedAt === 'string' ? new Date(moodUpdatedAt) : moodUpdatedAt
    if (Number.isNaN(updated.getTime())) return null
    if (!isSameLocalDay(updated, new Date())) return null
    return MOOD_BY_KEY[moodKey] ?? null
  }, [moodKey, moodUpdatedAt])
}
