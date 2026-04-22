import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, Check, Trash2, Loader, Calendar, ListChecks, Users, Inbox } from 'lucide-react'
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

type Branch = 'events' | 'tasks' | 'couple' | 'other'

// Branch routing: un único sitio donde mapeamos tipos del backend a
// categorías de UI. Si aparece un tipo desconocido cae en 'other' para
// que nunca se pierda una notificación.
function branchOf(n: NotificationItem): Branch {
  const t = (n.type || '').toLowerCase()
  if (t.includes('event') || t.includes('negotiation') || n.relatedEventId) return 'events'
  if (t.includes('task') || t.includes('todo') || n.relatedTaskLogId) return 'tasks'
  if (
    t.includes('partner') ||
    t.includes('couple') ||
    t.includes('link') ||
    t.includes('invit') ||
    t.includes('children') ||
    t.includes('reset')
  )
    return 'couple'
  return 'other'
}

const BRANCH_META: Record<Branch, { label: string; icon: typeof Bell; tone: string }> = {
  events: { label: 'Eventos', icon: Calendar, tone: 'text-brand-purple' },
  tasks: { label: 'Tareas', icon: ListChecks, tone: 'text-success' },
  couple: { label: 'Pareja', icon: Users, tone: 'text-warn' },
  other: { label: 'Otras', icon: Inbox, tone: 'text-text-secondary' },
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
  const [filter, setFilter] = useState<'all' | Branch>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => apiClient.notifications.getAll({ limit: 50 }) as Promise<{
      notifications?: NotificationItem[]
      data?: NotificationItem[]
    }>,
    staleTime: 30_000,
  })

  const items: NotificationItem[] = data?.notifications ?? data?.data ?? []

  const counts = useMemo(() => {
    const c: Record<Branch, number> = { events: 0, tasks: 0, couple: 0, other: 0 }
    for (const n of items) c[branchOf(n)]++
    return c
  }, [items])

  const visibleItems = filter === 'all' ? items : items.filter((n) => branchOf(n) === filter)

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
    const branch = branchOf(n)
    if (branch === 'events') navigate('/inbox')
    else if (branch === 'tasks') navigate(n.relatedTaskLogId ? '/inbox' : '/tasks')
    else if (branch === 'couple') navigate('/settings/couple')
    // 'other' — nos quedamos en la página de notificaciones
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
      <p className="text-xs text-text-tertiary mb-3">
        {unread > 0 ? `${unread} sin leer` : 'Estás al día'}
      </p>

      {items.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {([
            { id: 'all' as const, label: 'Todas', count: items.length },
            { id: 'events' as const, label: BRANCH_META.events.label, count: counts.events },
            { id: 'tasks' as const, label: BRANCH_META.tasks.label, count: counts.tasks },
            { id: 'couple' as const, label: BRANCH_META.couple.label, count: counts.couple },
            { id: 'other' as const, label: BRANCH_META.other.label, count: counts.other },
          ])
            .filter((t) => t.id === 'all' || t.count > 0)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilter(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition ${
                  filter === t.id
                    ? 'bg-brand-purple text-white border-brand-purple'
                    : 'bg-surface-card text-text-secondary border-brd-subtle hover:border-brd-purple'
                }`}
              >
                {t.label}
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                  filter === t.id ? 'bg-white/25 text-white' : 'bg-surface-muted text-text-tertiary'
                }`}>
                  {t.count}
                </span>
              </button>
            ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10 text-text-tertiary">
          <Loader className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-sm">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No tienes notificaciones todavía.
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="text-center py-10 text-text-tertiary text-sm">
          Ninguna notificación en esta categoría.
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((n) => {
            const b = branchOf(n)
            const meta = BRANCH_META[b]
            const Icon = meta.icon
            return (
              <li
                key={n.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                  n.isRead
                    ? 'bg-surface-card border-brd-subtle'
                    : 'bg-brand-purple/10 border-brand-purple/40'
                }`}
              >
                <div className={`mt-0.5 w-7 h-7 rounded-md bg-surface-muted border border-brd-subtle flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
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
            )
          })}
        </ul>
      )}
    </main>
  )
}
