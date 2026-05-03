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

import { useState, useMemo } from 'react'
import { ChevronLeft, X, Plus } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'

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
  const [step, setStep] = useState<'pick' | 'configure'>('pick')
  const [filter, setFilter] = useState('')
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
    const all = customGroup ? [customGroup, ...enrichedCatalog] : enrichedCatalog
    if (!filter) return all
    const q = filter.toLowerCase()
    return all
      .map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.name.toLowerCase().includes(q)) }))
      .filter((g) => g.tasks.length > 0)
  }, [enrichedCatalog, customGroup, filter])

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full sm:max-w-lg bg-surface-card border border-brd-subtle rounded-t-2xl sm:rounded-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto">
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
            {step === 'pick' ? 'Añadir tarea del catálogo' : `Configurar "${picked?.name}"`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"
            className="text-text-tertiary hover:text-text-secondary text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'pick' && (
          <>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar tarea…"
              className="w-full px-3 py-2 mb-3 text-sm bg-surface-base border border-brd-subtle rounded-md text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
            />

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
