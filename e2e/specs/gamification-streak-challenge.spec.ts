// v1.7 — E2E: streak + challenge endpoints. Skip si flag off.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('flag on: /api/gamification-v2/streak shape', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/gamification-v2/streak', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (r.status() === 404) test.skip(true, 'flag off')
  expect(r.ok()).toBeTruthy()
  const j: any = await r.json()
  expect(j).toHaveProperty('daily')
  expect(j).toHaveProperty('weekly')
  expect(j).toHaveProperty('longestDaily')
  expect(j).toHaveProperty('longestWeekly')
})

test('flag on: /api/gamification-v2/challenge no challenge yet', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/gamification-v2/challenge', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (r.status() === 404) test.skip(true, 'flag off')
  expect(r.ok()).toBeTruthy()
  const j: any = await r.json()
  // Sin generador previo, esperamos challenge: null
  expect('challenge' in j).toBe(true)
})

test('flag on: /api/gamification-v2/replay devuelve array', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/gamification-v2/replay', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (r.status() === 404) test.skip(true, 'flag off')
  expect(r.ok()).toBeTruthy()
  const j: any = await r.json()
  expect(Array.isArray(j.replays)).toBe(true)
})
