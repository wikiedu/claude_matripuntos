// Fase 1 — E2E flujo crítico #2 (ESTADO_PRE_REFACTOR): crear tarea →
// completarla (user A) → el partner (user B) la verifica → los puntos suman →
// el balance refleja el cambio. Se ejercita la app Express real contra el
// Postgres de test (sin mocks). NO se hardcodean puntos: el assert lee el
// `pointsFinal` que calcula el servidor y compara el balance contra él (riesgo
// #7 del plan: no acoplarse a las constantes de la fórmula).
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

describe('E2E flujo #2 — crear tarea → completar → verificar → balance', () => {
  it('suma los puntos al completer cuando el partner verifica', async () => {
    const { userA, userB } = couple

    // Balance de partida: ambos a 0 (pareja recién creada, sin transacciones).
    const before = await request(app)
      .get('/api/points/balance')
      .set(authHeader(userA.token))
    expect(before.status).toBe(200)
    expect(before.body.you.balance).toBe(0)
    expect(before.body.partner.balance).toBe(0)

    // 1) User A crea una tarea.
    const createRes = await request(app)
      .post('/api/tasks')
      .set(authHeader(userA.token))
      .send({ name: 'Cocinar la cena', category: 'cocina', pointsBase: 2.0 })
    expect(createRes.status).toBe(201)
    const taskId: string = createRes.body.task.id
    expect(taskId).toBeTruthy()

    // 2) User A registra que la hizo. El servidor calcula pointsFinal
    //    (pointsBase × modificadores). Lo leemos para el assert.
    const logRes = await request(app)
      .post(`/api/tasks/${taskId}/log`)
      .set(authHeader(userA.token))
      .send({ date: new Date().toISOString(), pointsBase: 2.0, modifier: 'none' })
    expect(logRes.status).toBe(201)
    const logId: string = logRes.body.taskLog.id
    const pointsFinal = Number(logRes.body.taskLog.pointsFinal)
    expect(pointsFinal).toBeGreaterThan(0)
    expect(logRes.body.taskLog.status).toBe('pending')

    // Aún sin verificar → no hay PointsTransaction → balance sigue a 0.
    const midway = await request(app)
      .get('/api/points/balance')
      .set(authHeader(userA.token))
    expect(midway.body.you.balance).toBe(0)

    // 3) User B (el partner) verifica el log.
    const verifyRes = await request(app)
      .put(`/api/tasks/${taskId}/logs/${logId}/verify`)
      .set(authHeader(userB.token))
      .send({})
    expect(verifyRes.status).toBe(200)
    expect(verifyRes.body.success).toBe(true)
    expect(verifyRes.body.taskLog.status).toBe('verified')

    // 4) El balance de A refleja exactamente los puntos del log verificado.
    const afterA = await request(app)
      .get('/api/points/balance')
      .set(authHeader(userA.token))
    expect(afterA.body.you.balance).toBeCloseTo(pointsFinal, 5)
    // Visto desde B, A es el "partner" y debe verse el mismo saldo.
    const afterB = await request(app)
      .get('/api/points/balance')
      .set(authHeader(userB.token))
    expect(afterB.body.partner.balance).toBeCloseTo(pointsFinal, 5)
    expect(afterB.body.you.balance).toBe(0)

    // Fuente de verdad: existe exactamente una PointsTransaction para ese log,
    // a nombre de A, con amount == pointsFinal.
    const txs = await prisma.pointsTransaction.findMany({
      where: { coupleId: couple.coupleId, relatedTaskLogId: logId },
    })
    expect(txs).toHaveLength(1)
    expect(txs[0].userId).toBe(userA.id)
    expect(txs[0].type).toBe('task_completed')
    expect(Number(txs[0].amount)).toBeCloseTo(pointsFinal, 5)
  })

  it('impide auto-verificación: el completer no puede verificar su propio log (P0-C)', async () => {
    const { userA } = couple

    const createRes = await request(app)
      .post('/api/tasks')
      .set(authHeader(userA.token))
      .send({ name: 'Limpiar baño', category: 'baños', pointsBase: 1.5 })
    const taskId: string = createRes.body.task.id

    const logRes = await request(app)
      .post(`/api/tasks/${taskId}/log`)
      .set(authHeader(userA.token))
      .send({ date: new Date().toISOString(), pointsBase: 1.5, modifier: 'none' })
    const logId: string = logRes.body.taskLog.id

    // User A intenta verificar su propio log → 403, sin transacción ni saldo.
    const selfVerify = await request(app)
      .put(`/api/tasks/${taskId}/logs/${logId}/verify`)
      .set(authHeader(userA.token))
      .send({})
    expect(selfVerify.status).toBe(403)

    const txs = await prisma.pointsTransaction.count({
      where: { relatedTaskLogId: logId },
    })
    expect(txs).toBe(0)

    const balance = await request(app)
      .get('/api/points/balance')
      .set(authHeader(userA.token))
    expect(balance.body.you.balance).toBe(0)
  })
})
