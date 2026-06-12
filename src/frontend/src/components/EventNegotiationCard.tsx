// T3 — migrado a la API canónica V1 (/api/negotiations, negotiationId-based).
// Antes consumía las rutas V2 deprecadas event-status-based (apiClient.negotiation.*,
// routes/negotiation.ts) — ver TODO_REFACTOR.md "retirada de rutas V2 deprecadas".
// El flujo completo (contraoferta con importe, forzar) vive en ActivityDetail
// (/home/activities/:id); este card resuelve los casos rápidos desde Calendar:
// proponer un draft, aceptar/rechazar la ronda pendiente, y ver el historial.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { Check, X, MessageSquare, Clock, Loader, Edit } from 'lucide-react'
import { ConfirmDialog } from './v2/primitives/ConfirmDialog'
import { Button } from './v2/primitives/Button'
import { Pill } from './v2/primitives/Pill'

type PendingAction = 'propose' | 'accept' | 'reject' | null

// Keys that downstream screens (Dashboard, Analytics, Achievements, Bell) depend on.
// Invalidating after accept/reject keeps points and activity feeds fresh
// whenever the user negotiates from any entry point that uses this card (Calendar, etc.).
const DOWNSTREAM_QUERY_KEYS: (readonly unknown[])[] = [
  ['balance'],
  ['recentActivity'],
  ['gamification', 'status'],
  ['achievements', 'map'],
  ['notifications'],
  ['notifications', 'unread-count'],
  ['taskLogs', 'pending'],
]

interface NegotiationRow {
  id: string
  roundNumber: number
  pointsProposed: string
  message?: string
  responseType?: string
  proposedBy?: string
}

interface NegotiationEvent {
  id: string
  type: string
  title?: string
  status: string
  pointsBase: string
  pointsCalculated: string
  pointsAgreed?: string | null
  negotiationRound: number
  maxFreeRounds?: number
  creator?: { id: string; name: string } | null
  negotiations: NegotiationRow[]
}

interface EventNegotiationCardProps {
  eventId: string
  eventTitle: string
  createdBy: string
  currentUserId: string
  onStatusChange?: () => void
}

function statusPill(status: string) {
  switch (status) {
    case 'draft':    return <Pill tone="indigo">Borrador</Pill>
    case 'pending':  return <Pill tone="warn">Pendiente</Pill>
    case 'accepted': return <Pill tone="success">Aceptada</Pill>
    case 'rejected': return <Pill tone="danger">Rechazada</Pill>
    case 'forced':   return <Pill tone="purple">Forzada</Pill>
    // Estados legacy del flujo V2 retirado — solo display, sin acciones.
    case 'proposed':             return <Pill tone="warn">Propuesta enviada</Pill>
    case 'counter_proposal':     return <Pill tone="warn">Contrapropuesta</Pill>
    case 'pending_conversation': return <Pill tone="indigo">Pendiente conversación</Pill>
    default:         return <Pill tone="indigo">{status}</Pill>
  }
}

