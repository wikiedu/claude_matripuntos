// Fase 1 — Smoke E2E: valida que el harness funciona de extremo a extremo
// (app real + Postgres real de test). Health 200 + register crea una pareja con
// 2 usuarios compartiendo coupleId.
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../../src/server.js'
import prisma from '../../src/lib/prisma.js'
import { registerCouple, resetDb } from './helpers/api.js'

beforeAll(async () => {
  await resetDb()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('E2E smoke — harness', () => {
  it('GET /api/health responde 200', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBeDefined()
    // La DB de test está migrada → el health check debe poder leer _prisma_migrations.
    expect(res.body.db).toBe('ok')
  })

  it('POST /api/auth/register crea una pareja con 2 usuarios y mismo coupleId', async () => {
    const couple = await registerCouple(app)

    expect(couple.coupleId).toBeTruthy()
    expect(couple.userA.token).toBeTruthy()
    expect(couple.userB.token).toBeTruthy()
    expect(couple.userA.coupleId).toBe(couple.userB.coupleId)

    const users = await prisma.user.findMany({ where: { coupleId: couple.coupleId } })
    expect(users).toHaveLength(2)
  })
})
