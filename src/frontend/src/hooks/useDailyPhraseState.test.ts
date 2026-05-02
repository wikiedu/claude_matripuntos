import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDailyPhraseState } from './useDailyPhraseState'

describe('useDailyPhraseState', () => {
  it('returns shape with all required keys', () => {
    const { result } = renderHook(() => useDailyPhraseState({ coupleId: 'c1', tz: 'Europe/Madrid' }))
    const s = result.current
    expect(s).toHaveProperty('coupleId', 'c1')
    expect(s).toHaveProperty('dayKey')
    expect(s.dayKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(typeof s.hasOpenDisputeRecent).toBe('boolean')
    expect(typeof s.streakBrokenLast24h).toBe('boolean')
    expect(typeof s.recentMilestone).toBe('boolean')
    expect(typeof s.weekendDay).toBe('boolean')
    expect(typeof s.heavyWeekDetected).toBe('boolean')
    expect(typeof s.partnerHighContribLastWeek).toBe('boolean')
    expect(typeof s.isMonday).toBe('boolean')
  })

  it('defaults all signals to false (MVP behavior)', () => {
    const { result } = renderHook(() => useDailyPhraseState({ coupleId: 'c1' }))
    const s = result.current
    expect(s.hasOpenDisputeRecent).toBe(false)
    expect(s.streakBrokenLast24h).toBe(false)
    expect(s.recentMilestone).toBe(false)
    expect(s.heavyWeekDetected).toBe(false)
    expect(s.partnerHighContribLastWeek).toBe(false)
  })

  it('weekendDay XOR isMonday — never both true', () => {
    const { result } = renderHook(() => useDailyPhraseState({ coupleId: 'c1' }))
    const s = result.current
    expect(s.weekendDay && s.isMonday).toBe(false)
  })
})
