// v2.0.4 — Hooks frontend para propuestas de configuración consensuada.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_CONFIG_PROPOSALS_ENABLED ?? 'true') !== 'false'

export interface ConfigProposal {
  id: string
  coupleId: string
  proposedById: string
  field: string
  oldValue: string
  newValue: string
  rationale: string | null
  status: 'active' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
  respondedById: string | null
  respondedAt: string | null
  expiresAt: string
  createdAt: string
  proposedBy?: { id: string; name: string }
}

export interface ConfigChangeLogEntry {
  id: string
  coupleId: string
  field: string
  oldValue: string
  newValue: string
  appliedById: string
  proposalId: string | null
  appliedAt: string
  appliedBy?: { id: string; name: string }
}

async function safeRequest<T>(path: string, fallback: T, opts?: any): Promise<T> {
  try {
    const r: any = await apiClient.request(path, opts)
    return r as T
  } catch {
    return fallback
  }
}

export function useActiveProposals() {
  return useQuery({
    queryKey: ['config-proposals', 'active'],
    queryFn: () =>
      safeRequest<{ proposals: ConfigProposal[] }>('/config-proposals', { proposals: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 30_000,
  })
}

export function useProposalsHistory() {
  return useQuery({
    queryKey: ['config-proposals', 'history'],
    queryFn: () =>
      safeRequest<{ proposals: ConfigProposal[] }>('/config-proposals/history', { proposals: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 60_000,
  })
}

export function useChangeLog() {
  return useQuery({
    queryKey: ['config-proposals', 'changelog'],
    queryFn: () =>
      safeRequest<{ entries: ConfigChangeLogEntry[] }>('/config-proposals/changelog', { entries: [] }),
    enabled: FLAG_ENABLED,
    staleTime: 60_000,
  })
}

interface ProposeBody {
  field: string
  oldValue: string
  newValue: string
  rationale?: string
  expiryDays?: number
}

export function useProposeChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ProposeBody) =>
      apiClient.request('/config-proposals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-proposals'] })
    },
  })
}

export function useAcceptProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/config-proposals/${id}/accept`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-proposals'] })
    },
  })
}

export function useRejectProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/config-proposals/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-proposals'] })
    },
  })
}

export function useCancelProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.request(`/config-proposals/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-proposals'] })
    },
  })
}
