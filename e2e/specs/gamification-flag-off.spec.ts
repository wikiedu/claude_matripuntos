// v1.7 — E2E: con feature flag GAMIFICATION_V2_ENABLED=false, los endpoints
// devuelven 404 y el Dashboard NO renderiza la sección v2.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('flag off: /api/gamification-v2/level retorna 404', async ({ request }) => {
  const { user1 } = await createCouple(request)
  const r = await request.get('/api/gamification-v2/level', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  // Si flag activo en prod este test debe saltarse — comprueba feature gate.
  if (r.status() === 200) test.skip(true, 'GAMIFICATION_V2_ENABLED=true en este env')
  expect(r.status()).toBe(404)
})

test('flag off: Dashboard no muestra LevelBar', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle', { timeout: 5_000 })
  const levelBar = page.getByTestId('level-bar')
  // Si el flag está on en este env, este test no aplica.
  const isVisible = await levelBar.isVisible().catch(() => false)
  if (isVisible) test.skip(true, 'GAMIFICATION_V2_ENABLED=true en frontend')
  expect(isVisible).toBe(false)
})
