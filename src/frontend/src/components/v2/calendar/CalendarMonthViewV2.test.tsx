import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarMonthViewV2 } from './CalendarMonthViewV2'
import type { CalendarEntry } from '../../../hooks/useCalendarV2'

const baseEntry = (over: Partial<CalendarEntry> = {}): CalendarEntry => ({
  id: 'e1',
  type: 'event',
  title: 'Sample',
  date: '2026-05-15T10:00:00Z',
  endDate: null,
  allDay: true,
  category: null,
  description: null,
  color: null,
  externalSource: null,
  metadata: null,
  ...over,
})

describe('CalendarMonthViewV2', () => {
  it('renders 7 day headers', () => {
    render(<CalendarMonthViewV2 year={2026} month={4} entries={[]} />)
    ;['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => {
      expect(screen.getAllByText(d)[0]).toBeInTheDocument()
    })
  })

  it('renders 31 cells for May 2026', () => {
    render(<CalendarMonthViewV2 year={2026} month={4} entries={[]} />)
    expect(screen.getByTestId('calendar-cell-1')).toBeInTheDocument()
    expect(screen.getByTestId('calendar-cell-31')).toBeInTheDocument()
  })

  it('shows entry dots in correct cell', () => {
    const entries = [
      baseEntry({ id: 'e1', date: '2026-05-15T08:00:00Z', type: 'event', title: 'Cita' }),
    ]
    render(<CalendarMonthViewV2 year={2026} month={4} entries={entries} />)
    const cell = screen.getByTestId('calendar-cell-15')
    expect(cell.querySelector('button[aria-label="Cita"]')).toBeInTheDocument()
  })

  it('calls onEntryClick when dot tapped', () => {
    const onClick = vi.fn()
    const entries = [baseEntry({ id: 'e1', date: '2026-05-15T08:00:00Z' })]
    render(<CalendarMonthViewV2 year={2026} month={4} entries={entries} onEntryClick={onClick} />)
    const cell = screen.getByTestId('calendar-cell-15')
    const btn = cell.querySelector('button[aria-label="Sample"]') as HTMLButtonElement
    fireEvent.click(btn)
    expect(onClick).toHaveBeenCalled()
  })

  it('caps visible dots at 4 + shows +N counter', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      baseEntry({ id: `e${i}`, title: `T${i}`, date: '2026-05-15T08:00:00Z' }),
    )
    render(<CalendarMonthViewV2 year={2026} month={4} entries={entries} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
