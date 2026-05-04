// v2.3.0 — Banner condicional de verificación (Claude Design canvas 15).
// Sustituye la inner tab "Verificar" que estaba vacía 80% del tiempo.
// Si no hay nada que verificar, ocupa 0px. Snooze 4h disponible.

import { useState, useMemo } from 'react'

const SNOOZE_KEY = 'mp.verify.snoozeUntil'
const SNOOZE_HOURS = 4

interface PendingLog {
  id: string
  taskId: string
  taskName: string
  pointsFinal: number | string
  completedBy: { id: string; name: string } | null
}

interface Props {
  pendingLogs: PendingLog[]
  onVerify: (log: PendingLog) => Promise<void> | void
  onViewAll?: () => void
}

export function VerifyBanner({ pendingLogs, onVerify, onViewAll }: Props) {
  const [busy, setBusy] = useState(false)

  const snoozedUntil = useMemo(() => {
    try {
      const v = Number(localStorage.getItem(SNOOZE_KEY) ?? '0')
      return Number.isFinite(v) ? v : 0
    } catch { return 0 }
  }, [])

  const isSnoozed = snoozedUntil > Date.now()
  if (pendingLogs.length === 0 || isSnoozed) return null

  const first = pendingLogs[0]
  const more = pendingLogs.length - 1
  const partner = first.completedBy?.name ?? 'Tu pareja'
  const pts = Number(first.pointsFinal) || 0

  const handleVerify = async () => {
    setBusy(true)
    try {
      await onVerify(first)
    } finally {
      setBusy(false)
    }
  }

  const handleSnooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_HOURS * 3600_000))
    } catch { /* ignore */ }
    // Force re-render via micro mutation; simpler: forzar reload del padre.
    window.dispatchEvent(new Event('mp:verify-snooze'))
  }

  return (
    <div
      className="mx-4 mb-3.5 p-3 rounded-2xl border grid grid-cols-[auto_1fr] items-start gap-2.5"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(168,85,247,0.05))',
        borderColor: 'rgba(245,158,11,0.35)',
      }}
      data-testid="verify-banner"
    >
      <div
        aria-hidden
        className="w-8 h-8 rounded-[9px] inline-flex items-center justify-center text-base flex-shrink-0"
        style={{ background: 'rgba(245,158,11,0.18)' }}
      >
        👀
      </div>
      <div className="text-[12px] text-text-secondary leading-snug">
        <span className="text-brand-amber font-bold">{partner}</span> ha completado{' '}
        <strong className="text-text-primary font-bold">{first.taskName}</strong>.
        <br />
        ¿Confirmas? Se acreditan <strong className="text-text-primary font-bold">+{pts} MP</strong> al verificar.
      </div>
      <div className="col-start-2 flex gap-1.5 mt-2">
        <button
          type="button"
          onClick={handleVerify}
          disabled={busy}
          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-success text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          {busy ? '…' : '✓ Verificar'}
        </button>
        <button
          type="button"
          onClick={handleSnooze}
          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-transparent text-text-secondary border border-brd-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        >
          Después
        </button>
      </div>

      {more > 0 && (
        <div className="col-span-2 mt-2 text-[11px] text-text-tertiary px-2 py-1.5 rounded-md border border-dashed"
          style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.25)' }}
        >
          <strong className="text-brand-purple font-bold">+{more} más</strong> esperando tu verificación
          {onViewAll && (
            <>
              {' · '}
              <button
                type="button"
                onClick={onViewAll}
                className="text-brand-purple font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
              >
                ver todas →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default VerifyBanner
