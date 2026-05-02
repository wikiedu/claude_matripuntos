import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoodNudge } from './MoodNudge'

beforeEach(() => { sessionStorage.clear() })

describe('MoodNudge', () => {
  it('shows when no current mood and not dismissed', () => {
    render(<MoodNudge hasMood={false} dateKey="2026-05-02" onTap={() => {}} />)
    expect(screen.getByTestId('mood-nudge')).toBeInTheDocument()
  })

  it('hides when hasMood=true', () => {
    render(<MoodNudge hasMood={true} dateKey="2026-05-02" onTap={() => {}} />)
    expect(screen.queryByTestId('mood-nudge')).toBeNull()
  })

  it('clicking dismiss persists to sessionStorage and hides', () => {
    const { rerender } = render(<MoodNudge hasMood={false} dateKey="2026-05-02" onTap={() => {}} />)
    fireEvent.click(screen.getByTestId('mood-nudge-dismiss'))
    expect(sessionStorage.getItem('moodNudgeDismissed:2026-05-02')).toBe('1')
    rerender(<MoodNudge hasMood={false} dateKey="2026-05-02" onTap={() => {}} />)
    expect(screen.queryByTestId('mood-nudge')).toBeNull()
  })

  it('tap on body fires onTap', () => {
    const onTap = vi.fn()
    render(<MoodNudge hasMood={false} dateKey="2026-05-02" onTap={onTap} />)
    fireEvent.click(screen.getByTestId('mood-nudge-body'))
    expect(onTap).toHaveBeenCalled()
  })

  it('dismiss for one date does not affect another date', () => {
    sessionStorage.setItem('moodNudgeDismissed:2026-05-01', '1')
    render(<MoodNudge hasMood={false} dateKey="2026-05-02" onTap={() => {}} />)
    expect(screen.getByTestId('mood-nudge')).toBeInTheDocument()
  })
})
