// Dominio puntos: saldo/historial/stats (V1) + cálculo y recálculo (V2).
import { http } from './http'

// Points endpoints
export const points = {
  getHistory: (filters?: {
    startDate?: string
    endDate?: string
    type?: string
    userId?: string
    limit?: number
    offset?: number
  }) => {
    const params = new URLSearchParams()
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.userId) params.append('userId', filters.userId)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return http.request(`/points/history${query}`)
  },

  getChartData: (days = 30) => http.request(`/points/chart-data?days=${days}`),

  getBalance: () => http.request('/points/balance'),

  getStats: () => http.request('/points/stats'),

  getTransaction: (id: string) => http.request(`/points/transactions/${id}`),

  requestReset: () =>
    http.request('/points/reset-request', { method: 'POST' }),

  confirmReset: () =>
    http.request('/points/reset-confirm', { method: 'POST' }),
}

// Points V2 endpoints
export const pointsV2 = {
  calculateBreakdown: (eventId: string) =>
    http.request('/points/calculate', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    }),

  recalculate: (eventId: string) =>
    http.request(`/points/recalculate/${eventId}`, {
      method: 'POST',
    }),

  getCategoryPoints: (categoryId: string) =>
    http.request(`/points/category/${categoryId}`),
}
