// src/frontend/src/pages/Activities.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'

const respond = vi.fn(async () => ({ ok: true }))

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: {
      getAll: vi.fn(async () => ({
        events: [
          { id: 'p1', type: 'cena', title: 'Cena', status: 'pending', createdBy: 'partner',
            lastProposedBy: 'partner', pointsBase: '10', pointsCalculated: '12',
            dateStart: '2026-05-01T21:00:00Z', dateEnd: '2026-05-01T23:00:00Z',
            negotiationRound: 1, creator: { id: 'partner', name: 'Eduardo' },
            negotiations: [{ id: 'n1', roundNumber: 1, pointsProposed: '12', proposedBy: 'partner' }] },
          { id: 'w1', type: 'cine', title: 'Cine', status: 'pending', createdBy: 'me',
            lastProposedBy: 'me', pointsBase: '20', pointsCalculated: '25',
            dateStart: '2026-04-24T20:00:00Z', dateEnd: '2026-04-24T22:00:00Z',
            negotiationRound: 1, creator: { id: 'me', name: 'Blanca' },
            negotiations: [{ id: 'n2', roundNumber: 1, pointsProposed: '25', proposedBy: 'me' }] },
          { id: 'h1', type: 'yoga', title: 'Yoga', status: 'accepted', createdBy: 'me',
            lastProposedBy: 'partner', pointsBase: '8', pointsCalculated: '10',
            dateStart: '2026-04-15T10:00:00Z', dateEnd: '2026-04-15T11:00:00Z',
            negotiationRound: 1, creator: { id: 'me', name: 'Blanca' },
            negotiations: [] },
        ],
      })),
    },
    negotiations: { respond, force: vi.fn() },
  },
}))

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    user: { id: 'me', name: 'Blanca' },
    couple: { id: 'c1', users: [{ id: 'me', name: 'Blanca' }, { id: 'partner', name: 'Eduardo' }] },
  }),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('Activities page', () => {
  it('renders Activas tab with pending + waiting sections', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText(/REQUIEREN TU RESPUESTA/i)).toBeInTheDocument())
    expect(screen.getByText('Cena')).toBeInTheDocument()
    expect(screen.getByText(/TUS SOLICITUDES ESPERANDO/i)).toBeInTheDocument()
    expect(screen.getByText('Cine')).toBeInTheDocument()
    expect(screen.queryByText('Yoga')).not.toBeInTheDocument()  // it's history
  })

  it('switches to Historial and filters by status', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Historial/i }))
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    // filter to Rechazadas → nothing
    fireEvent.click(screen.getByText('Rechazadas'))
    expect(screen.queryByText('Yoga')).not.toBeInTheDocument()
    expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument()
  })

  it('accepting a pending card calls negotiations.respond with accepted', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }))
    await waitFor(() => expect(respond).toHaveBeenCalledWith('n1', { responseType: 'accepted' }))
  })
})
