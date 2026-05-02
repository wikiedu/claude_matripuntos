// v1.6.1 — Task log dispute: partner marca disputed, status cambia.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('task log → dispute deja status disputed', async ({ request }) => {
  const { user1, user2 } = await createCouple(request)

  const tasks = await request.get('/api/tasks', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  const tj: any = await tasks.json()
  const list: any[] = Array.isArray(tj) ? tj : (tj.tasks ?? [])
  if (list.length === 0) test.skip(true, 'No tasks por defecto')
  const task = list[0]

  const log = await request.post('/api/tasks/logs', {
    headers: { Authorization: `Bearer ${user1.token}` },
    data: {
      taskId: task.id,
      date: new Date().toISOString(),
      pointsBase: task.pointsBase ?? 1,
      pointsFinal: task.pointsBase ?? 1,
    },
  })
  const lj: any = await log.json()

  const disp = await request.post(`/api/tasks/logs/${lj.id}/dispute`, {
    headers: { Authorization: `Bearer ${user2.token}` },
    data: { reason: 'no estoy de acuerdo' },
  })
  expect(disp.ok()).toBeTruthy()
  const dj: any = await disp.json()
  expect(dj.status).toBe('disputed')
})
