// Tests herméticos para redBalanceService.
// Prioridad ALTA: bug histórico timezone (v2.7.2 S2-7), vacation mode, streaks.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma: any = {
  couple: { findUnique: jest.fn<any>() },
  user: { findFirst: jest.fn<any>() },
  pointsTransaction: { findMany: jest.fn<any>() },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { computeRedBalance } from '../src/services/redBalanceService.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-10T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

/** Build a transaction `n` days before NOW with given userId and amount */
function tx(userId: string, amount: number, daysAgo: number) {
  return {
    userId,
    amount: String(amount),
    createdAt: new Date(NOW.getTime() - daysAgo * DAY_MS),
  }
}

const partner = { id: 'p1', name: 'Carlos' }

function setup(overrides: { coupleId?: string; pausedUntil?: Date | null } = {}) {
  mockPrisma.couple.findUnique.mockResolvedValue({
    pausedUntil: overrides.pausedUntil ?? null,
  })
  mockPrisma.user.findFirst.mockResolvedValue(partner)
}

beforeEach(() => {
  Object.values(mockPrisma).forEach((fn: any) => fn.mockReset?.())
})

// ── Vacation mode ────────────────────────────────────────────────────────────

describe('computeRedBalance — vacation mode', () => {
  it('returns zero status if couple is paused', async () => {
    setup({ pausedUntil: new Date(NOW.getTime() + DAY_MS) })

    const result = await computeRedBalance('c1', 'u1', NOW)

    expect(result.daysInRed).toBe(0)
    expect(result.severity).toBeNull()
    expect(result.myDailyDelta).toHaveLength(0)
  })

  it('proceeds normally if pausedUntil is in the past', async () => {
    setup({ pausedUntil: new Date(NOW.getTime() - DAY_MS) })
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([])

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.partnerName).toBe('Carlos')
  })
})

// ── No partner ───────────────────────────────────────────────────────────────

describe('computeRedBalance — no partner', () => {
  it('returns zero status if no active partner', async () => {
    setup()
    mockPrisma.user.findFirst.mockResolvedValue(null)

    const result = await computeRedBalance('c1', 'u1', NOW)

    expect(result.daysInRed).toBe(0)
    expect(result.severity).toBeNull()
    expect(result.partnerName).toBeNull()
  })
})

// ── No activity ──────────────────────────────────────────────────────────────

describe('computeRedBalance — no transactions', () => {
  it('returns zero when there are no transactions', async () => {
    setup()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([])

    const result = await computeRedBalance('c1', 'u1', NOW)

    expect(result.daysInRed).toBe(0)
    expect(result.severity).toBeNull()
    expect(result.myDailyDelta).toHaveLength(14)
    expect(result.myDailyDelta.every(v => v === 0)).toBe(true)
  })
})

// ── Streak detection ─────────────────────────────────────────────────────────

