import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { HomeSelector } from './HomeSelector'

describe('HomeSelector', () => {
  it('renders both chips with counts', () => {
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={2} onChange={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /Tareas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Actividades/i })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('marks the active chip', () => {
    renderWithProviders(
      <HomeSelector active="activities" activitiesCount={0} onChange={() => {}} />,
    )
    const act = screen.getByRole('button', { name: /Actividades/i })
    expect(act).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange when the other chip is clicked', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={3} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Actividades/i }))
    expect(onChange).toHaveBeenCalledWith('activities')
  })

  it('does not render badge when activitiesCount is 0', () => {
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={0} onChange={() => {}} />,
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
