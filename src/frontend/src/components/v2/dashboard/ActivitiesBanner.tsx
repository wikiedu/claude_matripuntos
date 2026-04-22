import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'
import { useActivities } from '../../../hooks/useActivities'
import { useInvalidateActivity } from '../../../hooks/useInvalidateActivity'
import { ActivityActionCard } from '../activities/ActivityActionCard'
import { CounterOfferSheet } from '../activities/CounterOfferSheet'

const MAX_CARDS = 2

export function ActivitiesBanner() {
  const nav = useNavigate()
  const { pending, pendingCount, waitingCount } = useActivities()
  const invalidate = useInvalidateActivity()

  const [counterFor, setCounterFor] = useState<string | null>(null)

  const respond = useMutation({
    mutationFn: (v: {
      negotiationId: string
      eventId: string
      payload: Parameters<typeof apiClient.negotiations.respond>[1]
    }) => apiClient.negotiations.respond(v.negotiationId, v.payload),
    onSuccess: (_, v) => invalidate(v.eventId),
    onError: (err) => {
      // Surface the real backend error. The API client throws Error(error.error)
      // for non-OK responses, so err.message is the human-readable reason.
      const msg = err instanceof Error && err.message
        ? err.message
        : 'No se pudo completar la acción. Inténtalo de nuevo.'
      window.alert(msg)
      invalidate()
    },
  })

  if (pendingCount === 0 && waitingCount === 0) return null

  const visible = pending.slice(0, MAX_CARDS)
  const overflow = Math.max(0, pendingCount - MAX_CARDS)

  // Prefer the negotiation still in 'awaiting'. Falls back to the first by
  // createdAt-desc only if none is awaiting (stuck state). Matches the logic
  // in ActivityDetail — prevents "Negotiation already responded to" 400s when
  // the cached list is out of sync with the DB.
  function lastNegOf(eventId: string) {
    const e = pending.find((x) => x.id === eventId)
    const negs = e?.negotiations ?? []
    return negs.find((n) => n.responseType === 'awaiting') ?? negs[0]
  }

  function handleAccept(eventId: string) {
    const neg = lastNegOf(eventId)
    if (neg) respond.mutate({ negotiationId: neg.id, eventId, payload: { responseType: 'accepted' } })
  }
  function handleReject(eventId: string) {
    const neg = lastNegOf(eventId)
    if (neg) respond.mutate({ negotiationId: neg.id, eventId, payload: { responseType: 'rejected' } })
  }
  function handleOpen(eventId: string) { nav(`/home/activities/${eventId}`) }

  const currentCounter = counterFor ? pending.find((e) => e.id === counterFor) : null
  const currentNeg = counterFor ? lastNegOf(counterFor) : undefined
  const currentPoints = Number(currentCounter?.pointsAgreed ?? currentCounter?.pointsCalculated ?? 0)

  return (
    <div className="mx-4 mt-2 mb-3 rounded-xl bg-brand-amber/10 border border-brand-amber/30 p-3">
      {pendingCount > 0 && (
        <>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-amber mb-2">
            🎯 Responder ({pendingCount})
          </h4>
          <div className="flex flex-col gap-2">
            {visible.map((ev) => (
              <ActivityActionCard
                key={ev.id}
                activity={{
                  id: ev.id,
                  title: ev.title ?? ev.type,
                  creatorName: ev.creator?.name ?? 'Tu pareja',
                  whenLabel: formatWhen(ev.dateStart),
                  pointsCalculated: Math.round(Number(ev.pointsAgreed ?? ev.pointsCalculated ?? 0)),
                  round: ev.negotiationRound ?? 1,
                }}
                busy={respond.isPending}
                onAccept={handleAccept}
                onReject={handleReject}
                onCounter={(id) => setCounterFor(id)}
                onOpen={handleOpen}
              />
            ))}
          </div>
          {overflow > 0 && (
            <button
              type="button"
              onClick={() => nav('/home/activities')}
              className="block mt-2 text-xs font-bold text-brand-amber"
            >
              …y {overflow} más · Ver todas →
            </button>
          )}
        </>
      )}

      {waitingCount > 0 && (
        <button
          type="button"
          onClick={() => nav('/home/activities')}
          className="mt-3 w-full text-left rounded-lg border border-dashed border-brand-purple/40 bg-brand-purple/10 p-2 text-xs text-text-secondary"
        >
          ⏳ <strong>{waitingCount} solicitudes tuyas</strong> · Ver →
        </button>
      )}

      <CounterOfferSheet
        open={Boolean(counterFor && currentNeg)}
        currentPoints={currentPoints}
        onClose={() => setCounterFor(null)}
        onSubmit={({ pointsProposed, message }) => {
          if (!currentCounter || !currentNeg) return
          respond.mutate({
            negotiationId: currentNeg.id,
            eventId: currentCounter.id,
            payload: { responseType: 'counter_proposed', pointsProposed, message },
          })
          setCounterFor(null)
        }}
      />
    </div>
  )
}

function formatWhen(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}
