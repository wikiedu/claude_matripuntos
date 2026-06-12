// E.2 Fase 2 — captura del evento beforeinstallprompt para ofrecer la
// instalación de la PWA desde la UI (Settings). El evento solo se dispara
// en Chrome/Edge (Android/desktop); en iOS no existe y la instalación es
// manual (Compartir → Añadir a pantalla de inicio).
//
// IMPORTANTE: initInstallPrompt() debe llamarse lo antes posible (main.tsx),
// antes de que React monte — el navegador puede disparar el evento durante
// la carga inicial y si no hay listener se pierde.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((cb) => cb())
}

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  // Si el usuario instala (por cualquier vía), el prompt deja de tener sentido.
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

/** True si la app ya corre instalada (standalone / iOS homescreen). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Detección iOS (incluye iPadOS que se anuncia como MacIntel táctil). */
export function isIOS(): boolean {
  const ua = navigator.userAgent
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** True si el navegador ofreció el prompt nativo y aún no se consumió. */
export function canInstall(): boolean {
  return deferredPrompt !== null
}

/** Lanza el diálogo nativo de instalación. Devuelve el outcome del usuario. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  const ev = deferredPrompt
  deferredPrompt = null // el evento solo puede usarse una vez
  notify()
  await ev.prompt()
  const choice = await ev.userChoice
  return choice.outcome
}

/** Suscripción para reactividad en React (useSyncExternalStore). */
export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
