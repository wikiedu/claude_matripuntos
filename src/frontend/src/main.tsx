import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initSentry } from './lib/sentry'
import { telemetry } from './services/telemetry'
import { readConsent } from './services/consent'
import { registerSW } from 'virtual:pwa-register'

initSentry()

// Fase 1 PWA — registra el service worker (src/sw.ts via vite-plugin-pwa).
// autoUpdate: el SW nuevo hace skipWaiting+claim; immediate evita esperar
// al evento load. En dev es no-op (devOptions desactivado).
registerSW({ immediate: true })

// v1.6.1 — Init telemetry según consent guardado. Si no hay cookie aún
// (primera visita), arranca opt-out anónimo. El user verá el banner y
// puede aceptar; al aceptar, useConsent guarda cookie + recarga
// permite a posthog activar capturing.
const consent = readConsent()
void telemetry.init(consent?.analytics === true)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
