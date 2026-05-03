// v2.0.5 — Hook frontend del anniversary timer.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_ANNIVERSARY_ENABLED ?? 'true') !== 'false'

export interface AnniversaryBreakdown {
  startDate: string
  totalDays: number
  years: number
  months: number
  days: number
  label: string
  nextMilestoneDays: number
  nextMilestoneLabel: string
}

async function safeRequest<T>(path: string, fallback: T, opts?: any): Promise<T> {
  try {
    const r: any = await apiClient.request(path, opts)
    return r as T
  } catch {
    return fallback
  }
}

export function useAnniversary() {
  return useQuery({
    queryKey: ['anniversary'],
    queryFn: () =>
      safeRequest<{ anniversary: AnniversaryBreakdown | null }>('/anniversary', { anniversary: null }),
    enabled: FLAG_ENABLED,
    staleTime: 60 * 60_000, // 1h, no cambia rápido
  })
}

export function useSetAnniversary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (startDate: string) =>
      apiClient.request('/anniversary', { method: 'PUT', body: JSON.stringify({ startDate }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anniversary'] }),
  })
}

export function useClearAnniversary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.request('/anniversary', { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anniversary'] }),
  })
}
