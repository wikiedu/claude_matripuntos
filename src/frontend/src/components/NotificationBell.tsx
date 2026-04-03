import { useState, useEffect } from 'react'
import { Bell, X, Eye, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../services/apiClient'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  relatedId?: string
  relatedType?: string
  createdAt: string
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.notifications.getAll({ limit: 20 })
      setNotifications(response.notifications || [])
      setUnreadCount(response.unreadCount || 0)
    } catch (error) {
      // Silently fail
    }
  }

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await apiClient.notifications.markAsRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* noop */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await apiClient.notifications.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* noop */ }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await apiClient.notifications.delete(id)
      const n = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (n && !n.isRead) setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* noop */ }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) handleMarkAsRead(notification.id)
    setIsOpen(false)

    const t = notification.type
    // Activity-related → inbox (activities tab)
    if (t === 'EVENT_PROPOSED' || t === 'event_proposed') {
      navigate('/inbox')
    } else if (t === 'EVENT_RESPONSE' || t === 'event_responded' || t === 'event_accepted' || t === 'event_rejected') {
      navigate('/inbox')
    // Task completed by partner → inbox (tasks tab for verification)
    } else if (t === 'TASK_COMPLETED' || t === 'task_completed') {
      navigate('/inbox')
    // Task disputed → tasks page to view history
    } else if (t === 'TASK_DISPUTED' || t === 'task_disputed') {
      navigate('/tasks')
    // Reset requests → settings
    } else if (t === 'reset_request' || t === 'reset_request_sent' || t === 'reset_completed') {
      navigate('/settings')
    } else {
      navigate('/inbox')
    }
  }

  const getTypeColor = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('event_proposed') || t === 'event_proposed') return 'border-l-4 border-blue-400 bg-blue-50'
    if (t.includes('event_response') || t.includes('event_accepted') || t.includes('event_rejected')) return 'border-l-4 border-green-400 bg-green-50'
    if (t.includes('task_completed')) return 'border-l-4 border-purple-400 bg-purple-50'
    if (t.includes('task_disputed')) return 'border-l-4 border-red-400 bg-red-50'
    if (t.includes('reset')) return 'border-l-4 border-orange-400 bg-orange-50'
    return 'border-l-4 border-gray-300 bg-gray-50'
  }

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('event_proposed')) return '📨'
    if (t.includes('event_response') || t.includes('event_accepted')) return '✅'
    if (t.includes('event_rejected')) return '❌'
    if (t.includes('task_completed')) return '🏠'
    if (t.includes('task_disputed')) return '⚠️'
    if (t.includes('reset')) return '🔄'
    return '🔔'
  }

  const visibleNotifications = showAll ? notifications : notifications.slice(0, 5)

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); setShowAll(false) }}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-84 bg-white rounded-xl shadow-xl border border-gray-200 z-50" style={{ width: '340px' }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck size={14} />
                    Todo leído
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Bell size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sin notificaciones</p>
                </div>
              ) : (
                <div>
                  {visibleNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 cursor-pointer hover:bg-opacity-80 transition-all ${getTypeColor(n.type)} ${!n.isRead ? 'opacity-100' : 'opacity-60'}`}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg flex-shrink-0 mt-0.5">{getTypeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                              {n.title}
                            </p>
                            <div className="flex gap-1 flex-shrink-0 mt-0.5">
                              {!n.isRead && (
                                <button
                                  onClick={e => handleMarkAsRead(n.id, e)}
                                  className="text-blue-500 hover:text-blue-700 p-0.5 hover:bg-blue-100 rounded"
                                  title="Marcar como leída"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                              <button
                                onClick={e => handleDelete(n.id, e)}
                                className="text-gray-300 hover:text-red-500 p-0.5 hover:bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 5 && (
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAll ? '▲ Ver menos' : `▼ Ver todas (${notifications.length})`}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
