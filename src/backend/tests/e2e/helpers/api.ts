// Fase 1 — Helpers E2E. Operan sobre la `app` real (supertest) y el Prisma real
// (DB de test). No mockean nada: ejercitan el código tal cual está hoy.
import request from 'supertest'
import type { Express } from 'express'
import prisma from '../../../src/lib/prisma.js'

export interface TestUser {
  id: string
  email: string
  token: string
  coupleId: string
}

export interface TestCouple {
  coupleId: string
  userA: TestUser
  userB: TestUser
}

let seq = 0

/**
 * Registra una pareja (2 usuarios) vía /api/auth/register y hace login de ambos
 * para obtener sus JWT. Devuelve ambos usuarios con token, compartiendo coupleId.
 * Emails únicos por llamada (timestamp + contador) para sobrevivir a resetDb.
 */
export async function registerCouple(app: Express): Promise<TestCouple> {
  seq += 1
  const tag = `e2e${Date.now()}x${seq}`
  const emailA = `${tag}_a@test.local`
  const emailB = `${tag}_b@test.local`
  const password = 'password123'

  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      email1: emailA, password1: password, name1: 'User A',
      email2: emailB, password2: password, name2: 'User B',
      ageConfirmed1: true, ageConfirmed2: true,
    })
  if (reg.status !== 201) {
    throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`)
  }
  const coupleId: string = reg.body.coupleId

  const userA = await loginUser(app, emailA, password, coupleId)
  const userB = await loginUser(app, emailB, password, coupleId)
  return { coupleId, userA, userB }
}

async function loginUser(app: Express, email: string, password: string, coupleId: string): Promise<TestUser> {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return { id: res.body.user.id, email, token: res.body.token, coupleId }
}

/** Header de autorización Bearer. */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` }
}

/**
 * Trunca todas las tablas de aplicación entre tests (RESTART IDENTITY CASCADE),
 * preservando el historial de migraciones de Prisma. Mantiene los tests aislados
 * sobre la DB compartida (--runInBand).
 */
export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'
  `
  if (rows.length === 0) return
  const list = rows.map((r) => `"${r.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}
