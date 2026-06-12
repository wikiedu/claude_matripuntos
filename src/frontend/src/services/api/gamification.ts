// Dominio gamificación: status, logros y mapa de achievements.
import type { GamificationStatus, AchievementMapNode } from '../../types/index'
import { http } from './http'

// Gamification endpoints (V2 - FASE 4)
export const gamification = {
  getStatus: (): Promise<GamificationStatus> =>
    http.request('/gamification/status'),

  getAllAchievements: () =>
    http.request('/achievements'),

  getUserAchievements: () =>
    http.request('/achievements/user/my-achievements'),

  checkAchievements: () =>
    http.request('/achievements/check', {
      method: 'POST',
    }),

  getCoupleStats: () =>
    http.request('/achievements/couple/stats'),

  getCoupleScore: () =>
    http.request('/achievements/couple/score'),

  getLeaderboard: (limit: number = 10) =>
    http.request(`/achievements/leaderboard?limit=${limit}`),

  getWeeklySummary: () =>
    http.request('/achievements/weekly-summary'),
}

// Achievements map endpoints (v1.2)
export const achievements = {
  getMap: (): Promise<AchievementMapNode[]> =>
    http.request('/achievements/map'),
}
