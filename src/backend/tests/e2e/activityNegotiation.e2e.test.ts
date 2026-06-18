// Fase 1 — E2E flujo crítico #3 (ESTADO_PRE_REFACTOR): negociación de una
// actividad. Reescrito en T3 contra la API canónica V1 (/api/negotiations,
// negotiationId-based) para poder retirar las rutas V2 deprecadas de
// negotiation.ts (event-status-based). Flujo V1: user A crea un evento (draft)
// → A abre la negociación (POST /api/negotiations, ronda 1 awaiting) → user B
// contraoferta (ronda 2 awaiting) → A acepta la contraoferta → el saldo del
// proponente (A) baja por el importe acordado.
//
// NOTA sobre turnos: en V1 el turno lo marca el `proposedBy` de la ronda
// 'awaiting' (mismo criterio que ActivityDetail/EventNegotiationCard): quien
// propuso la ronda espera; el otro responde. A diferencia de la V2 retirada,
// el creador SÍ responde a la contraoferta de su partner (rondas alternas).
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

// Helper: abre la negociación (ronda 1) sobre un evento draft. Devuelve el
// negotiationId de la ronda 1 (queda 'awaiting' para el partner).
async function openNegotiation(token: string, eventId: string, pointsProposed: number) {
  const res = await request(app)
    .post('/api/negotiations')
    .set(authHeader(token))
    .send({ eventId, pointsProposed, message: 'Te propongo esta actividad' })
  expect(res.status).toBe(201)
  expect(res.body.negotiation.responseType).toBe('awaiting')
  return res.body.negotiation.id as string
}

// Helper: ronda 'awaiting' actual del evento según la API (GET /event/:id).
async function getAwaitingNegotiation(token: string, eventId: string) {
  const res = await request(app)
    .get(`/api/negotiations/event/${eventId}`)
    .set(authHeader(token))
  expect(res.status).toBe(200)
  const negs: Array<{ id: string; responseType: string; roundNumber: number }> = res.body.negotiations
  return negs.filter((n) => n.responseType === 'awaiting').pop()
}

