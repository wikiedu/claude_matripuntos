// Fase 0 saneamiento 2026-06-07 — regression test for the cross-couple IDOR
// fix in routes/negotiation.ts (the deprecated V2 negotiation routes mounted
// at /api/events). Before the fix, `/:eventId/respond` loaded the event with
// `findUnique({ where: { id } })` (no coupleId) and only rejected the creator,
// so a user from ANOTHER couple could accept/reject/counter a foreign event
// (and corrupt cross-couple balances). The fix scopes the load by coupleId:
//   findFirst({ where: { id, coupleId } })  → cross-couple lookup is null → 404.
//
// Why mocked Prisma instead of a real DB call: schema.prisma is postgresql-only
// and there is no local Postgres / DB-bound test harness yet (the existing suite
// is hermetic; `.env.test` carries a stale sqlite URL incompatible with the
// postgres provider — see Fase 0 report "issues descubiertos"). Standing up
// Postgres or exporting the Express app from server.ts is out of Fase 0 scope.
// So we exercise the REAL negotiation router + REAL authMiddleware + REAL handler
// logic over a bare express app, mocking only the Prisma singleton (same pattern
// as refreshTokenService.test.ts). This still proves the security boundary: the
// handler queries with coupleId and returns 404 for a foreign couple.

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import jwt from 'jsonwebtoken'

const COUPLE_A = 'coupleA'
const COUPLE_B = 'coupleB'
const USER_A_CREATOR = 'userA'
const USER_B_OTHER = 'userB'
const EVENT_A = 'eventA'

const mockPrisma: any = {
  event: { findFirst: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
}

jest.mock('../src/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))

// Imported after jest.mock (hoisted) so the router + authMiddleware get the mock.
import negotiationRouter from '../src/routes/negotiation.js'

const eventA = {
  id: EVENT_A,
  coupleId: COUPLE_A,
  createdBy: USER_A_CREATOR,
  status: 'proposed',
  creator: { id: USER_A_CREATOR, name: 'User A', email: 'a@test.local' },
}

const app = express()
app.use(express.json())
app.use('/api/events', negotiationRouter)

function tokenFor(userId: string, coupleId: string): string {
  return jwt.sign({ userId, coupleId }, process.env.JWT_SECRET as string, { expiresIn: '1h' })
}

beforeEach(() => {
  // authMiddleware verifies the user exists with the token's coupleId.
  mockPrisma.user.findUnique.mockImplementation(async ({ where }: any) => ({
    id: where.id,
    coupleId: where.id === USER_B_OTHER ? COUPLE_B : COUPLE_A,
    deletedAt: null,
  }))
  mockPrisma.user.update.mockResolvedValue({}) // authMiddleware.touchLastSeen
  // The fix: only events of the querying user's couple are returned.
  mockPrisma.event.findFirst.mockImplementation(async (args: any) =>
    args?.where?.id === EVENT_A && args?.where?.coupleId === COUPLE_A ? eventA : null,
  )
})

describe('IDOR — POST /api/events/:eventId/respond (negotiation V2)', () => {
  it('returns 404 when a user from another couple responds to a foreign event', async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_A}/respond`)
      .set('Authorization', `Bearer ${tokenFor(USER_B_OTHER, COUPLE_B)}`)
      .send({ action: 'reject' })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Event not found')
    // The load MUST be scoped by coupleId (this is the actual fix).
    expect(mockPrisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ coupleId: COUPLE_B }) }),
    )
  })

  it('does NOT 404 for a same-couple user (creator gets 403, proving scoping passes)', async () => {
    const res = await request(app)
      .post(`/api/events/${EVENT_A}/respond`)
      .set('Authorization', `Bearer ${tokenFor(USER_A_CREATOR, COUPLE_A)}`)
      .send({ action: 'reject' })

    expect(res.status).toBe(403)
    expect(res.status).not.toBe(404)
  })
})
