// v2.0.4 — Panel de propuestas de configuración consensuada.
// Muestra propuestas activas del partner para aceptar/rechazar y propias para
// cancelar. Las propuestas accept→aplican el cambio + se logean.

import { useState } from 'react'
import {
  useActiveProposals,
  useAcceptProposal,
  useRejectProposal,
  useCancelProposal,
  type ConfigProposal,
} from '../../../hooks/useConfigProposals'
import { useAppStore } from '../../../store/useAppStore'

const FIELD_LABELS: Record<string, string> = {
  'multipliersConfig.children.1':  'Multiplicador 1 hijo',
  'multipliersConfig.children.2':  'Multiplicador 2 hijos',
  'multipliersConfig.children.3+': 'Multiplicador 3+ hijos',
  'multipliersConfig.time.morning':  'Bono mañana (07:00-09:30)',
  'multipliersConfig.time.evening':  'Bono tarde (17:30-21:30)',
  'multipliersConfig.time.night':    'Bono noche (21:30-01:00)',
  'multipliersConfig.time.dawn':     'Bono madrugada (01:00-07:00)',
  'multipliersConfig.duration.long': 'Bono evento largo (24h+)',
  'multipliersConfig.impact.high':   'Multiplicador alto impacto',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

function ProposalCard({ p }: { p: ConfigProposal }) {
  const me = useAppStore((s) => s.user)
  const isMine = p.proposedById === me?.id

  const accept = useAcceptProposal()
  const reject = useRejectProposal()
  const cancel = useCancelProposal()

  const [error, setError] = useState<string | null>(null)

  const handle = async (fn: () => Promise<unknown>) => {
    setError(null)
    try {
      await fn()
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado')
    }
  }

  // v2.6.2 audit 06 S1-13 — repintado con tokens dark del v2 design system.
  // Antes: bg-white, text-gray-*, bg-blue-* (light-mode). Ahora: surface-card,
  // text-text-*, brand-* — coherente con el resto de la app.
  return (
    <article className="rounded-xl p-4 bg-surface-card border border-brd-subtle space-y-2">
      <header className="flex items-center justify-between">
        <h3 className="font-medium text-text-primary">{fieldLabel(p.field)}</h3>
        <span className="text-xs text-text-tertiary">
          {isMine ? 'Tu propuesta' : `Propuesta de ${p.proposedBy?.name ?? '...'}`}
        </span>
      </header>

      <div className="text-sm flex items-center gap-2 text-text-secondary">
        <span className="line-through text-text-tertiary">{p.oldValue}</span>
        <span aria-hidden>→</span>
        <span className="font-semibold text-brand-amber">{p.newValue}</span>
      </div>

      {p.rationale && (
        <p className="text-sm text-text-secondary italic">"{p.rationale}"</p>
      )}

      <p className="text-xs text-text-tertiary">
        Expira: {new Date(p.expiresAt).toLocaleDateString()}
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2 pt-2">
        {isMine ? (
          <button
            type="button"
            onClick={() => handle(() => cancel.mutateAsync(p.id))}
            className="px-3 py-1.5 rounded-lg border border-brd-subtle bg-surface-muted text-text-primary text-sm hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
            disabled={cancel.isPending}
          >
            Cancelar
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handle(() => accept.mutateAsync(p.id))}
              className="px-3 py-1.5 rounded-lg bg-brand-amber text-bg-page text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:opacity-50"
              disabled={accept.isPending}
            >
              Aceptar
            </button>
            <button
              type="button"
              onClick={() => handle(() => reject.mutateAsync(p.id))}
              className="px-3 py-1.5 rounded-lg border border-brd-subtle bg-surface-muted text-text-primary text-sm hover:bg-surface-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
              disabled={reject.isPending}
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </article>
  )
}

export function ProposalsPanel() {
  const { data, isLoading } = useActiveProposals()
  const proposals = data?.proposals ?? []

  if (isLoading) return <p className="text-sm text-text-secondary">Cargando propuestas...</p>
  if (proposals.length === 0) {
    return (
      <p className="text-sm text-text-secondary italic">
        No hay propuestas pendientes. Cuando tu pareja proponga un cambio aparecerá aquí.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <ProposalCard key={p.id} p={p} />
      ))}
    </div>
  )
}

export default ProposalsPanel
