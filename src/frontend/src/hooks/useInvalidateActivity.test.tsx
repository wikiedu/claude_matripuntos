import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useInvalidateActivity } from './useInvalidateActivity'

describe('useInvalidateActivity', () => {
  it('invalidates all expected query keys', () => {
    const qc = new QueryClient()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useInvalidateActivity(), { wrapper })
    result.current('event-123')
    const calledKeys = spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown[] }).queryKey))
    expect(calledKeys).toContain(JSON.stringify(['events', 'all']))
    expect(calledKeys).toContain(JSON.stringify(['events', 'event-123']))
    expect(calledKeys).toContain(JSON.stringify(['balance']))
    expect(calledKeys).toContain(JSON.stringify(['recentActivity']))
    expect(calledKeys).toContain(JSON.stringify(['gamification', 'status']))
    expect(calledKeys).toContain(JSON.stringify(['achievements', 'map']))
    expect(calledKeys).toContain(JSON.stringify(['notifications']))
  })
})
