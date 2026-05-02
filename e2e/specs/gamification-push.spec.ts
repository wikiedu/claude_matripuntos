// v1.7 — E2E push subscription endpoints (no envío real, solo subscribe).

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('flag on: /api/notifications/push/vapid-key', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/notifications/push/vapid-key', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (r.status() === 404) test.skip(true, 'flag off')
  if (r.status() === 503) test.skip(true, 'VAPID keys not configured in env')
  expect(r.ok()).toBeTruthy()
  const j: any = await r.json()
  expect(typeof j.publicKey).toBe('string')
  expect(j.publicKey.length).toBeGreaterThan(20)
})

test('flag on: /api/notifications/push/subscribe rechaza endpoint inválido', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.post('/api/notifications/push/subscribe', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: { endpoint: 'not-a-url', keys: { p256dh: 'k', auth: 'a' } },
  })
  if (r.status() === 404) test.skip(true, 'flag off')
  expect(r.status()).toBe(400)
})
