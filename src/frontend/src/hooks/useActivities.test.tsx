import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

const MOCK_EVENTS = [
  { id: 'a', status: 'pending', createdBy: 'me',      lastProposedBy: 'me',   dateStart: '2026-05-01' },
  { id: 'b', status: 'pending', createdBy: 'partner', lastProposedBy: 'partner', dateStart: '2026-05-02' },
  { id: 'c', status: 'pending', createdBy: 'me',      lastProposedBy: 'partner', dateStart: '2026-05-03' }, // my turn
  { id: 'd', status: 'accepted', createdBy: 'me',     lastProposedBy: 'me',   dateStart: '2026-04-01' },
  { id: 'e', status: 'rejected', createdBy: 'partner', lastProposedBy: 'partner', dateStart: '2026-03-01' },
  { id: 'f', status: 'forced',   createdBy: 'me',     lastProposedBy: 'me',   dateStart: '2026-02-01' },
]

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: { getAll: vi.fn(async () => ({ events: MOCK_EVENTS })) },
  },
}))
vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me' } }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => { vi.clearAllMocks() })

describe('useActivities', () => {
  it('derives pending (turn = me), waiting (mine + partner has turn), and history', async () => {
    const { useActivities } = await import('./useActivities')
    const { result } = renderHook(() => useActivities(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Pending-for-me: partner proposed OR partner is the one who last moved.
    // Rule: status=pending AND lastProposedBy !== me.
    expect(result.current.pending.map(e => e.id)).toEqual(['b', 'c'])

    // Waiting: I created it AND it's still pending AND lastProposedBy === me.
    expect(result.current.waiting.map(e => e.id)).toEqual(['a'])

    // History: status ∈ {accepted, rejected, forced}, sorted by dateStart desc.
    expect(result.current.history.map(e => e.id)).toEqual(['d', 'e', 'f'])

    // Counts exposed:
    expect(result.current.pendingCount).toBe(2)
    expect(result.current.waitingCount).toBe(1)
  })
})
