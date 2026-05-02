// v1.6.1 — Profile zod schemas + MOOD_KEYS canonical list. Mirror del
// backend src/data/moodKeys.ts y frontend src/data/moods.ts. Esta es la
// SOURCE OF TRUTH a partir de v1.6.1.
import { z } from 'zod'

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

export const profileUpdateSchema = z.object({
  surname: z.string().max(80).optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  weeklyWorkHours: z.number().int().min(0).max(80).optional(),
  workMode: z.enum(['presencial', 'remoto', 'hibrido']).optional(),
  taskPreferencesLoves: z.array(z.string()).optional(),
  taskPreferencesDislikes: z.array(z.string()).optional(),
  avatarEmoji: z.string().max(8).optional(),
  avatarColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  currentMood: z.enum(MOOD_KEYS).nullable().optional(),
  hasCompletedOnboarding: z.boolean().optional(),
})
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export const profileCompletionResponseSchema = z.object({
  percent: z.number().int().min(0).max(100),
  missing: z.array(z.string()),
})
export type ProfileCompletion = z.infer<typeof profileCompletionResponseSchema>

export const moodHistoryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  tz: z.string().default('Europe/Madrid'),
})
export type MoodHistoryQuery = z.infer<typeof moodHistoryQuerySchema>

export const moodHistoryEntrySchema = z.object({
  date: z.string(),
  moodKey: z.enum(MOOD_KEYS).nullable(),
  emoji: z.string().optional(),
  label: z.string().optional(),
})
export type MoodHistoryEntry = z.infer<typeof moodHistoryEntrySchema>

export const moodHistoryResponseSchema = z.object({
  tz: z.string(),
  days: z.number().int(),
  history: z.array(moodHistoryEntrySchema),
})
export type MoodHistoryResponse = z.infer<typeof moodHistoryResponseSchema>
