import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: {
      getById: vi.fn(async () => ({
        event: {
          id: 'e1',
          type: 'cena',
          title: 'Cena con amigos',
          dateStart: '2026-05-01T21:00:00.000Z',
          dateEnd: '2026-05-01T23:00:00.000Z',
          pointsBase: '12',
          pointsCalculated: '15',
          status: 'pending',
          negotiationRound: 1,
          maxFreeRounds: 2,
          creator: { id: 'u1', name: 'Eduardo' },
          negotiations: [],
        },
      })),
    },
    negotiations: {
      respond: vi.fn(),
      force: vi.fn(),
    },
  },
}))

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me', name: 'Blanca' }, couple: { id: 'c1' } }),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('ActivityDetail', () => {
  it('renders title from loaded event', async () => {
    const { default: ActivityDetail } = await import('./ActivityDetail')
    renderWithProviders(<ActivityDetail />, {
      route: '/home/activities/e1',
      path: '/home/activities/:id',
    })
    await waitFor(() => expect(screen.getByText('Cena con amigos')).toBeInTheDocument())
  })
})
