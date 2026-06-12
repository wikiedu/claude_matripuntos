// E.2 Fase 2 — card de instalación de la PWA en Settings.
// Tres estados:
//   1. Ya instalada (standalone) → no renderiza nada.
//   2. Prompt nativo disponible (Chrome/Edge) → botón "Instalar app".
//   3. iOS sin instalar → instrucciones manuales (no hay beforeinstallprompt).
//   4. Resto (Firefox/Safari desktop sin evento) → no renderiza (sin ruido).
import { useSyncExternalStore, useState } from 'react'
import { Smartphone, Share } from 'lucide-react'
import {
  canInstall,
  isIOS,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from '../../../lib/installPrompt'

export function InstallAppCard() {
  const installable = useSyncExternalStore(subscribeInstallPrompt, canInstall)
  const [dismissedOutcome, setDismissedOutcome] = useState(false)

  if (isStandalone()) return null

  // Caso 2 — prompt nativo disponible
  if (installable) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-md bg-surface-card border border-brd-subtle">
        <Smartphone className="w-6 h-6 text-brand-purple flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary">Instala Matripuntos</p>
          <p className="text-xs text-text-secondary">
            Acceso directo, pantalla completa y más rápida.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void promptInstall().then((outcome) => {
              if (outcome === 'dismissed') setDismissedOutcome(true)
            })
          }}
          className="flex-shrink-0 px-3 py-2 rounded-md text-xs font-semibold bg-brand-purple/15 text-brand-purple border border-brand-purple/30 hover:bg-brand-purple/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        >
          {dismissedOutcome ? 'Reintentar' : 'Instalar app'}
        </button>
      </div>
    )
  }

  // Caso 3 — iOS: instalación manual
  if (isIOS()) {
    return (
      <div className="p-3 rounded-md bg-surface-card border border-brd-subtle">
        <div className="flex items-center gap-3 mb-1.5">
          <Smartphone className="w-6 h-6 text-brand-purple flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold text-text-primary">Instala Matripuntos</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          En Safari, pulsa <Share className="inline w-3.5 h-3.5 align-text-bottom" aria-label="Compartir" />{' '}
          <strong>Compartir</strong> y luego <strong>“Añadir a pantalla de inicio”</strong>. Tendrás la
          app a un toque y podrás recibir notificaciones.
        </p>
      </div>
    )
  }

  // Caso 4 — sin vía de instalación conocida
  return null
}
