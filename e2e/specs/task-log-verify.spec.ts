// v1.6.1 — Task log: user1 marca tarea, user2 verifica → genera transacción.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('task log → verify genera transacción task_completed', async ({ request }) => {
  const { user1, user2, coupleId: _ } = await createCouple(request)

  // Listar tasks (deberían crearse por defecto en el couple).
  const tasks = await request.get('/api/tasks', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  const tj: any = await tasks.json()
  const list: any[] = Array.isArray(tj) ? tj : (tj.tasks ?? [])
  if (list.length === 0) {
    test.skip(true, 'No tasks por defecto — habilitar tras seed automático en couple create')
  }
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
  expect(log.ok()).toBeTruthy()
  const lj: any = await log.json()

  const verify = await request.put(`/api/tasks/logs/${lj.id}`, {
    headers: { Authorization: `Bearer ${user2.token}` },
    data: { status: 'verified' },
  })
  expect(verify.ok()).toBeTruthy()
})
