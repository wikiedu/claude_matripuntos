// 3-step wizard to create a task, rendered inside a BottomSheet.
// Step 1: name + category + pointsBase
// Step 2: puntual vs recurrente (+ TaskScheduleForm when recurrente)
// Step 3: assignee — persisted as Task.defaultAssigneeId (null = cualquiera)

import { useState, useEffect } from 'react'
import { Loader } from 'lucide-react'
import { BottomSheet } from '../primitives/BottomSheet'
import { acquireSheetLock, releaseSheetLock } from '../../../lib/sheetLock'
import { Button } from '../primitives/Button'
import { Input } from '../primitives/Input'
import { apiClient } from '../../../services/apiClient'
import { TaskScheduleForm } from '../../TaskScheduleForm'
import type { TaskSchedule } from '../../../types'
import { useAppStore } from '../../../store/useAppStore'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './CategoryFilterStrip'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

type Mode = 'once' | 'recurring'

const INITIAL_CATEGORY = 'cocina'
const INITIAL_POINTS = 10

export function AddTaskSheet({ open, onClose, onSaved }: Props) {
  const user = useAppStore((s) => s.user)
  const couple = useAppStore((s) => s.couple)
  const partner = couple?.users?.find((u) => u.id !== user?.id) ?? null

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>(INITIAL_CATEGORY)
  const [pointsBase, setPointsBase] = useState<number>(INITIAL_POINTS)
  const [mode, setMode] = useState<Mode>('once')
  const [schedule, setSchedule] = useState<TaskSchedule | null>(null)
  // null = "cualquiera"; concreto = userId (self | partner)
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // v2.3.2 — pausa polling externo mientras este sheet está abierto.
  useEffect(() => {
    if (!open) return
    acquireSheetLock()
    return () => releaseSheetLock()
  }, [open])

  const categoryKeys = Object.keys(CATEGORY_EMOJI)

  const reset = () => {
    setStep(1)
    setName('')
    setCategory(INITIAL_CATEGORY)
    setPointsBase(INITIAL_POINTS)
    setMode('once')
    setSchedule(null)
    setAssigneeId(null)
    setSaving(false)
    setErr(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const canAdvanceStep1 = name.trim().length >= 2

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      const created = await apiClient.tasks.create({
        name: name.trim(),
        category,
        pointsBase,
        description: '',
        defaultAssigneeId: assigneeId,
      })
      const taskId = (created as any)?.task?.id
      if (mode === 'recurring' && schedule && taskId) {
        await apiClient.tasks.schedule(taskId, schedule)
      }
      onSaved()
      handleClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error creando tarea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title={`Nueva tarea · Paso ${step} de 3`}>
      {/* Back link */}
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
          className="absolute top-4 right-4 text-xs text-text-secondary hover:text-text-primary transition"
        >
          ‹ Atrás
        </button>
      )}

      {err && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs">
          {err}
        </div>
      )}

      {/* Step 1 — Name, category, points */}
      {step === 1 && (
        <div className="space-y-3">
          <Input
            label="Nombre *"
            placeholder="Ej: Limpiar la nevera"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-text-secondary">Categoría</label>
            <div className="grid grid-cols-3 gap-2">
              {categoryKeys.map((k) => {
                const active = category === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCategory(k)}
                    className={`px-2 py-2 rounded-md text-xs transition border ${
                      active
                        ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple font-bold'
                        : 'bg-surface-card border-brd-subtle text-text-secondary'
                    }`}
                  >
                    <span className="mr-1">{CATEGORY_EMOJI[k]}</span>
                    {CATEGORY_LABEL[k]}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            type="number"
            label="Puntos base"
            min={1}
            max={50}
            value={pointsBase}
            onChange={(e) => setPointsBase(parseInt(e.target.value, 10) || 0)}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={handleClose} fullWidth>
              Cancelar
            </Button>
            <Button onClick={() => setStep(2)} disabled={!canAdvanceStep1} fullWidth>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Puntual vs Recurrente */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-secondary">¿Cuándo se hace?</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'once' as const, label: '📅 Puntual', desc: 'Solo una vez' },
              { value: 'recurring' as const, label: '🔄 Recurrente', desc: 'Se repite' },
            ]).map((opt) => {
              const active = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMode(opt.value)
                    if (opt.value === 'once') setSchedule(null)
                  }}
                  className={`p-3 rounded-md text-left transition border ${
                    active
                      ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple'
                      : 'bg-surface-card border-brd-subtle text-text-secondary'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[11px] opacity-80">{opt.desc}</div>
                </button>
              )
            })}
          </div>

          {mode === 'recurring' && (
            <div className="rounded-md bg-surface-card border border-brd-subtle p-2">
              <TaskScheduleForm value={schedule} onChange={setSchedule} />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep(1)} fullWidth>
              Volver
            </Button>
            <Button onClick={() => setStep(3)} fullWidth>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Assignee + Save */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-secondary">¿Quién la hace?</p>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: user?.id ?? null, label: `Yo${user?.name ? ` (${user.name})` : ''}` },
              partner
                ? { id: partner.id, label: partner.name || 'Mi pareja' }
                : null,
              { id: null, label: 'Cualquiera' },
            ].filter(Boolean) as Array<{ id: string | null; label: string }>).map((opt) => {
              const active = assigneeId === opt.id
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAssigneeId(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs transition border ${
                    active
                      ? 'bg-brand-purple/20 border-brand-purple/40 text-brand-purple font-bold'
                      : 'bg-surface-card border-brd-subtle text-text-secondary'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="rounded-md bg-surface-muted border border-brd-subtle p-3 text-[11px] text-text-tertiary">
            💡 La persona asignada será el valor por defecto al loggear la tarea — podrás cambiarla en el momento si hace falta.
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={() => setStep(2)} fullWidth disabled={saving}>
              Volver
            </Button>
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" /> Guardando…
                </span>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
