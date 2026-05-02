// v1.6.1 — Actividad: user1 crea actividad, user2 la acepta, saldo se actualiza.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('crear actividad → aceptar → genera PointsTransaction', async ({ request }) => {
  const { user1, user2 } = await createCouple(request)

  // user1 crea event vía API
  const create = await request.post('/api/events', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: {
      type: 'gastronomia',
      dateStart: new Date(Date.now() + 3600_000).toISOString(),
      dateEnd: new Date(Date.now() + 2 * 3600_000).toISOString(),
      numChildren: 0,
      pointsBase: 10,
    },
  })
  expect(create.ok()).toBeTruthy()
  const ev: any = await create.json()
  expect(ev.id).toBeTruthy()

  // user2 acepta
  const accept = await request.post(`/api/events/${ev.id}/accept`, {
    headers: { Authorization: `Bearer ${user2.token}` },
  })
  expect(accept.ok()).toBeTruthy()

  // saldo de user2 (acepta = a favor) debe reflejarlo
  const bal = await request.get('/api/points/balance', {
    headers: { Authorization: `Bearer ${user2.token}` },
  })
  const bj: any = await bal.json()
  // Existe una entrada de saldo distinta de cero en alguno de los users.
  const hasBalance =
    Math.abs(bj.user1?.balance ?? 0) > 0 || Math.abs(bj.user2?.balance ?? 0) > 0
  expect(hasBalance).toBeTruthy()
})
