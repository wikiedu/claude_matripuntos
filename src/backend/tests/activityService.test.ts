// Unit tests for activityService.getRecentActivity.
// humanizeActivityType is internal but tested indirectly through event.type.
//
// Critical business logic:
//   - Accepted/forced events → delta = -pts (creator pays)
//   - Rejected events → delta = 0
//   - Verified task logs → delta = +pts (executor earns)
//   - Negotiation rows → delta = 0, no userId
//   - Results merged and sorted DESC by date, capped at 5

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockPrisma: any = {
  event: { findMany: jest.fn() },
  taskLog: { findMany: jest.fn() },
  negotiation: { findMany: jest.fn() },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { getRecentActivity } from '../src/services/activityService.js'

const COUPLE_ID = 'c1'

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev1',
    type: 'ocio',
    title: 'Cena',
    status: 'accepted',
    createdBy: 'u1',
    pointsAgreed: 10,
    pointsCalculated: 10,
    dateEnd: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-10T20:00:00Z'),
    ...overrides,
  }
}

function makeTaskLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tl1',
    taskId: 'task1',
    task: { name: 'Cocinar' },
    completedBy: 'u2',
    pointsFinal: 2.5,
    verifiedAt: new Date('2026-01-10T18:00:00Z'),
    ...overrides,
  }
}

function makeNegotiation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'neg1',
    eventId: 'ev1',
    event: { type: 'trabajo' },
    respondedAt: new Date('2026-01-10T15:00:00Z'),
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.event.findMany.mockResolvedValue([])
  mockPrisma.taskLog.findMany.mockResolvedValue([])
  mockPrisma.negotiation.findMany.mockResolvedValue([])
})

describe('getRecentActivity — event delta logic', () => {
  it('accepted event: delta = -pointsAgreed (creator pays)', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ status: 'accepted', pointsAgreed: 12 })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items).toHaveLength(1)
    expect(items[0].delta).toBe(-12)
    expect(items[0].type).toBe('event')
    expect(items[0].status).toBe('accepted')
  })

  it('forced event: delta = -pointsAgreed', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ status: 'forced', pointsAgreed: 8 })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].delta).toBe(-8)
  })

  it('rejected event: delta = 0', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ status: 'rejected' })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].delta).toBe(0)
  })

  it('uses pointsCalculated when pointsAgreed is null', async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      makeEvent({ status: 'accepted', pointsAgreed: null, pointsCalculated: 7 }),
    ])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].delta).toBe(-7)
  })

  it('falls back to 0 when both pointsAgreed and pointsCalculated are null', async () => {
    mockPrisma.event.findMany.mockResolvedValue([
      makeEvent({ status: 'accepted', pointsAgreed: null, pointsCalculated: null }),
    ])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    // -0 and 0 are both valid; normalize with Math.abs to avoid Object.is(-0,0)=false
    expect(Math.abs(items[0].delta)).toBe(0)
  })
})

describe('getRecentActivity — humanizeActivityType (via event.title)', () => {
  it('uses event.title when present', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ title: 'Mi evento' })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].name).toBe('Mi evento')
  })

  it('falls back to humanized type when title is null', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ title: null, type: 'deporte_hobby' })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    // humanizeActivityType('deporte_hobby') → 'Deporte/Hobby' (known map entry)
    expect(items[0].name).toBe('Deporte/Hobby')
  })

  it('falls back to Title Case for unknown type codes', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ title: null, type: 'mi_tipo_raro' })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].name).toBe('Mi Tipo Raro')
  })

  it('returns "Actividad" for null type', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ title: null, type: null })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].name).toBe('Actividad')
  })
})

describe('getRecentActivity — task log', () => {
  it('task log: delta = +pointsFinal, type = task, status = verified', async () => {
    mockPrisma.taskLog.findMany.mockResolvedValue([makeTaskLog()])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items).toHaveLength(1)
    expect(items[0].delta).toBe(2.5)
    expect(items[0].type).toBe('task')
    expect(items[0].status).toBe('verified')
    expect(items[0].name).toBe('Cocinar')
  })

  it('task log with null pointsFinal → delta = 0', async () => {
    mockPrisma.taskLog.findMany.mockResolvedValue([makeTaskLog({ pointsFinal: null })])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items[0].delta).toBe(0)
  })
})

describe('getRecentActivity — negotiation', () => {
  it('negotiation: delta = 0, type = negotiation, userId = null', async () => {
    mockPrisma.negotiation.findMany.mockResolvedValue([makeNegotiation()])
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items).toHaveLength(1)
    expect(items[0].delta).toBe(0)
    expect(items[0].type).toBe('negotiation')
    expect(items[0].userId).toBeNull()
    expect(items[0].name).toContain('Negociación')
  })
})

describe('getRecentActivity — sorting and cap', () => {
  it('returns items sorted DESC by date and caps at 5', async () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      makeEvent({ id: `ev${i}`, updatedAt: new Date(`2026-01-0${i + 1}T12:00:00Z`) }),
    )
    const logs = Array.from({ length: 3 }, (_, i) =>
      makeTaskLog({ id: `tl${i}`, verifiedAt: new Date(`2026-01-0${i + 4}T12:00:00Z`) }),
    )
    mockPrisma.event.findMany.mockResolvedValue(events)
    mockPrisma.taskLog.findMany.mockResolvedValue(logs)

    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items).toHaveLength(5)
    // newest first
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].date.getTime()).toBeGreaterThanOrEqual(items[i].date.getTime())
    }
  })

  it('returns empty array when DB returns nothing', async () => {
    const items = await getRecentActivity(mockPrisma, COUPLE_ID)
    expect(items).toEqual([])
  })
})
