import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export function useShoppingList() {
  return useQuery({
    queryKey: ['shopping'],
    queryFn: () => apiClient.shopping.getAll(),
    staleTime: 30_000,
  })
}
