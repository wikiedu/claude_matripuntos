// v1.6.1 — Contract tests for /api/events schemas. Hermetic.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const eventCreateSchema = z.object({
  type: z.string().min(1),
  dateStart: z.string(),
  dateEnd: z.string(),
  numChildren: z.number().int().min(0).max(10),
  pointsBase: z.number().nonnegative(),
  compensation: z
    .object({
      type: z.string().min(1),
      discountPercent: z.number().min(0).max(1).optional(),
    })
    .optional(),
})

const eventCounterSchema = z.object({
  pointsProposed: z.number().nonnegative(),
  message: z.string().max(280).optional(),
})

describe('POST /api/events — eventCreateSchema', () => {
  it('accepts minimum valid payload', () => {
    expect(() =>
      eventCreateSchema.parse({
        type: 'gastronomia',
        dateStart: '2026-05-01T18:00:00Z',
        dateEnd: '2026-05-01T22:00:00Z',
        numChildren: 0,
        pointsBase: 10,
      }),
    ).not.toThrow()
  })

  it('rejects negative pointsBase', () => {
    expect(() =>
      eventCreateSchema.parse({
        type: 'x',
        dateStart: '2026-05-01T00:00:00Z',
        dateEnd: '2026-05-01T01:00:00Z',
        numChildren: 0,
        pointsBase: -1,
      }),
    ).toThrow()
  })

  it('rejects numChildren out of bounds', () => {
    expect(() =>
      eventCreateSchema.parse({
        type: 'x',
        dateStart: '2026-05-01T00:00:00Z',
        dateEnd: '2026-05-01T01:00:00Z',
        numChildren: 99,
        pointsBase: 5,
      }),
    ).toThrow()
  })

  it('accepts compensation optional', () => {
    expect(() =>
      eventCreateSchema.parse({
        type: 'gastronomia',
        dateStart: '2026-05-01T18:00:00Z',
        dateEnd: '2026-05-01T22:00:00Z',
        numChildren: 1,
        pointsBase: 10,
        compensation: { type: 'descuento', discountPercent: 0.2 },
      }),
    ).not.toThrow()
  })
})

describe('POST /api/events/:id/counter — eventCounterSchema', () => {
  it('accepts payload with message', () => {
    expect(() =>
      eventCounterSchema.parse({ pointsProposed: 8, message: 'menos' }),
    ).not.toThrow()
  })

  it('accepts pointsProposed only', () => {
    expect(() => eventCounterSchema.parse({ pointsProposed: 0 })).not.toThrow()
  })

  it('rejects message too long', () => {
    expect(() =>
      eventCounterSchema.parse({
        pointsProposed: 5,
        message: 'x'.repeat(300),
      }),
    ).toThrow()
  })
})
