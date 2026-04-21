import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

export interface ActivityEvent {
  id: string
  type: string
  title?: string
  dateStart: string
  dateEnd: string
  pointsBase: string
  pointsCalculated: string
  pointsAgreed?: string
  status: 'pending' | 'accepted' | 'rejected' | 'forced' | 'draft'
  createdBy: string
  lastProposedBy?: string
  negotiationRound: number
  maxFreeRounds?: number
  creator?: { id: string; name: string }
  compensation?: string
  negotiations?: Array<{ id: string; roundNumber: number; pointsProposed: string; proposedBy?: string }>
}

export function useActivities() {
  const { user } = useAppStore()
  const meId = user?.id

  const query = useQuery<{ events: ActivityEvent[] }>({
    queryKey: ['events', 'all'],
    queryFn: () => apiClient.events.getAll() as Promise<{ events: ActivityEvent[] }>,
    staleTime: 30_000,
  })

  const events = query.data?.events ?? []

  const derived = useMemo(() => {
    const pending: ActivityEvent[] = []
    const waiting: ActivityEvent[] = []
    const history: ActivityEvent[] = []

    for (const e of events) {
      if (e.status === 'pending') {
        if (e.lastProposedBy !== meId) {
          pending.push(e)
        } else if (e.createdBy === meId) {
          waiting.push(e)
        }
      } else if (e.status === 'accepted' || e.status === 'rejected' || e.status === 'forced') {
        history.push(e)
      }
    }

    history.sort((a, b) => (b.dateStart || '').localeCompare(a.dateStart || ''))

    return {
      pending, waiting, history,
      pendingCount: pending.length,
      waitingCount: waiting.length,
    }
  }, [events, meId])

  return {
    ...query,
    ...derived,
    events,
  }
}
