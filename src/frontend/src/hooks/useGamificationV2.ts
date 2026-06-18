// v1.7 — Hooks frontend para gamification v2. Feature flag check.
// Cada hook hace un read separado: el cliente puede mostrar level sin
// esperar streak, etc. staleTime 5min para no spamear el backend.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

// v2.0.x — default ON. Solo desactivado con VITE_GAMIFICATION_V2_ENABLED=false explícito.
const FLAG_ENABLED = (import.meta.env?.VITE_GAMIFICATION_V2_ENABLED ?? 'true') !== 'false'

// Contrato real de GET /api/gamification-v2/level (routes/gamificationV2.ts).
// El backend NUNCA envía `perks`; sí envía `levelOrdinal`, `emoji` y `progressPct`.
export interface LevelInfo {
  xp: number
  level: number
  levelOrdinal: number
  name: string
  emoji: string
  threshold: number
  nextThreshold: number
  xpToNext: number
  progressPct: number
}

export interface StreakInfo {
  daily: number
  weekly: number
  longestDaily: number
  longestWeekly: number
  lastActivityAt: string | null
}

export interface ChallengeInfo {
  id: string
  type: 'balance' | 'verify' | 'diversity' | 'no_dispute' | 'high_impact'
  progress: number
  goal: number
  rewardXp: number
  weekStart: string
  config: Record<string, unknown>
}

export interface ReplayCard {
  key: string
  type: 'anniversary' | 'best_day' | 'balance_record' | 'first_event'
  title: string
  subtitle: string
  date: string
  payload?: Record<string, unknown>
}

async function safeRequest<T>(path: string, fallback: T): Promise<T> {
  try {
    const r: any = await apiClient.request(path)
    return r as T
  } catch {
    return fallback
  }
}

export function useLevel() {
  return useQuery({
    queryKey: ['gamification-v2', 'level'],
    queryFn: () => safeRequest<LevelInfo | null>('/gamification-v2/level', null),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useStreak() {
  return useQuery({
    queryKey: ['gamification-v2', 'streak'],
    queryFn: () => safeRequest<StreakInfo | null>('/gamification-v2/streak', null),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useChallenge() {
  return useQuery({
    queryKey: ['gamification-v2', 'challenge'],
    queryFn: async () => {
      const r = await safeRequest<{ challenge: ChallengeInfo | null }>('/gamification-v2/challenge', { challenge: null })
      return r.challenge
    },
    enabled: FLAG_ENABLED,
    staleTime: 10 * 60_000,
  })
}

export function useReplays() {
  return useQuery({
    queryKey: ['gamification-v2', 'replays'],
    queryFn: async () => {
      const r = await safeRequest<{ replays: ReplayCard[] }>('/gamification-v2/replay', { replays: [] })
      return r.replays
    },
    enabled: FLAG_ENABLED,
    staleTime: 60 * 60_000,  // 1h
  })
}

export const isGamificationV2Enabled = () => FLAG_ENABLED
