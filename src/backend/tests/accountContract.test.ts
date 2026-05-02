// v1.6.1 — Contract tests for /api/account schemas. Hermetic.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const deleteRequestSchema = z.object({
  reason: z.string().max(500).optional(),
})

const deleteConfirmSchema = z.object({
  confirmation: z.literal('ELIMINAR'),
  password: z.string().min(8).optional(),
})

describe('POST /api/account/delete-request — deleteRequestSchema', () => {
  it('accepts empty payload', () => {
    expect(() => deleteRequestSchema.parse({})).not.toThrow()
  })

  it('accepts a reason within bounds', () => {
    expect(() => deleteRequestSchema.parse({ reason: 'no me sirve' })).not.toThrow()
  })

  it('rejects reason too long', () => {
    expect(() =>
      deleteRequestSchema.parse({ reason: 'x'.repeat(600) }),
    ).toThrow()
  })
})

describe('POST /api/account/delete — deleteConfirmSchema', () => {
  it('accepts ELIMINAR + password', () => {
    expect(() =>
      deleteConfirmSchema.parse({ confirmation: 'ELIMINAR', password: 'pwd12345' }),
    ).not.toThrow()
  })

  it('accepts ELIMINAR sin password (re-auth opcional)', () => {
    expect(() => deleteConfirmSchema.parse({ confirmation: 'ELIMINAR' })).not.toThrow()
  })

  it('rejects confirmation distinta', () => {
    expect(() =>
      deleteConfirmSchema.parse({ confirmation: 'DELETE' as any }),
    ).toThrow()
  })

  it('rejects sin confirmation', () => {
    expect(() => deleteConfirmSchema.parse({} as any)).toThrow()
  })
})
