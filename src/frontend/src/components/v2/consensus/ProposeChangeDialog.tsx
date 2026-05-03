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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Proponer cambio</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600">{fieldLabel}</p>

        <div className="text-sm flex items-center gap-2">
          <span className="line-through text-gray-400">{oldValue}</span>
          <span aria-hidden>→</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nuevo valor"
            className="flex-1 px-2 py-1 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
          className="w-full px-2 py-1.5 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-sm"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={propose.isPending}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            {propose.isPending ? 'Enviando…' : 'Enviar a tu pareja'}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Tu pareja recibirá la propuesta y podrá aceptarla o rechazarla. Hasta entonces no se aplica el cambio.
        </p>
      </form>
    </div>
  )
}

export default ProposeChangeDialog
