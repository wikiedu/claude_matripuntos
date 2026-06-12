// Dominio gamificación: status, logros y mapa de achievements.
// Fase 2 C.2 — retiradas las funciones V1 (getAllAchievements,
// getUserAchievements, checkAchievements, getCoupleStats, getCoupleScore,
// getLeaderboard, getWeeklySummary): 0 importadores; varias apuntaban a
// endpoints inexistentes. El sistema canónico es V2 (/achievements/map).
import type { GamificationStatus, AchievementMapNode } from '../../types/index'
import { http } from './http'

// Gamification endpoints (V2 - FASE 4)
export const gamification = {
  getStatus: (): Promise<GamificationStatus> =>
    http.request('/gamification/status'),
}

// Achievements map endpoints (v1.2)
export const achievements = {
  getMap: (): Promise<AchievementMapNode[]> =>
    http.request('/achievements/map'),
}
