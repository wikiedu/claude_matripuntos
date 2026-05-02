import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StreakBadge } from './StreakBadge'

describe('StreakBadge', () => {
  it('hides when both daily=0 weekly=0', () => {
    const { container } = render(
      <StreakBadge streak={{ daily: 0, weekly: 0, longestDaily: 0, longestWeekly: 0, lastActivityAt: null }} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows daily only when weekly=0', () => {
    render(<StreakBadge streak={{ daily: 5, weekly: 0, longestDaily: 5, longestWeekly: 0, lastActivityAt: null }} />)
    expect(screen.getByTestId('streak-daily')).toHaveTextContent('🔥 5 días')
    expect(screen.queryByTestId('streak-weekly')).toBeNull()
  })

  it('shows both when both > 0', () => {
    render(<StreakBadge streak={{ daily: 12, weekly: 3, longestDaily: 12, longestWeekly: 3, lastActivityAt: null }} />)
    expect(screen.getByTestId('streak-daily')).toBeInTheDocument()
    expect(screen.getByTestId('streak-weekly')).toBeInTheDocument()
  })

  it('calls onTap on click', () => {
    const onTap = vi.fn()
    render(<StreakBadge streak={{ daily: 5, weekly: 0, longestDaily: 5, longestWeekly: 0, lastActivityAt: null }} onTap={onTap} />)
    fireEvent.click(screen.getByTestId('streak-badge'))
    expect(onTap).toHaveBeenCalled()
  })
})
