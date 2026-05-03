// v2.0.8 — Sheet para añadir o editar un ActivityTemplate.
// Replica el patrón de AddTaskSheet.

import { useState, useEffect } from 'react'
import { apiClient } from '../../../services/apiClient'
import type { ActivityTemplate } from '../../../hooks/useActivityCatalog'

interface Props {
  open: boolean
  initial?: ActivityTemplate | null
  onClose: () => void
  onSaved: () => void
}

const CATEGORIES: Array<{ slug: string; label: string; emoji: string }> = [
  { slug: 'trabajo',      label: 'Trabajo',      emoji: '💼' },
  { slug: 'salud',        label: 'Salud',        emoji: '🩺' },
  { slug: 'ocio',         label: 'Ocio',         emoji: '🎬' },
  { slug: 'social',       label: 'Social',       emoji: '👯' },
  { slug: 'alto_impacto', label: 'Alto impacto', emoji: '💒' },
  { slug: 'viaje',        label: 'Viaje',        emoji: '✈️' },
  { slug: 'cuidado',      label: 'Cuidado',      emoji: '👶' },
  { slug: 'personal',     label: 'Personal',     emoji: '😌' },
]

const IMPACTS: Array<{ slug: string; label: string; multiplier: string }> = [
  { slug: 'necessary', label: 'Necesaria',  multiplier: '×0.7' },
  { slug: 'health',    label: 'Salud',      multiplier: '×0.85' },
  { slug: 'leisure',   label: 'Ocio',       multiplier: '×1.0' },
  { slug: 'high',      label: 'Alto impacto', multiplier: '×1.4' },
]

export function AddActivityTemplateSheet({ open, initial, onClose, onSaved }: Props) {
  const editing = !!initial?.id

  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].slug)
  const [subcategory, setSubcategory] = useState('')
  const [pointsBaseSuggested, setPointsBaseSuggested] = useState<number>(10)
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState<number | ''>(60)
  const [defaultImpact, setDefaultImpact] = useState<string>('leisure')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && initial) {
      setName(initial.name)
      setCategory(initial.category)
      setSubcategory(initial.subcategory ?? '')
      setPointsBaseSuggested(Number(initial.pointsBaseSuggested))
      setDefaultDurationMinutes(initial.defaultDurationMinutes ?? '')
      setDefaultImpact(initial.defaultImpact ?? 'leisure')
      setEmoji(initial.emoji ?? '')
      setDescription(initial.description ?? '')
    } else if (open) {
      setName(''); setCategory(CATEGORIES[0].slug); setSubcategory('')
      setPointsBaseSuggested(10); setDefaultDurationMinutes(60)
      setDefaultImpact('leisure'); setEmoji(''); setDescription('')
    }
    setError(null)
  }, [open, initial])

  if (!open) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    try {
      const body = {
        category,
        name: name.trim(),
        pointsBaseSuggested,
        subcategory: subcategory.trim() || null,
        description: description.trim() || null,
        defaultDurationMinutes: defaultDurationMinutes === '' ? null : Number(defaultDurationMinutes),
        defaultImpact,
        emoji: emoji.trim() || null,
      }
      if (editing) {
        await apiClient.request(`/activity-templates/${initial!.id}`, {
          method: 'PUT', body: JSON.stringify(body),
        })
      } else {
        await apiClient.request('/activity-templates', {
          method: 'POST', body: JSON.stringify(body),
        })
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
      <form
        onSubmit={handleSave}
        className="w-full sm:max-w-lg bg-surface-card border border-brd-subtle rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 space-y-3 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">
            {editing ? 'Editar actividad' : 'Nueva actividad personal'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-secondary text-sm">✕</button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre *</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Cena con suegros"
            maxLength={120} required autoFocus
            className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.slug} type="button" onClick={() => setCategory(c.slug)}
                className={`px-2 py-1.5 rounded-md text-xs border transition ${
                  category === c.slug
                    ? 'bg-brand-purple/15 border-brand-purple text-text-primary'
                    : 'bg-surface-base border-brd-subtle text-text-secondary hover:border-brand-purple/40'
                }`}
              >
                <span className="mr-1">{c.emoji}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Subcategoría</label>
            <input
              type="text" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}
              placeholder="opcional" maxLength={40}
              className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Emoji</label>
            <input
              type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)}
              placeholder="🎯" maxLength={4}
              className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Puntos base sugeridos *</label>
            <input
              type="number" value={pointsBaseSuggested}
              onChange={(e) => setPointsBaseSuggested(Number(e.target.value))}
              min={0} max={500} step={0.5} required
              className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Duración (min)</label>
            <input
              type="number" value={defaultDurationMinutes}
              onChange={(e) => setDefaultDurationMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              min={0} max={20160}
              placeholder="60"
              className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Tipo de impacto</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {IMPACTS.map((i) => (
              <button
                key={i.slug} type="button" onClick={() => setDefaultImpact(i.slug)}
                className={`px-2 py-1.5 rounded-md text-xs border transition ${
                  defaultImpact === i.slug
                    ? 'bg-brand-purple/15 border-brand-purple text-text-primary'
                    : 'bg-surface-base border-brd-subtle text-text-secondary hover:border-brand-purple/40'
                }`}
              >
                {i.label}<span className="ml-1 text-text-tertiary">{i.multiplier}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">Descripción</label>
          <textarea
            value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="opcional" maxLength={500} rows={2}
            className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 rounded-md border border-brd-subtle text-sm text-text-secondary hover:bg-surface-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="px-3 py-2 rounded-md bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:opacity-50">
            {saving ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddActivityTemplateSheet
