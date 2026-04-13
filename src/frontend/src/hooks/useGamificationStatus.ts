import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export function useGamificationStatus() {
  return useQuery({
    queryKey: ['gamification', 'status'],
    queryFn: () => apiClient.gamification.getStatus(),
    staleTime: 30_000,
  })
}
