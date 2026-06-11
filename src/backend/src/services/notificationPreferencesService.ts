// v2.2.4 — Servicio de preferencias de notificación (canvas 10 Claude Design).
// Las preferencias se guardan como JSON string en User.notificationPreferences.
//
// Filosofía (handoff):
//  - 3 tiers: critical (siempre llega) / digest (solo en resumen diario) / off
//  - Quiet hours por defecto 22:00-09:00 (configurable)
//  - Categorías: request, negotiation, calendar, achievements, streak, ruleProposal

import prisma from '../lib/prisma.js'
import { parseJsonField } from '../lib/jsonField.js'

export type CategoryKey =
  | 'request' | 'negotiation' | 'calendar'
  | 'achievements' | 'streak' | 'ruleProposal'

export type Tier = 'critical' | 'digest' | 'off'

export interface NotificationPreferences {
  quietHours: { start: string; end: string }   // 'HH:MM'
  digestEnabled: boolean
  digestHour: string                           // 'HH:MM'
  categories: Record<CategoryKey, Tier>
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  quietHours: { start: '22:00', end: '09:00' },
  digestEnabled: true,
  digestHour: '20:30',
  categories: {
    request:      'critical',
    negotiation:  'critical',
    calendar:     'critical',
    ruleProposal: 'critical',
    achievements: 'digest',
    streak:       'off',
  },
}

export function parsePreferences(raw: string | null | undefined): NotificationPreferences {
  const parsed = parseJsonField<Partial<NotificationPreferences> | null>(raw, null)
  if (!parsed) return DEFAULT_PREFERENCES
  return {
    ...DEFAULT_PREFERENCES,
    ...parsed,
    quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...(parsed.quietHours ?? {}) },
    categories: { ...DEFAULT_PREFERENCES.categories, ...(parsed.categories ?? {}) },
  }
}

/**
 * Comprueba si una notif debe entregarse por push según las preferencias del
 * user. Devuelve { allow, reason } para auditoría.
 *
 *  - critical → siempre allow (incluso en quiet hours).
 *  - digest → bloqueado para push instantáneo (se incluirá en el digest).
 *  - off → bloqueado.
 *  - quiet hours: si estamos dentro y NO es critical → bloqueado.
 *
 * `now` parametrizable para tests.
 */
export function shouldSendPush(
  prefs: NotificationPreferences,
  category: CategoryKey,
  options: { now?: Date } = {},
): { allow: boolean; reason: string } {
  const tier = prefs.categories[category] ?? 'off'
  if (tier === 'off') return { allow: false, reason: 'category off' }
  if (tier === 'digest') return { allow: false, reason: 'category in digest only' }

  const now = options.now ?? new Date()
  if (isInQuietHours(now, prefs.quietHours)) {
    if (tier === 'critical') return { allow: true, reason: 'critical bypasses quiet hours' }
    return { allow: false, reason: 'quiet hours active' }
  }
  return { allow: true, reason: 'critical' }
}

function isInQuietHours(now: Date, qh: { start: string; end: string }): boolean {
  const [sh, sm] = qh.start.split(':').map(Number)
  const [eh, em] = qh.end.split(':').map(Number)
  const cur = now.getHours() * 60 + now.getMinutes()
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (startMin === endMin) return false
  if (startMin < endMin) {
    // Same-day window (e.g. 13:00 - 15:00)
    return cur >= startMin && cur < endMin
  }
  // Cross-midnight window (e.g. 22:00 - 09:00)
  return cur >= startMin || cur < endMin
}

export async function getPreferencesForUser(userId: string): Promise<NotificationPreferences> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  })
  return parsePreferences(u?.notificationPreferences)
}

export async function setPreferencesForUser(
  userId: string,
  prefs: NotificationPreferences,
): Promise<NotificationPreferences> {
  await prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: JSON.stringify(prefs) },
  })
  return prefs
}
