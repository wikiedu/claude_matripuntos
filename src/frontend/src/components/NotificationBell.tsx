import { useState, useEffect } from 'react'
import { Bell, X, Eye } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch notifications
  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.notifications.getAll({ limit: 5 })
      setNotifications(response.notifications || [])
      setUnreadCount(response.unreadCount || 0)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.notifications.markAsRead(id)
      setNotifications(
        notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        )
      )
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.notifications.delete(id)
      setNotifications(notifications.filter(n => n.id !== id))
      if (!notifications.find(n => n.id === id)?.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'EVENT_PROPOSED':
      case 'EVENT_RESPONSE':
        return 'border-blue-200 bg-blue-50'
      case 'TASK_COMPLETED':
        return 'border-green-200 bg-green-50'
      case 'TASK_DISPUTED':
        return 'border-red-200 bg-red-50'
      case 'CONFIGURATION_CHANGED':
        return 'border-yellow-200 bg-yellow-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="relative">
      {/* Bell icon button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell size={20} className="text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notificaciones</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} cursor-pointer hover:bg-opacity-75 transition-all`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-800">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(notification.createdAt).toLocaleDateString('es-ES', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-100 rounded"
                            title="Mark as read"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(notification.id)
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-200 p-3 bg-gray-50 text-center">
              <a
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas las notificaciones →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
