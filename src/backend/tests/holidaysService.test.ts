import { describe, it, expect } from '@jest/globals'
import { loadHolidays, deriveHolidayEntries } from '../src/services/holidaysService.js'

describe('holidaysService', () => {
  it('loadHolidays returns ES 2026 list', () => {
    const list = loadHolidays(2026, 'es')
    expect(list.length).toBeGreaterThanOrEqual(8)
    expect(list[0]).toHaveProperty('date')
    expect(list[0]).toHaveProperty('title')
  })

  it('case-insensitive country', () => {
    expect(loadHolidays(2026, 'ES').length).toBeGreaterThan(0)
  })

  it('returns empty for unknown year', () => {
    expect(loadHolidays(1999, 'es')).toEqual([])
  })

  it('returns empty for unknown country', () => {
    expect(loadHolidays(2026, 'xx')).toEqual([])
  })

  it('deriveHolidayEntries returns drafts with type=holiday', () => {
    const drafts = deriveHolidayEntries(2026, 'es')
    expect(drafts.every(d => d.type === 'holiday')).toBe(true)
    expect(drafts.every(d => d.externalSource === 'auto')).toBe(true)
    expect(drafts.every(d => d.date instanceof Date)).toBe(true)
  })

  it('Año Nuevo is January 1st', () => {
    const drafts = deriveHolidayEntries(2026, 'es')
    const newYear = drafts.find(d => d.title.includes('Año Nuevo'))
    expect(newYear?.date.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })
})
