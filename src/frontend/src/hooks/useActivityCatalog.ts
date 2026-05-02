// v2.0.4 — Hooks frontend para catálogo de actividades.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_CATALOG_ENABLED ?? 'true') !== 'false'

export interface ActivityTemplate {
  id: string
  coupleId: string | null
  category: string
  subcategory: string | null
  name: string
  description: string | null
  pointsBaseSuggested: number | string
  defaultDurationMinutes: number | null
  defaultImpact: 'necessary' | 'health' | 'leisure' | 'high' | null
  emoji: string | null
  isActive: boolean
  instancesThisMonth: number
  lastInstanceAt: string | null
  createdAt: string
  updatedAt: string
}

async function safeRequest<T>(path: string, fallback: T, opts?: any): Promise<T> {
  try {
    const r: any = await apiClient.request(path, opts)
    return r as T
  } catch {
    return fallback
  }
}

export function useActivityCatalog() {
  return useQuery({
    queryKey: ['catalog', 'activity-templates'],
    queryFn: () =>
      safeRequest<{ templates: ActivityTemplate[] }>('/activity-templates', { templates: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useActivityCatalogGrouped() {
  return useQuery({
    queryKey: ['catalog', 'activity-templates', 'grouped'],
    queryFn: () =>
      safeRequest<{ groups: Record<string, ActivityTemplate[]> }>(
        '/activity-templates?grouped=true',
        { groups: {} }
      ),
    enabled: FLAG_ENABLED,
    staleTime: 5 * 60_000,
  })
}

export function useCreateActivityTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ActivityTemplate>) =>
      apiClient.request('/activity-templates', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog', 'activity-templates'] })
    },
  })
}

export function useDeactivateActivityTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/activity-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalog', 'activity-templates'] })
    },
  })
}

export function useRecordTemplateUse() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/activity-templates/${id}/use`, { method: 'POST' }),
  })
}