export const EventNegotiationCard = ({
  eventId,
  eventTitle,
  createdBy,
  currentUserId,
  onStatusChange,
}: EventNegotiationCardProps) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const isCreator = createdBy === currentUserId
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Misma queryKey que ActivityDetail → comparten cache.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => apiClient.events.getById(eventId),
    enabled: !!eventId,
  })
  const event = data?.event as NegotiationEvent | undefined

  const invalidateAfterAction = () => {
    for (const key of DOWNSTREAM_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey: key })
    }
    queryClient.invalidateQueries({ queryKey: ['events', 'all'] })
    queryClient.invalidateQueries({ queryKey: ['events', eventId] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader className="w-5 h-5 animate-spin text-text-secondary" />
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
        No se pudo cargar la negociación.
      </div>
    )
  }

  // ─── Derivados V1 (mismo criterio que ActivityDetail) ─────────────────────
  const negs = event.negotiations || []
  const awaiting = negs.filter((n) => n.responseType === 'awaiting').pop()
  const isMyTurn = event.status === 'pending' && (
    !awaiting ? !isCreator : awaiting.proposedBy !== currentUserId
  )
  const pts = Number(event.pointsCalculated || event.pointsBase)
  const awaitingPts = awaiting ? Number(awaiting.pointsProposed) : pts
  const maxRounds = event.maxFreeRounds ?? 2
  const isFinalized = ['accepted', 'rejected', 'forced'].includes(event.status)
  const isLegacyStatus = ['proposed', 'counter_proposal', 'pending_conversation'].includes(event.status)

  const goToDetail = () => navigate(`/home/activities/${eventId}`)

  // ─── Acciones (API canónica V1) ────────────────────────────────────────────
  const runPropose = async () => {
    try {
      setBusy(true)
      setError(null)
      await apiClient.negotiations.create({ eventId, pointsProposed: pts })
      invalidateAfterAction()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la propuesta')
    } finally {
      setBusy(false)
    }
  }

  const runRespond = async (responseType: 'accepted' | 'rejected') => {
    if (!awaiting?.id) {
      setError('No se encontró la negociación activa.')
      return
    }
    try {
      setBusy(true)
      setError(null)
      await apiClient.negotiations.respond(awaiting.id, { responseType })
      invalidateAfterAction()
      onStatusChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo responder a la propuesta')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirm = async () => {
    const action = pendingAction
    setPendingAction(null)
    if (action === 'propose') await runPropose()
    else if (action === 'accept') await runRespond('accepted')
    else if (action === 'reject') await runRespond('rejected')
  }

  return (
    <div className="space-y-4">
      {/* Header: título + estado */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-text-primary truncate">{eventTitle}</h3>
        {statusPill(event.status)}
      </div>

      {/* Turn indicator */}
      {event.status === 'pending' && (
        <div className={`flex items-center gap-2 py-2 px-3 rounded-md text-sm border ${
          isMyTurn
            ? 'bg-warn/10 border-warn/30 text-warn'
            : 'bg-surface-muted border-brd-subtle text-text-secondary'
        }`}>
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isMyTurn ? 'bg-warn animate-pulse' : 'bg-text-tertiary'
          }`} />
          <span className="font-medium">
            {isMyTurn ? 'Tu turno de responder' : 'Esperando respuesta del partner'}
          </span>
          <span className="ml-auto opacity-70 text-xs flex-shrink-0">
            Ronda {event.negotiationRound}/{maxRounds}
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Puntos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Puntos propuestos:</span>
          <span className="font-bold text-brand-amber">{awaitingPts} pts</span>
        </div>
        {event.pointsAgreed != null && (
          <div className="flex items-center justify-between text-sm bg-success/10 border border-success/30 p-2 rounded-md">
            <span className="text-success">Puntos acordados:</span>
            <span className="font-semibold text-success">{Number(event.pointsAgreed)} pts</span>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        {/* Creador con draft → enviar propuesta (ronda 1 = puntos calculados) */}
        {isCreator && event.status === 'draft' && (
          <Button fullWidth onClick={() => setPendingAction('propose')} disabled={busy}>
            <span className="inline-flex items-center gap-2">
              <MessageSquare size={18} />
              Enviar Propuesta ({pts} pts)
            </span>
          </Button>
        )}

        {/* Mi turno → aceptar/rechazar la ronda pendiente */}
        {isMyTurn && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" onClick={() => setPendingAction('accept')} disabled={busy}>
                <span className="inline-flex items-center gap-2">
                  <Check size={18} />
                  Aceptar
                </span>
              </Button>
              <Button variant="danger" onClick={() => setPendingAction('reject')} disabled={busy}>
                <span className="inline-flex items-center gap-2">
                  <X size={18} />
                  Rechazar
                </span>
              </Button>
            </div>
            <Button variant="outline" fullWidth onClick={goToDetail}>
              <span className="inline-flex items-center gap-2">
                <Edit size={16} />
                Contraoferta / ver detalle
              </span>
            </Button>
          </>
        )}

        {/* Esperando al partner → solo enlace al detalle (forzar vive allí) */}
        {event.status === 'pending' && !isMyTurn && (
          <Button variant="outline" fullWidth onClick={goToDetail}>
            Ver detalle de la actividad
          </Button>
        )}

        {/* Estados legacy del flujo V2 retirado: sin acciones aquí */}
        {isLegacyStatus && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-surface-muted border border-brd-subtle text-sm text-text-secondary">
            <Clock size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Esta actividad usa el flujo de negociación antiguo. Gestiónala desde el
              detalle de la actividad.
            </span>
          </div>
        )}

        {/* Historial */}
        {negs.length > 0 && (
          <Button
            variant="outline"
            fullWidth
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Ocultar' : 'Ver'} Historial ({negs.length})
          </Button>
        )}
      </div>

      {/* Historial de rondas (Negotiation rows V1) */}
      {showHistory && negs.length > 0 && (
        <div className="pt-3 border-t border-brd-subtle space-y-2">
          {negs.map((neg) => (
            <div key={neg.id} className="bg-surface-muted border border-brd-subtle p-2.5 rounded-md text-sm">
              <div className="flex justify-between items-start gap-2">
                <span className="font-medium text-text-primary">Ronda {neg.roundNumber}</span>
                <span className="text-xs text-text-secondary bg-surface-card border border-brd-subtle px-2 py-0.5 rounded">
                  {neg.responseType === 'awaiting' ? 'Esperando respuesta' :
                   neg.responseType === 'accepted' ? 'Aceptado' :
                   neg.responseType === 'rejected' ? 'Rechazado' :
                   'Contrapropuesta'}
                </span>
              </div>
              <div className="text-text-secondary mt-1">Puntos: {Number(neg.pointsProposed)}</div>
              {neg.message && <div className="text-text-tertiary italic mt-0.5">"{neg.message}"</div>}
            </div>
          ))}
        </div>
      )}

      {/* Estado finalizado */}
      {isFinalized && (
        <div className="p-3 rounded-md bg-surface-muted border border-brd-subtle text-sm text-text-secondary">
          {event.status === 'accepted' && '✓ Actividad aceptada y acordada'}
          {event.status === 'rejected' && '✗ Actividad rechazada'}
          {event.status === 'forced' && '⚡ Actividad forzada por el creador'}
        </div>
      )}

      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction === 'propose' ? 'Enviar propuesta' :
          pendingAction === 'accept' ? 'Aceptar propuesta' :
          pendingAction === 'reject' ? 'Rechazar propuesta' : ''
        }
        message={
          pendingAction === 'propose' ? `¿Enviar la propuesta a tu pareja por ${pts} pts?` :
          pendingAction === 'accept' ? `¿Confirmas que aceptas esta propuesta de ${awaitingPts} pts?` :
          pendingAction === 'reject' ? '¿Confirmas que rechazas esta propuesta?' : ''
        }
        confirmLabel={
          pendingAction === 'propose' ? 'Enviar' :
          pendingAction === 'accept' ? 'Aceptar' :
          pendingAction === 'reject' ? 'Rechazar' : 'Confirmar'
        }
        variant={pendingAction === 'reject' ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={handleConfirm}
        onClose={() => setPendingAction(null)}
      />
    </div>
  )
}
