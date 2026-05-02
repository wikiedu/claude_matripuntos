// v1.6.1 — Catálogo cerrado de eventos de telemetría.
// Frontend y backend importan el mismo schema. validateTelemetryEvent
// rechaza eventos off-schema con error loud en dev y warn silencioso en prod.
import { z } from 'zod'
import { MOOD_KEYS } from './schemas/profile.js'

const phraseCategoryEnum = z.enum([
  'reconciliacion','animo','celebrar','agradecer','calma','animo-suave','hito','neutra-positivo',
])

export const TELEMETRY_EVENT_SCHEMAS = {
  'auth.signup_completed':           z.object({ method: z.enum(['email','joinCode']), timeToCompleteMs: z.number() }),
  'auth.login_success':              z.object({}),
  'auth.logout':                     z.object({}),
  'onboarding.step_completed':       z.object({ step: z.number().int().min(1).max(6), role: z.enum(['creator','invitee']) }),
  'onboarding.invitee_skipped_step': z.object({ step: z.number().int() }),
  'onboarding.invitee_banner_dismissed': z.object({}),
  'mood.set':                        z.object({ moodKey: z.enum(MOOD_KEYS), source: z.enum(['header','card','nudge','settings']) }),
  'mood.cleared':                    z.object({}),
  'mood.expired_seen':               z.object({}),
  'phrase.daily_seen':               z.object({ category: phraseCategoryEnum }),
  'avatar.changed':                  z.object({ from: z.string(), to: z.string(), colorChanged: z.boolean() }),
  'activity.created':                z.object({ type: z.string(), hasCompensation: z.boolean(), pointsBase: z.number() }),
  'activity.responded':              z.object({ response: z.enum(['accepted','rejected','counter','forced']), round: z.number().int() }),
  'activity.force_paid':             z.object({ amount: z.number() }),
  'task.log_created':                z.object({ category: z.string() }),
  'task.log_disputed':               z.object({}),
  'task.log_auto_verified':          z.object({}),
  'couple.left':                     z.object({}),
  'account.deleted':                 z.object({}),
  'account.exported':                z.object({}),
  'consent.changed':                 z.object({ analytics: z.boolean() }),
  'ratelimit.hit':                   z.object({ endpoint: z.string(), bucket: z.string() }),
} as const

export type TelemetryEventName = keyof typeof TELEMETRY_EVENT_SCHEMAS
export type TelemetryEventProps<E extends TelemetryEventName> =
  z.infer<typeof TELEMETRY_EVENT_SCHEMAS[E]>

export function validateTelemetryEvent<E extends TelemetryEventName>(
  name: E,
  props: unknown,
): { ok: true; data: TelemetryEventProps<E> } | { ok: false; error: z.ZodError } {
  const schema = TELEMETRY_EVENT_SCHEMAS[name]
  const r = schema.safeParse(props)
  if (r.success) return { ok: true, data: r.data as any }
  return { ok: false, error: r.error }
}
