// RequestInbox page — v2 dark design (Task 7.4 of v1.4 La Evolución).
// 3 tabs (Actividades · Tareas · Historial) with v2 cards, Pills for status, BottomSheet for dispute.
// Rendered naked inside AuthedLayout; AppHeader is provided globally.

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, X, Loader, ChevronRight, History, RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, fetchPendingTaskLogs } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { TaskPendingCard } from '../components/TaskPendingCard'
import { TaskPendingLog } from '../types/activity'
import { Button } from '../components/v2/primitives/Button'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'
import { BottomSheet } from '../components/v2/primitives/BottomSheet'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Negotiation {
  id: string
  roundNumber: number
  pointsProposed: string
  message?: string
  responseType?: string
  proposedBy?: string
  respondedAt?: string
}

interface ActivityEvent {
  id: string
  type: string
  title?: string
  description?: string
  dateStart: string
  dateEnd: string
  pointsBase: string
  pointsCalculated: string
  status: string
  negotiationRound: number
  maxFreeRounds?: number
  compensation?: string
  creator?: { id: string; name: string }
  negotiations: Negotiation[]
}

interface TaskLogItem {
  id: string
  taskId: string
  taskName: string
  taskCategory: string
  date: string
  pointsFinal: string
  status: 'pending' | 'verified' | 'disputed'
  modifier?: string
  disputeReason?: string
  completedBy: { id: string; name: string } | null
  verifiedBy: { id: string; name: string } | null
  verifiedAt?: string
}

type InboxTab = 'activities' | 'tasks' | 'history'

// ─── Category / compensation helpers ──────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', compra: '🛒', logistica: '📋',
  cuidado: '👶', baños: '🚿', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾',
}

// ─── Event-status pill ────────────────────────────────────────────────────────
function EventStatusPill({ status }: { status: string }) {
  switch (status) {
    case 'accepted': return <Pill tone="success">Aceptada</Pill>
    case 'rejected': return <Pill tone="danger">Rechazada</Pill>
    case 'pending':  return <Pill tone="warn">Pendiente</Pill>
    case 'forced':   return <Pill tone="purple">Forzada</Pill>
    default:         return <Pill tone="indigo">{status}</Pill>
  }
}

function TaskStatusPill({ status }: { status: string }) {
  switch (status) {
    case 'verified': return <Pill tone="success">Verificada</Pill>
    case 'disputed': return <Pill tone="warn">Disputada</Pill>
    case 'pending':  return <Pill tone="amber">Pendiente</Pill>
    default:         return <Pill tone="indigo">{status}</Pill>
  }
}

