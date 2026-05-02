// v1.6 — Banner ámbar pequeño debajo del header. Aparece SOLO si:
//  - el user actual no tiene mood vigente
//  - no se ha dismissed esta sesión (sessionStorage por dateKey)
//
// Tap → abre MoodSelectorSheet. × → dismiss persistente para esa fecha.

import { useState, useEffect } from 'react'

interface Props {
  hasMood: boolean
  dateKey: string  // YYYY-MM-DD
  onTap: () => void
}

export function MoodNudge({ hasMood, dateKey, onTap }: Props) {
  const storageKey = `moodNudgeDismissed:${dateKey}`
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(storageKey) === '1',
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(sessionStorage.getItem(storageKey) === '1')
  }, [storageKey])

  if (hasMood || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1')
    setDismissed(true)
  }

  return (
    <div data-testid="mood-nudge" className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 flex items-center gap-3">
      <button
        type="button"
        data-testid="mood-nudge-body"
        onClick={onTap}
        className="flex-1 text-left text-sm text-amber-100"
      >
        ¿Cómo estás hoy? Comparte tu mood con tu pareja →
      </button>
      <button
        type="button"
        data-testid="mood-nudge-dismiss"
        onClick={handleDismiss}
        className="text-amber-100/60 hover:text-amber-100 text-xl px-2"
        aria-label="Descartar"
      >
        ×
      </button>
    </div>
  )
}
