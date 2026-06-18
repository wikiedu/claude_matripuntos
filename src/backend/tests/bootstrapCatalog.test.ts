// Unit tests for bootstrapCatalog.bootstrapActivityCatalog.
//
// Key properties:
//   1. Idempotency guard (alreadyRan): second call within the same module is a no-op
//   2. CATALOG_AUTOSEED=false → immediate return without touching DB
//   3. New templates → created; existing ones → skipped (findFirst returns a hit)
//   4. DB failure → logged and swallowed (server boots anyway)

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

const mockFindFirst: any = jest.fn()
const mockCreate: any = jest.fn()
const mockPrisma: any = {
  activityTemplate: { findFirst: mockFindFirst, create: mockCreate },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
jest.mock('../src/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

// We need to reset the module between tests because `alreadyRan` is module-level state.
// Jest's module registry lets us do this with jest.resetModules().

async function freshBootstrap() {
  jest.resetModules()
  // Re-register mocks in the new module registry
  jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
  jest.mock('../src/lib/logger', () => ({
    logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }))
  // Stub the data module to keep tests fast (don't load all 50 templates)
  jest.mock('../src/data/activityTemplatesData', () => ({
    __esModule: true,
    ACTIVITY_TEMPLATES_SEED: [
      { category: 'trabajo', name: 'Jornada laboral', pointsBaseSuggested: 8 },
      { category: 'salud', name: 'Cita médica', pointsBaseSuggested: 4 },
    ],
  }))
  const mod = await import('../src/services/bootstrapCatalog.js')
  return mod.bootstrapActivityCatalog
}

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.CATALOG_AUTOSEED
})

describe('bootstrapActivityCatalog — CATALOG_AUTOSEED=false', () => {
  it('returns immediately without touching DB', async () => {
    process.env.CATALOG_AUTOSEED = 'false'
    const fn = await freshBootstrap()
    await fn()
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('bootstrapActivityCatalog — new templates', () => {
  it('creates templates that are not yet in DB (findFirst returns null)', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'tmpl1' })
    const fn = await freshBootstrap()
    await fn()
    // 2 seed templates × 1 create each
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })
})

describe('bootstrapActivityCatalog — existing templates', () => {
  it('skips templates that already exist (findFirst returns a hit)', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing' })
    const fn = await freshBootstrap()
    await fn()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates only the missing ones when mix of existing and new', async () => {
    mockFindFirst
      .mockResolvedValueOnce({ id: 'existing' })  // 'Jornada laboral' already there
      .mockResolvedValueOnce(null)                  // 'Cita médica' is new
    mockCreate.mockResolvedValue({ id: 'new1' })
    const fn = await freshBootstrap()
    await fn()
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})

describe('bootstrapActivityCatalog — DB error', () => {
  it('swallows errors and does not throw (server boots regardless)', async () => {
    mockFindFirst.mockRejectedValue(new Error('DB unreachable'))
    const fn = await freshBootstrap()
    // Should NOT throw
    await expect(fn()).resolves.toBeUndefined()
  })
})

describe('bootstrapActivityCatalog — idempotency guard', () => {
  it('second call within the same module instance is a no-op', async () => {
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 't1' })
    const fn = await freshBootstrap()
    await fn()
    await fn() // second call
    // findFirst should only be called for the first invocation (2 templates)
    expect(mockFindFirst).toHaveBeenCalledTimes(2)
  })
})
