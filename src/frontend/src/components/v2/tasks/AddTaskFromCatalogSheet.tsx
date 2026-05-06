// v2.1.1 — Sheet "Añadir tarea" (botón primario en /home/tasks).
//
// Flujo:
//   1) El usuario ve un selector con el catálogo (TASK_CATALOG estático +
//      las Task con isDefault=true que ya existen en su couple).
//   2) Tras elegir, transición a un mini-form de configuración:
//      puntos editables, recurrencia (sí/no + frecuencia), día programado,
//      asignado a.
//   3) Submit → si la tarea no existe aún en la pareja, se crea (isDefault=false);
//      luego se llama a /tasks/:id/schedule para programarla con la config.

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, X, Plus } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'

type CatalogItem = { name: string; pts: number; desc?: string; existing?: { id: string; isDefault: boolean } }
type CatalogGroup = { category: string; tasks: CatalogItem[] }

interface Props {
  open: boolean
  catalog: CatalogGroup[]      // TASK_CATALOG estático (frontend)
  existingTasks: Array<{       // Tasks ya en la pareja para poder programar las que ya existían
    id: string
    name: string
    category: string
    pointsBase: string
    isDefault: boolean
  }>
  partnerName: string
  meName: string
  onClose: () => void
  onSaved: () => void
}

const CATEGORY_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', 'baños': '🚿', compra: '🛒',
  logistica: '📋', cuidado: '👶', mantenimiento: '🔧',
  jardineria: '🌱', mascotas: '🐾',
}

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly'

