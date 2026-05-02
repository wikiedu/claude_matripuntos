// v1.7 — Web push wrapper sobre web-push (RFC 8030 + VAPID).
// Lazy-load para no fallar si la dep no está instalada en dev.
//
// Env vars requeridas en producción:
//   VAPID_PUBLIC_KEY  — pública (también enviada al frontend)
//   VAPID_PRIVATE_KEY — privada
//   VAPID_SUBJECT     — mailto:soporte@matripuntos.app

interface PushPayload {
  title: string
  body: string
  url?: string         // URL relativa para nav al click ('/dashboard')
  icon?: string        // override del default
  tag?: string         // dedupe en el mismo tag
}

interface SubscriptionLike {
  endpoint: string
  p256dh: string
  auth: string
}

let webPushModule: any = null
let webPushInitialized = false

async function getWebPush() {
  if (webPushModule || webPushInitialized) return webPushModule
  const moduleName = ['web', 'push'].join('-')
  webPushModule = await import(/* @vite-ignore */ moduleName).catch(() => null)
  if (!webPushModule) {
    webPushInitialized = true
    return null
  }
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT ?? 'mailto:soporte@matripuntos.app'
  if (!pub || !priv) {
    console.warn('[webpush] VAPID keys not set — push deshabilitado')
    webPushModule = null
    webPushInitialized = true
    return null
  }
  webPushModule.default?.setVapidDetails?.(subj, pub, priv) ?? webPushModule.setVapidDetails?.(subj, pub, priv)
  webPushInitialized = true
  return webPushModule
}

export async function sendPushToSubscription(
  sub: SubscriptionLike,
  payload: PushPayload,
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const wp = await getWebPush()
  if (!wp) return { ok: false, error: 'web-push not configured' }

  const subscriptionObj = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }

  try {
    const send = wp.default?.sendNotification ?? wp.sendNotification
    const res = await send(subscriptionObj, JSON.stringify(payload))
    return { ok: true, statusCode: res?.statusCode }
  } catch (e: any) {
    // 410 Gone → subscription muerta; 404 → idem. El llamador debe limpiar.
    return { ok: false, statusCode: e?.statusCode, error: e?.message ?? 'send failed' }
  }
}

export function getPublicVapidKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null
}

// Plantillas de payload (ES, cap 2048 bytes payload total tras serializar).
export const pushTemplates = {
  achievementUnlocked(name: string, icon: string): PushPayload {
    return {
      title: `${icon} Logro desbloqueado`,
      body: `${name}`,
      url: '/achievements',
      tag: 'achievement',
    }
  },

  challengeReady(): PushPayload {
    return {
      title: '🎯 Nuevo reto de la semana',
      body: 'Tu reto ya está disponible. ¡A por él!',
      url: '/dashboard',
      tag: 'challenge',
    }
  },

  partnerActivity(partnerName: string, count: number): PushPayload {
    return {
      title: `💕 ${partnerName} está activo`,
      body: `Ha registrado ${count} ${count === 1 ? 'tarea' : 'tareas'} hoy.`,
      url: '/dashboard',
      tag: 'partner-activity',
    }
  },

  reEngagement(daysAgo: number): PushPayload {
    return {
      title: 'Te echamos de menos 💕',
      body: `Hace ${daysAgo} días que no abres Matripuntos. ¿Qué tal va todo?`,
      url: '/dashboard',
      tag: 're-engagement',
    }
  },
}
