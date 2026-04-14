import { getNextOccurrences } from '../src/services/recurringTaskService.js'

describe('getNextOccurrences', () => {
  const base = new Date('2026-04-14T10:00:00Z') // Monday

  it('daily: generates 7 dates in 7 days', () => {
    const dates = getNextOccurrences(base, 'daily', 7)
    expect(dates).toHaveLength(7)
    expect(dates[1].getTime() - dates[0].getTime()).toBe(86400000)
  })

  it('weekly: generates same weekday', () => {
    const dates = getNextOccurrences(base, 'weekly', 4)
    expect(dates).toHaveLength(4)
    expect(dates[1].getDay()).toBe(base.getDay())
    expect(dates[1].getTime() - dates[0].getTime()).toBe(7 * 86400000)
  })

  it('biweekly: generates every 2 days', () => {
    const dates = getNextOccurrences(base, 'biweekly', 3)
    expect(dates[1].getTime() - dates[0].getTime()).toBe(2 * 86400000)
  })

  it('bimonthly: generates every 14 days', () => {
    const dates = getNextOccurrences(base, 'bimonthly', 3)
    expect(dates[1].getTime() - dates[0].getTime()).toBe(14 * 86400000)
  })

  it('monthly: same day next month', () => {
    const dates = getNextOccurrences(base, 'monthly', 2)
    expect(dates[1].getDate()).toBe(base.getDate())
    expect(dates[1].getMonth()).toBe(base.getMonth() + 1)
  })

  it('respects maxCount limit', () => {
    const dates = getNextOccurrences(base, 'daily', 100, { maxCount: 3 })
    expect(dates).toHaveLength(3)
  })

  it('respects endDate limit', () => {
    const end = new Date('2026-04-17T10:00:00Z')
    const dates = getNextOccurrences(base, 'daily', 100, { endDate: end })
    expect(dates.every(d => d <= end)).toBe(true)
    expect(dates).toHaveLength(4) // 14, 15, 16, 17
  })
})
