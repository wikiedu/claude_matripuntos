// Fase 1 PWA — Service worker de Matripuntos (vite-plugin-pwa, injectManifest).
// Responsabilidades:
//   1. Precache del app shell (Workbox inyecta el manifest en build).
//   2. Navigation fallback a index.html (SPA con react-router).
//   3. Web push: pinta la notificación y navega al click.
// Las llamadas /api NUNCA se cachean (network-only por omisión: no hay
// runtime route para ellas y el denylist las excluye del fallback).

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

// autoUpdate: el SW nuevo toma control sin esperar a cerrar pestañas.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//],
  }),
)

// ---------------------------------------------------------------------------
// Web push — payload del backend (webPushService.PushPayload):
//   { title, body, url?, icon?, tag? }
// ---------------------------------------------------------------------------

self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; url?: string; icon?: string; tag?: string } = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Matripuntos', {
      body: payload.body ?? '',
      icon: payload.icon ?? '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: payload.tag,
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Si ya hay una pestaña de la app, foco + navega; si no, abre una.
      const existing = clients.find((c) => 'focus' in c)
      if (existing) {
        existing.navigate(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
