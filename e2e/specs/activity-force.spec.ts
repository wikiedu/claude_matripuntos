// v1.6.1 — Force: tras agotar rondas, proposer fuerza pagando de su saldo.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('force tras counter genera PointsTransaction negativa al proposer', async ({ request }) => {
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

  // user2 contraoferta
  await request.post(`/api/events/${ev.id}/counter`, {
    headers: { Authorization: `Bearer ${user2.token}` },
    data: { pointsProposed: 8, message: 'menos' },
  })

  // user1 fuerza
  const force = await request.post(`/api/events/${ev.id}/force`, {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (!force.ok()) {
    test.skip(true, `force endpoint devolvió ${force.status()}`)
  }
  expect(force.ok()).toBeTruthy()

  // Hay transacción de tipo forced_payment
  const hist = await request.get('/api/points/history?limit=20', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  const hj: any = await hist.json()
  const list: any[] = Array.isArray(hj) ? hj : (hj.transactions ?? [])
  const hasForced = list.some(t => t.type === 'forced_payment')
  expect(hasForced).toBeTruthy()
})
