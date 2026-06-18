/**
 * E2E: ConfigurationProposal full lifecycle.
 *
 * Flow tested:
 *   1. User A proposes a change to tasks.cocina
 *   2. User B (partner) sees it in the active list
 *   3. User B accepts it → Configuration.tasksConfig is updated
 *   4. Change appears in changelog
 *   5. Duplicate proposal for same field is rejected
 *   6. User A cannot accept their own proposal
 *
 * Requires a running backend at TEST_BASE_URL (default: http://localhost:3000).
 * Skipped automatically when SKIP_E2E=true.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { createTestCouple, loginAs, type TestUser } from './helpers/api.js'

const BASE = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const SKIP = process.env.SKIP_E2E === 'true'

let userA: TestUser
let userB: TestUser

beforeAll(async () => {
  if (SKIP) return
  ;({ user1: userA, user2: userB } = await createTestCouple(BASE))
})

describe('ConfigurationProposal lifecycle E2E', () => {
  let proposalId: string

  it('User A can propose a tasks.cocina change', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userA)
      .post('/api/config-proposals')
      .send({ field: 'tasks.cocina', oldValue: '2', newValue: '3', rationale: 'more effort' })

    expect(res.status).toBe(201)
    proposalId = res.body.id
    expect(proposalId).toBeDefined()
  })

  it('User A cannot propose a duplicate for the same field', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userA)
      .post('/api/config-proposals')
      .send({ field: 'tasks.cocina', oldValue: '2', newValue: '4' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/activa/i)
  })

  it('User B can see the active proposal', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userB).get('/api/config-proposals')
    expect(res.status).toBe(200)
    const found = res.body.find((p: any) => p.id === proposalId)
    expect(found).toBeDefined()
    expect(found.status).toBe('active')
  })

  it('User A cannot accept their own proposal', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userA)
      .post(`/api/config-proposals/${proposalId}/accept`)

    expect(res.status).toBe(403)
  })

  it('User B can accept the proposal — Configuration is updated', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userB)
      .post(`/api/config-proposals/${proposalId}/accept`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('accepted')

    // Verify Configuration was updated
    const cfg = await loginAs(BASE, userB).get('/api/configuration')
    const tasks = JSON.parse(cfg.body.tasksConfig ?? '{}')
    expect(tasks['cocina']).toBe(3)
  })

  it('Change appears in changelog', async () => {
    if (SKIP) return

    const res = await loginAs(BASE, userB).get('/api/config-proposals/changelog')
    expect(res.status).toBe(200)
    const entry = res.body.find((e: any) => e.field === 'tasks.cocina')
    expect(entry).toBeDefined()
    expect(entry.newValue).toBe('3')
  })
})

describe('ConfigurationProposal — reject and cancel', () => {
  it('User A can cancel their own active proposal', async () => {
    if (SKIP) return

    const createRes = await loginAs(BASE, userA)
      .post('/api/config-proposals')
      .send({ field: 'tasks.limpieza', oldValue: '1.5', newValue: '2' })
    expect(createRes.status).toBe(201)

    const cancelRes = await loginAs(BASE, userA)
      .delete(`/api/config-proposals/${createRes.body.id}`)
    expect(cancelRes.status).toBe(200)
    expect(cancelRes.body.status).toBe('cancelled')
  })

  it('User B can reject an active proposal', async () => {
    if (SKIP) return

    const createRes = await loginAs(BASE, userA)
      .post('/api/config-proposals')
      .send({ field: 'tasks.compra', oldValue: '1', newValue: '2' })
    expect(createRes.status).toBe(201)

    const rejectRes = await loginAs(BASE, userB)
      .post(`/api/config-proposals/${createRes.body.id}/reject`)
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.body.status).toBe('rejected')
  })
})
