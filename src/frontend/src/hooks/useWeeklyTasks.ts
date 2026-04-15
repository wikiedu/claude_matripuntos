import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export function useWeeklyTasks(from: string, to: string) {
  return useQuery({
    queryKey: ['tasks', 'week', from, to],
    queryFn: () => apiClient.tasks.getWeeklyLogs(from, to),
    staleTime: 60_000,
    enabled: !!from && !!to,
  })
}
