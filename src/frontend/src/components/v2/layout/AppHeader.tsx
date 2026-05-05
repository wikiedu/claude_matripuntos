import { Bell, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar } from '../primitives/Avatar'

interface Props {
  userName: string
  userAvatarEmoji?: string
  userAvatarColor?: string
  userMood?: string | null
  partnerMood?: string | null
  partnerName?: string | null
  partnerLastSeenAt?: string | null
  unreadCount?: number
  onBell: () => void
  onMenu: () => void
  onAvatar?: () => void
}

// Presencia: umbral de 2 min para "en línea" (latido suficiente para el
// tamaño del uso). Más allá se muestra "hace X min/h".
const ONLINE_WINDOW_MS = 2 * 60 * 1000

function presenceLabel(iso: string | null | undefined): { label: string; online: boolean } | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return null
  if (diff < ONLINE_WINDOW_MS) return { label: 'en línea ahora', online: true }
  const min = Math.floor(diff / 60000)
  if (min < 60) return { label: `hace ${min} min`, online: false }
  const h = Math.floor(min / 60)
  if (h < 24) return { label: `hace ${h} h`, online: false }
  const d = Math.floor(h / 24)
  if (d < 7) return { label: `hace ${d} d`, online: false }
  return null
}

export function AppHeader({
  userName, userAvatarEmoji, userAvatarColor, userMood,
  partnerMood, partnerName, partnerLastSeenAt,
  unreadCount = 0, onBell, onMenu, onAvatar,
}: Props) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  // v2.5.3 audit 06 S1-11 — botón Refresh hacía invalidateQueries() sin
  // key → cascada >20 refetches simultáneos. Ahora invalidamos solo las
  // queries cuyo refresh aporta valor al user en el momento (datos del
  // dashboard, listas que ven, contadores). Las internas (analytics
  // aggregator, achievement maps cacheadas, daily phrase) se quedan
  // hasta su staleTime natural.
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['balance'] }),
        queryClient.invalidateQueries({ queryKey: ['recentActivity'] }),
        queryClient.invalidateQueries({ queryKey: ['activities'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['tasks', 'logs', 'all'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] }),
        queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] }),
      ])
      // Mínimo 400ms de spinner para que se note el feedback visual.
      await new Promise((r) => setTimeout(r, 400))
    } finally {
      setRefreshing(false)
    }
  }
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const emoji    = hour < 12 ? '☀️'          : hour < 20 ? '🌤️'           : '🌙'

  return (
    <header className="sticky top-0 z-40 bg-[rgba(15,10,30,0.95)] backdrop-blur-md border-b border-brd-subtle px-4 py-3 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-secondary m-0">{greeting} {emoji}</p>
        <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight m-0 mt-0.5">{userName.split(' ')[0]}</h1>
        {partnerName && (() => {
          // v2.2.11 (canvas 12 mínimo): mostrar SIEMPRE la presencia cuando
          // exista, combinada con el mood si lo hay. Antes el mood ocultaba
          // la presencia, ahora coexisten en la misma línea con dot.
          const p = presenceLabel(partnerLastSeenAt)
          if (!partnerMood && !p) return null
          return (
            <p className="text-[11px] text-text-secondary mt-0.5 m-0 flex items-center gap-1.5">
              {p && (
                <span
                  aria-hidden
                  className={`inline-block w-1.5 h-1.5 rounded-full ${p.online ? 'bg-success' : 'bg-text-tertiary'}`}
                  style={p.online ? { boxShadow: '0 0 6px var(--success)' } : {}}
                />
              )}
              <span>
                {partnerName}
                {partnerMood ? ` está ${partnerMood} hoy` : ''}
                {p && (partnerMood ? ` · ${p.label}` : ` · ${p.label}`)}
              </span>
            </p>
          )
        })()}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="Refrescar datos"
          title="Refrescar datos"
          className="w-9 h-9 rounded-md bg-surface-muted border border-brd-purple flex items-center justify-center text-text-primary disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onBell}
          aria-label="Notificaciones"
          className="relative w-9 h-9 rounded-md bg-surface-muted border border-brd-purple flex items-center justify-center text-text-primary"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} notificaciones sin leer`}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold leading-none flex items-center justify-center border-[1.5px] border-bg-page"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={onMenu}
          aria-label="Más"
          className="w-9 h-9 rounded-md bg-surface-muted border border-brd-purple text-text-primary font-bold tracking-widest flex items-center justify-center"
        >⋯</button>
        <button onClick={onAvatar} aria-label="Mi perfil">
          <Avatar emoji={userAvatarEmoji ?? '🐼'} color={userAvatarColor ?? '#7c3aed'} mood={userMood} size="lg" />
        </button>
      </div>
    </header>
  )
}
