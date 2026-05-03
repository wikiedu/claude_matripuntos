// v2.0.5 — Hooks frontend para image proof en task logs.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

const FLAG_ENABLED = (import.meta.env?.VITE_TASK_PROOF_ENABLED ?? 'true') !== 'false'

export interface TaskProof {
  proofImageUrl: string | null
  proofUploadedAt: string | null
}

async function safeRequest<T>(path: string, fallback: T, opts?: any): Promise<T> {
  try {
    const r: any = await apiClient.request(path, opts)
    return r as T
  } catch {
    return fallback
  }
}

export function useTaskProof(logId: string | null | undefined) {
  return useQuery({
    queryKey: ['task-proof', logId],
    queryFn: () =>
      safeRequest<TaskProof>(`/task-logs/${logId}/proof`, { proofImageUrl: null, proofUploadedAt: null }),
    enabled: FLAG_ENABLED && !!logId,
    staleTime: 60_000,
  })
}

export function useUploadTaskProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ logId, proofImageUrl }: { logId: string; proofImageUrl: string }) =>
      apiClient.request(`/task-logs/${logId}/proof`, {
        method: 'POST',
        body: JSON.stringify({ proofImageUrl }),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['task-proof', vars.logId] })
    },
  })
}

export function useDeleteTaskProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (logId: string) =>
      apiClient.request(`/task-logs/${logId}/proof`, { method: 'DELETE' }),
    onSuccess: (_d, logId) => {
      qc.invalidateQueries({ queryKey: ['task-proof', logId] })
    },
  })
}
