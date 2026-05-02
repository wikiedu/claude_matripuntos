// v1.7 — Hermetic tests para achievementEngineV2. Pure logic.

import { describe, it, expect } from '@jest/globals'
import { evaluateNewUnlocks, computeProgress, visibleCatalog, type CoupleMetrics } from '../src/services/achievementEngineV2.js'
import { ACHIEVEMENT_CATALOG } from '../src/data/achievementCatalog.js'

const ZERO_METRICS: CoupleMetrics = {
  events_accepted: 0,
  tasks_verified_mutual: 0,
  moods_set: 0,
  phrases_seen: 0,
  negotiations_resolved: 0,
  daily_streak: 0,
  weekly_streak: 0,
  balanced_days: 0,
  categories_distinct: 0,
  categories_balanced_3: 0,
  event_types_distinct: 0,
  couple_age_days: 0,
  weekly_max_balance: 0,
  no_dispute_days: 0,
  perfect_weeks: 0,
}

describe('achievementEngineV2.evaluateNewUnlocks', () => {
  it('returns empty when all metrics zero', () => {
    const r = evaluateNewUnlocks(ZERO_METRICS, new Set())
    expect(r).toHaveLength(0)
  })

  it('unlocks first-activity at events_accepted=1', () => {
    const r = evaluateNewUnlocks({ ...ZERO_METRICS, events_accepted: 1 }, new Set())
    expect(r.map(x => x.id)).toContain('first-activity')
  })

  it('does NOT unlock first-activity if already in alreadyUnlocked', () => {
    const r = evaluateNewUnlocks({ ...ZERO_METRICS, events_accepted: 1 }, new Set(['first-activity']))
    expect(r.map(x => x.id)).not.toContain('first-activity')
  })

  it('unlocks streak-7 + streak-30 if daily_streak=30', () => {
    const r = evaluateNewUnlocks({ ...ZERO_METRICS, daily_streak: 30 }, new Set())
    const ids = r.map(x => x.id)
    expect(ids).toContain('streak-7')
    expect(ids).toContain('streak-30')
    expect(ids).not.toContain('streak-90')
  })

  it('unlocks legendary streak-365 at exactly 365 daily_streak', () => {
    const r = evaluateNewUnlocks({ ...ZERO_METRICS, daily_streak: 365 }, new Set())
    expect(r.map(x => x.id)).toContain('streak-365')
  })

  it('unlocks collab-50 at tasks_verified_mutual=60', () => {
    const r = evaluateNewUnlocks({ ...ZERO_METRICS, tasks_verified_mutual: 60 }, new Set())
    const ids = r.map(x => x.id)
    expect(ids).toContain('collab-10')
    expect(ids).toContain('collab-50')
    expect(ids).not.toContain('collab-100')
  })
})

describe('achievementEngineV2.computeProgress', () => {
  it('orders results by progress desc (closest first)', () => {
    const r = computeProgress({ ...ZERO_METRICS, daily_streak: 5 }, new Set())
    // streak-7 está al 5/7 ≈ 0.71 — debe ir antes que streak-30 al 5/30 ≈ 0.17
    const streakRanked = r.filter(x => x.achievementId.startsWith('streak-'))
    expect(streakRanked[0].achievementId).toBe('streak-7')
    expect(streakRanked[1].achievementId).toBe('streak-30')
  })

  it('caps progress at 1', () => {
    const r = computeProgress({ ...ZERO_METRICS, daily_streak: 1000 }, new Set())
    for (const e of r) {
      expect(e.progress).toBeLessThanOrEqual(1)
    }
  })

  it('excludes hidden achievements from progress list', () => {
    const r = computeProgress({ ...ZERO_METRICS, daily_streak: 999 }, new Set())
    // streak-1000 is hidden; should not appear in progress list
    expect(r.map(x => x.achievementId)).not.toContain('streak-1000')
  })

  it('excludes already-unlocked achievements', () => {
    const r = computeProgress(ZERO_METRICS, new Set(['first-mood']))
    expect(r.map(x => x.achievementId)).not.toContain('first-mood')
  })
})

describe('achievementEngineV2.visibleCatalog', () => {
  it('hides legendary hidden achievements when not unlocked', () => {
    const v = visibleCatalog(new Set())
    expect(v.map(x => x.id)).not.toContain('streak-1000')
    expect(v.map(x => x.id)).not.toContain('hito-perfect-week')
  })

  it('reveals hidden achievements after unlock', () => {
    const v = visibleCatalog(new Set(['streak-1000']))
    expect(v.map(x => x.id)).toContain('streak-1000')
  })
})

describe('ACHIEVEMENT_CATALOG integrity', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENT_CATALOG.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has 30 entries (6 categories × 5)', () => {
    expect(ACHIEVEMENT_CATALOG.length).toBe(30)
  })

  it('every entry has rewardXp > 0', () => {
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(a.rewardXp).toBeGreaterThan(0)
    }
  })

  it('every entry has valid rarity', () => {
    const valid = new Set(['common', 'rare', 'epic', 'legendary'])
    for (const a of ACHIEVEMENT_CATALOG) {
      expect(valid.has(a.rarity)).toBe(true)
    }
  })
})
