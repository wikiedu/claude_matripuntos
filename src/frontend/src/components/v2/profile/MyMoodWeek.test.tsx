import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyMoodWeek } from './MyMoodWeek'

const history = [
  { date: '2026-04-26', moodKey: null },
  { date: '2026-04-27', moodKey: 'feliz', emoji: '😊', label: 'Feliz' },
  { date: '2026-04-28', moodKey: 'cansado', emoji: '😴', label: 'Cansada/o' },
  { date: '2026-04-29', moodKey: null },
  { date: '2026-04-30', moodKey: 'energico', emoji: '💪', label: 'Con energía' },
  { date: '2026-05-01', moodKey: null },
  { date: '2026-05-02', moodKey: 'tranquilo', emoji: '😌', label: 'Tranquila/o' },
]

describe('MyMoodWeek', () => {
  it('renders 7 day entries', () => {
    render(<MyMoodWeek history={history} loading={false} />)
    expect(screen.getAllByTestId(/^mood-day-/)).toHaveLength(7)
  })

  it('shows emoji on filled days, empty marker on null days', () => {
    render(<MyMoodWeek history={history} loading={false} />)
    expect(screen.getByTestId('mood-day-2026-04-27')).toHaveTextContent('😊')
    expect(screen.getByTestId('mood-day-2026-04-29')).toHaveTextContent('·')
  })

  it('shows loading placeholder when loading', () => {
    render(<MyMoodWeek history={[]} loading={true} />)
    expect(screen.getByTestId('mood-week-loading')).toBeInTheDocument()
  })

  it('shows empty state when not loading and history empty', () => {
    render(<MyMoodWeek history={[]} loading={false} />)
    expect(screen.getByTestId('mood-week-empty')).toBeInTheDocument()
  })
})
