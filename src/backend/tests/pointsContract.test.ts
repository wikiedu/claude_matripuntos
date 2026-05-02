// v1.6.1 — Contract tests for /api/points/balance response shape. Hermetic.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const userBalanceSchema = z.object({
  userId: z.string().optional(),
  name: z.string(),
  balance: z.number(),
})

const balanceSchema = z.object({
  user1: userBalanceSchema,
  user2: userBalanceSchema.nullable().optional(),
  net: z.number().optional(),
})

describe('GET /api/points/balance — balanceSchema', () => {
  it('accepts solo couple (user2 null)', () => {
    expect(() =>
      balanceSchema.parse({
        user1: { name: 'A', balance: 0 },
        user2: null,
      }),
    ).not.toThrow()
  })

  it('accepts paired couple with net', () => {
    expect(() =>
      balanceSchema.parse({
        user1: { name: 'A', balance: 12 },
        user2: { name: 'B', balance: -7 },
        net: 19,
      }),
    ).not.toThrow()
  })

  it('rejects balance as string', () => {
    expect(() =>
      balanceSchema.parse({
        user1: { name: 'A', balance: '12' as any },
        user2: { name: 'B', balance: 0 },
      }),
    ).toThrow()
  })
})
