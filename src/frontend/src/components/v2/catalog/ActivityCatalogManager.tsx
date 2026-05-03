// v2.0.8 — Manager del catálogo de actividades. Replica el patrón de Tasks:
//  - Header con "Nueva actividad" + refresh
//  - Filtro por categoría
//  - Lista de templates (globales + propios), agrupada por categoría
//  - Edit / delete sólo para propios; los globales son read-only

import { useState, useMemo } from 'react'
import { Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import {
  useActivityCatalog,
  useDeactivateActivityTemplate,
  type ActivityTemplate,
} from '../../../hooks/useActivityCatalog'
import { AddActivityTemplateSheet } from './AddActivityTemplateSheet'

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  trabajo:      { label: 'Trabajo',      emoji: '💼' },
  salud:        { label: 'Salud',        emoji: '🩺' },
  ocio:         { label: 'Ocio',         emoji: '🎬' },
  social:       { label: 'Social',       emoji: '👯' },
  alto_impacto: { label: 'Alto impacto', emoji: '💒' },
  viaje:        { label: 'Viaje',        emoji: '✈️' },
  cuidado:      { label: 'Cuidado',      emoji: '👶' },
  personal:     { label: 'Personal',     emoji: '😌' },
}

export function ActivityCatalogManager() {
  const { data, isLoading, refetch } = useActivityCatalog()
  const deactivate = useDeactivateActivityTemplate()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ActivityTemplate | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [confirmDelete, setConfirmDelete] = useState<ActivityTemplate | null>(null)

  const templates = data?.templates ?? []

  const grouped = useMemo(() => {
    const list = filter === 'all'
      ? templates
      : templates.filter((t) => t.category === filter)
    const byCat: Record<string, ActivityTemplate[]> = {}
    for (const t of list) {
      if (!byCat[t.category]) byCat[t.category] = []
      byCat[t.category].push(t)
    }
    return byCat
  }, [templates, filter])

  const cats = Object.keys(grouped).sort((a, b) => {
    const order = Object.keys(CATEGORY_META)
    return order.indexOf(a) - order.indexOf(b)
  })

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deactivate.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e: any) {
      alert(e?.message ?? 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-text-primary">Catálogo de actividades</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Actualizar"
            className="p-2 rounded-md bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowAdd(true) }}
            className="px-3 py-2 rounded-md bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nueva actividad
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
            filter === 'all' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-surface-card text-text-tertiary border border-brd-subtle'
          }`}
        >
          Todas
        </button>
        {Object.entries(CATEGORY_META).map(([slug, meta]) => (
          <button
            key={slug}
            type="button"
            onClick={() => setFilter(slug)}
            className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${
              filter === slug ? 'bg-brand-purple/20 text-brand-purple' : 'bg-surface-card text-text-tertiary border border-brd-subtle'
            }`}
          >
            {meta.emoji} {meta.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-text-tertiary py-3">Cargando catálogo…</p>}

      {!isLoading && cats.length === 0 && (
        <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
          <p className="text-sm text-text-secondary mb-2">Aún no hay actividades en este filtro.</p>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowAdd(true) }}
            className="text-sm text-brand-purple hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
          >
            Crear la primera →
          </button>
        </div>
      )}

      {cats.map((cat) => (
        <section key={cat}>
          <h3 className="text-[11px] uppercase tracking-wide text-text-tertiary font-bold mb-1.5">
            {CATEGORY_META[cat]?.emoji} {CATEGORY_META[cat]?.label ?? cat}
          </h3>
          <div className="space-y-1.5">
            {grouped[cat].map((t) => {
              const isCustom = !!t.coupleId
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-md bg-surface-card border border-brd-subtle p-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {t.emoji && <span className="mr-1">{t.emoji}</span>}
                      {t.name}
                      {isCustom && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-brand-purple/15 text-brand-purple">tuya</span>
                      )}
                    </p>
                    <p className="text-[11px] text-text-tertiary">
                      {t.subcategory && <span>{t.subcategory} · </span>}
                      {Number(t.pointsBaseSuggested)} pts base
                      {t.defaultDurationMinutes ? ` · ${t.defaultDurationMinutes} min` : ''}
                    </p>
                  </div>
                  {isCustom ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => { setEditing(t); setShowAdd(true) }}
                        aria-label={`Editar ${t.name}`}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-brand-purple hover:bg-surface-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(t)}
                        aria-label={`Eliminar ${t.name}`}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-surface-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-text-tertiary px-2 py-0.5 rounded bg-surface-base flex-shrink-0">global</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <AddActivityTemplateSheet
        open={showAdd}
        initial={editing}
        onClose={() => { setShowAdd(false); setEditing(null) }}
        onSaved={() => refetch()}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-brd-subtle rounded-2xl p-5 max-w-sm w-full">
            <h3 className="text-base font-bold text-text-primary mb-2">¿Eliminar "{confirmDelete.name}"?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Las actividades ya creadas con esta plantilla siguen tal cual. Sólo desaparece del catálogo.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button" onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 rounded-md border border-brd-subtle text-sm text-text-secondary hover:bg-surface-base"
              >Cancelar</button>
              <button
                type="button" onClick={handleDelete}
                disabled={deactivate.isPending}
                className="px-3 py-2 rounded-md bg-danger text-white text-sm font-semibold hover:bg-danger/90 disabled:opacity-50"
              >Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityCatalogManager
