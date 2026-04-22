import { useEffect, useState, useCallback } from 'react'
import { Loader, Pause, Play, Repeat } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { formatLocalDate } from '../../../utils/dateUtils'
import { Button } from '../primitives/Button'
import { Pill } from '../primitives/Pill'
import { ConfirmDialog } from '../primitives/ConfirmDialog'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './CategoryFilterStrip'

interface RecurringTask {
  id: string
  name: string
  category: string
  pointsBase: string
  frequency: 'daily' | 'biweekly' | 'weekly' | 'bimonthly' | 'monthly'
  isActive: boolean
  recurrenceStart: string | null
  recurrenceEnd: string | null
  nextOccurrence: string | null
  completedCount: number
}

const FREQ_LABEL: Record<RecurringTask['frequency'], string> = {
  daily: 'Diaria',
  biweekly: 'Cada 2 días',
  weekly: 'Semanal',
  bimonthly: 'Quincenal',
  monthly: 'Mensual',
}

interface Props {
  onChanged?: () => void
}

export function RecurringTaskManager({ onChanged }: Props) {
  const [tasks, setTasks] = useState<RecurringTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pausing, setPausing] = useState<RecurringTask | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res: any = await apiClient.tasks.getRecurring()
      setTasks(res.tasks ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando tareas recurrentes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleResume = async (t: RecurringTask) => {
    setBusy(t.id)
    setError(null)
    try {
      await apiClient.tasks.resume(t.id)
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reactivar')
    } finally {
      setBusy(null)
    }
  }

  const handleConfirmPause = async () => {
    if (!pausing) return
    setBusy(pausing.id)
    setError(null)
    try {
      await apiClient.tasks.pause(pausing.id)
      setPausing(null)
      await load()
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al pausar')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-text-secondary text-sm">
        <Loader className="w-4 h-4 animate-spin mr-2" />
        Cargando recurrentes…
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md bg-surface-card border border-brd-subtle p-8 text-center">
        <div className="text-3xl mb-2"><Repeat className="w-8 h-8 mx-auto text-text-tertiary" /></div>
        <p className="text-sm font-semibold text-text-primary mb-1">Sin tareas recurrentes</p>
        <p className="text-xs text-text-secondary">
          Crea una tarea y elige <strong>Recurrente</strong> en el paso 2 para verla aquí.
        </p>
      </div>
    )
  }

  const active = tasks.filter((t) => t.isActive)
  const paused = tasks.filter((t) => !t.isActive)

  const renderRow = (t: RecurringTask) => (
    <div
      key={t.id}
      className={`p-3 rounded-md border ${
        t.isActive
          ? 'bg-surface-card border-brd-subtle'
          : 'bg-surface-muted border-brd-subtle opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <span className="text-xl flex-shrink-0">
            {CATEGORY_EMOJI[t.category?.toLowerCase()] ?? '✅'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate">{t.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Pill tone="purple">{FREQ_LABEL[t.frequency]}</Pill>
              <Pill tone="amber">{t.pointsBase} pts base</Pill>
              <span className="text-[11px] text-text-tertiary">
                {CATEGORY_LABEL[t.category?.toLowerCase()] ?? t.category}
              </span>
            </div>
            <div className="text-[11px] text-text-tertiary mt-1.5 space-x-2">
              {t.isActive && t.nextOccurrence && (
                <span>Próxima: <strong>{formatLocalDate(t.nextOccurrence)}</strong></span>
              )}
              {!t.isActive && t.recurrenceEnd && (
                <span>Pausada el <strong>{formatLocalDate(t.recurrenceEnd)}</strong></span>
              )}
              <span>· {t.completedCount} hechas</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          {t.isActive ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPausing(t)}
              disabled={busy === t.id}
            >
              <span className="inline-flex items-center gap-1">
                {busy === t.id ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
                Pausar
              </span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleResume(t)}
              disabled={busy === t.id}
            >
              <span className="inline-flex items-center gap-1">
                {busy === t.id ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Reactivar
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {active.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
            Activas ({active.length})
          </h3>
          <div className="space-y-2">{active.map(renderRow)}</div>
        </section>
      )}

      {paused.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
            Pausadas ({paused.length})
          </h3>
          <div className="space-y-2">{paused.map(renderRow)}</div>
        </section>
      )}

      <p className="text-[11px] text-text-tertiary px-1">
        Pausar una tarea recurrente borra sólo las ocurrencias futuras no ejecutadas.
        El historial de tareas completadas se conserva intacto y podrás reactivarla en
        cualquier momento.
      </p>

      <ConfirmDialog
        open={pausing !== null}
        title="¿Pausar tarea recurrente?"
        message={
          pausing
            ? `Se cancelarán las próximas ocurrencias de "${pausing.name}". Las tareas ya hechas con este nombre se mantendrán en el histórico y podrás reactivarla cuando quieras.`
            : ''
        }
        confirmLabel="Pausar"
        variant="warn"
        busy={busy === pausing?.id}
        onConfirm={handleConfirmPause}
        onClose={() => !busy && setPausing(null)}
      />
    </div>
  )
}
