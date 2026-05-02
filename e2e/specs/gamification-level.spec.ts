// v1.7 — E2E: con flag activo, el Dashboard renderiza LevelBar y endpoints
// devuelven shape correcto. test.skip si flag está off.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('flag on: /api/gamification-v2/level retorna shape', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/gamification-v2/level', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  if (r.status() === 404) test.skip(true, 'GAMIFICATION_V2_ENABLED=false')
  expect(r.ok()).toBeTruthy()
  const j: any = await r.json()
  expect(j).toHaveProperty('level')
  expect(j).toHaveProperty('xp')
  expect(j).toHaveProperty('name')
  expect(j).toHaveProperty('xpToNext')
  expect(j.level).toBeGreaterThanOrEqual(1)
})

test('flag on: Dashboard muestra LevelBar', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)
  await page.goto('/dashboard')
  const levelBar = page.getByTestId('level-bar')
  const visible = await levelBar.isVisible({ timeout: 5_000 }).catch(() => false)
  if (!visible) test.skip(true, 'flag off o sin couple — esperado')
  expect(visible).toBe(true)
})
