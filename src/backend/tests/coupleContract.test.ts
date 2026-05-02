// v1.6.1 — Contract tests for /api/couple/leave + /api/history/past-couples. Hermetic.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const leaveCoupleSchema = z.object({
  reason: z.string().max(500).optional(),
})

const pastCoupleSchema = z.object({
  coupleId: z.string(),
  partnerName: z.string().nullable(),
  startedAt: z.string(),
  dissolvedAt: z.string(),
})

const pastCouplesListSchema = z.array(pastCoupleSchema)

describe('POST /api/couple/leave — leaveCoupleSchema', () => {
  it('accepts empty payload', () => {
    expect(() => leaveCoupleSchema.parse({})).not.toThrow()
  })

  it('accepts a reason', () => {
    expect(() => leaveCoupleSchema.parse({ reason: 'cambios personales' })).not.toThrow()
  })

  it('rejects reason too long', () => {
    expect(() => leaveCoupleSchema.parse({ reason: 'x'.repeat(600) })).toThrow()
  })
})

describe('GET /api/history/past-couples — pastCouplesListSchema', () => {
  it('accepts empty list', () => {
    expect(() => pastCouplesListSchema.parse([])).not.toThrow()
  })

  it('accepts past couple entry', () => {
    expect(() =>
      pastCouplesListSchema.parse([
        {
          coupleId: 'c1',
          partnerName: 'Anna',
          startedAt: '2024-01-01T00:00:00Z',
          dissolvedAt: '2026-04-30T00:00:00Z',
        },
      ]),
    ).not.toThrow()
  })

  it('accepts partnerName null (anon ghost)', () => {
    expect(() =>
      pastCouplesListSchema.parse([
        {
          coupleId: 'c1',
          partnerName: null,
          startedAt: '2024-01-01T00:00:00Z',
          dissolvedAt: '2026-04-30T00:00:00Z',
        },
      ]),
    ).not.toThrow()
  })

  it('rejects entry sin dissolvedAt', () => {
    expect(() =>
      pastCouplesListSchema.parse([
        {
          coupleId: 'c1',
          partnerName: 'A',
          startedAt: '2024-01-01T00:00:00Z',
        } as any,
      ]),
    ).toThrow()
  })
})
