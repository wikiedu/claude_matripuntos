import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentMovementsTabs, MovementVM } from './RecentMovementsTabs'

const data: MovementVM[] = [
  { id: '1', userName: 'Edu',    action: 'Cena',    delta: -18, when: '20 abr', kind: 'activity', refId: 'e1' },
  { id: '2', userName: 'Blanca', action: 'Cocinar', delta:  12, when: '20 abr', kind: 'task',     refId: 't1' },
  { id: '3', userName: 'Blanca', action: 'Baños',   delta:   8, when: '19 abr', kind: 'task',     refId: 't2' },
]

function wrap(ui: React.ReactElement) { return render(<MemoryRouter>{ui}</MemoryRouter>) }

describe('RecentMovementsTabs', () => {
  it('renders 3 items from All tab', () => {
    wrap(<RecentMovementsTabs movements={data} />)
    expect(screen.getByText(/Cena/)).toBeInTheDocument()
    expect(screen.getByText(/Cocinar/)).toBeInTheDocument()
    expect(screen.getByText(/Baños/)).toBeInTheDocument()
  })

  it('filters by Activities tab', () => {
    wrap(<RecentMovementsTabs movements={data} />)
    fireEvent.click(screen.getByRole('button', { name: /Actividades/ }))
    expect(screen.getByText(/Cena/)).toBeInTheDocument()
    expect(screen.queryByText(/Cocinar/)).not.toBeInTheDocument()
  })

  it('filters by Tasks tab', () => {
    wrap(<RecentMovementsTabs movements={data} />)
    fireEvent.click(screen.getByRole('button', { name: /^Tareas$/ }))
    expect(screen.queryByText(/Cena/)).not.toBeInTheDocument()
    expect(screen.getByText(/Cocinar/)).toBeInTheDocument()
  })

  it('renders empty hint per tab', () => {
    wrap(<RecentMovementsTabs movements={[]} />)
    expect(screen.getByText(/Aún no hay movimientos/i)).toBeInTheDocument()
  })
})