// ─── Segment control (reusable, dark theme) ───────────────────────────────────
function Segment<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; badge?: number | null }[]
}) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-surface-card border border-brd-subtle">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              active
                ? 'bg-grad-cta text-white shadow-md shadow-brand-amber/30'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
            {typeof opt.badge === 'number' && opt.badge > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-danger/80 text-white'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RequestInbox({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<InboxTab>('activities')

  // Activities state
  const [pendingActivities, setPendingActivities] = useState<ActivityEvent[]>([])
  const [allActivities, setAllActivities] = useState<ActivityEvent[]>([])

  // Tasks: React Query hooks for pending task logs
  const { data: pendingTaskLogs = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: fetchPendingTaskLogs,
    staleTime: 5 * 60 * 1000,
    select: (logs: TaskPendingLog[]) => logs.filter((log) => log.completedBy?.id !== user?.id),
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ taskLogId, taskId }: { taskLogId: string; taskId: string }) =>
      apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/verify`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSuccess('Tarea verificada. Puntos actualizados.')
      setTimeout(() => setSuccess(null), 5000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al verificar la tarea')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ taskLogId, taskId }: { taskLogId: string; taskId: string }) =>
      apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/dispute`, {
        method: 'PUT',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSuccess('Tarea rechazada / disputada.')
      setTimeout(() => setSuccess(null), 5000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al rechazar la tarea')
    },
  })

  // History / dispute state
  const [allTaskLogs, setAllTaskLogs] = useState<TaskLogItem[]>([])
  const [disputingLog, setDisputingLog] = useState<TaskLogItem | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [isDisputing, setIsDisputing] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    if (!user?.id || !couple?.id) return
    try {
      setIsLoading(true)
      setError(null)

      const [eventsRes, allLogsRes] = await Promise.all([
        apiClient.events.getAll(),
        apiClient.tasks.getAllLogs(),
      ])

      const events: ActivityEvent[] = eventsRes.events || []
      setAllActivities(events)

      const pending = events.filter((e: ActivityEvent) => {
        if (e.status !== 'pending') return false
        const negs = e.negotiations || []
        const lastAwaiting = negs.filter((n) => n.responseType === 'awaiting').pop() || negs[negs.length - 1]
        if (!lastAwaiting) return e.creator?.id !== user.id
        return lastAwaiting.proposedBy !== user.id
      })
      setPendingActivities(pending)

      const allLogs: TaskLogItem[] = (allLogsRes.logs || []).map((l: any) => ({
        ...l,
        taskName: l.taskName ?? l.task?.name ?? '',
        taskCategory: l.taskCategory ?? l.task?.category ?? '',
      }))
      setAllTaskLogs(allLogs)

      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, couple?.id, queryClient])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDisputeConfirm = async () => {
    if (!disputingLog) return
    setIsDisputing(true)
    try {
      await apiClient.tasks.disputeLog(disputingLog.taskId, disputingLog.id, {
        disputeReason: disputeReason.trim() || 'Sin motivo especificado',
      })
      setSuccess(`Tarea "${disputingLog.taskName}" disputada.`)
      setDisputingLog(null)
      setDisputeReason('')
      setTimeout(() => setSuccess(null), 4000)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al disputar')
    } finally {
      setIsDisputing(false)
    }
  }

  const goHome = onBack || (() => navigate('/dashboard'))

  // ─── Main inbox view ──────────────────────────────────────────────────────

  const myPendingActivities = allActivities.filter(
    (e) => e.status === 'pending' && e.creator?.id === user?.id,
  )
  const historyActivities = allActivities.filter(
    (e) => ['accepted', 'rejected', 'forced'].includes(e.status),
  )
  const historyTaskLogs = allTaskLogs.filter((l) => l.status !== 'pending')

  const totalPending = pendingActivities.length + pendingTaskLogs.length

  return (
    <main className="px-4 pt-3 pb-6">
      {/* Dispute BottomSheet */}
      <BottomSheet
        open={!!disputingLog}
        onClose={() => { if (!isDisputing) { setDisputingLog(null); setDisputeReason('') } }}
        title="Disputar tarea"
      >
        {disputingLog && (
          <>
            <p className="text-sm text-text-secondary mb-3">
              Disputando <strong className="text-text-primary">{disputingLog.taskName}</strong>{' '}
              de <strong className="text-text-primary">{disputingLog.completedBy?.name}</strong>{' '}
              ({disputingLog.pointsFinal} pts).
            </p>
            <label className="text-sm font-medium text-text-secondary mb-1 block">
              Motivo (opcional)
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="¿Por qué disputas esta tarea?"
              rows={3}
              className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 resize-none mb-4"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => { setDisputingLog(null); setDisputeReason('') }}
                disabled={isDisputing}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={handleDisputeConfirm}
                disabled={isDisputing}
              >
                {isDisputing ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Disputando…
                  </span>
                ) : 'Confirmar disputa'}
              </Button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goHome}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm font-semibold"
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
          <span>Bandeja de entrada</span>
        </button>
        <div className="flex items-center gap-2">
          {totalPending > 0 && <Pill tone="amber">{totalPending} pendiente{totalPending !== 1 ? 's' : ''}</Pill>}
          <button
            onClick={loadAll}
            className="p-2 rounded-md bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary transition"
            title="Actualizar"
            aria-label="Actualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-text-tertiary mb-4">
        {totalPending > 0
          ? `${totalPending} elemento${totalPending !== 1 ? 's' : ''} requiere${totalPending !== 1 ? 'n' : ''} tu atención`
          : 'Todo al día.'}
      </p>

      {/* Tabs */}
      <div className="mb-4">
        <Segment<InboxTab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'activities', label: '🎯 Actividades', badge: pendingActivities.length },
            { value: 'tasks',      label: '🏠 Tareas',      badge: pendingTaskLogs.length },
            { value: 'history',    label: '📋 Historial',   badge: null },
          ]}
        />
      </div>

      {/* Inline banners */}
      {error && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm flex items-start justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-md bg-success/10 border border-success/30 text-success text-sm">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-secondary">
          <Loader className="w-6 h-6 text-brand-purple animate-spin mr-2" />
          <span>Cargando bandeja…</span>
        </div>
      ) : (
        <>
          {/* ─── ACTIVITIES TAB ─── */}
          {tab === 'activities' && (
            <div className="space-y-5">
              {pendingActivities.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
                    Requieren tu respuesta ({pendingActivities.length})
                  </h2>
                  <div className="space-y-3">
                    {pendingActivities.map((event) => {
                      const pts = Number(event.pointsCalculated || event.pointsBase)
                      const negs = event.negotiations || []
                      const lastNeg = negs[0]
                      const isCounter = negs.length > 1
                      return (
                        <button
                          key={event.id}
                          onClick={() => navigate(`/request-inbox/${event.id}`)}
                          className="w-full text-left bg-surface-card border border-brd-subtle rounded-lg p-4 hover:border-brd-purple transition group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {isCounter && <Pill tone="amber">Contraoferta</Pill>}
                                <p className="font-semibold text-text-primary truncate">
                                  {event.title || event.type}
                                </p>
                              </div>
                              <p className="text-sm text-text-secondary">
                                De {event.creator?.name || '?'} ·{' '}
                                {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                              {lastNeg?.message && (
                                <p className="text-xs text-text-tertiary mt-1 truncate">
                                  "{lastNeg.message}"
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <div className="font-bold text-brand-amber">−{pts} pts</div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary transition" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {myPendingActivities.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
                    Mis solicitudes enviadas ({myPendingActivities.length})
                  </h2>
                  <div className="space-y-3">
                    {myPendingActivities.map((event) => {
                      const pts = Number(event.pointsCalculated || event.pointsBase)
                      return (
                        <button
                          key={event.id}
                          onClick={() => navigate(`/request-inbox/${event.id}`)}
                          className="w-full text-left bg-surface-card border border-brd-subtle rounded-lg p-4 hover:border-brd-purple transition opacity-90 group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Pill tone="warn">Esperando respuesta</Pill>
                              </div>
                              <p className="font-semibold text-text-primary truncate">
                                {event.title || event.type}
                              </p>
                              <p className="text-sm text-text-secondary">
                                {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="font-bold text-brand-amber">−{pts} pts</div>
                              <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-text-secondary transition" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {pendingActivities.length === 0 && myPendingActivities.length === 0 && (
                <Card className="text-center py-12">
                  <div className="text-5xl mb-3">🎯</div>
                  <p className="font-semibold text-text-primary mb-1">Sin actividades pendientes</p>
                  <p className="text-sm text-text-secondary">Las solicitudes de actividades aparecerán aquí.</p>
                </Card>
              )}
            </div>
          )}

          {/* ─── TASKS TAB ─── */}
          {tab === 'tasks' && (
            <div className="space-y-3">
              {tasksLoading && (
                <Card className="text-center py-12">
                  <Loader className="w-6 h-6 animate-spin text-brand-purple mx-auto mb-3" />
                  <p className="text-text-secondary">Cargando tareas…</p>
                </Card>
              )}

              {tasksError && (
                <Card className="text-center py-12">
                  <div className="text-5xl mb-3">⚠️</div>
                  <p className="font-semibold text-danger mb-1">Error al cargar tareas</p>
                  <p className="text-sm text-text-secondary">
                    {tasksError instanceof Error ? tasksError.message : 'Intenta recargar la página.'}
                  </p>
                </Card>
              )}

              {!tasksLoading && !tasksError && pendingTaskLogs.length === 0 && (
                <Card className="text-center py-12">
                  <div className="text-5xl mb-3">🏠</div>
                  <p className="font-semibold text-text-primary mb-1">Sin tareas pendientes de verificar</p>
                  <p className="text-sm text-text-secondary">
                    Cuando tu pareja registre tareas, aparecerán aquí para verificar.
                  </p>
                </Card>
              )}

              {!tasksLoading && !tasksError && (pendingTaskLogs as TaskPendingLog[]).length > 0 && (
                <>
                  <p className="text-xs text-text-tertiary pb-1">
                    Tareas completadas por tu pareja que esperan tu verificación.
                  </p>
                  {(pendingTaskLogs as TaskPendingLog[]).map((taskLog) => (
                    <TaskPendingCard
                      key={taskLog.id}
                      taskLog={taskLog}
                      onVerify={(taskLogId) => verifyMutation.mutateAsync({ taskLogId, taskId: taskLog.taskId })}
                      onReject={(taskLogId) => rejectMutation.mutateAsync({ taskLogId, taskId: taskLog.taskId })}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ─── HISTORY TAB ─── */}
          {tab === 'history' && (
            <div className="space-y-5">
              {historyActivities.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Actividades resueltas
                  </h2>
                  <div className="space-y-2">
                    {historyActivities.map((event) => {
                      const pts = Number(event.pointsCalculated || event.pointsBase)
                      return (
                        <button
                          key={event.id}
                          onClick={() => navigate(`/request-inbox/${event.id}`)}
                          className="w-full text-left bg-surface-card border border-brd-subtle rounded-lg p-3 hover:border-brd-purple transition group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <EventStatusPill status={event.status} />
                              </div>
                              <p className="font-medium text-text-primary truncate">
                                {event.title || event.type}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {event.creator?.name} ·{' '}
                                {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`font-bold text-sm ${
                                event.status === 'accepted' ? 'text-brand-amber' : 'text-text-tertiary'
                              }`}>
                                {event.status === 'accepted' ? `−${pts} pts` : `${pts} pts`}
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-tertiary ml-auto group-hover:text-text-secondary transition" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {historyTaskLogs.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Tareas resueltas
                  </h2>
                  <div className="space-y-2">
                    {historyTaskLogs.slice(0, 30).map((log) => (
                      <div
                        key={log.id}
                        className="bg-surface-card border border-brd-subtle rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <TaskStatusPill status={log.status} />
                            </div>
                            <p className="font-medium text-text-primary truncate">
                              {CATEGORY_EMOJI[log.taskCategory] || '🏠'} {log.taskName}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {log.completedBy?.name} ·{' '}
                              {new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              {log.verifiedBy && ` · ✓ ${log.verifiedBy.name}`}
                            </p>
                            {log.disputeReason && (
                              <p className="text-xs text-warn mt-0.5">"{log.disputeReason}"</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className={`font-bold text-sm ${
                              log.status === 'verified' ? 'text-success' : 'text-text-tertiary'
                            }`}>
                              {log.status === 'verified' ? `+${log.pointsFinal}` : log.pointsFinal} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {historyActivities.length === 0 && historyTaskLogs.length === 0 && (
                <Card className="text-center py-12">
                  <div className="text-5xl mb-3">📋</div>
                  <p className="font-semibold text-text-primary">Sin historial todavía</p>
                  <p className="text-sm text-text-secondary">
                    Aquí verás todas las actividades y tareas resueltas.
                  </p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
