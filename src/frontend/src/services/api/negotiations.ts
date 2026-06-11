// Dominio negociación: API canónica V1 (/api/negotiations, negotiationId-based)
// y la V2 deprecada (event-status-based) que sigue viva hasta T3 — ver
// TODO_REFACTOR.md "retirada de rutas V2 deprecadas".
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

// Negotiation endpoints (V2 - PHASE 3)
// ⚠️ Deprecada (Sunset vencido). Consumida por EventNegotiationCard.tsx;
// se retira en T3 junto con routes/negotiation.ts del backend.
export const negotiation = {
  proposeEvent: (eventId: string, message?: string) =>
    http.request(`/events/${eventId}/propose`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  respondToProposal: (eventId: string, action: 'accept' | 'reject' | 'counter_propose' | 'pending_conversation', pointsProposed?: number, message?: string) =>
    http.request(`/events/${eventId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, pointsProposed, message }),
    }),

  getNegotiationStatus: (eventId: string) =>
    http.request(`/events/${eventId}/negotiation`),

  getNegotiationHistory: (eventId: string) =>
    http.request(`/events/${eventId}/negotiation/history`),

  getPendingNegotiations: () =>
    http.request('/events/user/pending'),
}
