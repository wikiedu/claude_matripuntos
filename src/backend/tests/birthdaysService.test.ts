import { describe, it, expect } from '@jest/globals'
import { deriveBirthdaysForYear } from '../src/services/birthdaysService.js'

const KID = (id: string, name: string, iso: string) => ({
  id, name, dateOfBirth: new Date(iso),
})

describe('birthdaysService.deriveBirthdaysForYear', () => {
  it('returns child birthday with age', () => {
    const drafts = deriveBirthdaysForYear([KID('c1', 'Lucía', '2020-04-15T00:00:00Z')], null, 2026)
    expect(drafts).toHaveLength(1)
    expect(drafts[0].title).toContain('Lucía')
    expect(drafts[0].title).toContain('6')
    expect(drafts[0].date.toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('skips child whose year is before dob', () => {
    const drafts = deriveBirthdaysForYear([KID('c1', 'Future', '2030-01-01T00:00:00Z')], null, 2026)
    expect(drafts).toHaveLength(0)
  })

  it('returns anniversary with year count', () => {
    const drafts = deriveBirthdaysForYear([], { startDate: new Date('2020-06-10T00:00:00Z') }, 2026)
    expect(drafts).toHaveLength(1)
    expect(drafts[0].title).toContain('6 años')
    expect(drafts[0].date.getUTCMonth()).toBe(5)
  })

  it('skips anniversary in same year as start', () => {
    const drafts = deriveBirthdaysForYear([], { startDate: new Date('2026-06-10T00:00:00Z') }, 2026)
    expect(drafts.find(d => d.metadata.kind === 'anniversary')).toBeUndefined()
  })

  it('returns both children and anniversary', () => {
    const drafts = deriveBirthdaysForYear(
      [KID('c1', 'A', '2020-01-15T00:00:00Z'), KID('c2', 'B', '2022-08-20T00:00:00Z')],
      { startDate: new Date('2018-03-05T00:00:00Z') },
      2026,
    )
    expect(drafts).toHaveLength(3)
    expect(drafts.filter(d => d.metadata.kind === 'child').length).toBe(2)
    expect(drafts.filter(d => d.metadata.kind === 'anniversary').length).toBe(1)
  })

  it('sets externalSource auto on all', () => {
    const drafts = deriveBirthdaysForYear([KID('c1', 'X', '2020-01-01T00:00:00Z')], null, 2026)
    expect(drafts.every(d => d.externalSource === 'auto')).toBe(true)
    expect(drafts.every(d => d.allDay === true)).toBe(true)
  })
})
