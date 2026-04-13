import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export function useAchievementsMap() {
  return useQuery({
    queryKey: ['achievements', 'map'],
    queryFn: () => apiClient.achievements.getMap(),
    staleTime: 60_000,
  })
}
