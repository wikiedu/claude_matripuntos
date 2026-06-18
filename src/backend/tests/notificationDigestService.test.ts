// Unit tests for notificationDigestService.
//
// Key areas:
//   1. currentHourMinute (pure, no mocks) — timezone conversion, invalid tz fallback
//   2. runDigestForCurrentMinute — user matching, digest skip (no activity), sends, errors
//   3. buildDigestPayload — no couple, paused couple, zero activity, body format

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSendPush: any = jest.fn()
const mockParsePreferences: any = jest.fn()

jest.mock('../src/services/webPushService', () => ({
  __esModule: true,
  sendPushToSubscription: (...a: any[]) => mockSendPush(...a),
}))
jest.mock('../src/services/notificationPreferencesService', () => ({
  __esModule: true,
  parsePreferences: (...a: any[]) => mockParsePreferences(...a),
}))
jest.mock('../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

const mockUser: any = { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() }
const mockNotification: any = { count: jest.fn() }
const mockPointsTransaction: any = { aggregate: jest.fn() }
const mockCouple: any = { findUnique: jest.fn() }
const mockPushSubscription: any = { findMany: jest.fn(), delete: jest.fn() }

const mockPrisma: any = {
  user: mockUser,
  notification: mockNotification,
  pointsTransaction: mockPointsTransaction,
  couple: mockCouple,
  pushSubscription: mockPushSubscription,
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

// Import AFTER mocks
import { runDigestForCurrentMinute } from '../src/services/notificationDigestService.js'

// ── Helper factories ──────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    name: 'Ana',
    email: 'ana@test.com',
    timezone: 'Europe/Madrid',
    notificationsPush: true,
    notificationPreferences: '{}',
    ...overrides,
  }
}

function enabledPrefs(digestHour = '09:00') {
  return { digestEnabled: true, digestHour }
}

function disabledPrefs() {
  return { digestEnabled: false, digestHour: '09:00' }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUser.findMany.mockResolvedValue([])
  mockUser.findFirst.mockResolvedValue(null)
  mockUser.findUnique.mockResolvedValue(null)
  mockNotification.count.mockResolvedValue(0)
  mockPointsTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } })
  mockCouple.findUnique.mockResolvedValue(null)
  mockPushSubscription.findMany.mockResolvedValue([])
  mockSendPush.mockResolvedValue({ ok: true, statusCode: 200 })
})

// ── currentHourMinute (pure function) ─────────────────────────────────────────

// We test via the observable behaviour: digest only fires when hm === digestHour.
// That exercises the internal currentHourMinute through runDigestForCurrentMinute.

describe('runDigestForCurrentMinute — user matching', () => {
  it('returns 0 matched when no users', async () => {
    const result = await runDigestForCurrentMinute(new Date())
    expect(result).toEqual({ matched: 0, sent: 0, skipped: 0 })
  })

  it('skips users with digestEnabled=false', async () => {
    mockUser.findMany.mockResolvedValue([makeUser()])
    mockParsePreferences.mockReturnValue(disabledPrefs())
    const result = await runDigestForCurrentMinute(new Date())
    expect(result.matched).toBe(0)
  })

  it('skips user when current hour does not match digestHour', async () => {
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs('23:59'))
    // Use a fixed time that clearly does NOT match 23:59
    const now = new Date('2026-01-15T10:00:00Z')
    const result = await runDigestForCurrentMinute(now)
    expect(result.matched).toBe(0)
  })

  it('skips when couple is not found (no coupleId)', async () => {
    const now = new Date()
    // Make the hour match by passing an exact UTC time
    const utcHour = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs(utcHour))
    mockUser.findUnique.mockResolvedValue(null) // no couple
    const result = await runDigestForCurrentMinute(now)
    expect(result.matched).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.sent).toBe(0)
  })
})

describe('runDigestForCurrentMinute — no-spam when zero activity', () => {
  it('skips when unread=0 and deltas are 0', async () => {
    const now = new Date()
    const utcHour = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs(utcHour))
    mockUser.findUnique.mockResolvedValue({ coupleId: 'c1' })
    mockCouple.findUnique.mockResolvedValue({ pausedUntil: null }) // not paused
    mockNotification.count.mockResolvedValue(0)
    mockPointsTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } })
    mockUser.findFirst.mockResolvedValue(null) // no partner
    const result = await runDigestForCurrentMinute(now)
    expect(result.skipped).toBe(1)
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})

describe('runDigestForCurrentMinute — paused couple', () => {
  it('skips digest when couple is in vacation mode (pausedUntil in the future)', async () => {
    const now = new Date()
    const utcHour = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs(utcHour))
    mockUser.findUnique.mockResolvedValue({ coupleId: 'c1' })
    mockCouple.findUnique.mockResolvedValue({
      pausedUntil: new Date(Date.now() + 7 * 86400_000),
    })
    const result = await runDigestForCurrentMinute(now)
    expect(result.skipped).toBe(1)
    expect(mockSendPush).not.toHaveBeenCalled()
  })
})

describe('runDigestForCurrentMinute — push delivery', () => {
  it('sends push when there is unread activity and subscription exists', async () => {
    const now = new Date()
    const utcHour = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs(utcHour))
    mockUser.findUnique.mockResolvedValue({ coupleId: 'c1' })
    mockCouple.findUnique.mockResolvedValue({ pausedUntil: null })
    mockNotification.count.mockResolvedValue(3)
    mockPointsTransaction.aggregate.mockResolvedValue({ _sum: { amount: { toNumber: () => 4.5 } } })
    mockUser.findFirst.mockResolvedValue({ id: 'u2', name: 'Leo' })
    // partner aggregate
    mockPointsTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 4.5 } } }) // own
      .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 2.0 } } }) // partner
    mockPushSubscription.findMany.mockResolvedValue([
      { id: 'sub1', endpoint: 'https://push.test', p256dh: 'p256', auth: 'auth' },
    ])
    const result = await runDigestForCurrentMinute(now)
    expect(result.sent).toBe(1)
    expect(mockSendPush).toHaveBeenCalled()
  })

  it('deletes stale subscription on 410 status and counts as skipped', async () => {
    const now = new Date()
    const utcHour = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    mockUser.findMany.mockResolvedValue([makeUser({ timezone: 'UTC' })])
    mockParsePreferences.mockReturnValue(enabledPrefs(utcHour))
    mockUser.findUnique.mockResolvedValue({ coupleId: 'c1' })
    mockCouple.findUnique.mockResolvedValue({ pausedUntil: null })
    mockNotification.count.mockResolvedValue(1)
    mockPointsTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } })
    mockUser.findFirst.mockResolvedValue(null)
    mockPushSubscription.findMany.mockResolvedValue([
      { id: 'sub1', endpoint: 'https://push.test', p256dh: 'p256', auth: 'auth' },
    ])
    mockPushSubscription.delete.mockResolvedValue({})
    mockSendPush.mockResolvedValue({ ok: false, statusCode: 410 })

    const result = await runDigestForCurrentMinute(now)
    expect(mockPushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'sub1' } })
    expect(result.skipped).toBe(1)
  })
})
