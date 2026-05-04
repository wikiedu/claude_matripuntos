// v2.3.4 — Sheet unificado de Actividades simétrico al de Tareas (canvas 15).
// Dos pestañas: '📚 Del catálogo' (default) y '✏️ Nueva personalizada'.
// 'Del catálogo' lleva al wizard RequestActivity con templateId pre-seleccionado.
// 'Nueva personalizada' abre el wizard sin pre-selección.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, ChevronRight } from 'lucide-react'
import { useActivityCatalog, useRecordTemplateUse, type ActivityTemplate } from '../../../hooks/useActivityCatalog'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'

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
  const [tab, setTab] = useState<'catalog' | 'new'>('catalog')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('all')
  const { data, isLoading } = useActivityCatalog()
  const recordUse = useRecordTemplateUse()

  // v2.3.4 — pausa polling externo mientras este sheet está abierto.
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
    onClose()
    nav('/request-activity')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full sm:max-w-lg bg-surface-card border border-brd-subtle rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-text-primary flex-1">
            {tab === 'catalog' ? 'Nueva actividad' : 'Crear nueva'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-secondary text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setTab('catalog')}
            className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple inline-flex items-center justify-center gap-1.5 ${
              tab === 'catalog'
                ? 'bg-brand-purple/15 border-brand-purple/40 text-brand-purple'
                : 'bg-surface-card border-brd-subtle text-text-tertiary'
            }`}
          >
            📚 Del catálogo <span className="text-[10px] opacity-70">{templates.length} ideas</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple inline-flex items-center justify-center gap-1.5 ${
              tab === 'new'
                ? 'bg-brand-purple/15 border-brand-purple/40 text-brand-purple'
                : 'bg-surface-card border-brd-subtle text-text-tertiary'
            }`}
          >
            ✏️ Crear nueva
          </button>
        </div>

        {tab === 'catalog' && (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar plantilla…"
              className="w-full px-3 py-2 mb-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />

            {/* Chips de categorías */}
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
                  Nada coincide con tu búsqueda. Pulsa "✏️ Crear nueva" para una propuesta libre.
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
          </>
        )}

        {tab === 'new' && (
          <div className="py-6 text-center">
            <p className="text-sm text-text-secondary mb-1 leading-relaxed">
              Vas a abrir el wizard completo para proponer una actividad personalizada (categoría, fecha, duración, puntos, compensación).
            </p>
            <p className="text-xs text-text-tertiary mb-5 leading-relaxed">
              La propuesta se enviará a tu pareja para aceptarla, contraofertarla o rechazarla.
            </p>
            <button
              type="button"
              onClick={handleStartBlank}
              className="px-4 py-2.5 rounded-md bg-gradient-to-br from-brand-purple to-[#7c3aed] text-white text-sm font-bold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple shadow-[0_6px_14px_rgba(168,85,247,0.30)]"
            >
              <Plus className="w-4 h-4" /> Abrir wizard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AddActivitySheet
