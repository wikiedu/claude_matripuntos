// v1.7 — Hook wrapper para web push subscription. Maneja:
//   - Permission request (browser API).
//   - Service worker register.
//   - Subscribe via VAPID public key del backend.
//   - Estado: 'idle' | 'unsupported' | 'denied' | 'subscribing' | 'subscribed' | 'error'.

import { useEffect, useState } from 'react'
import { apiClient } from '../services/apiClient'

// Fase 1 PWA (T4) — WEB PUSH REACTIVADO.
// El SW real (src/sw.ts, via vite-plugin-pwa) lo registra main.tsx con handlers
// de push/notificationclick incluidos. Este hook ya NO registra ningún SW:
// espera al registration existente (navigator.serviceWorker.ready). En dev el
// SW no se registra (devOptions off) → el race con timeout evita colgarse.
const WEB_PUSH_ENABLED: boolean = true

type State = 'idle' | 'unsupported' | 'denied' | 'subscribing' | 'subscribed' | 'error'

export function useWebPush() {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!WEB_PUSH_ENABLED) {
      // Kill-switch (no debería activarse desde Fase 1 PWA).
      setState('unsupported')
      return
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    // Detect existing subscription
    navigator.serviceWorker.getRegistration?.()
      .then(reg => reg?.pushManager.getSubscription?.())
      .then(sub => { if (sub) setState('subscribed') })
      .catch(() => {})
  }, [])

  async function subscribe(): Promise<boolean> {
    setError(null)
    if (!WEB_PUSH_ENABLED) {
      setState('unsupported')
      return false
    }
    if (state === 'unsupported') return false
    setState('subscribing')

    try {
      // 1. Permission
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setState('denied')
        return false
      }

      // 2. Service worker — ya registrado por main.tsx (vite-plugin-pwa).
      // ready nunca rechaza; si no hay SW (p.ej. dev), cortamos a los 5s.
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('service worker no disponible')), 5000),
        ),
      ])

      // 3. VAPID key del backend
      const r: any = await apiClient.request('/notifications/push/vapid-key')
      if (!r?.publicKey) throw new Error('VAPID key not available')

      // 4. Subscribe — applicationServerKey acepta BufferSource. Convertimos
      // el Uint8Array a un ArrayBuffer "estricto" para que pase el typing
      // moderno de TS DOM lib (que distingue ArrayBuffer vs SharedArrayBuffer).
      const keyBytes = urlBase64ToUint8Array(r.publicKey)
      const keyBuffer: ArrayBuffer = keyBytes.buffer.slice(keyBytes.byteOffset, keyBytes.byteOffset + keyBytes.byteLength) as ArrayBuffer
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBuffer,
      })

      // 5. Send to backend
      const json = sub.toJSON() as any
      await apiClient.request('/notifications/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        }),
      })

      setState('subscribed')
      return true
    } catch (e: any) {
      setError(e?.message ?? 'subscribe failed')
      setState('error')
      return false
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!WEB_PUSH_ENABLED) return
    if (typeof window === 'undefined') return
    const reg = await navigator.serviceWorker.getRegistration?.()
    const sub = await reg?.pushManager.getSubscription?.()
    if (!sub) return
    const json = sub.toJSON() as any
    await apiClient.request('/notifications/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: json.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe()
    setState('idle')
  }

  return { state, error, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
