// Fase 2 A.2 — E2E de invitations.ts (V2 deprecada pero activa): guards
// cross-couple (IDOR) + invariante de capacidad (máx 2 usuarios por pareja).
// Ejercita la app real + Postgres embebido, sin mocks.
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import crypto from 'crypto'
import { app } from '../../src/server.js'
import prisma from '../../src/lib/prisma.js'
import { registerCouple, authHeader, resetDb, TestCouple } from './helpers/api.js'

let coupleA: TestCouple
let coupleB: TestCouple

beforeAll(async () => {
  await resetDb()
  coupleA = await registerCouple(app)
  coupleB = await registerCouple(app)
})

afterAll(async () => {
  await prisma.$disconnect()
})

/** Crea una invitation directamente en BD (los flujos API la bloquean en parejas completas). */
async function seedInvitation(data: {
  coupleId: string
  fromUserId: string
  toEmail?: string
  toUserId?: string
  type: 'email_invite' | 'link_request'
}) {
  return prisma.invitation.create({
    data: {
      coupleId: data.coupleId,
      fromUserId: data.fromUserId,
      toEmail: data.toEmail ?? `invitee_${Date.now()}@test.local`,
      toUserId: data.toUserId,
      token: crypto.randomBytes(32).toString('hex'),
      type: data.type,
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })
}

describe('E2E invitations — capacidad de pareja', () => {
  it('POST /invite-partner desde pareja completa → 400', async () => {
    const res = await request(app)
      .post('/api/auth/invite-partner')
      .set(authHeader(coupleA.userA.token))
      .send({ inviteeEmail: 'tercero@test.local' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/pareja vinculada/i)
  })

  it('POST /register-with-invitation hacia pareja completa → 409', async () => {
    const toEmail = `tercero_${Date.now()}@test.local`
    const inv = await seedInvitation({
      coupleId: coupleA.coupleId,
      fromUserId: coupleA.userA.id,
      toEmail,
      type: 'email_invite',
    })
    const res = await request(app)
      .post('/api/auth/register-with-invitation')
      .send({ token: inv.token, email: toEmail, password: 'password123', name: 'Tercero' })
    expect(res.status).toBe(409)

    // El usuario NO debe haberse creado ni la pareja superar 2 miembros
    const created = await prisma.user.findUnique({ where: { email: toEmail } })
    expect(created).toBeNull()
    const members = await prisma.user.count({ where: { coupleId: coupleA.coupleId } })
    expect(members).toBe(2)
  })
})

describe('E2E invitations — guards cross-couple (IDOR)', () => {
  it('POST /accept-invitation con token de otra pareja y email distinto → 400', async () => {
    const inv = await seedInvitation({
      coupleId: coupleA.coupleId,
      fromUserId: coupleA.userA.id,
      toEmail: 'destinatario-legitimo@test.local',
      type: 'email_invite',
    })
    // userA de la pareja B intenta colarse en la pareja A con un token ajeno
    const res = await request(app)
      .post('/api/auth/accept-invitation')
      .set(authHeader(coupleB.userA.token))
      .send({ token: inv.token })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email does not match/i)

    // Su coupleId no debe haber cambiado
    const me = await prisma.user.findUnique({ where: { id: coupleB.userA.id } })
    expect(me?.coupleId).toBe(coupleB.coupleId)
  })

  it('POST /accept-link-partner con invitationId dirigido a otro usuario → 404', async () => {
    const inv = await seedInvitation({
      coupleId: coupleA.coupleId,
      fromUserId: coupleA.userA.id,
      toUserId: coupleA.userB.id, // dirigida a userB de A, no al atacante
      type: 'link_request',
    })
    const res = await request(app)
      .post('/api/auth/accept-link-partner')
      .set(authHeader(coupleB.userA.token))
      .send({ invitationId: inv.id })
    expect(res.status).toBe(404)

    const invAfter = await prisma.invitation.findUnique({ where: { id: inv.id } })
    expect(invAfter?.status).toBe('pending') // intacta
  })

  it('POST /reject-link-partner sobre invitación ajena no la modifica', async () => {
    const inv = await seedInvitation({
      coupleId: coupleA.coupleId,
      fromUserId: coupleA.userA.id,
      toUserId: coupleA.userB.id,
      type: 'link_request',
    })
    const res = await request(app)
      .post('/api/auth/reject-link-partner')
      .set(authHeader(coupleB.userA.token))
      .send({ invitationId: inv.id })
    // El endpoint responde 200 genérico (updateMany), pero NO debe tocar la fila
    expect(res.status).toBe(200)
    const invAfter = await prisma.invitation.findUnique({ where: { id: inv.id } })
    expect(invAfter?.status).toBe('pending')
  })
})
