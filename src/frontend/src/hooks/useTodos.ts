import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export function useTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: () => apiClient.todos.getAll(),
    staleTime: 30_000,
  })
}
