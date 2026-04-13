import { getLevelInfo, getDailyMultiplier, getWeeklyBonus, LEVELS } from '../src/services/gamificationService.js'

describe('getLevelInfo', () => {
  it('returns nido at 0 XP', () => {
    const info = getLevelInfo(0)
    expect(info.current.level).toBe('nido')
    expect(info.next.level).toBe('brote')
  })

  it('returns brote at 300 XP', () => {
    const info = getLevelInfo(300)
    expect(info.current.level).toBe('brote')
  })

  it('returns eterno at 80000 XP', () => {
    const info = getLevelInfo(80000)
    expect(info.current.level).toBe('eterno')
    expect(info.xpProgress).toBe(100)
  })

  it('calculates correct xpProgress mid-level', () => {
    // brote: 300–2000. At 1150: (1150-300)/(2000-300) = 850/1700 = 50%
    const info = getLevelInfo(1150)
    expect(info.current.level).toBe('brote')
    expect(info.xpProgress).toBe(50)
  })
})

describe('getDailyMultiplier', () => {
  it('returns 1.0 for 0-2 days', () => {
    expect(getDailyMultiplier(0)).toBe(1.0)
    expect(getDailyMultiplier(2)).toBe(1.0)
  })
  it('returns 1.1 for 3-6 days', () => {
    expect(getDailyMultiplier(3)).toBe(1.1)
    expect(getDailyMultiplier(6)).toBe(1.1)
  })
  it('returns 1.3 for 7-13 days', () => {
    expect(getDailyMultiplier(7)).toBe(1.3)
    expect(getDailyMultiplier(13)).toBe(1.3)
  })
  it('returns 2.0 for 90+ days', () => {
    expect(getDailyMultiplier(90)).toBe(2.0)
    expect(getDailyMultiplier(365)).toBe(2.0)
  })
})

describe('getWeeklyBonus', () => {
  it('returns 0 for 0 weeks', () => {
    expect(getWeeklyBonus(0)).toBe(0)
  })
  it('returns 0.05 per week', () => {
    expect(getWeeklyBonus(2)).toBe(0.10)
    expect(getWeeklyBonus(3)).toBe(0.15)
  })
  it('caps at 0.20', () => {
    expect(getWeeklyBonus(4)).toBe(0.20)
    expect(getWeeklyBonus(10)).toBe(0.20)
  })
})
