// v2.0.5 — Tarjeta de aniversario para el dashboard.
// Si la pareja no tiene relationshipStartDate, muestra un CTA para añadirla.

import { useState } from 'react'
import { useAnniversary, useSetAnniversary } from '../../../hooks/useAnniversary'

export function AnniversaryCard() {
  const { data, isLoading } = useAnniversary()
  const setMut = useSetAnniversary()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ann = data?.anniversary

  if (isLoading) return null

  if (!ann || editing) {
    return (
      <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
        <h3 className="text-sm font-semibold text-pink-900 mb-2">
          {editing ? 'Edita vuestra fecha' : '¿Cuándo empezasteis juntos?'}
        </h3>
        <p className="text-xs text-pink-800 mb-3">
          Pon la fecha en la que empezasteis a estar en pareja. Aparecerá un timer en el dashboard.
        </p>
        <form
          className="flex flex-wrap gap-2 items-center"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            try {
              await setMut.mutateAsync(date)
              setEditing(false)
            } catch (err: any) {
              setError(err?.message ?? 'Error al guardar')
            }
          }}
        >
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
            className="px-2 py-1 border border-pink-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          />
          <button
            type="submit"
            disabled={setMut.isPending}
            className="px-3 py-1 rounded bg-pink-600 text-white text-sm hover:bg-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 disabled:opacity-50"
          >
            Guardar
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1 rounded border text-sm"
            >
              Cancelar
            </button>
          )}
        </form>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-pink-700 font-semibold">Llevamos juntos</p>
          <p className="text-2xl font-bold text-pink-900 mt-1">{ann.label}</p>
          <p className="text-xs text-pink-700 mt-1">{ann.nextMilestoneLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDate(ann.startDate.slice(0, 10))
            setEditing(true)
          }}
          className="text-xs text-pink-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 rounded"
          aria-label="Editar fecha de aniversario"
        >
          Editar
        </button>
      </div>
    </div>
  )
}

export default AnniversaryCard
