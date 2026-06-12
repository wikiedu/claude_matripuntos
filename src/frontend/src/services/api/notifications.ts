// Dominio notificaciones: centro de notificaciones in-app.
import { http } from './http'

// Notification endpoints
export const notifications = {
  getAll: (filters?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  }) => {
    const params = new URLSearchParams()
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())
    if (filters?.unreadOnly) params.append('unreadOnly', 'true')

    const query = params.toString() ? `?${params.toString()}` : ''
    return http.request(`/notifications${query}`)
  },

  getUnreadCount: () => http.request('/notifications/unread-count'),

  markAsRead: (id: string) =>
    http.request(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    http.request('/notifications/read-all', {
      method: 'PUT',
    }),

  delete: (id: string) =>
    http.request(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  deleteAll: () =>
    http.request('/notifications', {
      method: 'DELETE',
    }),
}
