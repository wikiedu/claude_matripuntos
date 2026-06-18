// Tests herméticos para achievementCheckService.
// Cubren: evaluateCondition para cada uno de los 8 tipos soportados,
// checkAllAchievements (happy path, skip ya-desbloqueados, condición mal formada),
// getAchievementsMap (status unlocked/in_progress/locked, secretos).

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  achievementDefinition: { findMany: jest.fn() },
  coupleAchievement:    { findMany: jest.fn(), upsert: jest.fn() },
  taskLog:              { count: jest.fn() },
  couple:               { findUnique: jest.fn() },
  coupleScore:          { findFirst: jest.fn(), findMany: jest.fn() },
  event:                { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
  notification:         { create: jest.fn() },
  user:                 { findMany: jest.fn() },
}
const mockCreateCoupleNotification = jest.fn<any>()

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
jest.mock('../src/services/notificationService', () => ({
  __esModule: true,
  createCoupleNotification: (...args: any[]) => mockCreateCoupleNotification(...args),
}))

import { checkAllAchievements, getAchievementsMap } from '../src/services/achievementCheckService.js'

// ── Factories ─────────────────────────────────────────────────────────────────

function makeDef(overrides: Record<string, any> = {}) {
  return {
    id: 'def1',
    name: 'Primer paso',
    description: 'Primera tarea',
    icon: '👣',
    rarity: 'common',
    category: 'constancia',
    condition: JSON.stringify({ type: 'tasks_completed', threshold: 1 }),
    xpReward: 10,
    orderIndex: 1,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.coupleAchievement.upsert.mockResolvedValue({} as any)
  mockCreateCoupleNotification.mockResolvedValue({} as any)
})

// ── checkAllAchievements — condition types ────────────────────────────────────

describe('checkAllAchievements — tasks_completed', () => {
  it('unlocks when verified tasks >= threshold', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([makeDef()])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.taskLog.count.mockResolvedValue(1)

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
    expect(mockPrisma.coupleAchievement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ unlockedAt: expect.any(Date) }),
      })
    )
  })

  it('does not unlock when tasks < threshold', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([makeDef()])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.taskLog.count.mockResolvedValue(0)

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })
})

describe('checkAllAchievements — daily_streak', () => {
  it('unlocks when dailyStreakDays >= threshold', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'daily_streak', threshold: 3 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.couple.findUnique.mockResolvedValue({ dailyStreakDays: 5 })

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
  })
})

describe('checkAllAchievements — equilibrium_week', () => {
  it('unlocks when last equilibrium score >= threshold', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'equilibrium_week', threshold: 80 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.coupleScore.findFirst.mockResolvedValue({ equilibrium: 85 })

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
  })

  it('does not unlock when no score exists', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'equilibrium_week', threshold: 80 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.coupleScore.findFirst.mockResolvedValue(null)

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })
})

describe('checkAllAchievements — equilibrium_consecutive_weeks', () => {
  it('unlocks when N consecutive weeks all have equilibrium >= 40', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'equilibrium_consecutive_weeks', threshold: 2 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.coupleScore.findMany.mockResolvedValue([
      { equilibrium: 50 }, { equilibrium: 60 },
    ])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
  })

  it('does not unlock when fewer weeks than threshold exist', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'equilibrium_consecutive_weeks', threshold: 4 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.coupleScore.findMany.mockResolvedValue([{ equilibrium: 80 }])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })
})

describe('checkAllAchievements — negotiations_without_force', () => {
  it('unlocks when N accepted events and none are forced', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'negotiations_without_force', threshold: 2 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.event.findMany.mockResolvedValue([
      { status: 'accepted' }, { status: 'accepted' },
    ])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
  })
})

describe('checkAllAchievements — no_forced_events_days', () => {
  it('unlocks when no forced events in the last N days', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'no_forced_events_days', threshold: 30 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.event.count.mockResolvedValue(0)
    mockPrisma.event.findFirst.mockResolvedValue(null)
    // Couple created >30 days ago
    mockPrisma.couple.findUnique.mockResolvedValue({
      createdAt: new Date(Date.now() - 35 * 86400000),
    })

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toContain('def1')
  })

  it('does not unlock when a forced event exists in the window', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'no_forced_events_days', threshold: 30 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])
    mockPrisma.event.count.mockResolvedValue(1)

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })
})

describe('checkAllAchievements — unknown condition type', () => {
  it('skips (returns not met) for unrecognised condition types', async () => {
    const def = makeDef({ condition: JSON.stringify({ type: 'future_type_v3', threshold: 1 }) })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })

  it('skips definitions with null/invalid condition JSON', async () => {
    const def = makeDef({ condition: null })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
  })
})

describe('checkAllAchievements — already unlocked', () => {
  it('skips definitions that are already unlocked', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([makeDef()])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([
      { achievementDefinitionId: 'def1', unlockedAt: new Date() },
    ])

    const unlocked = await checkAllAchievements('c1')
    expect(unlocked).toHaveLength(0)
    expect(mockPrisma.taskLog.count).not.toHaveBeenCalled()
  })
})

// ── getAchievementsMap — status derivation ────────────────────────────────────

describe('getAchievementsMap', () => {
  const def1 = makeDef({ id: 'd1', orderIndex: 1, category: 'constancia' })
  const def2 = makeDef({ id: 'd2', orderIndex: 2, category: 'constancia', name: 'Racha 3' })

  it('marks first achievement in_progress when none unlocked', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def1, def2])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])

    const map = await getAchievementsMap('c1')
    expect(map[0].status).toBe('in_progress') // first in category always in_progress
    expect(map[1].status).toBe('locked')       // second is locked until first unlocked
  })

  it('marks achievement unlocked when coupleAchievement has unlockedAt', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def1])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([
      { achievementDefinitionId: 'd1', unlockedAt: new Date(), progress: null },
    ])

    const map = await getAchievementsMap('c1')
    expect(map[0].status).toBe('unlocked')
    expect(map[0].unlockedAt).toBeDefined()
  })

  it('hides name and description for secretos category when not unlocked', async () => {
    const secret = makeDef({ id: 's1', category: 'secretos', name: 'Secreto oscuro' })
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([secret])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([])

    const map = await getAchievementsMap('c1')
    expect(map[0].name).toBe('???')
    expect(map[0].description).toBe('Logro secreto')
  })

  it('returns progress percentage when progress JSON present', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def1])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([
      { achievementDefinitionId: 'd1', unlockedAt: null, progress: JSON.stringify({ current: 5, target: 10 }) },
    ])

    const map = await getAchievementsMap('c1')
    expect(map[0].progress).toEqual({ current: 5, target: 10, percentage: 50 })
  })

  it('keeps status in_progress when previous in same category is unlocked', async () => {
    mockPrisma.achievementDefinition.findMany.mockResolvedValue([def1, def2])
    mockPrisma.coupleAchievement.findMany.mockResolvedValue([
      { achievementDefinitionId: 'd1', unlockedAt: new Date(), progress: null },
    ])

    const map = await getAchievementsMap('c1')
    expect(map[0].status).toBe('unlocked')
    expect(map[1].status).toBe('in_progress')
  })
})
