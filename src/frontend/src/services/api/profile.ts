// Dominio perfil/familia: perfiles user/couple, mood history e hijos/mascotas.
import { http } from './http'

// Profile endpoints (V2)
export const profile = {
  completeUserProfile: (data: any) =>
    http.request('/profile/user', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserProfile: (userId: string) =>
    http.request(`/profile/user/${userId}`),

  createCoupleProfile: (data: any) =>
    http.request('/profile/couple', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCoupleProfile: () =>
    http.request('/profile/couple'),

  updateMe: (data: {
    avatarEmoji?: string
    avatarColor?: string
    theme?: string
    currentMood?: string
    hasCompletedOnboarding?: boolean
    weeklyWorkHours?: number
    workMode?: 'presencial' | 'remoto' | 'hibrido'
  }) =>
    http.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Family endpoints (V2)
export const family = {
  addChild: (data: any) =>
    http.request('/children', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getChildren: () =>
    http.request('/children'),

  updateChild: (childId: string, data: any) =>
    http.request(`/children/${childId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteChild: (childId: string) =>
    http.request(`/children/${childId}`, {
      method: 'DELETE',
    }),

  addPet: (data: any) =>
    http.request('/pets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPets: () =>
    http.request('/pets'),

  updatePet: (petId: string, data: any) =>
    http.request(`/pets/${petId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deletePet: (petId: string) =>
    http.request(`/pets/${petId}`, {
      method: 'DELETE',
    }),
}

// v1.6 — Mood history del user autenticado
export interface MoodHistoryEntry {
  date: string  // YYYY-MM-DD en TZ pedida
  moodKey: string | null
  emoji?: string
  label?: string
}
export interface MoodHistoryResponse {
  tz: string
  days: number
  history: MoodHistoryEntry[]
}

export const getMoodHistory = (
  days = 7,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid',
): Promise<MoodHistoryResponse> =>
  http.request(`/profile/mood-history?days=${days}&tz=${encodeURIComponent(tz)}`)