export function AddTaskFromCatalogSheet({
  open, catalog, existingTasks, partnerName, meName, onClose, onSaved,
}: Props) {
  // v2.3.2 — pestañas internas según canvas 15: 'catalog' (default) y 'create'.
  const [tab, setTab] = useState<'catalog' | 'create'>('catalog')
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [filter, setFilter] = useState('')
  // v2.3.4 — filtro de categoría para no scrollear cuando hay muchas tareas.
  const [catFilter, setCatFilter] = useState<string>('all')
  const [picked, setPicked] = useState<{ name: string; category: string; pts: number; existingId?: string } | null>(null)

  // Configure form
  const todayISO = new Date().toISOString().slice(0, 10)
  const [scheduledFor, setScheduledFor] = useState(todayISO)
  const [points, setPoints] = useState<number>(0)
  const [isRecurring, setIsRecurring] = useState(false)
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [assignedTo, setAssignedTo] = useState<'me' | 'partner' | 'either'>('either')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // v2.3.2 — Crear nueva (form en blanco)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('cocina')
  const [newPoints, setNewPoints] = useState<number>(5)
  const [newSaveToCatalog, setNewSaveToCatalog] = useState(true)

  // v2.3.2 — sheetLock: pausar polling de loadUserData mientras esté abierto.
  useEffect(() => {
    if (!open) return
    acquireSheetLock()
    return () => releaseSheetLock()
  }, [open])

  // Mezcla catálogo estático con tareas existentes de la pareja: si la pareja
  // ya tiene un Task con name+category igual, marcamos `existing` para evitar
  // duplicar al añadir.
  const enrichedCatalog: CatalogGroup[] = useMemo(() => {
    return catalog.map((g) => ({
      ...g,
      tasks: g.tasks.map((t) => {
        const existing = existingTasks.find(
          (et) => et.name.toLowerCase() === t.name.toLowerCase() && et.category === g.category,
        )
        return existing ? { ...t, existing: { id: existing.id, isDefault: existing.isDefault } } : t
      }),
    }))
  }, [catalog, existingTasks])

  // Tareas que la pareja creó manualmente y NO están en el catálogo estático
  const customGroup: CatalogGroup | null = useMemo(() => {
    const knownNames = new Set(catalog.flatMap((g) => g.tasks.map((t) => `${g.category}:${t.name.toLowerCase()}`)))
    const own = existingTasks.filter((et) => !knownNames.has(`${et.category}:${et.name.toLowerCase()}`))
    if (own.length === 0) return null
    return {
      category: 'tuyas',
      tasks: own.map((et) => ({
        name: et.name,
        pts: Number(et.pointsBase),
        existing: { id: et.id, isDefault: et.isDefault },
      })),
    }
  }, [catalog, existingTasks])

  const visibleGroups = useMemo(() => {
    let all = customGroup ? [customGroup, ...enrichedCatalog] : enrichedCatalog
    // v2.3.4 — filtro por categoría
    if (catFilter !== 'all') {
      all = all.filter((g) => g.category === catFilter)
    }
    if (!filter) return all
    const q = filter.toLowerCase()
    return all
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.name.toLowerCase().includes(q)) }))
      .filter((g) => g.tasks.length > 0)
  }, [enrichedCatalog, customGroup, filter, catFilter])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    enrichedCatalog.forEach((g) => set.add(g.category))
    if (customGroup) set.add(customGroup.category)
    return Array.from(set)
  }, [enrichedCatalog, customGroup])

  if (!open) return null

  const handlePick = (category: string, item: CatalogItem) => {
    setPicked({ name: item.name, category, pts: item.pts, existingId: item.existing?.id })
    setPoints(item.pts)
    setError(null)
    setStep('configure')
  }

  const handleSave = async () => {
    if (!picked) return
    setSaving(true)
    setError(null)
    try {
      let taskId = picked.existingId

      // Crear la Task si no existía (la añadimos al catálogo de la pareja)
      if (!taskId) {
        const createRes: any = await apiClient.request('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            name: picked.name,
            category: picked.category,
            pointsBase: points,
            isDefault: false,
          }),
        })
        taskId = createRes?.task?.id
        if (!taskId) throw new Error('No se pudo crear la tarea')
      }

      // Programar / activar recurrencia
      const body: any = { scheduledFor: new Date(scheduledFor).toISOString() }
      if (isRecurring) body.frequency = frequency
      await apiClient.request(`/tasks/${taskId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      // Asignación: si tiene preferencia, llamamos al endpoint de asignación.
      // Si no, lo dejamos abierto.
      if (assignedTo === 'me' || assignedTo === 'partner') {
        try {
          await apiClient.request(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({
              defaultAssignee: assignedTo === 'me' ? 'self' : 'partner',
            }),
          })
        } catch {
          // No bloqueante: la asignación es preferencia, no requisito.
        }
      }

      onSaved()
      onClose()
      // reset
      setStep('pick'); setPicked(null); setPoints(0); setIsRecurring(false)
    } catch (e: any) {
      setError(e?.message ?? 'Error al añadir')
    } finally {
      setSaving(false)
    }
  }

  // v2.3.2 — Crear tarea nueva en blanco. Si saveToCatalog=true (default),
  // se guarda como Task con isDefault=false en el couple para que en futuras
  // aperturas del sheet aparezca en la lista.
  const handleCreateNew = async () => {
    if (!newName.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const createRes: any = await apiClient.request('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          category: newCategory,
          pointsBase: newPoints,
          isDefault: false,
        }),
      })
      const taskId = createRes?.task?.id
      if (!taskId) throw new Error('No se pudo crear la tarea')

      const body: any = { scheduledFor: new Date(scheduledFor).toISOString() }
      if (isRecurring) body.frequency = frequency
      await apiClient.request(`/tasks/${taskId}/schedule`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      onSaved()
      onClose()
      // reset
      setTab('catalog'); setStep('pick'); setNewName(''); setNewPoints(5); setIsRecurring(false)
    } catch (e: any) {
      setError(e?.message ?? 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
      {/* v2.7.7 audit 09 S1-U-2 — safe-area-inset-bottom. */}
      <div
        className="w-full sm:max-w-lg bg-surface-card border border-brd-subtle rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-3">
          {step === 'configure' && (
            <button
              type="button"
              onClick={() => setStep('pick')}
              className="text-text-tertiary hover:text-text-primary inline-flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}
          <h2 className="text-base font-bold text-text-primary flex-1 text-center sm:text-left">
            {step === 'configure'
              ? `Configurar "${picked?.name}"`
              : tab === 'catalog' ? 'Añadir tarea' : 'Crear tarea nueva'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-secondary text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* v2.3.2 — Tabs catálogo / crear nueva (canvas 15) */}
        {step === 'pick' && (
          <div className="flex gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => setTab('catalog')}
              className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber inline-flex items-center justify-center gap-1.5 ${
                tab === 'catalog'
                  ? 'bg-brand-amber/10 border-brand-amber/40 text-brand-amber'
                  : 'bg-surface-card border-brd-subtle text-text-tertiary'
              }`}
            >
              📚 Del catálogo <span className="text-[10px] opacity-70">{catalog.reduce((s, g) => s + g.tasks.length, 0)} ideas</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber inline-flex items-center justify-center gap-1.5 ${
                tab === 'create'
                  ? 'bg-brand-amber/10 border-brand-amber/40 text-brand-amber'
                  : 'bg-surface-card border-brd-subtle text-text-tertiary'
              }`}
            >
              ✏️ Crear nueva
            </button>
          </div>
        )}

        {step === 'pick' && tab === 'catalog' && (
          <>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar tarea…"
              className="w-full px-3 py-2 mb-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            />

            {/* v2.3.4 — chips horizontales scrollable de categorías */}
            <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              <button
                type="button"
                onClick={() => setCatFilter('all')}
                className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${
                  catFilter === 'all'
                    ? 'bg-brand-amber/20 text-brand-amber border border-brand-amber/40'
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
                  className={`flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber ${
                    catFilter === c
                      ? 'bg-brand-amber/20 text-brand-amber border border-brand-amber/40'
                      : 'bg-surface-card text-text-tertiary border border-brd-subtle'
                  }`}
                >
                  {CATEGORY_EMOJI[c] ?? '•'} {c}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {visibleGroups.length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-6">
                  Nada coincide con tu búsqueda. ¿Crear una tarea nueva en su lugar?
                </p>
              )}

              {visibleGroups.map((g) => (
                <section key={g.category}>
                  <h3 className="text-[11px] uppercase tracking-wide text-text-tertiary font-bold mb-1.5">
                    {CATEGORY_EMOJI[g.category] ?? '✅'} {g.category}
                  </h3>
                  <div className="space-y-1">
                    {g.tasks.map((t) => (
                      <button
                        key={`${g.category}:${t.name}`}
                        type="button"
                        onClick={() => handlePick(g.category, t)}
                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-md bg-surface-base border border-brd-subtle hover:border-brand-purple/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{t.name}</p>
                          {t.desc && <p className="text-[11px] text-text-tertiary truncate">{t.desc}</p>}
                        </div>
                        <span className="text-sm font-bold text-brand-purple flex-shrink-0">{t.pts} pts</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}

        {/* v2.3.2 — Crear nueva en blanco (canvas 15 sheet-tabs) */}
        {step === 'pick' && tab === 'create' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Nombre *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Sacar al perro al parque"
                maxLength={120}
                autoFocus
                className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Categoría</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['cocina', 'limpieza', 'baños', 'compra', 'logistica', 'cuidado', 'mantenimiento', 'jardineria', 'mascotas'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewCategory(c)}
                    className={`px-2 py-1.5 rounded-md text-[11px] font-bold border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber capitalize ${
                      newCategory === c
                        ? 'bg-brand-amber/10 border-brand-amber/40 text-brand-amber'
                        : 'bg-surface-base border-brd-subtle text-text-tertiary'
                    }`}
                  >
                    {CATEGORY_EMOJI[c] ?? '✅'} {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Puntos base</label>
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                min={0}
                max={50}
                step={0.5}
                className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Día programado</label>
              <input
                type="date"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-brand-amber"
              />
              Es recurrente
            </label>

            {isRecurring && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Frecuencia</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly'] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`px-2 py-1.5 rounded-md text-xs border ${
                        frequency === f
                          ? 'bg-brand-amber/10 border-brand-amber/40 text-brand-amber'
                          : 'bg-surface-base border-brd-subtle text-text-tertiary'
                      }`}
                    >
                      {f === 'daily' ? 'Diaria' : f === 'weekly' ? 'Semanal'
                        : f === 'biweekly' ? 'Cada 2 días' : f === 'monthly' ? 'Mensual' : 'Quincenal'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={newSaveToCatalog}
                onChange={(e) => setNewSaveToCatalog(e.target.checked)}
                className="w-3.5 h-3.5 accent-brand-purple"
              />
              Guardar en catálogo de pareja para reusar más adelante
            </label>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="px-3 py-2 rounded-md border border-brd-subtle text-sm text-text-secondary hover:bg-surface-base">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={saving}
                className="px-3 py-2 rounded-md bg-grad-cta text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Creando…' : 'Crear y añadir'}
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && picked && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Puntos base</label>
              <input
                type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))}
                min={0} max={500} step={0.5}
                className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Día programado</label>
              <input
                type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-brand-purple"
              />
              Es recurrente
            </label>

            {isRecurring && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Frecuencia</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly'] as Frequency[]).map((f) => (
                    <button
                      key={f} type="button" onClick={() => setFrequency(f)}
                      className={`px-2 py-1.5 rounded-md text-xs border transition ${
                        frequency === f
                          ? 'bg-brand-purple/15 border-brand-purple text-text-primary'
                          : 'bg-surface-base border-brd-subtle text-text-secondary'
                      }`}
                    >
                      {f === 'daily' ? 'Diaria' : f === 'weekly' ? 'Semanal'
                        : f === 'biweekly' ? 'Cada 2 días' : f === 'monthly' ? 'Mensual' : 'Quincenal'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Asignada a</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { v: 'me' as const, label: meName ?? 'Yo' },
                  { v: 'either' as const, label: 'Cualquiera' },
                  { v: 'partner' as const, label: partnerName },
                ]).map((opt) => (
                  <button
                    key={opt.v} type="button" onClick={() => setAssignedTo(opt.v)}
                    className={`px-2 py-1.5 rounded-md text-xs border transition ${
                      assignedTo === opt.v
                        ? 'bg-brand-purple/15 border-brand-purple text-text-primary'
                        : 'bg-surface-base border-brd-subtle text-text-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={onClose}
                className="px-3 py-2 rounded-md border border-brd-subtle text-sm text-text-secondary hover:bg-surface-base">
                Cancelar
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-3 py-2 rounded-md bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/90 disabled:opacity-50 inline-flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {saving ? 'Añadiendo…' : 'Añadir a mi lista'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AddTaskFromCatalogSheet
