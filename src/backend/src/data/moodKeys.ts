// v1.6 — Canonical list of moodKeys.
// Used by zod validation in PUT /api/profile/me and GET /api/profile/mood-history.
// Mirrored in frontend src/data/moods.ts (con metadata adicional: emoji, label, hint, tone).
//
// **Decisión deliberada:** sin moods hostiles (enfadado, cabreado, etc.).
// Los conflictos se canalizan por disputas/negociación, no por etiquetas pasivas.

export const MOOD_KEYS = [
  'feliz',
  'enamorado',
  'energico',
  'carinoso',
  'tranquilo',
  'pensativo',
  'cansado',
  'enfermo',
  'estresado',
  'bajon',
] as const

export type MoodKey = typeof MOOD_KEYS[number]
