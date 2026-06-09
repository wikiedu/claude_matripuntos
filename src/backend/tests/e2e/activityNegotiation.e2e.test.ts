// Fase 1 — E2E flujo crítico #3 (ESTADO_PRE_REFACTOR): negociación de una
// actividad. User A crea un evento (draft) → lo propone → user B contraoferta →
// se acepta al precio contraofertado → el saldo del proponente baja por el
// importe acordado. Se ejercita la app real + Postgres de test contra las rutas
// V2 de negotiation.ts TAL CUAL están hoy (deprecación aplazada, ver
// TODO_REFACTOR.md) — sin tocar la lógica de negociación.
//
// NOTA sobre quién acepta: la ruta POST /:eventId/respond bloquea al creador
// ("Creator cannot respond to own proposal", 403). El flujo real (y el que
// renderiza EventNegotiationCard) es que el RESPONDER conduce todo: contraoferta
// y, una vez en counter_proposal, acepta su propia contraoferta. El plan asumía
// "user A acepta", pero eso da 403 contra el código actual; este test fija el
// comportamiento verdadero y lo documenta con un assert explícito del 403.
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../../src/server.js'
import prisma from '../../src/lib/prisma.js'
import { registerCouple, authHeader, resetDb, type TestCouple } from './helpers/api.js'

let couple: TestCouple

beforeEach(async () => {
  await resetDb()
  couple = await registerCouple(app)
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Helper: crea un evento draft a nombre de `token`. Devuelve id + puntos
// calculados por el servidor (no se hardcodea la fórmula).
async function createDraftEvent(token: string) {
  const dateStart = '2026-07-01T18:00:00.000Z'
  const dateEnd = '2026-07-01T22:00:00.000Z'
  const res = await request(app)
    .post('/api/events')
    .set(authHeader(token))
    .send({ type: 'cena', title: 'Cena fuera', dateStart, dateEnd, pointsBase: 10 })
  expect(res.status).toBe(201)
  return {
    id: res.body.event.id as string,
    pointsCalculated: Number(res.body.event.pointsCalculated),
  }
}

describe('E2E flujo #3 — proponer → contraoferta → aceptar → balance', () => {
  it('aplica los puntos acordados (contraoferta) al saldo del proponente', async () => {
    const { userA, userB } = couple

    // 1) User A crea el evento y lo propone (ronda 1 = pointsCalculated).
    const { id: eventId, pointsCalculated } = await createDraftEvent(userA.token)
    expect(pointsCalculated).toBeGreaterThan(0)

    const proposeRes = await request(app)
      .post(`/api/events/${eventId}/propose`)
      .set(authHeader(userA.token))
      .send({ message: 'Te propongo esta cena' })
    expect(proposeRes.status).toBe(200)
    expect(proposeRes.body.event.status).toBe('proposed')

    // 2) User B contraoferta con un importe DISTINTO del calculado, para probar
    //    que es el valor acordado (no el original) el que afecta al saldo.
    const counterPoints = pointsCalculated + 7
    const counterRes = await request(app)
      .post(`/api/events/${eventId}/respond`)
      .set(authHeader(userB.token))
      .send({ action: 'counter_propose', pointsProposed: counterPoints, message: 'Mejor estos puntos' })
    expect(counterRes.status).toBe(200)
    expect(counterRes.body.event.status).toBe('counter_proposal')

    // 2b) El creador NO puede responder a su propia negociación (guard real de
    //     la ruta). Documenta que el "user A acepta" del plan da 403 hoy.
    const creatorAccept = await request(app)
      .post(`/api/events/${eventId}/respond`)
      .set(authHeader(userA.token))
      .send({ action: 'accept' })
    expect(creatorAccept.status).toBe(403)

    // 3) El responder (B) acepta la contraoferta → evento accepted.
    const acceptRes = await request(app)
      .post(`/api/events/${eventId}/respond`)
      .set(authHeader(userB.token))
      .send({ action: 'accept' })
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.body.event.status).toBe('accepted')
    expect(Number(acceptRes.body.event.pointsAgreed)).toBeCloseTo(counterPoints, 5)

    // 4) El proponente (A) "paga" los puntos acordados → saldo negativo por
    //    counterPoints; el responder (B) no se mueve.
    const balA = await request(app).get('/api/points/balance').set(authHeader(userA.token))
    expect(balA.body.you.balance).toBeCloseTo(-counterPoints, 5)
    expect(balA.body.partner.balance).toBe(0)

    const balB = await request(app).get('/api/points/balance').set(authHeader(userB.token))
    expect(balB.body.you.balance).toBe(0)
    expect(balB.body.partner.balance).toBeCloseTo(-counterPoints, 5)

    // Fuente de verdad: una única PointsTransaction event_accepted a nombre de A
    // con amount == -counterPoints.
    const txs = await prisma.pointsTransaction.findMany({
      where: { coupleId: couple.coupleId, relatedEventId: eventId },
    })
    expect(txs).toHaveLength(1)
    expect(txs[0].userId).toBe(userA.id)
    expect(txs[0].type).toBe('event_accepted')
    expect(Number(txs[0].amount)).toBeCloseTo(-counterPoints, 5)
  })

  it('aceptación directa (sin contraoferta) cobra los puntos calculados al proponente', async () => {
    const { userA, userB } = couple

    const { id: eventId, pointsCalculated } = await createDraftEvent(userA.token)

    await request(app)
      .post(`/api/events/${eventId}/propose`)
      .set(authHeader(userA.token))
      .send({ message: 'Propuesta directa' })
      .expect(200)

    // B acepta sin contraofertar → se cobra el valor de la ronda 1 (calculado).
    const acceptRes = await request(app)
      .post(`/api/events/${eventId}/respond`)
      .set(authHeader(userB.token))
      .send({ action: 'accept' })
    expect(acceptRes.status).toBe(200)
    expect(acceptRes.body.event.status).toBe('accepted')

    const balA = await request(app).get('/api/points/balance').set(authHeader(userA.token))
    expect(balA.body.you.balance).toBeCloseTo(-pointsCalculated, 5)
  })
})
