// v2.0.3 — Hooks Analytics Pro. Default ON.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_ANALYTICS_V2_ENABLED ?? 'true') !== 'false'

export interface SummaryData {
  range: { from: string; to: string }
  events: { total: number; accepted: number; rejected: number; pending: number; other: number }
  eventsByDay: Record<string, number>
  eventsByWeek: Record<string, number>
  eventsByMonth: Record<string, number>
  eventsByCategory: Record<string, number>
  taskLogs: { total: number; verified: number; pending: number; disputed: number }
  balanceByUser: Record<string, number>
  netBalance: number
  equityBand: 'green' | 'yellow' | 'red'
}

export interface InsightCard {
  id: string
  kind: string
  title: string
  body: string
  payload: Record<string, unknown>
  trend: 'up' | 'down' | 'flat' | null
  generatedAt: string
  validUntil: string
}

async function safeRequest<T>(path: string, fallback: T): Promise<T> {
  try {
    const r: any = await apiClient.request(path)
    return r as T
  } catch {
    return fallback
  }
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics-v2', 'summary'],
    queryFn: () => safeRequest<SummaryData | null>('/analytics/v2/summary', null),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsInsights() {
  return useQuery({
    queryKey: ['analytics-v2', 'insights'],
    queryFn: async () => {
      const r = await safeRequest<{ insights: InsightCard[] }>('/analytics/v2/insights', { insights: [] })
      return r.insights
    },
    enabled: FLAG_ENABLED,
    staleTime: 30 * 60_000,
  })
}

export function useAnalyticsHeatmap() {
  return useQuery({
    queryKey: ['analytics-v2', 'heatmap'],
    queryFn: () => safeRequest<{ heatmap: number[][]; total: number }>('/analytics/v2/heatmap', { heatmap: [], total: 0 }),
    enabled: FLAG_ENABLED,
    staleTime: 30 * 60_000,
  })
}

export function useAnalyticsEquityCurve() {
  return useQuery({
    queryKey: ['analytics-v2', 'equity-curve'],
    queryFn: () => safeRequest<{ curve: Array<{ date: string; net: number }>; lastNet: number }>('/analytics/v2/equity-curve', { curve: [], lastNet: 0 }),
    enabled: FLAG_ENABLED,
    staleTime: 30 * 60_000,
  })
}

export const isAnalyticsV2Enabled = () => FLAG_ENABLED
