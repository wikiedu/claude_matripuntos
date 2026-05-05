import { ReactNode, useEffect } from 'react'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // v2.4 audit 06 S0-1 / 07 S0 — el sheetLock pasa de "opt-in por componente"
    // a automático para CUALQUIER consumidor de BottomSheet. Antes 8+ sheets
    // no lo invocaban y el polling background interrumpía la interacción.
    acquireSheetLock()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      releaseSheetLock()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[80] animate-in fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-0 right-0 bottom-0 z-[81] max-w-[500px] mx-auto bg-surface-elevated border-t border-brd-purple rounded-t-xl p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-200"
      >
        {title && <h3 className="text-base font-bold text-text-primary mb-3">{title}</h3>}
        {children}
      </div>
    </>
  )
}
