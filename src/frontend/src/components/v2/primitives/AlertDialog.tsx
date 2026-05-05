import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from './Button'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'

interface Props {
  open: boolean
  title?: string
  message: string
  buttonLabel?: string
  variant?: 'danger' | 'warn' | 'primary'
  onClose: () => void
}

export function AlertDialog({
  open,
  title = 'Aviso',
  message,
  buttonLabel = 'Entendido',
  variant = 'warn',
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onEsc)
    acquireSheetLock()
    return () => {
      window.removeEventListener('keydown', onEsc)
      releaseSheetLock()
    }
  }, [open, onClose])

  if (!open) return null

  const tone =
    variant === 'danger' ? 'text-danger' : variant === 'warn' ? 'text-warn' : 'text-brand-purple'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-card border border-brd-subtle rounded-xl shadow-xl max-w-sm w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tone}`} />
          <div className="flex-1">
            <h3 id="alert-dialog-title" className="text-base font-bold text-text-primary">
              {title}
            </h3>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4">
          <Button variant="primary" onClick={onClose} fullWidth>
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
