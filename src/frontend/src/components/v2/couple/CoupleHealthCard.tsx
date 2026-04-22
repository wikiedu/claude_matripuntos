// Small at-a-glance panel for the Settings → Pareja section. Shows the
// balance net, recent activity counts, and join-code summary in one card.
// Intentionally read-only — the deeper analytics live in /analytics.

import { useEffect, useState } from 'react'
import { Activity, Scale, Copy, CheckCircle } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { Card } from '../primitives/Card'
import { Pill } from '../primitives/Pill'

interface Props {
  userId?: string
  partnerId?: string
  joinCode?: string | null
}

interface BalanceResponse {
  user1?: { id?: string; name: string; balance: number }
  user2?: { id?: string; name: string; balance: number }
  net?: number
}

interface HistoryItem {
  id: string
  userId: string | null
  amount: number
  type: string
  createdAt: string
}

export function CoupleHealthCard({ userId, partnerId, joinCode }: Props) {
  const [balance, setBalance] = useState<BalanceResponse | null>(null)
  const [recent, setRecent] = useState<HistoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [b, h]: any = await Promise.all([
          apiClient.points.getBalance(),
          apiClient.points.getHistory({ limit: 50 }),
        ])
        if (cancelled) return
        setBalance(b ?? null)
        setRecent(h?.transactions ?? h?.history ?? [])
      } catch {
        if (!cancelled) {
          setBalance(null)
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent7 = (recent ?? []).filter(
    (t) => new Date(t.createdAt).getTime() >= sevenDaysAgo,
  )
  const myCount = userId ? recent7.filter((t) => t.userId === userId).length : 0
  const partnerCount = partnerId
    ? recent7.filter((t) => t.userId === partnerId).length
    : 0

  const lastMine = userId
    ? (recent ?? []).find((t) => t.userId === userId)?.createdAt ?? null
    : null
  const lastPartner = partnerId
    ? (recent ?? []).find((t) => t.userId === partnerId)?.createdAt ?? null
    : null

  const fmtRelative = (iso: string | null) => {
    if (!iso) return 'sin actividad'
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'justo ahora'
    if (diffMin < 60) return `hace ${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `hace ${diffH} h`
    const diffD = Math.floor(diffH / 24)
    return `hace ${diffD} d`
  }

  const net = balance?.net ?? 0
  const netLabel =
    net > 0 ? `+${net} a tu favor` : net < 0 ? `${net} (debes)` : 'Equilibrado'
  const netTone: 'success' | 'warn' | 'purple' =
    net > 0 ? 'success' : net < 0 ? 'warn' : 'purple'

  async function copyCode() {
    if (!joinCode) return
    try {
      await navigator.clipboard?.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* silenciar: el usuario puede copiar manualmente */
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
          Salud de la pareja
        </p>
        {loading && (
          <span className="text-[10px] text-text-tertiary">cargando…</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-surface-muted border border-brd-subtle p-3">
          <div className="flex items-center gap-1 text-[11px] text-text-tertiary uppercase tracking-wide mb-1">
            <Scale className="w-3 h-3" /> Balance
          </div>
          <Pill tone={netTone}>{netLabel}</Pill>
          <div className="mt-1 text-[11px] text-text-tertiary">
            {balance?.user1?.name}: {balance?.user1?.balance ?? 0} ·{' '}
            {balance?.user2?.name}: {balance?.user2?.balance ?? 0}
          </div>
        </div>

        <div className="rounded-md bg-surface-muted border border-brd-subtle p-3">
          <div className="flex items-center gap-1 text-[11px] text-text-tertiary uppercase tracking-wide mb-1">
            <Activity className="w-3 h-3" /> Últimos 7 días
          </div>
          <p className="text-sm font-bold text-text-primary">
            {myCount + partnerCount} movimientos
          </p>
          <p className="text-[11px] text-text-tertiary">
            Tú {myCount} · pareja {partnerCount}
          </p>
        </div>
      </div>

      <div className="rounded-md bg-surface-muted border border-brd-subtle p-3 space-y-1.5">
        <p className="text-[11px] text-text-tertiary uppercase tracking-wide">
          Última actividad
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{balance?.user1?.name ?? 'Tú'}</span>
          <span className="text-text-primary font-semibold">{fmtRelative(lastMine)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{balance?.user2?.name ?? 'Pareja'}</span>
          <span className="text-text-primary font-semibold">{fmtRelative(lastPartner)}</span>
        </div>
      </div>

      {joinCode && (
        <div className="rounded-md bg-surface-muted border border-brd-subtle p-3">
          <p className="text-[11px] text-text-tertiary uppercase tracking-wide mb-1">
            Código de pareja
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono tracking-[0.3em] text-sm font-bold text-text-primary flex-1">
              {joinCode}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="text-text-primary hover:text-brand-purple"
              aria-label="Copiar código"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
