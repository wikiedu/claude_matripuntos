// v2.0.6 — Mini diálogo para proponer un cambio de configuración consensuado.
// Se abre desde RulesSection (Settings) con field + oldValue ya prefijados.

import { useState } from 'react'
import { useProposeChange } from '../../../hooks/useConfigProposals'

interface Props {
  field: string
  fieldLabel: string
  oldValue: string
  onClose: () => void
}

export function ProposeChangeDialog({ field, fieldLabel, oldValue, onClose }: Props) {
  const [newValue, setNewValue] = useState('')
  const [rationale, setRationale] = useState('')
  const [error, setError] = useState<string | null>(null)
  const propose = useProposeChange()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!newValue.trim()) {
      setError('Indica el nuevo valor que propones.')
      return
    }
    if (newValue.trim() === oldValue.trim()) {
      setError('El nuevo valor coincide con el actual.')
      return
    }
    try {
      await propose.mutateAsync({
        field,
        oldValue,
        newValue: newValue.trim(),
        rationale: rationale.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Error al enviar la propuesta')
    }
  }

  // v2.6.2 audit 06 S1-13 — repintado con tokens dark del v2 design system.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="propose-change-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-surface-card border border-brd-subtle rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 id="propose-change-title" className="font-semibold text-text-primary">Proponer cambio</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-text-secondary">{fieldLabel}</p>

        <div className="text-sm flex items-center gap-2 text-text-secondary">
          <span className="line-through text-text-tertiary">{oldValue}</span>
          <span aria-hidden>→</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nuevo valor"
            className="flex-1 px-2 py-1 border border-brd-subtle bg-surface-muted text-text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            required
            autoFocus
          />
        </div>

        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Por qué crees que deberíamos cambiarlo (opcional)"
          maxLength={500}
          rows={3}
          className="w-full px-2 py-1.5 border border-brd-subtle bg-surface-muted text-text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber text-sm placeholder:text-text-tertiary"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-brd-subtle bg-surface-muted text-text-primary text-sm hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={propose.isPending}
            className="px-3 py-1.5 rounded-lg bg-brand-amber text-bg-page text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-50"
          >
            {propose.isPending ? 'Enviando…' : 'Enviar a tu pareja'}
          </button>
        </div>

        <p className="text-xs text-text-tertiary">
          Tu pareja recibirá la propuesta y podrá aceptarla o rechazarla. Hasta entonces no se aplica el cambio.
        </p>
      </form>
    </div>
  )
}

export default ProposeChangeDialog
