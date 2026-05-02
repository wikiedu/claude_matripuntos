// v1.6 — Frontend mood catalog. Mirror del backend src/backend/src/data/moodKeys.ts
// con metadata extra (emoji, label, hint, tone) para UI.
//
// **Decisión deliberada:** sin moods hostiles. Conflictos se canalizan por
// disputas/negociación, no por etiquetas pasivas.
//
// Distribución de 10 moods: 4 positivos, 2 neutros, 2 low-energy, 2 negative-soft.

export type MoodTone = 'positive' | 'neutral' | 'low-energy' | 'negative-soft'

export interface Mood {
  key: string
  emoji: string
  label: string
  hint: string
  tone: MoodTone
}

export const MOODS: Mood[] = [
  // positive (4)
  { key: 'feliz',     emoji: '😊', label: 'Feliz',          hint: 'de buenas',         tone: 'positive' },
  { key: 'enamorado', emoji: '🥰', label: 'Enamorada/o',    hint: 'cariño extra',      tone: 'positive' },
  { key: 'energico',  emoji: '💪', label: 'Con energía',    hint: 'productivo',        tone: 'positive' },
  { key: 'carinoso',  emoji: '🤗', label: 'Cariñosa/o',     hint: 'busco mimos',       tone: 'positive' },
  // neutral (2)
  { key: 'tranquilo', emoji: '😌', label: 'Tranquila/o',    hint: 'en mi rollo',       tone: 'neutral' },
  { key: 'pensativo', emoji: '🤔', label: 'Pensativa/o',    hint: 'le doy vueltas',    tone: 'neutral' },
  // low-energy (2)
  { key: 'cansado',   emoji: '😴', label: 'Cansada/o',      hint: 'no esperes mucho',  tone: 'low-energy' },
  { key: 'enfermo',   emoji: '🤒', label: 'Enferma/o',      hint: 'de baja hoy',       tone: 'low-energy' },
  // negative-soft (2) — nunca hostil
  { key: 'estresado', emoji: '😤', label: 'Estresada/o',    hint: 'saturada/o',        tone: 'negative-soft' },
  { key: 'bajon',     emoji: '😔', label: 'De bajón',       hint: 'necesito apoyo',    tone: 'negative-soft' },
]

export const MOOD_KEYS: string[] = MOODS.map(m => m.key)

export const MOOD_BY_KEY: Record<string, Mood> = Object.fromEntries(
  MOODS.map(m => [m.key, m]),
)
