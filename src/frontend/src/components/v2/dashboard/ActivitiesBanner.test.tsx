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

  it('picks the awaiting negotiation, not the first by order, when responding', async () => {
    // Event with 2 negotiations: round 1 already responded, round 2 awaiting.
    // Even if [0] ends up being the resolved one (stale/reordered cache),
    // the banner must submit round 2's id — otherwise the backend returns
    // "Negotiation already responded to".
    mockState.events = [{
      id: 'p1', title: 'Spa', type: 'bienestar', status: 'pending',
      createdBy: 'partner', lastProposedBy: 'partner',
      pointsBase: '10', pointsCalculated: '12',
      dateStart: '2026-05-01T21:00:00Z', dateEnd: '2026-05-01T23:00:00Z',
      negotiationRound: 2,
      creator: { id: 'partner', name: 'Blanca' },
      negotiations: [
        { id: 'neg-round-1', roundNumber: 1, pointsProposed: '10', proposedBy: 'partner', responseType: 'counter_proposed' },
        { id: 'neg-round-2', roundNumber: 2, pointsProposed: '12', proposedBy: 'partner', responseType: 'awaiting' },
      ],
    }]
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText('Spa')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }))
    await waitFor(() => expect(respond).toHaveBeenCalledWith('neg-round-2', { responseType: 'accepted' }))
  })
})
