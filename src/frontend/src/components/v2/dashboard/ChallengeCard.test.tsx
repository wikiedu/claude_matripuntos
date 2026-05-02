import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChallengeCard } from './ChallengeCard'

const base = {
  id: 'c1',
  type: 'verify' as const,
  progress: 3,
  goal: 10,
  rewardXp: 100,
  weekStart: '2026-04-27T00:00:00Z',
  config: {},
}

describe('ChallengeCard', () => {
  it('renders type label and reward', () => {
    render(<ChallengeCard challenge={base} />)
    expect(screen.getByText(/Verificar tareas mutuamente/)).toBeInTheDocument()
    expect(screen.getByTestId('challenge-reward')).toHaveTextContent('+100 XP')
  })

  it('shows progress fraction', () => {
    render(<ChallengeCard challenge={base} />)
    expect(screen.getByTestId('challenge-status')).toHaveTextContent('3/10')
  })

  it('renders progress bar with correct width', () => {
    render(<ChallengeCard challenge={base} />)
    expect(screen.getByTestId('challenge-progress')).toHaveStyle({ width: '30%' })
  })

  it('shows completed message when progress >= goal', () => {
    render(<ChallengeCard challenge={{ ...base, progress: 10 }} />)
    expect(screen.getByTestId('challenge-done')).toBeInTheDocument()
  })

  it('does not overflow progress bar above goal', () => {
    render(<ChallengeCard challenge={{ ...base, progress: 50 }} />)
    expect(screen.getByTestId('challenge-progress')).toHaveStyle({ width: '100%' })
  })

  it('uses correct emoji for each type', () => {
    const { rerender } = render(<ChallengeCard challenge={{ ...base, type: 'balance' }} />)
    expect(screen.getByText('Equilibrar saldo')).toBeInTheDocument()
    rerender(<ChallengeCard challenge={{ ...base, type: 'high_impact' }} />)
    expect(screen.getByText('Una actividad de alto impacto')).toBeInTheDocument()
  })
})
