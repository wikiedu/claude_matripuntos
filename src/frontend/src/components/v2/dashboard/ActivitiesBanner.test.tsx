import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'

const respond = vi.fn(async () => ({ ok: true }))

function makeEv(id: string, title: string, createdBy: string, lastProposedBy: string) {
  return {
    id, title, type: 'cena', status: 'pending', createdBy, lastProposedBy,
    pointsBase: '10', pointsCalculated: '12', dateStart: '2026-05-01T21:00:00Z', dateEnd: '2026-05-01T23:00:00Z',
    negotiationRound: 1, creator: { id: createdBy, name: createdBy === 'me' ? 'Blanca' : 'Edu' },
    negotiations: [{ id: 'n-' + id, roundNumber: 1, pointsProposed: '12', proposedBy: createdBy }],
  }
}

const mockState = vi.hoisted(() => ({ events: [] as any[] }))

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    events: {
      getAll: vi.fn(async () => ({ events: mockState.events })),
    },
    negotiations: { respond, force: vi.fn() },
  },
}))
vi.mock('../../../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me' }, couple: { id: 'c1', users: [{ id: 'me', name: 'Blanca' }, { id: 'partner', name: 'Edu' }] } }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Default setup: 3 pending from partner + 1 waiting from me
  mockState.events = [
    makeEv('p1', 'Cena', 'partner', 'partner'),
    makeEv('p2', 'Pádel', 'partner', 'partner'),
    makeEv('p3', 'Pádel 2', 'partner', 'partner'),
    { ...makeEv('w1', 'Cine', 'me', 'me'), status: 'pending' },
  ]
})

describe('ActivitiesBanner', () => {
  it('renders nothing when no pending and no waiting', async () => {
    mockState.events = []
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    const { container } = renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('shows at most 2 action cards + overflow link', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    expect(screen.getByText('Cena')).toBeInTheDocument()
    expect(screen.getByText('Pádel')).toBeInTheDocument()
    expect(screen.queryByText('Pádel 2')).not.toBeInTheDocument()
    expect(screen.getByText(/y 1 más/)).toBeInTheDocument()
  })

  it('shows waiting summary when you have outgoing requests', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText(/solicitudes tuyas/i)).toBeInTheDocument())
  })

  it('accepting calls respond(accepted)', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    const acceptBtns = screen.getAllByRole('button', { name: /Aceptar/i })
    fireEvent.click(acceptBtns[0])
    await waitFor(() => expect(respond).toHaveBeenCalledWith('n-p1', { responseType: 'accepted' }))
  })
})
