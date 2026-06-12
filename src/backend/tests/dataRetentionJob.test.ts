// Tests herméticos para dataRetentionJob.
// Prioridad MEDIA: cutoff correctness, dry-run toggle, off-by-one en user purge (31d).

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mock Prisma ──────────────────────────────────────────────────────────────

const mockPrisma: any = {
  moodLog:      { count: jest.fn<any>(), deleteMany: jest.fn<any>() },
  notification: { count: jest.fn<any>(), deleteMany: jest.fn<any>() },
  invitation:   { count: jest.fn<any>(), deleteMany: jest.fn<any>() },
  user:         { count: jest.fn<any>(), deleteMany: jest.fn<any>() },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

import { runRetention } from '../src/jobs/dataRetentionJob.js'

function resetMocks() {
  for (const model of Object.values(mockPrisma) as any[]) {
    model.count?.mockReset()
    model.deleteMany?.mockReset()
  }
}

beforeEach(resetMocks)

// ── Dry-run mode ─────────────────────────────────────────────────────────────

describe('runRetention — dry-run', () => {
  it('calls count (not deleteMany) in dry-run mode', async () => {
    mockPrisma.moodLog.count.mockResolvedValue(5)
    mockPrisma.notification.count.mockResolvedValue(3)
    mockPrisma.invitation.count.mockResolvedValue(1)
    mockPrisma.user.count.mockResolvedValue(2)

    const result = await runRetention({ dryRun: true })

    expect(result).toEqual({ moodLog: 5, notification: 3, invitation: 1, userPurged: 2 })

    expect(mockPrisma.moodLog.count).toHaveBeenCalled()
    expect(mockPrisma.notification.count).toHaveBeenCalled()
    expect(mockPrisma.invitation.count).toHaveBeenCalled()
    expect(mockPrisma.user.count).toHaveBeenCalled()

    expect(mockPrisma.moodLog.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.notification.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.invitation.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.user.deleteMany).not.toHaveBeenCalled()
  })
})

// ── Real-run mode ─────────────────────────────────────────────────────────────

describe('runRetention — real run', () => {
  it('calls deleteMany (not count) and returns deleted counts', async () => {
    mockPrisma.moodLog.deleteMany.mockResolvedValue({ count: 12 })
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 7 })
    mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 2 })
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 1 })

    const result = await runRetention({ dryRun: false })

    expect(result).toEqual({ moodLog: 12, notification: 7, invitation: 2, userPurged: 1 })

    expect(mockPrisma.moodLog.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.invitation.deleteMany).toHaveBeenCalled()
    expect(mockPrisma.user.deleteMany).toHaveBeenCalled()

    expect(mockPrisma.moodLog.count).not.toHaveBeenCalled()
  })

  it('defaults to real run when no opts passed', async () => {
    mockPrisma.moodLog.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 })

    await runRetention()

    expect(mockPrisma.moodLog.deleteMany).toHaveBeenCalled()
  })
})

// ── Cutoff window correctness ────────────────────────────────────────────────

describe('runRetention — cutoff calculations', () => {
  const DAY_MS = 24 * 60 * 60 * 1000
  const tolerance = 5000 // 5s

  beforeEach(() => {
    // All return 0 so we just care about the `where` args
    for (const model of Object.values(mockPrisma) as any[]) {
      model.count?.mockResolvedValue(0)
      model.deleteMany?.mockResolvedValue({ count: 0 })
    }
  })

  it('moodLog cutoff is ~90 days ago', async () => {
    const before = Date.now()
    await runRetention({ dryRun: true })
    const after = Date.now()

    const call = mockPrisma.moodLog.count.mock.calls[0][0] as any
    const cutoff: Date = call.where.createdAt.lt
    const expectedMin = new Date(before - 90 * DAY_MS)
    const expectedMax = new Date(after - 90 * DAY_MS)

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - tolerance)
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + tolerance)
  })

  it('notification cutoff is ~60 days ago', async () => {
    const before = Date.now()
    await runRetention({ dryRun: true })
    const after = Date.now()

    const call = mockPrisma.notification.count.mock.calls[0][0] as any
    const cutoff: Date = call.where.createdAt.lt
    const expectedMin = new Date(before - 60 * DAY_MS)
    const expectedMax = new Date(after - 60 * DAY_MS)

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - tolerance)
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + tolerance)
  })

  it('invitation cutoff is ~14 days ago based on expiresAt', async () => {
    const before = Date.now()
    await runRetention({ dryRun: true })
    const after = Date.now()

    const call = mockPrisma.invitation.count.mock.calls[0][0] as any
    const cutoff: Date = call.where.expiresAt.lt

    const expectedMin = new Date(before - 14 * DAY_MS)
    const expectedMax = new Date(after - 14 * DAY_MS)

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - tolerance)
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + tolerance)
  })

  it('(v1.6.2 off-by-one fix) user purge cutoff is ~31 days ago (not 30)', async () => {
    const before = Date.now()
    await runRetention({ dryRun: true })
    const after = Date.now()

    const call = mockPrisma.user.count.mock.calls[0][0] as any
    const cutoff: Date = call.where.deletedAt.lt

    const expectedMin = new Date(before - 31 * DAY_MS)
    const expectedMax = new Date(after - 31 * DAY_MS)

    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - tolerance)
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + tolerance)

    // Verify it's NOT just 30 days (the off-by-one value)
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS)
    expect(cutoff.getTime()).toBeLessThan(thirtyDaysAgo.getTime())
  })
})

// ── Invitation: only deletes pending ─────────────────────────────────────────

describe('runRetention — invitation status filter', () => {
  it('only targets pending invitations', async () => {
    mockPrisma.moodLog.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.invitation.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.user.deleteMany.mockResolvedValue({ count: 0 })

    await runRetention({ dryRun: false })

    const call = mockPrisma.invitation.deleteMany.mock.calls[0][0] as any
    expect(call.where.status).toBe('pending')
  })
})
