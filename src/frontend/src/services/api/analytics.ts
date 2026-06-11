// Dominio analytics: agregados V1 por rango de fechas.
import { http } from './http'

// Analytics endpoints (FASE 6)
export const analytics = {
  getCouple: (startDate: string, endDate: string) =>
    http.request(`/analytics/couple?startDate=${startDate}&endDate=${endDate}`),

  getUsers: (startDate: string, endDate: string) =>
    http.request(`/analytics/users?startDate=${startDate}&endDate=${endDate}`),

  getDailyActivity: (startDate: string, endDate: string) =>
    http.request(`/analytics/daily-activity?startDate=${startDate}&endDate=${endDate}`),

  getNegotiations: (startDate: string, endDate: string) =>
    http.request(`/analytics/negotiations?startDate=${startDate}&endDate=${endDate}`),

  getPointsByCategory: (startDate: string, endDate: string) =>
    http.request(`/analytics/points-by-category?startDate=${startDate}&endDate=${endDate}`),

  getWeeklyTrends: (weeks?: number) =>
    http.request(`/analytics/weekly-trends${weeks ? `?weeks=${weeks}` : ''}`),

  getDailyBreakdown: (startDate: string, endDate: string) =>
    http.request(`/analytics/daily-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),

  getMonthly: (year: number, month: number) =>
    http.request(`/analytics/monthly/${year}/${month}`),

  getYearly: (year: number) =>
    http.request(`/analytics/yearly/${year}`),
}
