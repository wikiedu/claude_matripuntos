import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '../primitives/Avatar'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'

type WhoFilter   = 'all' | 'me' | 'partner'
type RangeFilter = 'week' | 'month' | 'all'

// Map a couple's two users → id→display metadata so we can render avatars/names
// without asking the backend to JOIN on the user record for every transaction.
interface UserMeta { name: string; avatarEmoji?: string; avatarColor?: string }

const CAT_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', baños: '🛁', compra: '🛒', logistica: '📋',
  cuidado: '👶', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾',
}

const TYPE_LABEL: Record<string, string> = {
  event_accepted: 'Actividad aceptada',
  task_completed: 'Tarea completada',
  donation: 'Donación',
  forced_payment: 'Pago forzado',
  event_rejected: 'Actividad rechazada',
}

function actionFor(tx: any): string {
  if (tx.event?.title) return tx.event.title
  if (tx.event?.type) return `Actividad · ${tx.event.type}`
  if (tx.taskLog?.taskName) {
    const emoji = CAT_EMOJI[(tx.taskLog.category ?? '').toLowerCase()] ?? ''
    return `${emoji ? `${emoji} ` : ''}${tx.taskLog.taskName}`.trim()
  }
  if (tx.description) return tx.description
  return TYPE_LABEL[tx.type] ?? tx.type ?? 'Movimiento'
}

// Group entries by the day they occurred. "Hoy / Ayer / <fecha larga>" is friendlier
// than raw timestamps and lets MovementsTab render per-day sections.
function dayLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Otros'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return 'Hoy'
  const yday = new Date(now)
  yday.setDate(now.getDate() - 1)
  if (d.toDateString() === yday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function MovementsTab() {
  const [who,   setWho]   = useState<WhoFilter>('all')
  const [range, setRange] = useState<RangeFilter>('week')

  const user = useAppStore(s => s.user)
  const couple = useAppStore(s => s.couple)
  const partner = (couple?.users ?? []).find(u => u.id !== user?.id)

  const userMeta = useMemo(() => {
    const map = new Map<string, UserMeta>()
    for (const u of (couple?.users ?? [])) {
      map.set(u.id, { name: u.name, avatarEmoji: u.avatarEmoji, avatarColor: u.avatarColor })
    }
    return map
  }, [couple])

  // Backend /points/history speaks startDate/endDate + userId — translate
  // the user-facing who/range controls into those params.
  const targetUserId = who === 'me' ? user?.id : who === 'partner' ? partner?.id : undefined
  const startDate = useMemo(() => {
    if (range === 'all') return undefined
    const d = new Date()
    d.setDate(d.getDate() - (range === 'week' ? 7 : 30))
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [range])

  const { data, isLoading } = useQuery({
    queryKey: ['movements', who, range, user?.id],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (startDate) params.set('endDate', new Date().toISOString())
      if (targetUserId) params.set('userId', targetUserId)
      params.set('limit', '100')
      const r = await apiClient.request(`/points/history?${params.toString()}`)
      return r as { transactions?: any[] }
    },
    enabled: !!user?.id && !!couple?.id,
  })

  const movements = (data?.transactions ?? []).map(tx => {
    const meta = tx.userId ? userMeta.get(tx.userId) : undefined
    return {
      id: tx.id,
      userId: tx.userId,
      userName: meta?.name ?? tx.user?.name ?? 'Pareja',
      userAvatarEmoji: meta?.avatarEmoji,
      userAvatarColor: meta?.avatarColor,
      action: actionFor(tx),
      delta: Number(tx.amount ?? 0),
      dateLabel: dayLabel(tx.createdAt),
    }
  })

  const groups: Record<string, typeof movements> = {}
  movements.forEach(m => {
    const key = m.dateLabel ?? 'Otros'
    ;(groups[key] ??= []).push(m)
  })

  return (
    <>
      <div className="mx-4 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all','me','partner'] as WhoFilter[]).map(w => (
          <button key={w} onClick={() => setWho(w)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${who === w ? 'bg-brand-purple text-white' : 'bg-surface-card text-text-secondary border border-brd-subtle'}`}>
            {w === 'all' ? 'Todos' : w === 'me' ? 'Tú' : 'Pareja'}
          </button>
        ))}
        {(['week','month','all'] as RangeFilter[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ml-auto ${range === r ? 'bg-brand-amber text-white' : 'bg-surface-card text-text-secondary border border-brd-subtle'}`}>
            {r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Todo'}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="mx-4 mt-8 text-center text-text-secondary text-sm">Cargando historial…</div>
      )}

      {!isLoading && Object.keys(groups).length === 0 && (
        <div className="mx-4 mt-8 text-center text-text-secondary text-sm">Sin movimientos en este rango</div>
      )}

      {Object.entries(groups).map(([day, items]) => (
        <div key={day} className="mx-4 mb-4">
          <div className="text-[11px] font-bold text-text-secondary uppercase mb-1.5">{day}</div>
          <div className="rounded-md bg-[rgba(26,16,53,0.3)] overflow-hidden">
            {items.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? 'border-t border-brd-subtle' : ''}`}>
                <Avatar emoji={m.userAvatarEmoji} color={m.userAvatarColor} size="sm" />
                <div className="flex-1 text-xs min-w-0">
                  <span className="text-text-primary font-semibold">{m.userName}</span>
                  <span className="text-text-secondary"> · {m.action}</span>
                </div>
                <span className={`text-xs font-bold tabular-nums ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                  {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)} MP
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
