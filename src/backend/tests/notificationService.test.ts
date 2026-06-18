// Unit tests for notificationService.
// All functions mock Prisma — no DB required.
//
// Gaps covered:
//  - createNotification: happy path, DB error swallowed (logger.error, no throw)
//  - createCoupleNotification: couple not found → early return, two users
//  - notifyEventProposed: proposer identity, notifies the *other* user
//  - notifyEventResponded: accepted / rejected / counter-proposed text
//  - notifyTaskCompleted: notifies partner (not the executor)
//  - notifyTaskDisputed: notifies original completer
//  - notifyConfigurationChanged: delegates to createCoupleNotification

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockCreate: any = jest.fn()
const mockFindUnique: any = jest.fn()
const mockPrisma: any = {
  notification: { create: mockCreate },
  couple: { findUnique: mockFindUnique },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
jest.mock('../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import {
  createNotification,
  createCoupleNotification,
  notifyEventProposed,
  notifyEventResponded,
  notifyTaskCompleted,
  notifyTaskDisputed,
  notifyConfigurationChanged,
} from '../src/services/notificationService.js'

const COUPLE_ID = 'c1'
const USER1 = { id: 'u1', name: 'Ana' }
const USER2 = { id: 'u2', name: 'Leo' }

function fakeCouple() {
  return {
    id: COUPLE_ID,
    users: [USER1, USER2],
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreate.mockResolvedValue({})
  mockFindUnique.mockResolvedValue(fakeCouple())
})

// ── createNotification ────────────────────────────────────────────────────────

describe('createNotification', () => {
  it('creates a notification with isRead=false', async () => {
    await createNotification({
      coupleId: COUPLE_ID,
      userId: 'u1',
      type: 'TEST',
      title: 'Hello',
      message: 'World',
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ isRead: false, type: 'TEST' }),
    })
  })

  it('includes relatedEventId when provided', async () => {
    await createNotification({
      coupleId: COUPLE_ID,
      userId: 'u1',
      type: 'EVENT_PROPOSED',
      title: 'T',
      message: 'M',
      relatedEventId: 'ev42',
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ relatedEventId: 'ev42' }),
    })
  })

  it('does NOT throw when Prisma throws — swallows error', async () => {
    mockCreate.mockRejectedValue(new Error('DB down'))
    await expect(
      createNotification({ coupleId: 'c1', userId: 'u1', type: 'T', title: 'T', message: 'M' }),
    ).resolves.toBeUndefined()
  })
})

// ── createCoupleNotification ──────────────────────────────────────────────────

describe('createCoupleNotification', () => {
  it('creates one notification per user in the couple', async () => {
    await createCoupleNotification(COUPLE_ID, 'CONFIG_CHANGE', 'Title', 'Body')
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('early-returns without creating notifications when couple is not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    await createCoupleNotification(COUPLE_ID, 'T', 'Title', 'Body')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does not throw when Prisma throws', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB error'))
    await expect(
      createCoupleNotification(COUPLE_ID, 'T', 'Title', 'Body'),
    ).resolves.toBeUndefined()
  })
})

// ── notifyEventProposed ───────────────────────────────────────────────────────

describe('notifyEventProposed', () => {
  it('notifies the partner (not the proposer)', async () => {
    await notifyEventProposed('ev1', COUPLE_ID, 'u1', 'Cena romántica')
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u2', // partner
        type: 'EVENT_PROPOSED',
        relatedEventId: 'ev1',
      }),
    })
  })

  it('includes proposer name in message', async () => {
    await notifyEventProposed('ev1', COUPLE_ID, 'u1', 'Cena romántica')
    const call = mockCreate.mock.calls[0][0] as any
    expect(call.data.message).toContain('Ana')
    expect(call.data.message).toContain('Cena romántica')
  })

  it('early-returns when couple is not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    await notifyEventProposed('ev1', COUPLE_ID, 'u1', 'Cena')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('early-returns when there is no other user (solo account)', async () => {
    mockFindUnique.mockResolvedValue({ id: COUPLE_ID, users: [USER1] })
    await notifyEventProposed('ev1', COUPLE_ID, 'u1', 'Cena')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

// ── notifyEventResponded ──────────────────────────────────────────────────────

describe('notifyEventResponded', () => {
  it('notifies proposer (opposite of responder)', async () => {
    await notifyEventResponded('ev1', COUPLE_ID, 'u2', 'accepted', 'Cena')
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'EVENT_RESPONSE',
      }),
    })
  })

  it('uses "aceptó" text for accepted status', async () => {
    await notifyEventResponded('ev1', COUPLE_ID, 'u2', 'accepted', 'Cena')
    const msg = (mockCreate.mock.calls[0][0] as any).data.message
    expect(msg).toContain('aceptó')
  })

  it('uses "rechazó" text for rejected status', async () => {
    await notifyEventResponded('ev1', COUPLE_ID, 'u2', 'rejected', 'Cena')
    const msg = (mockCreate.mock.calls[0][0] as any).data.message
    expect(msg).toContain('rechazó')
  })

  it('uses "contra-propuso" for any other status (counter offer)', async () => {
    await notifyEventResponded('ev1', COUPLE_ID, 'u2', 'counter_proposed', 'Cena')
    const msg = (mockCreate.mock.calls[0][0] as any).data.message
    expect(msg).toContain('contra-propuso')
  })
})

// ── notifyTaskCompleted ───────────────────────────────────────────────────────

describe('notifyTaskCompleted', () => {
  it('notifies partner — not the completer', async () => {
    await notifyTaskCompleted('tl1', COUPLE_ID, 'u1', 'Cocinar')
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u2',
        type: 'TASK_COMPLETED',
        relatedTaskLogId: 'tl1',
      }),
    })
  })

  it('includes task name and completer name in message', async () => {
    await notifyTaskCompleted('tl1', COUPLE_ID, 'u1', 'Cocinar')
    const msg = (mockCreate.mock.calls[0][0] as any).data.message
    expect(msg).toContain('Ana')
    expect(msg).toContain('Cocinar')
  })
})

// ── notifyTaskDisputed ────────────────────────────────────────────────────────

describe('notifyTaskDisputed', () => {
  it('notifies the original completer (not the disputer)', async () => {
    await notifyTaskDisputed('tl1', COUPLE_ID, 'u2', 'Cocinar', 'No estaba limpio')
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        type: 'TASK_DISPUTED',
        relatedTaskLogId: 'tl1',
      }),
    })
  })

  it('includes dispute reason in message', async () => {
    await notifyTaskDisputed('tl1', COUPLE_ID, 'u2', 'Cocinar', 'No estaba limpio')
    const msg = (mockCreate.mock.calls[0][0] as any).data.message
    expect(msg).toContain('No estaba limpio')
  })
})

// ── notifyConfigurationChanged ────────────────────────────────────────────────

describe('notifyConfigurationChanged', () => {
  it('creates notifications for both users', async () => {
    await notifyConfigurationChanged(COUPLE_ID, 'u1', 'points multiplier updated')
    expect(mockCreate).toHaveBeenCalledTimes(2)
    const calls = (mockCreate.mock.calls as any[]).map((c) => c[0].data)
    expect(calls.some((d) => d.type === 'CONFIGURATION_CHANGED')).toBe(true)
  })
})
