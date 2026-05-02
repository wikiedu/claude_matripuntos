import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoodSelectorSheet } from './MoodSelectorSheet'
import { MOODS } from '../../../data/moods'

describe('MoodSelectorSheet', () => {
  it('renders all 10 moods when open', () => {
    render(<MoodSelectorSheet open currentMoodKey={null} onChange={() => {}} onClose={() => {}} />)
    expect(screen.getAllByTestId(/^mood-opt-/)).toHaveLength(MOODS.length)
  })

  it('does not render when closed', () => {
    render(<MoodSelectorSheet open={false} currentMoodKey={null} onChange={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId(/^mood-opt-/)).toBeNull()
  })

  it('clicking mood calls onChange + onClose', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<MoodSelectorSheet open currentMoodKey={null} onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mood-opt-feliz'))
    expect(onChange).toHaveBeenCalledWith('feliz')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows clear button when currentMoodKey set, hides when null', () => {
    const { rerender } = render(<MoodSelectorSheet open currentMoodKey="feliz" onChange={() => {}} onClose={() => {}} />)
    expect(screen.getByTestId('mood-clear-action')).toBeInTheDocument()
    rerender(<MoodSelectorSheet open currentMoodKey={null} onChange={() => {}} onClose={() => {}} />)
    expect(screen.queryByTestId('mood-clear-action')).toBeNull()
  })

  it('clear button calls onChange(null)', () => {
    const onChange = vi.fn()
    render(<MoodSelectorSheet open currentMoodKey="feliz" onChange={onChange} onClose={() => {}} />)
    fireEvent.click(screen.getByTestId('mood-clear-action'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    render(<MoodSelectorSheet open currentMoodKey={null} onChange={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('mood-sheet-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('marks current mood with data-selected', () => {
    render(<MoodSelectorSheet open currentMoodKey="cansado" onChange={() => {}} onClose={() => {}} />)
    expect(screen.getByTestId('mood-opt-cansado')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('mood-opt-feliz')).toHaveAttribute('data-selected', 'false')
  })
})
