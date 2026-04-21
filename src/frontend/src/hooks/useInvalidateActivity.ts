import { useQueryClient } from '@tanstack/react-query'

export function useInvalidateActivity() {
  const qc = useQueryClient()
  return (eventId?: string) => {
    qc.invalidateQueries({ queryKey: ['events', 'all'] })
    if (eventId) qc.invalidateQueries({ queryKey: ['events', eventId] })
    qc.invalidateQueries({ queryKey: ['balance'] })
    qc.invalidateQueries({ queryKey: ['recentActivity'] })
    qc.invalidateQueries({ queryKey: ['gamification', 'status'] })
    qc.invalidateQueries({ queryKey: ['achievements', 'map'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
}
