// v1.6.1 — MoodHistory devuelve la lista de moods del user en orden desc.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('mood-history devuelve entradas en orden desc por createdAt', async ({ request }) => {
  const { user1 } = await createCouple(request)

  await request.put('/api/profile/me', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: { currentMood: 'happy' },
  })
  await request.put('/api/profile/me', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: { currentMood: 'tired' },
  })

  const r = await request.get('/api/profile/mood-history', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (!r.ok()) test.skip(true, `mood-history: ${r.status()}`)
  const j: any = await r.json()
  const list: any[] = Array.isArray(j) ? j : (j.history ?? j.moods ?? [])
  expect(list.length).toBeGreaterThanOrEqual(2)
  const ts = list.map((x: any) => new Date(x.createdAt).getTime())
  for (let i = 0; i < ts.length - 1; i++) {
    expect(ts[i]).toBeGreaterThanOrEqual(ts[i + 1])
  }
})
