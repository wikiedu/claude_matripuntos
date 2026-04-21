import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityWaitingCard } from './ActivityWaitingCard'

describe('ActivityWaitingCard', () => {
  it('shows partner name waiting + dashed border styling cue', () => {
    render(<ActivityWaitingCard
      activity={{ id: 'e1', title: '🎬 Cine', partnerName: 'Eduardo', pointsCalculated: 25, whenLabel: 'vie 24 abr' }}
      onOpen={() => {}}
    />)
    expect(screen.getByText(/Esperando a Eduardo/)).toBeInTheDocument()
    expect(screen.getByText('−25 MP')).toBeInTheDocument()
  })

  it('opens on tap', () => {
    const onOpen = vi.fn()
    render(<ActivityWaitingCard
      activity={{ id: 'e1', title: 'x', partnerName: 'p', pointsCalculated: 1, whenLabel: 'hoy' }}
      onOpen={onOpen}
    />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith('e1')
  })
})
