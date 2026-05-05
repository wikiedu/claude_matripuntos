// v2.0.4 — Picker visual del catálogo de actividades.
// Se muestra en la creación de eventos: el usuario elige un template y la
// página rellena los campos sugeridos (puntos, duración, impacto).

import { useMemo, useState } from 'react'
import {
  useActivityCatalogGrouped,
  useRecordTemplateUse,
  type ActivityTemplate,
} from '../../../hooks/useActivityCatalog'

interface Props {
  onSelect: (template: ActivityTemplate) => void
  onClose?: () => void
  visibleCategories?: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  trabajo: 'Trabajo',
  salud: 'Salud',
  ocio: 'Ocio',
  social: 'Social',
  alto_impacto: 'Alto impacto',
  viaje: 'Viaje',
  cuidado: 'Cuidado',
  personal: 'Personal',
}

export function ActivityCatalogPicker({ onSelect, onClose, visibleCategories }: Props) {
  const { data, isLoading } = useActivityCatalogGrouped()
  const recordUse = useRecordTemplateUse()
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const all = data?.groups ?? {}
    const filtered: Record<string, ActivityTemplate[]> = {}
    for (const [cat, items] of Object.entries(all)) {
      if (visibleCategories && !visibleCategories.includes(cat)) continue
      const matched = items.filter((t) => {
        if (!filter) return true
        const haystack = `${t.name} ${t.subcategory ?? ''} ${t.description ?? ''}`.toLowerCase()
        return haystack.includes(filter.toLowerCase())
      })
      if (matched.length) filtered[cat] = matched
    }
    return filtered
  }, [data, filter, visibleCategories])

  const handleSelect = (t: ActivityTemplate) => {
    recordUse.mutate(t.id)
    onSelect(t)
  }

  // v2.6.2 audit 06 S1-12 — repintado completo con tokens dark del v2.
  return (
    <div className="bg-surface-card border border-brd-subtle rounded-2xl shadow-lg max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Elige una actividad</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded"
            aria-label="Cerrar"
          >
            ✕
          </button>
        )}
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Buscar actividad..."
        className="w-full px-3 py-2 border border-brd-subtle bg-surface-muted text-text-primary placeholder:text-text-tertiary rounded-lg mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
      />

      {isLoading && (
        <p className="text-sm text-text-secondary">Cargando catálogo...</p>
      )}

      {!isLoading && Object.keys(groups).length === 0 && (
        <p className="text-sm text-text-secondary">No hay actividades que coincidan con tu búsqueda.</p>
      )}

      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(groups).map(([cat, items]) => (
          <section key={cat}>
            <h3 className="text-sm uppercase tracking-wide text-text-tertiary mb-2">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(t)}
                    className="w-full text-left p-3 rounded-xl border border-brd-subtle bg-surface-muted text-text-primary hover:border-brand-amber/40 hover:bg-surface-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {t.emoji && <span className="mr-1">{t.emoji}</span>}
                          {t.name}
                        </p>
                        {t.subcategory && (
                          <p className="text-xs text-text-tertiary">{t.subcategory}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-brand-amber whitespace-nowrap">
                        {Number(t.pointsBaseSuggested)} pts
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

export default ActivityCatalogPicker
