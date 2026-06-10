// v1.6.1 — Backend telemetry wrapper sobre posthog-node.
// Sanitize PII via whitelist. Si POSTHOG_KEY no está en env, no-op.
// Schemas validados contra catálogo cerrado en @matripuntos/shared.

import { validateTelemetryEvent, type TelemetryEventName, type TelemetryEventProps } from '../../../../packages/shared/dist/index.js'
import { logger } from '../lib/logger.js'

const PII_BLACKLIST = ['email', 'password', 'passwordHash', 'name', 'surname', 'secretKey', 'joinCode', 'text', 'message', 'notes']

function sanitize(props?: Record<string, any>): Record<string, any> {
  if (!props) return {}
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(props)) {
    if (PII_BLACKLIST.includes(k)) continue
    out[k] = v
  }
  return out
}

let client: any = null

async function getClient() {
  if (client !== null) return client
  const key = process.env.POSTHOG_KEY
  if (!key) {
    client = false  // marcador: ya intentado, no hay key
    return null
  }
  try {
    // posthog-node se carga lazy y como dep opcional; si no está instalada,
    // el wrapper queda no-op sin romper la app.
    const mod: any = await import('posthog-node' as any).catch(() => null)
    if (!mod?.PostHog) {
      logger.warn('[telemetry] posthog-node no disponible, telemetría deshabilitada')
      client = false
      return null
    }
    client = new mod.PostHog(key, { host: process.env.POSTHOG_HOST ?? 'https://eu.posthog.com' })
    return client
  } catch (e) {
    logger.warn({ err: e }, '[telemetry] init falló, telemetría deshabilitada')
    client = false
    return null
  }
}

export const telemetryBackend = {
  async track<E extends TelemetryEventName>(distinctId: string, event: E, props?: TelemetryEventProps<E>) {
    const c = await getClient()
    if (!c) return
    const r = validateTelemetryEvent(event, props ?? {})
    if (r.ok === false) {
      logger.warn({ issues: r.error.issues }, `[telemetry-backend] ${event} schema fail`)
      return
    }
    c.capture({ distinctId, event, properties: sanitize(r.data as any) })
  },

  async shutdown() {
    if (client && typeof client.shutdownAsync === 'function') {
      await client.shutdownAsync()
    }
  },
}
