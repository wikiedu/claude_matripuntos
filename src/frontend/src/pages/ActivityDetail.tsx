import { useState, useEffect } from 'react'
import {
  ChevronLeft, Check, X, Edit, Calendar, Loader, Clock,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/v2/primitives/Button'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'
import { ConfirmDialog } from '../components/v2/primitives/ConfirmDialog'

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

// ─── Local helpers (inline — no shared module yet) ────────────────────────────
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

function EventStatusPill({ status }: { status: string }) {
  switch (status) {
    case 'accepted': return <Pill tone="success">Aceptada</Pill>
    case 'rejected': return <Pill tone="danger">Rechazada</Pill>
    case 'pending':  return <Pill tone="warn">Pendiente</Pill>
    case 'forced':   return <Pill tone="purple">Forzada</Pill>
    default:         return <Pill tone="indigo">{status}</Pill>
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ActivityDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', id],
    queryFn: () => apiClient.events.getById(id),
    enabled: !!id,
  })
  const event = data?.event as ActivityEvent | undefined

  // Local state
  const [counterPoints, setCounterPoints] = useState(0)
  const [counterMessage, setCounterMessage] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [isForcing, setIsForcing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Back navigation helper ──────────────────────────────────────────────
  const handleBack = () => {
    const idx = (window.history.state && (window.history.state as { idx?: number }).idx) ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/home/activities')
  }

  // Sync counterPoints when event first loads
  useEffect(() => {
    if (event) {
      setCounterPoints(Number(event.pointsCalculated || event.pointsBase))
    }
  // Only reset counter when a NEW event is loaded; ignore later mutations
  // to counterPoints triggered by the user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  // ─── Loading / error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <main className="px-4 pt-3 pb-6 flex items-center justify-center min-h-[200px]">
        <Loader className="w-6 h-6 animate-spin text-text-secondary" />
      </main>
    )
  }

  if (isError || !event) {
    return (
      <main className="px-4 pt-3 pb-6">
        <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          No se pudo cargar la actividad.
        </div>
        <div className="pt-4">
          <Button variant="outline" size="sm" onClick={handleBack}>
            Volver
          </Button>
        </div>
      </main>
    )
  }

  // ─── Query invalidation helper ────────────────────────────────────────────
  const invalidateAfterAction = () => {
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
    queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
    queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
    // New keys required by actividades-module plan
    queryClient.invalidateQueries({ queryKey: ['events', 'all'] })
    queryClient.invalidateQueries({ queryKey: ['events', id] })
  }

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleRespond = async (action: 'accepted' | 'rejected' | 'counter_proposed') => {
    const negs = event.negotiations || []
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
      invalidateAfterAction()
      handleBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al responder')
    } finally {
      setIsResponding(false)
    }
  }

  // v2.5.2 audit 12 S1-Q-3 — fricción explícita antes de forzar.
  // Antes era 1 click → pago inmediato del saldo del proposer. Riesgo
  // de tap accidental en mobile. Ahora ConfirmDialog con preview de
  // puntos y nota de irreversibilidad.
  const [showForceConfirm, setShowForceConfirm] = useState(false)
  const handleForce = () => setShowForceConfirm(true)

  const performForce = async () => {
    const negs = event.negotiations || []
    const target = negs.filter((n) => n.responseType === 'awaiting').pop() || negs[negs.length - 1]
    if (!target?.id) { setError('No se encontró la negociación activa.'); setShowForceConfirm(false); return }

    setIsForcing(true)
    setError(null)
    try {
      await apiClient.negotiations.force(target.id)
      invalidateAfterAction()
      setShowForceConfirm(false)
      handleBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al forzar la actividad')
      setShowForceConfirm(false)
    } finally {
      setIsForcing(false)
    }
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const pts = Number(event.pointsCalculated || event.pointsBase)
  const dateStart = new Date(event.dateStart)
  const dateEnd = new Date(event.dateEnd)
  const sameDay = dateStart.toDateString() === dateEnd.toDateString()
  const isMyEvent = event.creator?.id === user?.id

  const negsForTurn = event.negotiations || []
  const lastAwaitingNeg = negsForTurn.filter((n) => n.responseType === 'awaiting').pop()
    || negsForTurn[negsForTurn.length - 1]
  const isMyTurn = event.status === 'pending' && (
    !lastAwaitingNeg
      ? event.creator?.id !== user?.id
      : lastAwaitingNeg.proposedBy !== user?.id
  )

  const maxRounds = event.maxFreeRounds ?? 2
  const canForce =
    event.status === 'pending'
    && isMyEvent
    && (event.negotiationRound ?? 0) >= maxRounds

  // ─── Detail view ──────────────────────────────────────────────────────────
  return (
    <main className="px-4 pt-3 pb-6">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleBack}
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
              <h2 className="text-xl font-extrabold text-text-primary">{event.title || event.type}</h2>
              <p className="text-text-secondary text-sm mt-1">
                Solicitado por{' '}
                <strong className="text-text-primary">{event.creator?.name || '?'}</strong>
              </p>
              <div className="mt-2">
                <EventStatusPill status={event.status} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-3xl font-black text-brand-amber">−{pts}</div>
              <div className="text-xs text-text-tertiary">
                pts para {event.creator?.name}
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

          {event.description && (
            <div className="mt-4 bg-surface-muted border border-brd-subtle rounded-md p-3 text-sm text-text-secondary">
              {event.description}
            </div>
          )}
          {event.compensation && (
            <div className="mt-3 bg-brand-indigo/10 border border-brand-indigo/30 rounded-md p-3 text-sm text-indigo-300">
              <strong className="text-text-primary">Compensación ofrecida:</strong>{' '}
              {getCompensationLabel(event.compensation)}
            </div>
          )}
        </Card>

        {/* Negotiation history */}
        {(event.negotiations || []).length > 0 && (
          <Card>
            <h3 className="font-bold text-text-primary mb-3">Historial de negociación</h3>
            <div className="space-y-2">
              {event.negotiations.map((neg, i) => (
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
        {event.status === 'pending' && !isMyTurn && (
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
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showForceConfirm}
        title="Forzar aceptación"
        message={`Vas a forzar el cierre de esta actividad. Pagarás ${pts} MP de tu saldo actual. Esta acción no se puede deshacer.`}
        confirmLabel={`Pagar ${pts} MP y forzar`}
        cancelLabel="Cancelar"
        variant="danger"
        busy={isForcing}
        onConfirm={performForce}
        onClose={() => setShowForceConfirm(false)}
      />
    </main>
  )
}
