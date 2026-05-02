// v1.6 — Mood metadata para enriquecer responses (mood-history endpoint).
// Mirror reducido de frontend src/data/moods.ts. Solo emoji + label, no tone/hint
// (esos son del frontend, ya que el backend solo necesita devolver display data).

import { MOOD_KEYS, type MoodKey } from './moodKeys.js'

interface MoodMeta { emoji: string; label: string }

export const MOOD_BY_KEY: Record<MoodKey, MoodMeta> = {
  feliz:     { emoji: '😊', label: 'Feliz' },
  enamorado: { emoji: '🥰', label: 'Enamorada/o' },
  energico:  { emoji: '💪', label: 'Con energía' },
  carinoso:  { emoji: '🤗', label: 'Cariñosa/o' },
  tranquilo: { emoji: '😌', label: 'Tranquila/o' },
  pensativo: { emoji: '🤔', label: 'Pensativa/o' },
  cansado:   { emoji: '😴', label: 'Cansada/o' },
  enfermo:   { emoji: '🤒', label: 'Enferma/o' },
  estresado: { emoji: '😤', label: 'Estresada/o' },
  bajon:     { emoji: '😔', label: 'De bajón' },
}

// Guardrail: assert at module load that all MOOD_KEYS have metadata.
for (const k of MOOD_KEYS) {
  if (!MOOD_BY_KEY[k]) {
    throw new Error(`MOOD_BY_KEY missing key: ${k}`)
  }
}
