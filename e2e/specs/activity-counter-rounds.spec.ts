// v1.6.1 — Contraoferta de actividad: free max 2 rondas (decisión negociación v1.x).

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('counter agotando 2 rondas free bloquea la 3ª', async ({ request }) => {
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

  // ronda 1: user2 contraoferta
  const c1 = await request.post(`/api/events/${ev.id}/counter`, {
    headers: { Authorization: `Bearer ${user2.token}` },
    data: { pointsProposed: 8, message: 'menos' },
  })
  expect(c1.ok()).toBeTruthy()

  // ronda 2: user1 contraoferta
  const c2 = await request.post(`/api/events/${ev.id}/counter`, {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: { pointsProposed: 9, message: 'algo' },
  })
  expect(c2.ok()).toBeTruthy()

  // ronda 3: debe bloquear (forzar a usar /force o premium)
  const c3 = await request.post(`/api/events/${ev.id}/counter`, {
    headers: { Authorization: `Bearer ${user2.token}` },
    data: { pointsProposed: 7, message: 'última' },
  })
  expect([400, 403, 409]).toContain(c3.status())
})
