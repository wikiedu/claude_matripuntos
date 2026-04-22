import { useEffect } from 'react'
import { AlertTriangle, Loader, X } from 'lucide-react'
import { Button } from './Button'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warn' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, busy, onClose])

  if (!open) return null

  const tone =
    variant === 'danger' ? 'text-danger' : variant === 'warn' ? 'text-warn' : 'text-brand-purple'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-surface-card border border-brd-subtle rounded-xl shadow-xl max-w-sm w-full p-5">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tone}`} />
          <div className="flex-1">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-line">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-text-tertiary hover:text-text-primary disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} fullWidth disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'primary' ? 'primary' : 'danger'}
            onClick={onConfirm}
            fullWidth
            disabled={busy}
          >
            <span className="inline-flex items-center gap-2">
              {busy && <Loader className="w-4 h-4 animate-spin" />}
              {confirmLabel}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}
