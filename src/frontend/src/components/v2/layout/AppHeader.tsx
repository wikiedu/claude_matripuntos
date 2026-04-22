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
  unreadCount?: number
  onBell: () => void
  onMenu: () => void
  onAvatar?: () => void
}

export function AppHeader({
  userName, userAvatarEmoji, userAvatarColor, userMood,
  partnerMood, partnerName, unreadCount = 0, onBell, onMenu, onAvatar,
}: Props) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries()
      // Mínimo 400ms de spinner para que se note el feedback visual
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
        {partnerMood && partnerName && (
          <p className="text-[11px] text-text-secondary mt-0.5 m-0">{partnerName} está {partnerMood} hoy</p>
        )}
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
