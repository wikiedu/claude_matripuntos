import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryFilters, HistoryFilterValues } from './HistoryFilters'

const defaults: HistoryFilterValues = { status: 'all', who: 'all', range: 'month' }

describe('HistoryFilters', () => {
  it('renders all three groups', () => {
    render(<HistoryFilters partnerName="Edu" value={defaults} onChange={() => {}} />)
    expect(screen.getAllByText('Todos').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Aprobadas')).toBeInTheDocument()
    expect(screen.getByText('Rechazadas')).toBeInTheDocument()
    expect(screen.getByText('Forzadas')).toBeInTheDocument()
    expect(screen.getByText('Yo')).toBeInTheDocument()
    expect(screen.getByText('Edu')).toBeInTheDocument()
    expect(screen.getByText('Semana')).toBeInTheDocument()
    expect(screen.getByText('Mes')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('emits change on each chip tap with current state', () => {
    const onChange = vi.fn()
    render(<HistoryFilters partnerName="Edu" value={defaults} onChange={onChange} />)
    fireEvent.click(screen.getByText('Aprobadas'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'accepted', who: 'all', range: 'month' })
    fireEvent.click(screen.getByText('Yo'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'all', who: 'me', range: 'month' })
    fireEvent.click(screen.getByText('Semana'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'all', who: 'all', range: 'week' })
  })
})
