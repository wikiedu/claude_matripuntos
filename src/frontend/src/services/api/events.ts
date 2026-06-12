// Dominio eventos/actividades: CRUD + feed de actividad reciente.
import { http } from './http'

// Event endpoints
export const events = {
  create: (data: {
    type: string
    title?: string
    description?: string
    dateStart: string
    dateEnd: string
    hasChildren?: boolean
    numChildren?: number
    pointsBase: number
    compensation?: string
    compensationDiscount?: number
  }) =>
    http.request('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: (status?: string) => {
    const query = status ? `?status=${status}` : ''
    return http.request(`/events${query}`)
  },

  getById: (id: string) => http.request(`/events/${id}`),

  update: (id: string, data: Record<string, any>) =>
    http.request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    http.request(`/events/${id}`, { method: 'DELETE' }),
}

/**
 * Fetch the 5 most recent activities for the user's couple.
 * @returns {Promise<any>} The recent activity data
 * @throws {Error} If the request fails
 */
export const fetchRecentActivity = () =>
  http.request('/recent-activity')
