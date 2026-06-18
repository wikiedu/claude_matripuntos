// Tests para lib/requireAuth — narrowing de tipo req.user.
// Sin dependencias de DB ni Express: 100% unit.

import { describe, it, expect } from '@jest/globals'
import { requireAuth } from '../src/lib/requireAuth.js'
import type { Request } from 'express'

function makeReq(user?: { id: string; coupleId: string }): Request {
  return { user } as unknown as Request
}

describe('requireAuth', () => {
  it('returns userId and coupleId when req.user is set', () => {
    const result = requireAuth(makeReq({ id: 'u1', coupleId: 'c1' }))
    expect(result).toEqual({ userId: 'u1', coupleId: 'c1' })
  })

  it('throws when req.user is undefined (missing middleware)', () => {
    expect(() => requireAuth(makeReq(undefined))).toThrow(
      'requireAuth: req.user indefinido'
    )
  })

  it('throws when req.user is null (misconfigured optional route)', () => {
    const req = { user: null } as unknown as Request
    expect(() => requireAuth(req)).toThrow()
  })
})