describe('E2E flujo #3 (V1) — proponer → contraoferta → aceptar → balance', () => {
  it('aplica los puntos acordados (contraoferta) al saldo del proponente', async () => {
    const { userA, userB } = couple

    // 1) User A crea el evento y abre la negociación (ronda 1 = pointsCalculated).
    const { id: eventId, pointsCalculated } = await createDraftEvent(userA.token)
    expect(pointsCalculated).toBeGreaterThan(0)

    const round1Id = await openNegotiation(userA.token, eventId, pointsCalculated)

    // El evento pasa a 'pending' con la ronda 1 en awaiting.
    const evAfterPropose = await request(app)
      .get(`/api/events/${eventId}`)
      .set(authHeader(userA.token))
    expect(evAfterPropose.body.event.status).toBe('pending')
    expect(evAfterPropose.body.event.negotiationRound).toBe(1)

    // 2) User B contraoferta con un importe DISTINTO del calculado, para probar
    //    que es el valor acordado (no el original) el que afecta al saldo.
    //    Responde sobre la ronda 1 → se crea la ronda 2 (awaiting, proposedBy B).
    const counterPoints = pointsCalculated + 7
    const counterRes = await request(app)
      .put(`/api/negotiations/${round1Id}/respond`)
      .set(authHeader(userB.token))
      .send({ responseType: 'counter_proposed', pointsProposed: counterPoints, message: 'Mejor estos puntos' })
    expect(counterRes.status).toBe(200)

    const awaiting = await getAwaitingNegotiation(userA.token, eventId)
    expect(awaiting).toBeDefined()
    expect(awaiting!.roundNumber).toBe(2)

    // 2b) La ronda 1 ya está respondida: responder de nuevo sobre ella da 409
    //     con puntero a la ronda awaiting vigente (guard real de la ruta).
    const staleRes = await request(app)
      .put(`/api/negotiations/${round1Id}/respond`)
      .set(authHeader(userA.token))
      .send({ responseType: 'accepted' })
    expect(staleRes.status).toBe(409)
    expect(staleRes.body.awaitingNegotiationId).toBe(awaiting!.id)

    // 3) El creador (A) acepta la contraoferta de B → evento accepted al precio
    //    de la ronda 2.
    const acceptRes = await request(app)
      .put(`/api/negotiations/${awaiting!.id}/respond`)
      .set(authHeader(userA.token))
      .send({ responseType: 'accepted' })
    expect(acceptRes.status).toBe(200)

    const evFinal = await request(app)
      .get(`/api/events/${eventId}`)
      .set(authHeader(userA.token))
    expect(evFinal.body.event.status).toBe('accepted')
    expect(Number(evFinal.body.event.pointsAgreed)).toBeCloseTo(counterPoints, 5)

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
    const round1Id = await openNegotiation(userA.token, eventId, pointsCalculated)

    // B acepta sin contraofertar → se cobra el valor de la ronda 1 (calculado).
    const acceptRes = await request(app)
      .put(`/api/negotiations/${round1Id}/respond`)
      .set(authHeader(userB.token))
      .send({ responseType: 'accepted' })
    expect(acceptRes.status).toBe(200)

    const evFinal = await request(app)
      .get(`/api/events/${eventId}`)
      .set(authHeader(userA.token))
    expect(evFinal.body.event.status).toBe('accepted')

    const balA = await request(app).get('/api/points/balance').set(authHeader(userA.token))
    expect(balA.body.you.balance).toBeCloseTo(-pointsCalculated, 5)
  })

  // Sustituye al contract test del IDOR V2 (negotiationIdorContract.test.ts,
  // retirado junto con routes/negotiation.ts): la ruta canónica V1 scopa la
  // negociación por coupleId del evento → un usuario de OTRA pareja no puede
  // responder ni forzar una negociación ajena (404, nunca 2xx).
  it('cross-couple: un usuario de otra pareja no puede responder ni forzar (404)', async () => {
    const { userA } = couple
    const intruder = (await registerCouple(app)).userA

    const { id: eventId, pointsCalculated } = await createDraftEvent(userA.token)
    const round1Id = await openNegotiation(userA.token, eventId, pointsCalculated)

    const respondRes = await request(app)
      .put(`/api/negotiations/${round1Id}/respond`)
      .set(authHeader(intruder.token))
      .send({ responseType: 'accepted' })
    expect(respondRes.status).toBe(404)

    const forceRes = await request(app)
      .post(`/api/negotiations/${round1Id}/force`)
      .set(authHeader(intruder.token))
    expect(forceRes.status).toBe(404)

    // El evento ajeno sigue intacto y sin transacciones.
    const ev = await request(app).get(`/api/events/${eventId}`).set(authHeader(userA.token))
    expect(ev.body.event.status).toBe('pending')
    const txs = await prisma.pointsTransaction.findMany({
      where: { relatedEventId: eventId },
    })
    expect(txs).toHaveLength(0)
  })

  // [p3:A1-2] El proponente de una ronda 'awaiting' no puede resolverla él
  // mismo (auto-aceptar sin consenso del partner debitaría a event.createdBy).
  // Mismo criterio que ruleProposals/configurationProposalService.
  it('self-response: el proponente no puede aceptar su propia ronda (403, sin cobro)', async () => {
    const { userA } = couple

    const { id: eventId, pointsCalculated } = await createDraftEvent(userA.token)
    const round1Id = await openNegotiation(userA.token, eventId, pointsCalculated)

    // A propuso la ronda 1 → A intenta aceptarla él mismo.
    const selfAccept = await request(app)
      .put(`/api/negotiations/${round1Id}/respond`)
      .set(authHeader(userA.token))
      .send({ responseType: 'accepted' })
    expect(selfAccept.status).toBe(403)

    // El evento sigue pending y NO se generó ninguna PointsTransaction.
    const ev = await request(app).get(`/api/events/${eventId}`).set(authHeader(userA.token))
    expect(ev.body.event.status).toBe('pending')
    const txs = await prisma.pointsTransaction.findMany({
      where: { relatedEventId: eventId },
    })
    expect(txs).toHaveLength(0)
  })
})
