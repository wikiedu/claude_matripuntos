// Fachada del API client (T6 — partición del god-service, antes 938 líneas).
// El transporte HTTP + interceptor JWT/refresh único vive en `api/http.ts`;
// los endpoints por dominio en `api/<dominio>.ts`. Este archivo solo ensambla
// `apiClient` con la MISMA forma pública de siempre y re-exporta los helpers
// sueltos, para que ningún consumidor cambie sus imports.
import { http } from './api/http'
import { auth, invitations } from './api/auth'
import { events } from './api/events'
import { tasks } from './api/tasks'
import { negotiations, negotiation } from './api/negotiations'
import { points, pointsV2 } from './api/points'
import { configuration, categories, rules } from './api/configuration'
import { notifications } from './api/notifications'
import { profile, family } from './api/profile'
import { gamification, achievements } from './api/gamification'
import { calendar } from './api/calendar'
import { analytics } from './api/analytics'
import { shopping, todos } from './api/lists'

export const apiClient = {
  // Token management + request genérico — delegan en el singleton HTTP
  // (un solo interceptor de rotación para toda la app).
  setToken: http.setToken.bind(http),
  setRefreshToken: http.setRefreshToken.bind(http),
  getRefreshToken: http.getRefreshToken.bind(http),
  setTokensFromAuthResponse: http.setTokensFromAuthResponse.bind(http),
  getToken: http.getToken.bind(http),
  clearToken: http.clearToken.bind(http),
  setOnUnauthorized: http.setOnUnauthorized.bind(http),
  request: http.request.bind(http),

  // Namespaces por dominio
  auth,
  events,
  tasks,
  negotiations,
  negotiation,
  points,
  pointsV2,
  configuration,
  categories,
  rules,
  notifications,
  profile,
  family,
  invitations,
  gamification,
  achievements,
  calendar,
  analytics,
  shopping,
  todos,
}

// Helpers sueltos y tipos — re-exportados desde sus dominios para mantener
// los imports históricos (`from '../services/apiClient'`) intactos.
export type { MoodHistoryEntry, MoodHistoryResponse } from './api/profile'
export { getMoodHistory } from './api/profile'
export { fetchRecentActivity } from './api/events'
export { fetchPendingTaskLogs, verifyTaskLog, rejectTaskLog } from './api/tasks'
