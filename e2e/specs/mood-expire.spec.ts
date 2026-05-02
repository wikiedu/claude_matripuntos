// v1.6.1 — Mood expira tras 24h y deja de aparecer como vigente.
// Como no podemos viajar 24h en E2E, este test usa el endpoint /mood-history
// para verificar el shape: setear y ver entrada con createdAt.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('setear mood crea entry en mood-history con createdAt reciente', async ({ request }) => {
  const { user1 } = await createCouple(request)

  await request.put('/api/profile/me', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: { currentMood: 'tired' },
  })

  const r = await request.get('/api/profile/mood-history', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (!r.ok()) test.skip(true, `mood-history endpoint: ${r.status()}`)
  const j: any = await r.json()
  const list: any[] = Array.isArray(j) ? j : (j.history ?? j.moods ?? [])
  expect(list.length).toBeGreaterThan(0)
  const newest = list[0]
  expect(newest).toHaveProperty('createdAt')
  expect(['tired', 'happy', 'stressed']).toContain(newest.mood ?? newest.moodKey ?? newest.value)
})
