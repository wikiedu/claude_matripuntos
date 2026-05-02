// v1.6.1 — Reject: partner rechaza actividad y queda en estado rejected.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('reject deja event en status rejected sin generar transacción', async ({ request }) => {
  const { user1, user2 } = await createCouple(request)

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
  const ev: any = await create.json()

  const rej = await request.post(`/api/events/${ev.id}/reject`, {
    headers: { Authorization: `Bearer ${user2.token}` },
  })
  expect(rej.ok()).toBeTruthy()

  const get = await request.get(`/api/events/${ev.id}`, {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  const ej: any = await get.json()
  expect(ej.status).toBe('rejected')
})
