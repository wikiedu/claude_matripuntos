// v2.0.5 — Tarjeta de aniversario para el dashboard.
// v2.0.6 fix UX: estilo dark, más discreta, no domina el dashboard.

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAnniversary, useSetAnniversary } from '../../../hooks/useAnniversary'

export function AnniversaryCard() {
  const { data, isLoading } = useAnniversary()
  const setMut = useSetAnniversary()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ann = data?.anniversary
  if (isLoading) return null

  // Sin fecha: chip discreto, una sola línea
  if (!ann && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-surface-card border border-brd-subtle hover:border-brand-purple/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
      >
        <span className="flex items-center gap-2 text-xs text-text-tertiary">
          <Heart className="w-3.5 h-3.5 text-brand-purple/70" />
          Añade vuestra fecha de aniversario
        </span>
        <span className="text-[11px] text-brand-purple">Añadir →</span>
      </button>
    )
  }

  // Form de edición: compacto, en línea con el resto de cards del dashboard
  if (editing) {
    return (
      <div className="rounded-md bg-surface-card border border-brd-subtle p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-brand-purple" />
            ¿Cuándo empezasteis juntos?
          </p>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null) }}
            className="text-xs text-text-tertiary hover:text-text-secondary"
            aria-label="Cancelar"
          >
            ✕
          </button>
        </div>
        <form
          className="flex flex-wrap gap-2 items-center"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            try {
              await setMut.mutateAsync(date)
              setEditing(false)
            } catch (err: any) {
              const msg = err?.message ?? 'Error al guardar'
              setError(msg.includes('Route not found')
                ? 'Esta función está actualizándose. Espera unos segundos y reintenta.'
                : msg)
            }
          }}
        >
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
            className="flex-1 min-w-[140px] px-2 py-1.5 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          />
          <button
            type="submit"
            disabled={setMut.isPending}
            className="px-3 py-1.5 rounded-md bg-brand-purple text-white text-xs font-semibold hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:opacity-50"
          >
            {setMut.isPending ? '...' : 'Guardar'}
          </button>
        </form>
        {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
      </div>
    )
  }

  // Estado normal: pill compacta con label inline
  return (
    <button
      type="button"
      onClick={() => {
        setDate(ann!.startDate.slice(0, 10))
        setEditing(true)
      }}
      className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-surface-card border border-brd-subtle hover:border-brand-purple/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
      aria-label="Editar fecha de aniversario"
    >
      <span className="flex items-center gap-2 min-w-0">
        <Heart className="w-3.5 h-3.5 text-brand-purple flex-shrink-0" />
        <span className="text-xs">
          <span className="text-text-tertiary">Llevamos juntos </span>
          <span className="text-text-primary font-semibold">{ann!.label}</span>
        </span>
      </span>
      <span className="text-[10px] text-brand-purple whitespace-nowrap">
        {ann!.nextMilestoneDays}d
      </span>
    </button>
  )
}

export default AnniversaryCard
