// src/frontend/src/pages/Activities.tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { useActivities, ActivityEvent } from '../hooks/useActivities'
import { useInvalidateActivity } from '../hooks/useInvalidateActivity'
import { ActivityActionCard } from '../components/v2/activities/ActivityActionCard'
import { ActivityWaitingCard } from '../components/v2/activities/ActivityWaitingCard'
import { HistoryFilters, HistoryFilterValues } from '../components/v2/activities/HistoryFilters'
import { Pill } from '../components/v2/primitives/Pill'
import { ActivityCatalogManager } from '../components/v2/catalog/ActivityCatalogManager'
import { Plus } from 'lucide-react'
import { MPTabs } from '../components/v2/tasks/MPTabs'
import { AddActivitySheet } from '../components/v2/activities/AddActivitySheet'

type Tab = 'active' | 'history' | 'catalog'

export default function Activities() {
  const nav = useNavigate()
  const { user, couple } = useAppStore()
  const { pending, waiting, history, isLoading } = useActivities()
  const invalidate = useInvalidateActivity()

  const [tab, setTab] = useState<Tab>('active')
  const [filters, setFilters] = useState<HistoryFilterValues>({ status: 'all', who: 'all', range: 'month' })
  const [showAddSheet, setShowAddSheet] = useState(false)

  const partnerName = couple?.users?.find((u) => u.id !== user?.id)?.name ?? 'Tu pareja'

  const respondMut = useMutation({
    mutationFn: ({ negotiationId, responseType }: { negotiationId: string; eventId: string; responseType: 'accepted' | 'rejected' }) =>
      apiClient.negotiations.respond(negotiationId, { responseType }),
    onSuccess: (_, vars) => invalidate(vars.eventId),
    onError: (err) => {
      const msg = err instanceof Error && err.message
        ? err.message
        : 'No se pudo completar la acción. Inténtalo de nuevo.'
      window.alert(msg)
      invalidate()
    },
  })

  function handleAccept(eventId: string) {
    const ev = pending.find((e) => e.id === eventId)
    const lastNeg = ev?.negotiations?.[0]
    if (!lastNeg) return
    respondMut.mutate({ negotiationId: lastNeg.id, eventId, responseType: 'accepted' })
  }
  function handleReject(eventId: string) {
    const ev = pending.find((e) => e.id === eventId)
    const lastNeg = ev?.negotiations?.[0]
    if (!lastNeg) return
    respondMut.mutate({ negotiationId: lastNeg.id, eventId, responseType: 'rejected' })
  }
  function handleCounter(eventId: string) {
    nav(`/home/activities/${eventId}`)
  }
  function handleOpen(eventId: string) {
    nav(`/home/activities/${eventId}`)
  }

  const filteredHistory = useMemo(() => filterHistory(history, filters, user?.id ?? ''), [history, filters, user])

  return (
    <main className="pb-4 pt-1">
      {/* v2.3.0 — Refactor canvas 15: top tabs +MP/-MP simétricos con Tareas. */}
      <MPTabs active="activities" />
      <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between">
        <h1 className="m-0 text-[22px] font-black tracking-tight text-text-primary">Actividades</h1>
        {tab !== 'catalog' && (
          <button
            type="button"
            onClick={() => setShowAddSheet(true)}
            className="text-[11px] font-bold text-white bg-gradient-to-br from-brand-purple to-[#7c3aed] rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple shadow-[0_6px_14px_rgba(168,85,247,0.30)]"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva actividad
          </button>
        )}
      </div>
      {/* Segment Activas / Historial / Catálogo según handoff: simétrico al
          HeaderStrip de Tareas pero adaptado al modelo de actividades. */}
      <div className="px-4 pb-3">
        <div className="flex gap-0 p-0.5 rounded-[10px] bg-surface-card/80 border border-brd-subtle">
          {([
            { v: 'active' as const,  label: `Activas${pending.length + waiting.length > 0 ? ` · ${pending.length + waiting.length}` : ''}` },
            { v: 'history' as const, label: 'Historial' },
            { v: 'catalog' as const, label: 'Catálogo' },
          ]).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setTab(opt.v)}
              className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${
                tab === opt.v ? 'bg-brand-purple/20 text-text-primary' : 'text-text-tertiary'
              }`}
              aria-pressed={tab === opt.v}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'active' && (
        <ActiveView
          isLoading={isLoading}
          pending={pending}
          waiting={waiting}
          partnerName={partnerName}
          meId={user?.id ?? ''}
          busy={respondMut.isPending}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
          onOpen={handleOpen}
        />
      )}

      {tab === 'history' && (
        <HistoryView
          isLoading={isLoading}
          history={filteredHistory}
          hasAnyHistory={history.length > 0}
          partnerName={partnerName}
          filters={filters}
          setFilters={setFilters}
          onOpen={handleOpen}
        />
      )}

      {tab === 'catalog' && (
        <div className="mx-4">
          <ActivityCatalogManager />
        </div>
      )}

      <AddActivitySheet open={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </main>
  )
}

// v2.3.0 — TabBtn legacy retirado; ahora usamos el segment inline del HeaderStrip pattern.

function toVM(ev: ActivityEvent): {
  id: string; title: string; whenLabel: string; pointsCalculated: number; round: number
} {
  const points = Number(ev.pointsAgreed ?? ev.pointsCalculated ?? ev.pointsBase ?? 0)
  const d = new Date(ev.dateStart)
  const whenLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  return {
    id: ev.id,
    title: ev.title ?? labelFromType(ev.type),
    whenLabel,
    pointsCalculated: Math.round(points),
    round: ev.negotiationRound ?? 1,
  }
}

function labelFromType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function ActiveView({
  isLoading, pending, waiting, partnerName, meId: _meId, busy,
  onAccept, onReject, onCounter, onOpen,
}: {
  isLoading: boolean
  pending: ActivityEvent[]
  waiting: ActivityEvent[]
  partnerName: string
  meId: string
  busy: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onCounter: (id: string) => void
  onOpen: (id: string) => void
}) {
  if (isLoading) return <p className="text-center text-text-secondary py-6">Cargando…</p>
  if (pending.length === 0 && waiting.length === 0) {
    return (
      <div className="mx-4 text-center py-8">
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-sm text-text-primary font-bold">Sin actividades activas.</div>
        <div className="text-[11px] text-text-secondary mt-1">Crea una con +.</div>
      </div>
    )
  }
  return (
    <>
      {pending.length > 0 && (
        <section>
          <h3 className="mx-4 mt-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Requieren tu respuesta ({pending.length})
          </h3>
          <div className="mx-4 flex flex-col gap-2">
            {pending.map((ev) => {
              const vm = toVM(ev)
              return (
                <ActivityActionCard
                  key={ev.id}
                  activity={{ ...vm, creatorName: ev.creator?.name ?? 'Tu pareja' }}
                  busy={busy}
                  onAccept={onAccept}
                  onReject={onReject}
                  onCounter={onCounter}
                  onOpen={onOpen}
                />
              )
            })}
          </div>
        </section>
      )}
      {waiting.length > 0 && (
        <section>
          <h3 className="mx-4 mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Tus solicitudes esperando ({waiting.length})
          </h3>
          <div className="mx-4 flex flex-col gap-2">
            {waiting.map((ev) => {
              const vm = toVM(ev)
              return (
                <ActivityWaitingCard
                  key={ev.id}
                  activity={{ ...vm, partnerName }}
                  onOpen={onOpen}
                />
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

function HistoryView({
  isLoading, history, hasAnyHistory, partnerName, filters, setFilters, onOpen,
}: {
  isLoading: boolean
  history: ActivityEvent[]
  hasAnyHistory: boolean
  partnerName: string
  filters: HistoryFilterValues
  setFilters: (v: HistoryFilterValues) => void
  onOpen: (id: string) => void
}) {
  if (isLoading) return <p className="text-center text-text-secondary py-6">Cargando…</p>
  return (
    <>
      <HistoryFilters partnerName={partnerName} value={filters} onChange={setFilters} />
      {history.length === 0 && (
        <div className="mx-4 text-center py-8 text-text-secondary text-xs">
          {hasAnyHistory
            ? 'Sin resultados con estos filtros.'
            : '📋 Aún no has cerrado ninguna actividad.'}
        </div>
      )}
      <div className="mx-4 flex flex-col gap-2">
        {history.map((ev) => {
          const vm = toVM(ev)
          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => onOpen(ev.id)}
              className="w-full text-left bg-transparent border-0 p-0 block"
            >
              <div className="bg-surface-elevated border border-brd-subtle rounded-lg p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Pill tone={statusTone(ev.status)}>{statusLabel(ev.status)}</Pill>
                    <span className="text-sm font-bold text-text-primary truncate">{vm.title}</span>
                  </div>
                  <div className="text-[11px] text-text-secondary mt-1">
                    {ev.creator?.name ?? '—'} · {vm.whenLabel}{ev.negotiationRound > 1 ? ` · ronda ${ev.negotiationRound}` : ''}
                  </div>
                </div>
                <span className="text-sm font-bold text-danger tabular-nums">−{vm.pointsCalculated} MP</span>
              </div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function statusLabel(s: string): string {
  return s === 'accepted' ? 'Aprobada' : s === 'rejected' ? 'Rechazada' : s === 'forced' ? 'Forzada' : s
}

// History only contains accepted/rejected/forced (enforced by useActivities derivation).
// Return only tones that Pill supports: success | danger | purple.
function statusTone(s: string): 'success' | 'danger' | 'purple' {
  return s === 'rejected' ? 'danger' : s === 'forced' ? 'purple' : 'success'
}

function filterHistory(
  history: ActivityEvent[],
  f: HistoryFilterValues,
  meId: string,
): ActivityEvent[] {
  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const MONTH = 30 * 24 * 60 * 60 * 1000
  return history.filter((e) => {
    if (f.status !== 'all' && e.status !== f.status) return false
    if (f.who === 'me' && e.createdBy !== meId) return false
    if (f.who === 'partner' && e.createdBy === meId) return false
    if (f.range !== 'all') {
      const ts = new Date(e.dateStart).getTime()
      const limit = f.range === 'week' ? WEEK : MONTH
      if (now - ts > limit) return false
    }
    return true
  })
}
