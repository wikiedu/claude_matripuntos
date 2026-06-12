// Dominio negociación: API canónica V1 (/api/negotiations, negotiationId-based).
// La V2 deprecada (event-status-based, namespace `negotiation`) se retiró en T3
// junto con routes/negotiation.ts del backend — ver TODO_REFACTOR.md.
import { http } from './http'

// Negotiation endpoints
export const negotiations = {
  create: (data: {
    eventId: string
    pointsProposed: number
    message?: string
  }) =>
    http.request('/negotiations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  respond: (negotiationId: string, data: {
    responseType: 'accepted' | 'rejected' | 'counter_proposed'
    pointsProposed?: number
    message?: string
  }) =>
    http.request(`/negotiations/${negotiationId}/respond`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getByEvent: (eventId: string) =>
    http.request(`/negotiations/event/${eventId}`),

  force: (negotiationId: string) =>
    http.request(`/negotiations/${negotiationId}/force`, {
      method: 'POST',
    }),
}
