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

  // NOTA (p3:A4-4): los métodos requestReset()/confirmReset() se retiraron de
  // este cliente por ser huérfanos (ningún componente los invocaba). El backend
  // mantiene las rutas POST /points/reset-request y /points/reset-confirm, pero
  // reset-confirm está gated tras POINTS_RESET_ENABLED y devuelve 503 hasta que
  // ship el flujo de aprobación de v1.5 (ResetRequest + consentimiento firmado).
  // Cuando ese flujo entre, re-cablear aquí el client + la UI en Settings.
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
