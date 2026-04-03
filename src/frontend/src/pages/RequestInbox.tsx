import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Check, X, Edit, Calendar, Loader, Clock, Home, ChevronRight, CheckCircle, AlertTriangle, History, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Category emojis ─────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', compra: '🛒', logistica: '📋',
  cuidado: '👶', baños: '🚿', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾',
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function RequestInbox({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { user, couple } = useAppStore()

  const [tab, setTab] = useState<InboxTab>('activities')

  // Activities state
  const [pendingActivities, setPendingActivities] = useState<ActivityEvent[]>([])
  const [allActivities, setAllActivities] = useState<ActivityEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null)
  const [counterPoints, setCounterPoints] = useState(0)
  const [counterMessage, setCounterMessage] = useState('')
  const [isResponding, setIsResponding] = useState(false)

  // Tasks state
  const [pendingTaskLogs, setPendingTaskLogs] = useState<TaskLogItem[]>([])
  const [allTaskLogs, setAllTaskLogs] = useState<TaskLogItem[]>([])
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
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

      // Pending activities = events where it's MY turn to respond
      const pending = events.filter((e: ActivityEvent) => {
        if (e.status !== 'pending') return false
        const negs = e.negotiations || []
        const lastAwaiting = negs.filter(n => n.responseType === 'awaiting').pop() || negs[negs.length - 1]
        if (!lastAwaiting) return e.creator?.id !== user.id
        return lastAwaiting.proposedBy !== user.id
      })
      setPendingActivities(pending)

      const allLogs: TaskLogItem[] = allLogsRes.logs || []
      setAllTaskLogs(allLogs)

      // Pending task logs = partner's tasks awaiting my verification
      const pendingTasks = allLogs.filter(l => l.status === 'pending' && l.completedBy?.id !== user.id)
      setPendingTaskLogs(pendingTasks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando datos')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, couple?.id])

  useEffect(() => { loadAll() }, [loadAll])

  // ─── Activity response ────────────────────────────────────────────────────
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

  const handleRespond = async (action: 'accepted' | 'rejected' | 'counter_proposed') => {
    if (!selectedEvent) return
    const negs = selectedEvent.negotiations || []
    const awaiting = negs.find(n => n.responseType === 'awaiting') || negs[negs.length - 1]
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
        action === 'accepted' ? '✅ Actividad aceptada. ¡Puntos actualizados!' :
        action === 'rejected' ? '❌ Actividad rechazada' :
        '↩️ Contrapropuesta enviada'
      )
      setSelectedEvent(null)
      setTimeout(() => setSuccess(null), 5000)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al responder')
    } finally {
      setIsResponding(false)
    }
  }

  // ─── Task verification ────────────────────────────────────────────────────
  const handleVerify = async (log: TaskLogItem) => {
    setVerifyingId(log.id)
    setError(null)
    try {
      await apiClient.tasks.verifyLog(log.taskId, log.id)
      setSuccess(`✅ Tarea "${log.taskName}" verificada. +${log.pointsFinal} pts para ${log.completedBy?.name}`)
      setTimeout(() => setSuccess(null), 5000)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar')
    } finally {
      setVerifyingId(null)
    }
  }

  const handleDisputeConfirm = async () => {
    if (!disputingLog) return
    setIsDisputing(true)
    try {
      await apiClient.tasks.disputeLog(disputingLog.taskId, disputingLog.id, {
        disputeReason: disputeReason.trim() || 'Sin motivo especificado',
      })
      setSuccess(`⚠️ Tarea "${disputingLog.taskName}" disputada`)
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

    // Determine whose turn it is to respond — based on who proposed the last 'awaiting' round
    // NOT based on who created the event (that breaks after counter-proposals)
    const negsForTurn = selectedEvent.negotiations || []
    const lastAwaitingNeg = negsForTurn.filter(n => n.responseType === 'awaiting').pop()
      || negsForTurn[negsForTurn.length - 1]
    const isMyTurn = selectedEvent.status === 'pending' && (
      !lastAwaitingNeg
        ? selectedEvent.creator?.id !== user?.id   // no negs yet: partner (non-creator) responds first
        : lastAwaitingNeg.proposedBy !== user?.id  // last awaiting was proposed by other person → my turn
    )

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex-1">
              {isMyEvent ? 'Mi solicitud' : 'Solicitud recibida'}
            </h1>
            <button onClick={goHome} className="p-2 hover:bg-gray-100 rounded-lg">
              <Home className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
              {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Event info */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title || selectedEvent.type}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Solicitado por <strong>{selectedEvent.creator?.name || '?'}</strong>
                </p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium ${
                  selectedEvent.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  selectedEvent.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  selectedEvent.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {selectedEvent.status === 'accepted' ? '✅ Aceptada' :
                   selectedEvent.status === 'rejected' ? '❌ Rechazada' :
                   selectedEvent.status === 'pending' ? '⏳ Pendiente' :
                   selectedEvent.status}
                </span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-orange-500">−{pts}</div>
                <div className="text-xs text-gray-500">pts para {selectedEvent.creator?.name}</div>
                {!isMyEvent && (
                  <div className="text-xs text-green-600 font-medium mt-1">+{pts} pts para ti</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha</p>
                <p className="font-medium">
                  {dateStart.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long' })}
                  {!sameDay && ` → ${dateEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hora</p>
                <p className="font-medium">
                  {dateStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {dateEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {selectedEvent.description && (
              <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-700">{selectedEvent.description}</div>
            )}
            {selectedEvent.compensation && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                💡 <strong>Compensación ofrecida:</strong> {selectedEvent.compensation}
              </div>
            )}
          </div>

          {/* Negotiation history */}
          {(selectedEvent.negotiations || []).length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3">Historial de negociación</h3>
              <div className="space-y-2">
                {selectedEvent.negotiations.map((neg, i) => (
                  <div key={neg.id || i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${i === 0 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {neg.roundNumber}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">
                          {neg.responseType === 'awaiting' ? '⏳ Esperando respuesta' :
                           neg.responseType === 'accepted' ? '✅ Aceptado' :
                           neg.responseType === 'rejected' ? '❌ Rechazado' : '↩️ Contrapropuesta'}
                        </span>
                        <span className="font-bold text-primary text-sm">{Number(neg.pointsProposed).toFixed(0)} pts</span>
                      </div>
                      {neg.message && <p className="text-sm text-gray-700">{neg.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response form — shown when it's genuinely MY turn to respond (turn-based, not creator-based) */}
          {isMyTurn && (
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-4">Tu respuesta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntos que aceptas <span className="text-gray-400 font-normal">(propuesta: {pts} pts)</span>
                  </label>
                  <input
                    type="number" min="1" step="1"
                    value={counterPoints}
                    onChange={e => setCounterPoints(Number(e.target.value))}
                    className="input-field"
                  />
                  {counterPoints !== pts && (
                    <p className="text-xs text-orange-600 mt-1">
                      ↩️ Enviarás contrapropuesta: {counterPoints} pts (original: {pts} pts)
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje (opcional)</label>
                  <textarea
                    value={counterMessage} onChange={e => setCounterMessage(e.target.value)}
                    placeholder="Explica tu respuesta..."
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => handleRespond('rejected')} disabled={isResponding}
                    className="flex-1 py-3 px-4 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {isResponding ? <Loader className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleRespond(counterPoints === pts ? 'accepted' : 'counter_proposed')}
                    disabled={isResponding}
                    className="flex-1 py-3 px-4 bg-primary text-white hover:bg-opacity-90 rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    {isResponding ? <Loader className="w-4 h-4 animate-spin" /> :
                     counterPoints === pts ? <><Check className="w-4 h-4" /> Aceptar ({pts} pts)</> :
                     <><Edit className="w-4 h-4" /> Contraoferta ({counterPoints} pts)</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting message — only when it's genuinely NOT my turn */}
          {selectedEvent.status === 'pending' && !isMyTurn && (
            <div className="card bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800">Esperando respuesta</p>
                  <p className="text-sm text-yellow-700">
                    {isMyEvent ? 'Tu pareja aún no ha respondido.' : 'Esperando que el solicitante responda a tu contraoferta.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ─── Main inbox view ──────────────────────────────────────────────────────

  // My outgoing pending activities (created by me, still pending)
  const myPendingActivities = allActivities.filter(
    e => e.status === 'pending' && e.creator?.id === user?.id
  )
  // History: resolved events
  const historyActivities = allActivities.filter(
    e => ['accepted', 'rejected', 'forced'].includes(e.status)
  )
  // History: all resolved task logs (both mine and partner's)
  const historyTaskLogs = allTaskLogs.filter(l => l.status !== 'pending')

  const totalPending = pendingActivities.length + pendingTaskLogs.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dispute modal */}
      {disputingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">⚠️ Disputar tarea</h3>
            <p className="text-sm text-gray-600 mb-4">
              Disputando <strong>{disputingLog.taskName}</strong> de <strong>{disputingLog.completedBy?.name}</strong> ({disputingLog.pointsFinal} pts)
            </p>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Motivo (opcional)</label>
            <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
              placeholder="¿Por qué disputas esta tarea?" rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setDisputingLog(null); setDisputeReason('') }} className="flex-1 btn-secondary" disabled={isDisputing}>
                Cancelar
              </button>
              <button onClick={handleDisputeConfirm} disabled={isDisputing}
                className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1">
                {isDisputing ? <Loader className="w-3 h-3 animate-spin" /> : '⚠️'} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={goHome} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Bandeja de entrada</h1>
            <p className="text-sm text-gray-500">
              {totalPending > 0 ? `${totalPending} elemento${totalPending !== 1 ? 's' : ''} pendiente${totalPending !== 1 ? 's' : ''}` : 'Todo al día ✅'}
            </p>
          </div>
          <button onClick={loadAll} className="p-2 hover:bg-gray-100 rounded-lg" title="Actualizar">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {([
              { key: 'activities' as const, label: '🎯 Actividades', count: pendingActivities.length },
              { key: 'tasks' as const, label: '🏠 Tareas', count: pendingTaskLogs.length },
              { key: 'history' as const, label: '📋 Historial', count: null },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}>
                {t.label}
                {t.count !== null && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-primary text-white' : 'bg-red-500 text-white'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{success}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-8 h-8 text-primary animate-spin mr-2" />
            <span className="text-gray-500">Cargando bandeja...</span>
          </div>
        ) : (
          <>
            {/* ── ACTIVITIES TAB ── */}
            {tab === 'activities' && (
              <div className="space-y-4">
                {/* Pending FROM partner — need my response */}
                {pendingActivities.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                      Requieren tu respuesta ({pendingActivities.length})
                    </h2>
                    <div className="space-y-3">
                      {pendingActivities.map(event => {
                        const pts = Number(event.pointsCalculated || event.pointsBase)
                        const negs = event.negotiations || []
                        // negs from getAll() are ordered DESC (newest first), so negs[0] is the most recent
                        const lastNeg = negs[0]
                        const isCounter = negs.length > 1
                        return (
                          <button key={event.id} onClick={() => handleSelectEvent(event)}
                            className="w-full card text-left hover:shadow-md transition-all border-l-4 border-primary">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isCounter && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">↩️ Contraoferta</span>}
                                  <p className="font-semibold text-gray-900 truncate">{event.title || event.type}</p>
                                </div>
                                <p className="text-sm text-gray-500">
                                  De {event.creator?.name || '?'} · {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </p>
                                {lastNeg?.message && (
                                  <p className="text-xs text-gray-400 mt-1 truncate">💬 "{lastNeg.message}"</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 ml-3">
                                <div className="text-right">
                                  <div className="font-bold text-orange-500">−{pts} pts</div>
                                  <div className="text-xs text-green-600">+{pts} tuyos</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* My outgoing pending */}
                {myPendingActivities.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                      Mis solicitudes enviadas ({myPendingActivities.length})
                    </h2>
                    <div className="space-y-3">
                      {myPendingActivities.map(event => {
                        const pts = Number(event.pointsCalculated || event.pointsBase)
                        return (
                          <button key={event.id} onClick={() => handleSelectEvent(event)}
                            className="w-full card text-left hover:shadow-md transition-all border-l-4 border-yellow-400 opacity-80">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{event.title || event.type}</p>
                                <p className="text-sm text-gray-500">
                                  ⏳ Esperando respuesta · {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <div className="text-orange-500 font-bold">−{pts} pts</div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pendingActivities.length === 0 && myPendingActivities.length === 0 && (
                  <div className="card text-center py-14">
                    <div className="text-5xl mb-3">🎯</div>
                    <p className="font-semibold text-gray-700 mb-1">Sin actividades pendientes</p>
                    <p className="text-sm text-gray-500">Las solicitudes de actividades aparecerán aquí</p>
                  </div>
                )}
              </div>
            )}

            {/* ── TASKS TAB ── */}
            {tab === 'tasks' && (
              <div className="space-y-3">
                {pendingTaskLogs.length === 0 ? (
                  <div className="card text-center py-14">
                    <div className="text-5xl mb-3">🏠</div>
                    <p className="font-semibold text-gray-700 mb-1">Sin tareas pendientes de verificar</p>
                    <p className="text-sm text-gray-500">Cuando tu pareja registre tareas, aparecerán aquí para verificar</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 pb-1">
                      Tareas completadas por tu pareja que esperan tu verificación
                    </p>
                    {pendingTaskLogs.map(log => (
                      <div key={log.id} className="card border-l-4 border-purple-400">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{CATEGORY_EMOJI[log.taskCategory] || '✅'}</span>
                              <p className="font-semibold text-gray-900 truncate">{log.taskName}</p>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {log.completedBy?.name} · {new Date(log.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {log.modifier && log.modifier !== 'none' && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${log.modifier === 'extra' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {log.modifier === 'extra' ? '⭐ Extra' : '🔸 Parcial'}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-xl font-bold text-purple-600">+{log.pointsFinal}</div>
                            <div className="text-xs text-gray-400">pts</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerify(log)}
                            disabled={verifyingId === log.id}
                            className="flex-1 py-2.5 px-3 bg-green-100 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                            {verifyingId === log.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Verificar (+{log.pointsFinal} pts)
                          </button>
                          <button
                            onClick={() => setDisputingLog(log)}
                            disabled={verifyingId === log.id}
                            className="flex-1 py-2.5 px-3 bg-orange-100 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Disputar
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {tab === 'history' && (
              <div className="space-y-5">
                {/* Resolved activities */}
                {historyActivities.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" /> Actividades resueltas
                    </h2>
                    <div className="space-y-2">
                      {historyActivities.map(event => {
                        const pts = Number(event.pointsCalculated || event.pointsBase)
                        return (
                          <button key={event.id} onClick={() => handleSelectEvent(event)}
                            className="w-full card text-left hover:shadow-md transition-all py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    event.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                    event.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {event.status === 'accepted' ? '✅ Aceptada' : event.status === 'rejected' ? '❌ Rechazada' : '⚡ Forzada'}
                                  </span>
                                </div>
                                <p className="font-medium text-gray-900 truncate">{event.title || event.type}</p>
                                <p className="text-xs text-gray-500">
                                  {event.creator?.name} · {new Date(event.dateStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </p>
                              </div>
                              <div className="ml-3 text-right">
                                <div className={`font-bold text-sm ${event.status === 'accepted' ? 'text-orange-500' : 'text-gray-400'}`}>
                                  {event.status === 'accepted' ? `−${pts} pts` : `${pts} pts`}
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Resolved task logs */}
                {historyTaskLogs.length > 0 && (
                  <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" /> Tareas resueltas
                    </h2>
                    <div className="space-y-2">
                      {historyTaskLogs.slice(0, 30).map(log => (
                        <div key={log.id} className="card py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  log.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {log.status === 'verified' ? '✅ Verificada' : '⚠️ Disputada'}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 truncate">
                                {CATEGORY_EMOJI[log.taskCategory] || '🏠'} {log.taskName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {log.completedBy?.name} · {new Date(log.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                {log.verifiedBy && ` · ✓ ${log.verifiedBy.name}`}
                              </p>
                              {log.disputeReason && (
                                <p className="text-xs text-orange-600 mt-0.5">💬 "{log.disputeReason}"</p>
                              )}
                            </div>
                            <div className="ml-3 text-right">
                              <div className={`font-bold text-sm ${log.status === 'verified' ? 'text-green-600' : 'text-gray-400'}`}>
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
                  <div className="card text-center py-14">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="font-semibold text-gray-700">Sin historial todavía</p>
                    <p className="text-sm text-gray-500">Aquí verás todas las actividades y tareas resueltas</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
