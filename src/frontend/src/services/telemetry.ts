// v1.6.1 — Frontend telemetry wrapper sobre posthog-js.
// Lazy-load: si posthog-js no está instalado o no hay VITE_POSTHOG_KEY, no-op.
// PII whitelist agresiva. Validación contra catálogo cerrado de @matripuntos/shared.
// Decisión brainstorm 9-B: opt-out con tracking anónimo por defecto.

import {
  validateTelemetryEvent,
  type TelemetryEventName,
  type TelemetryEventProps,
} from '@matripuntos/shared'

const PII_BLACKLIST = [
  'email', 'password', 'passwordHash', 'name', 'surname',
  'secretKey', 'joinCode', 'text', 'message', 'notes',
]

export function sanitizeProps(props?: Record<string, any>): Record<string, any> {
  if (!props) return {}
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(props)) {
    if (PII_BLACKLIST.includes(k)) continue
    out[k] = v
  }
  return out
}

let posthogInstance: any = null

async function getPosthog() {
  if (posthogInstance !== null) return posthogInstance
  try {
    // Vite resuelve imports estáticos en build, así que usamos un identificador
    // computado que evita la resolución estática. Si posthog-js no está
    // instalado (caso v1.6.1 actual), el wrapper queda no-op.
    const moduleName = ['posthog', 'js'].join('-')
    const mod: any = await import(/* @vite-ignore */ moduleName).catch(() => null)
    if (!mod?.default) {
      posthogInstance = false
      return null
    }
    posthogInstance = mod.default
    return posthogInstance
  } catch {
    posthogInstance = false
    return null
  }
}

export const telemetry = {
  async init(consent: boolean) {
    const key = import.meta.env.VITE_POSTHOG_KEY
    if (!key) return  // sin key, no-op
    const ph = await getPosthog()
    if (!ph) return
    const host = import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.posthog.com'
    ph.init(key, {
      api_host: host,
      opt_out_capturing_by_default: !consent,
      persistence: 'localStorage+cookie',
      autocapture: false,         // queremos eventos explícitos del catálogo
      capture_pageview: false,    // pageviews ad-hoc via track('phrase.daily_seen', etc.)
      disable_session_recording: true,  // brainstorm 9: sin replay
    })
  },

  async identify(userId: string, traits?: Record<string, any>) {
    const ph = await getPosthog()
    if (!ph) return
    ph.identify(userId, sanitizeProps(traits))
  },

  async track<E extends TelemetryEventName>(event: E, props?: TelemetryEventProps<E>) {
    const ph = await getPosthog()
    if (!ph) return
    const r = validateTelemetryEvent(event, props ?? {})
    if (r.ok === false) {
      if (import.meta.env.DEV) {
        console.warn(`[telemetry] event ${event} schema fail`, r.error.issues)
      }
      return
    }
    ph.capture(event, sanitizeProps(r.data as any))
  },

  async optIn() {
    const ph = await getPosthog()
    ph?.opt_in_capturing()
  },
  async optOut() {
    const ph = await getPosthog()
    ph?.opt_out_capturing()
  },
  async reset() {
    const ph = await getPosthog()
    ph?.reset()
  },
}