describe('computeRedBalance — consecutive streak', () => {
  it('counts days in red only from the most recent day backward (streak break stops count)', async () => {
    setup()
    // Days 0-2 (most recent): user has less than partner → red
    // Day 3: both zero (breaks streak)
    // Days 4-9: also red, but shouldn't count
    const transactions = [
      tx('u1', 1, 0), tx('p1', 3, 0),  // day 0: red
      tx('u1', 1, 1), tx('p1', 3, 1),  // day 1: red
      tx('u1', 1, 2), tx('p1', 3, 2),  // day 2: red
      // day 3: zero activity → streak break
      tx('u1', 1, 4), tx('p1', 3, 4),  // day 4: red, but outside streak
    ]
    mockPrisma.pointsTransaction.findMany.mockResolvedValue(transactions)

    const result = await computeRedBalance('c1', 'u1', NOW)

    expect(result.daysInRed).toBe(3)
    expect(result.severity).toBe('soft')
  })

  it('severity is null for 0 consecutive days in red', async () => {
    setup()
    // User earns more than partner every day
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([
      tx('u1', 5, 0), tx('p1', 1, 0),
    ])

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.daysInRed).toBe(0)
    expect(result.severity).toBeNull()
  })

  it('severity is soft for exactly 3 consecutive days in red', async () => {
    setup()
    const transactions = Array.from({ length: 3 }, (_, i) => [
      tx('u1', 1, i), tx('p1', 5, i),
    ]).flat()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue(transactions)

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.daysInRed).toBe(3)
    expect(result.severity).toBe('soft')
  })

  it('severity is warn for 7 consecutive days in red', async () => {
    setup()
    const transactions = Array.from({ length: 7 }, (_, i) => [
      tx('u1', 1, i), tx('p1', 5, i),
    ]).flat()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue(transactions)

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.daysInRed).toBe(7)
    expect(result.severity).toBe('warn')
  })

  it('severity is crit for 14 consecutive days in red', async () => {
    setup()
    const transactions = Array.from({ length: 14 }, (_, i) => [
      tx('u1', 1, i), tx('p1', 5, i),
    ]).flat()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue(transactions)

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.daysInRed).toBe(14)
    expect(result.severity).toBe('crit')
  })

  it('does not count a zero-activity day as red (both zero = no red)', async () => {
    setup()
    // Days 0 and 1 are red, day 2 both zero (no transactions), days 3+ are red
    const transactions = [
      tx('u1', 1, 0), tx('p1', 5, 0),
      tx('u1', 1, 1), tx('p1', 5, 1),
      // day 2: no transactions
      tx('u1', 1, 3), tx('p1', 5, 3),
    ]
    mockPrisma.pointsTransaction.findMany.mockResolvedValue(transactions)

    const result = await computeRedBalance('c1', 'u1', NOW)
    // Streak breaks at day 2 (zero activity), so only days 0+1 count
    expect(result.daysInRed).toBe(2)
  })
})

// ── myDailyDelta output ──────────────────────────────────────────────────────

describe('computeRedBalance — myDailyDelta array', () => {
  it('returns 14 elements corresponding to the last 14 days', async () => {
    setup()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([
      tx('u1', 3, 0), // today: 3
      tx('u1', 2, 1), // yesterday: 2
    ])

    const result = await computeRedBalance('c1', 'u1', NOW)

    expect(result.myDailyDelta).toHaveLength(14)
    // Last element = day 0 (today), second-to-last = day 1 (yesterday)
    expect(result.myDailyDelta[13]).toBe(3)
    expect(result.myDailyDelta[12]).toBe(2)
    expect(result.myDailyDelta[0]).toBe(0) // 13 days ago: no transactions
  })

  it('aggregates multiple transactions on the same day', async () => {
    setup()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([
      tx('u1', 2, 0),
      tx('u1', 3, 0), // two transactions today
    ])

    const result = await computeRedBalance('c1', 'u1', NOW)
    expect(result.myDailyDelta[13]).toBe(5)
  })
})

// ── DB query window ──────────────────────────────────────────────────────────

describe('computeRedBalance — DB query', () => {
  it('queries exactly 14 days of transactions', async () => {
    setup()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([])

    await computeRedBalance('c1', 'u1', NOW)

    const call = mockPrisma.pointsTransaction.findMany.mock.calls[0][0] as any
    const gte: Date = call.where.createdAt.gte
    const expectedStart = new Date(NOW.getTime() - 14 * DAY_MS)
    // Allow 1 second tolerance
    expect(Math.abs(gte.getTime() - expectedStart.getTime())).toBeLessThan(1000)
  })

  it('queries transactions for both user and partner', async () => {
    setup()
    mockPrisma.pointsTransaction.findMany.mockResolvedValue([])

    await computeRedBalance('c1', 'u1', NOW)

    const call = mockPrisma.pointsTransaction.findMany.mock.calls[0][0] as any
    expect(call.where.userId.in).toEqual(expect.arrayContaining(['u1', 'p1']))
  })
})
