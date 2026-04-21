import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, Check, Trash2, Loader } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/v2/primitives/Button'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  relatedEventId?: string | null
  relatedTaskLogId?: string | null
}

function formatWhen(iso: string) {
  const dt = new Date(iso)
  if (isNaN(dt.getTime())) return ''
  const diffMs = Date.now() - dt.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days} d`
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function Notifications() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => apiClient.notifications.getAll({ limit: 50 }) as Promise<{
      notifications?: NotificationItem[]
      data?: NotificationItem[]
    }>,
    staleTime: 30_000,
  })

  const items: NotificationItem[] = data?.notifications ?? data?.data ?? []

  const markOne = useMutation({
    mutationFn: (id: string) => apiClient.notifications.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => apiClient.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => apiClient.notifications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const handleOpen = (n: NotificationItem) => {
    if (!n.isRead) markOne.mutate(n.id)
    if (n.relatedEventId) navigate('/inbox')
    else if (n.relatedTaskLogId) navigate('/inbox')
  }

  const unread = items.filter((n) => !n.isRead).length

  return (
    <main className="px-4 pt-3 pb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="w-4 h-4" /> Volver
        </button>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <Check className="w-4 h-4 mr-1" /> Marcar todas
          </Button>
        )}
      </div>

      <h1 className="text-xl font-extrabold text-text-primary mb-1 flex items-center gap-2">
        <Bell className="w-5 h-5" /> Notificaciones
      </h1>
      <p className="text-xs text-text-tertiary mb-4">
        {unread > 0 ? `${unread} sin leer` : 'Estás al día'}
      </p>

      {isLoading ? (
        <div className="flex justify-center py-10 text-text-tertiary">
          <Loader className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No tienes notificaciones todavía.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                n.isRead
                  ? 'bg-surface-card border-brd-subtle'
                  : 'bg-brand-purple/10 border-brand-purple/40'
              }`}
            >
              <button
                type="button"
                onClick={() => handleOpen(n)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-semibold text-sm truncate ${n.isRead ? 'text-text-primary' : 'text-brand-purple'}`}>
                    {n.title}
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0" />}
                </div>
                <p className="text-xs text-text-secondary line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-text-tertiary mt-1">{formatWhen(n.createdAt)}</p>
              </button>
              <button
                type="button"
                onClick={() => remove.mutate(n.id)}
                aria-label="Borrar notificación"
                className="p-1.5 rounded-md text-text-tertiary hover:text-danger hover:bg-danger/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
