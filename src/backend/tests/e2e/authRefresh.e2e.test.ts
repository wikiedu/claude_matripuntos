// Fase 1 — E2E del flujo de refresh-token rotation (audit Top 10 #9). Red de
// seguridad ANTES de acortar el access JWT a ~15min: verifica que login con
// `X-Want-Refresh` emite un par, que `/refresh` rota y devuelve un access token
// usable, y que la rotación revoca el refresh anterior (reuse detection). Si
// más adelante se acorta el JWT, este test garantiza que el cliente puede
// renovar sesión sin re-login.
import { describe, it, expect, beforeEach, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../../src/server.js'
import prisma from '../../src/lib/prisma.js'
import { registerCouple, authHeader, resetDb, TEST_PASSWORD, type TestCouple } from './helpers/api.js'

let couple: TestCouple

beforeEach(async () => {
  await resetDb()
  couple = await registerCouple(app)
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Login opt-in a refresh rotation (header X-Want-Refresh: 1).
async function loginWithRefresh(email: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .set('X-Want-Refresh', '1')
    .send({ email, password: TEST_PASSWORD })
  expect(res.status).toBe(200)
  return res.body as { token: string; refreshToken: string; refreshExpiresAt: string }
}

describe('E2E refresh-token rotation (#9)', () => {
  it('login con X-Want-Refresh emite refreshToken; sin el header no', async () => {
    const withHeader = await loginWithRefresh(couple.userA.email)
    expect(withHeader.token).toBeTruthy()
    expect(withHeader.refreshToken).toBeTruthy()
    expect(new Date(withHeader.refreshExpiresAt).getTime()).toBeGreaterThan(Date.now())

    const withoutHeader = await request(app)
      .post('/api/auth/login')
      .send({ email: couple.userA.email, password: TEST_PASSWORD })
    expect(withoutHeader.status).toBe(200)
    expect(withoutHeader.body.token).toBeTruthy()
    expect(withoutHeader.body.refreshToken).toBeUndefined()
  })

  it('rota: /refresh devuelve un access token nuevo y usable', async () => {
    const { refreshToken } = await loginWithRefresh(couple.userA.email)

    const rot = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(rot.status).toBe(200)
    expect(rot.body.accessToken).toBeTruthy()
    expect(rot.body.refreshToken).toBeTruthy()
    expect(rot.body.refreshToken).not.toBe(refreshToken) // rotado

    // El nuevo access token autentica una ruta protegida.
    const me = await request(app).get('/api/auth/me').set(authHeader(rot.body.accessToken))
    expect(me.status).toBe(200)
    expect(me.body.user?.id ?? me.body.id).toBe(couple.userA.id)
  })

  it('reuse detection: el refresh anterior queda revocado tras rotar', async () => {
    const { refreshToken: original } = await loginWithRefresh(couple.userA.email)

    const first = await request(app).post('/api/auth/refresh').send({ refreshToken: original })
    expect(first.status).toBe(200)

    // Reusar el refresh original (ya rotado) → 401.
    const reused = await request(app).post('/api/auth/refresh').send({ refreshToken: original })
    expect(reused.status).toBe(401)
  })

  it('rechaza un refresh token inexistente con 401', async () => {
    const bogus = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'no-soy-un-token-valido-aaaaaaaaaaaaaaaaaaaaaaaa' })
    expect(bogus.status).toBe(401)
  })
})
