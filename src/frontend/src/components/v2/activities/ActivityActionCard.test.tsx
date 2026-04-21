import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityActionCard } from './ActivityActionCard'

const ev = {
  id: 'e1',
  title: '🍽️ Cena con amigos',
  creatorName: 'Eduardo',
  whenLabel: 'sáb 25 abr',
  pointsCalculated: 18,
  round: 1,
}

describe('ActivityActionCard', () => {
  it('renders title, creator, when, and points', () => {
    render(<ActivityActionCard activity={ev} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByText(/Cena con amigos/)).toBeInTheDocument()
    expect(screen.getByText(/Eduardo/)).toBeInTheDocument()
    expect(screen.getByText('sáb 25 abr')).toBeInTheDocument()
    expect(screen.getByText('−18 MP')).toBeInTheDocument()
  })

  it('fires onAccept/onCounter/onReject without bubbling to onOpen', () => {
    const onAccept = vi.fn(), onCounter = vi.fn(), onReject = vi.fn(), onOpen = vi.fn()
    render(<ActivityActionCard activity={ev} onAccept={onAccept} onCounter={onCounter} onReject={onReject} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }))
    fireEvent.click(screen.getByRole('button', { name: /Contraoferta/i }))
    fireEvent.click(screen.getByRole('button', { name: /Rechazar/i }))
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCounter).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('fires onOpen when the card body is tapped', () => {
    const onOpen = vi.fn()
    render(<ActivityActionCard activity={ev} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={onOpen} />)
    fireEvent.click(screen.getByTestId('action-card-body'))
    expect(onOpen).toHaveBeenCalledWith('e1')
  })

  it('disables all action buttons when busy', () => {
    render(<ActivityActionCard activity={ev} busy onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: /Aceptar/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Contraoferta/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Rechazar/i })).toBeDisabled()
  })

  it('shows round pill when round > 1', () => {
    render(<ActivityActionCard activity={{ ...ev, round: 2 }} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByText(/Ronda 2/i)).toBeInTheDocument()
  })
})
