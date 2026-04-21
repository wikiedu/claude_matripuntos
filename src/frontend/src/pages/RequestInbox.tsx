// RequestInbox page — v2 dark design (Task 7.4 of v1.4 La Evolución).
// 3 tabs (Actividades · Tareas · Historial) with v2 cards, Pills for status, BottomSheet for dispute.
// Rendered naked inside AuthedLayout; AppHeader is provided globally.

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, Check, X, Edit, Calendar, Loader, Clock, ChevronRight, History, RefreshCw,
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

const COMPENSATIONS: { id: string; label: string }[] = [
  { id: 'none', label: 'Sin compensación' },
  { id: 'cocinar', label: '🍳 Cocinar la cena de la semana' },
  { id: 'tareas', label: '🧹 Tareas extra esa semana' },
  { id: 'masaje', label: '💆 Masaje de espalda' },
  { id: 'desayuno', label: '☕ Desayuno en cama' },
  { id: 'noche_libre', label: '🌙 Noche libre para tu pareja' },
]

const getCompensationLabel = (id: string) =>
  COMPENSATIONS.find((c) => c.id === id)?.label ?? id

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
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null)
  const [counterPoints, setCounterPoints] = useState(0)
  const [counterMessage, setCounterMessage] = useState('')
  const [isResponding, setIsResponding] = useState(false)

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
  const [isForcing, setIsForcing] = useState(false)

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

  // ─── Activity handlers ────────────────────────────────────────────────────
  const handleSelectEvent = async (event: ActivityEvent) => {
    try {
      const res = await apiClient.events.getById(event.id)
      const full = res.event || event
      setSelectedEvent(full)
      setCounterPoints(Number(full.pointsCalculated || full.pointsBase))
      setCounterMessage('')
    } catch {
      setSelectedEvent(event)
      setCounterPoints(Number(event.pointsCalculated || event.pointsBase))
      setCounterMessage('')
    }
  }

  // Keys that downstream screens (Dashboard, Analytics, Achievements, Bell) depend on.
  // Invalidating after accept/reject/force keeps points and activity feeds fresh.
  const invalidateAfterAction = () => {
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
    queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
    queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
  }

  const handleRespond = async (action: 'accepted' | 'rejected' | 'counter_proposed') => {
    if (!selectedEvent) return
    const negs = selectedEvent.negotiations || []
    const awaiting = negs.find((n) => n.responseType === 'awaiting') || negs[negs.length - 1]
    if (!awaiting?.id) { setError('No se encontró la negociación activa.'); return }

    setIsResponding(true)
    setError(null)
    try {
      await apiClient.negotiations.respond(awaiting.id, {
        responseType: action,
        pointsProposed: action !== 'rejected' ? counterPoints : undefined,
        message: counterMessage || undefined,
      })
      setSuccess(
        action === 'accepted'
          ? 'Actividad aceptada. Puntos actualizados.'
          : action === 'rejected'
            ? 'Actividad rechazada.'
            : 'Contrapropuesta enviada.',
      )
      setSelectedEvent(null)
      setTimeout(() => setSuccess(null), 5000)
      invalidateAfterAction()
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al responder')
    } finally {
      setIsResponding(false)
    }
  }

  const handleForce = async () => {
    if (!selectedEvent) return
    const negs = selectedEvent.negotiations || []
    const target = negs.filter((n) => n.responseType === 'awaiting').pop() || negs[negs.length - 1]
    if (!target?.id) { setError('No se encontró la negociación activa.'); return }

    setIsForcing(true)
    setError(null)
    try {
      await apiClient.negotiations.force(target.id)
      setSuccess('Actividad forzada. Puntos descontados de tu saldo.')
      setSelectedEvent(null)
      setTimeout(() => setSuccess(null), 5000)
      invalidateAfterAction()
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al forzar la actividad')
    } finally {
      setIsForcing(false)
    }
  }

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

  // ─── Activity detail view ─────────────────────────────────────────────────
  if (selectedEvent) {
    const pts = Number(selectedEvent.pointsCalculated || selectedEvent.pointsBase)
    const dateStart = new Date(selectedEvent.dateStart)
    const dateEnd = new Date(selectedEvent.dateEnd)
    const sameDay = dateStart.toDateString() === dateEnd.toDateString()
    const isMyEvent = selectedEvent.creator?.id === user?.id

    const negsForTurn = selectedEvent.negotiations || []
    const lastAwaitingNeg = negsForTurn.filter((n) => n.responseType === 'awaiting').pop()
      || negsForTurn[negsForTurn.length - 1]
    const isMyTurn = selectedEvent.status === 'pending' && (
      !lastAwaitingNeg
        ? selectedEvent.creator?.id !== user?.id
        : lastAwaitingNeg.proposedBy !== user?.id
    )

    const maxRounds = selectedEvent.maxFreeRounds ?? 2
    const canForce =
      selectedEvent.status === 'pending'
      && isMyEvent
      && (selectedEvent.negotiationRound ?? 0) >= maxRounds

    return (
      <main className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setSelectedEvent(null)}
            className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm font-semibold"
            aria-label="Volver"
          >
            <ChevronLeft size={18} />
            <span>{isMyEvent ? 'Mi solicitud' : 'Solicitud recibida'}</span>
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm flex items-start justify-between gap-2">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Event info */}
          <Card>
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-extrabold text-text-primary">{selectedEvent.title || selectedEvent.type}</h2>
                <p className="text-text-secondary text-sm mt-1">
                  Solicitado por{' '}
                  <strong className="text-text-primary">{selectedEvent.creator?.name || '?'}</strong>
                </p>
                <div className="mt-2">
                  <EventStatusPill status={selectedEvent.status} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-3xl font-black text-brand-amber">−{pts}</div>
                <div className="text-xs text-text-tertiary">
                  pts para {selectedEvent.creator?.name}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-tertiary mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Fecha
                </p>
                <p className="font-medium text-text-primary">
                  {dateStart.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' })}
                  {!sameDay && ` → ${dateEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
                </p>
              </div>
              <div>
                <p className="text-text-tertiary mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Hora
                </p>
                <p className="font-medium text-text-primary">
                  {dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {selectedEvent.description && (
              <div className="mt-4 bg-surface-muted border border-brd-subtle rounded-md p-3 text-sm text-text-secondary">
                {selectedEvent.description}
              </div>
            )}
            {selectedEvent.compensation && (
              <div className="mt-3 bg-brand-indigo/10 border border-brand-indigo/30 rounded-md p-3 text-sm text-indigo-300">
                <strong className="text-text-primary">Compensación ofrecida:</strong>{' '}
                {getCompensationLabel(selectedEvent.compensation)}
              </div>
            )}
          </Card>

          {/* Negotiation history */}
          {(selectedEvent.negotiations || []).length > 0 && (
            <Card>
              <h3 className="font-bold text-text-primary mb-3">Historial de negociación</h3>
              <div className="space-y-2">
                {selectedEvent.negotiations.map((neg, i) => (
                  <div key={neg.id || i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                      i === 0
                        ? 'bg-grad-cta text-white'
                        : 'bg-surface-muted text-text-secondary border border-brd-subtle'
                    }`}>
                      {neg.roundNumber}
                    </div>
                    <div className="flex-1 bg-surface-muted border border-brd-subtle rounded-md p-3">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-xs text-text-tertiary">
                          {neg.responseType === 'awaiting' ? 'Esperando respuesta' :
                           neg.responseType === 'accepted' ? 'Aceptado' :
                           neg.responseType === 'rejected' ? 'Rechazado' :
                           'Contrapropuesta'}
                        </span>
                        <span className="font-bold text-brand-purple text-sm">
                          {Number(neg.pointsProposed).toFixed(0)} pts
                        </span>
                      </div>
                      {neg.message && <p className="text-sm text-text-secondary">{neg.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Response form — when it is my turn */}
          {isMyTurn && (
            <Card>
              <h3 className="font-bold text-text-primary mb-4">Tu respuesta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Puntos que aceptas{' '}
                    <span className="text-text-tertiary font-normal">(propuesta: {pts} pts)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={counterPoints}
                    onChange={(e) => setCounterPoints(Number(e.target.value))}
                    className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50"
                  />
                  {counterPoints !== pts && (
                    <p className="text-xs text-brand-amber mt-1">
                      Enviarás contrapropuesta: {counterPoints} pts (original: {pts} pts)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Mensaje (opcional)</label>
                  <textarea
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    placeholder="Explica tu respuesta…"
                    className="w-full bg-surface-card border border-brd-purple rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/50 h-20 resize-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={() => handleRespond('rejected')}
                    disabled={isResponding}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isResponding ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Rechazar
                    </span>
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => handleRespond(counterPoints === pts ? 'accepted' : 'counter_proposed')}
                    disabled={isResponding}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isResponding ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : counterPoints === pts ? (
                        <><Check className="w-4 h-4" /> Aceptar ({pts} pts)</>
                      ) : (
                        <><Edit className="w-4 h-4" /> Contraoferta ({counterPoints} pts)</>
                      )}
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Waiting message (not my turn) */}
          {selectedEvent.status === 'pending' && !isMyTurn && (
            <Card className="bg-warn/10 border-warn/30">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warn flex-shrink-0" />
                <div>
                  <p className="font-semibold text-text-primary">Esperando respuesta</p>
                  <p className="text-sm text-text-secondary">
                    {isMyEvent
                      ? 'Tu pareja aún no ha respondido.'
                      : 'Esperando que el solicitante responda a tu contraoferta.'}
                  </p>
                </div>
              </div>

              {canForce && (
                <div className="mt-3 pt-3 border-t border-brd-subtle">
                  <p className="text-xs text-text-tertiary mb-2">
                    Has agotado tus rondas gratuitas ({maxRounds}). Puedes forzar la actividad pagando los puntos de tu saldo.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleForce}
                    disabled={isForcing}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isForcing && <Loader className="w-4 h-4 animate-spin" />}
                      Forzar y pagar ({pts} pts)
                    </span>
                  </Button>
                </div>
              )}
            </Card>
          )}

          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={goHome}>
              Volver al dashboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

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
                          onClick={() => handleSelectEvent(event)}
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
                          onClick={() => handleSelectEvent(event)}
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
                          onClick={() => handleSelectEvent(event)}
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
