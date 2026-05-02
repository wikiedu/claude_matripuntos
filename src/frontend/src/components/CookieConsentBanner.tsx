// v1.6.1 — Banner inferior NO bloqueante con 3 acciones:
// "Solo esenciales" / "Personalizar" / "Aceptar todo".
// Modal de personalizar muestra toggles esenciales (siempre on, disabled)
// + analítica (libre). Persiste en cookie via consent service.
// Decisión brainstorm 9-B: opt-out anónimo por defecto.

import { useEffect, useRef, useState } from 'react'
import { useConsent } from '../hooks/useConsent'
import { telemetry } from '../services/telemetry'

export function CookieConsentBanner() {
  const { consent, setConsent } = useConsent()
  const [showCustom, setShowCustom] = useState(false)
  const [analyticsToggle, setAnalyticsToggle] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  // v1.6.2 fix S1-9 (WCAG 2.1.2): focus en el primer botón al montar y
  // Escape cierra al "Solo esenciales" (rechazo seguro por defecto).
  useEffect(() => {
    if (consent) return
    firstFocusableRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setConsent({ analytics: false })
        void telemetry.track('consent.changed', { analytics: false }).then(() => telemetry.optOut())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [consent, setConsent])

  if (consent) return null

  const accept = (analytics: boolean) => {
    setConsent({ analytics })
    // v1.6.1 — telemetry: dispara consent.changed antes/después según opt-in/out.
    if (analytics) {
      void telemetry.optIn().then(() => telemetry.track('consent.changed', { analytics: true }))
    } else {
      void telemetry.track('consent.changed', { analytics: false }).then(() => telemetry.optOut())
    }
  }

  return (
    <div
      ref={containerRef}
      data-testid="cookie-banner"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#1a1035] border-t border-white/10 p-4 shadow-2xl"
      role="dialog"
      aria-modal="false"
      aria-label="Consentimiento de cookies"
    >
      {!showCustom && (
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-3">
          <p className="text-sm text-white/90 flex-1">
            Usamos cookies esenciales para que la app funcione. Las analíticas son opcionales y nos ayudan a mejorarla.{' '}
            <a href="/cookies" className="underline">Más info</a>
          </p>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              ref={firstFocusableRef}
              type="button"
              data-testid="btn-only-essentials"
              onClick={() => accept(false)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              Solo esenciales
            </button>
            <button
              type="button"
              data-testid="btn-customize"
              onClick={() => setShowCustom(true)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
            >
              Personalizar
            </button>
            <button
              type="button"
              data-testid="btn-accept-all"
              onClick={() => accept(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400"
            >
              Aceptar todo
            </button>
          </div>
        </div>
      )}
      {showCustom && (
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-semibold text-white mb-3">Personalizar cookies</h3>
          <div className="space-y-2 mb-4">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/90">
                Esenciales <span className="text-white/40 text-xs">(necesarias)</span>
              </span>
              <input type="checkbox" checked disabled aria-label="Esenciales (siempre activadas)" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/90">Analíticas (PostHog)</span>
              <input
                data-testid="toggle-analytics"
                type="checkbox"
                checked={analyticsToggle}
                onChange={e => setAnalyticsToggle(e.target.checked)}
                aria-label="Analíticas opcionales"
              />
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm"
            >
              Volver
            </button>
            <button
              type="button"
              data-testid="btn-save-custom"
              onClick={() => accept(analyticsToggle)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
