// v2.3.5 — Sheet de Actividades simplificado (KISS).
// Una sola vista: catálogo (search + chips de categoría + listado agrupado).
// Picker → wizard /request-activity con templateId pre-seleccionado.
// CTA secundario abajo del listado: "✏️ Crear desde cero" → abre el editor
// de plantilla (AddActivityTemplateSheet) para que el usuario añada la suya
// al catálogo y luego la seleccione.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, Pencil } from 'lucide-react'
import { useActivityCatalog, useRecordTemplateUse, type ActivityTemplate } from '../../../hooks/useActivityCatalog'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'
import { AddActivityTemplateSheet } from '../catalog/AddActivityTemplateSheet'

const CATEGORY_LABEL: Record<string, { emoji: string; label: string }> = {
  trabajo:      { emoji: '💼', label: 'Trabajo' },
  salud:        { emoji: '🩺', label: 'Salud' },
  ocio:         { emoji: '🎬', label: 'Ocio' },
  social:       { emoji: '👯', label: 'Social' },
  alto_impacto: { emoji: '💒', label: 'Alto impacto' },
  viaje:        { emoji: '✈️', label: 'Viaje' },
  cuidado:      { emoji: '👶', label: 'Cuidado' },
  personal:     { emoji: '😌', label: 'Personal' },
}

interface Props {
  open: boolean
  onClose: () => void
}

export function AddActivitySheet({ open, onClose }: Props) {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [showTemplateSheet, setShowTemplateSheet] = useState(false)
  const { data, isLoading, refetch } = useActivityCatalog()
  const recordUse = useRecordTemplateUse()

  useEffect(() => {
    if (!open) return
    acquireSheetLock()
    return () => releaseSheetLock()
  }, [open])

  const templates = data?.templates ?? []

  const grouped = useMemo(() => {
    let list = templates
    if (catFilter !== 'all') {
      list = list.filter((t) => t.category === catFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
    }
    const groups: Record<string, ActivityTemplate[]> = {}
    for (const t of list) {
      if (!groups[t.category]) groups[t.category] = []
      groups[t.category].push(t)
    }
    return groups
  }, [templates, catFilter, search])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    templates.forEach((t) => set.add(t.category))
    return Array.from(set)
  }, [templates])

  if (!open) return null

  const handlePickFromCatalog = (tpl: ActivityTemplate) => {
    recordUse.mutate(tpl.id)
    onClose()
    nav(`/request-activity?templateId=${tpl.id}`)
  }

  const handleStartBlank = () => {
    setShowTemplateSheet(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
      {/* v2.7.7 audit 09 S1-U-2 — safe-area-inset-bottom para iPhone notch.
           sm:rounded-2xl + sm:p-4 al desktop reset el padding bottom inheritor. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-activity-title"
        className="w-full sm:max-w-lg bg-surface-card border border-brd-subtle rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="add-activity-title" className="text-base font-bold text-text-primary flex-1">
            Nueva actividad
            <span className="ml-2 text-[10px] font-medium text-text-tertiary">{templates.length} ideas</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-secondary text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar plantilla…"
          className="w-full px-3 py-2 mb-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        />

        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setCatFilter('all')}
            className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${
              catFilter === 'all'
                ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                : 'bg-surface-card text-text-tertiary border border-brd-subtle'
            }`}
          >
            Todas
          </button>
          {allCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${
                catFilter === c
                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
                  : 'bg-surface-card text-text-tertiary border border-brd-subtle'
              }`}
            >
              {CATEGORY_LABEL[c]?.emoji ?? '•'} {CATEGORY_LABEL[c]?.label ?? c}
            </button>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto space-y-3">
          {isLoading && (
            <p className="text-sm text-text-tertiary text-center py-6">Cargando catálogo…</p>
          )}
          {!isLoading && Object.keys(grouped).length === 0 && (
            <p className="text-sm text-text-tertiary text-center py-6">
              Nada coincide con tu búsqueda.
            </p>
          )}
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h3 className="text-[10px] uppercase tracking-wide text-text-tertiary font-bold mb-1.5">
                {CATEGORY_LABEL[cat]?.emoji ?? '•'} {CATEGORY_LABEL[cat]?.label ?? cat}
              </h3>
              <div className="space-y-1">
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePickFromCatalog(t)}
                    className="w-full flex items-center justify-between gap-2 p-2.5 rounded-md bg-surface-base border border-brd-subtle hover:border-brand-purple/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {t.emoji && <span className="mr-1">{t.emoji}</span>}
                        {t.name}
                      </p>
                      {t.subcategory && (
                        <p className="text-[10px] text-text-tertiary truncate">{t.subcategory}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-brand-purple flex-shrink-0">
                      −{Number(t.pointsBaseSuggested)} MP
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-brd-subtle">
          <button
            type="button"
            onClick={handleStartBlank}
            className="w-full px-3 py-2.5 rounded-md border border-brd-subtle bg-surface-base text-text-primary text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:border-brand-purple/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          >
            <Pencil className="w-4 h-4" /> Crear desde cero
          </button>
          <p className="text-[10px] text-text-tertiary text-center mt-1.5 leading-relaxed">
            Crea una plantilla nueva en tu catálogo (nombre, categoría, puntos, duración) y luego selecciónala para programarla.
          </p>
        </div>
      </div>

      <AddActivityTemplateSheet
        open={showTemplateSheet}
        initial={null}
        onClose={() => setShowTemplateSheet(false)}
        onSaved={() => refetch()}
      />
    </div>
  )
}

export default AddActivitySheet
