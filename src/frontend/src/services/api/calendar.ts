// Dominio calendario: vistas mes/semana/día y CRUD de entradas.
import { http } from './http'

// Calendar endpoints (FASE 5)
export const calendar = {
  getMonth: (year: number, month: number) =>
    http.request(`/calendar/month/${year}/${month}`),

  getWeek: (year: number, week: number) =>
    http.request(`/calendar/week/${year}/${week}`),

  getDay: (date: string) =>
    http.request(`/calendar/day/${date}`),

  getUpcoming: () =>
    http.request('/calendar/upcoming'),

  getSpecialDates: () =>
    http.request('/calendar/special-dates'),

  createEntry: (data: any) =>
    http.request('/calendar/entry', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEntry: (entryId: string, data: any) =>
    http.request(`/calendar/entry/${entryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEntry: (entryId: string) =>
    http.request(`/calendar/entry/${entryId}`, {
      method: 'DELETE',
    }),

  getByType: (type: string, startDate?: string, endDate?: string) =>
    http.request(`/calendar/by-type/${type}${startDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`),
}
