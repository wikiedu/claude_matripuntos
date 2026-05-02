// v1.6.1 — Consent service para cookies/analítica.
// Cookie `mp_consent_v1` con TTL 12 meses. Decisión brainstorm 9-B:
// opt-out con tracking anónimo por defecto.

export const CONSENT_COOKIE_NAME = 'mp_consent_v1'
export const CONSENT_TTL_DAYS = 365

export interface Consent {
  analytics: boolean
  version: 1
  acceptedAt: string  // ISO date
}

export function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp(`${CONSENT_COOKIE_NAME}=([^;]+)`))
  if (!m) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1]))
    if (parsed.version === 1 && typeof parsed.analytics === 'boolean') {
      return parsed as Consent
    }
  } catch { /* swallow */ }
  return null
}

export function writeConsent(partial: { analytics: boolean }): void {
  if (typeof document === 'undefined') return
  const data: Consent = {
    analytics: partial.analytics,
    version: 1,
    acceptedAt: new Date().toISOString(),
  }
  const exp = new Date(Date.now() + CONSENT_TTL_DAYS * 86400000).toUTCString()
  document.cookie =
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}` +
    `; expires=${exp}; path=/; SameSite=Lax`
}

export function clearConsent(): void {
  if (typeof document === 'undefined') return
  document.cookie =
    `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}
