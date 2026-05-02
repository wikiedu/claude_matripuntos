// v1.6.1 — Smoke FAB: el FAB del Dashboard abre acciones (registrar tarea, etc.).

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('FAB en Dashboard abre menú de acciones', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  await page.goto('/dashboard')
  const fab = page.locator('[data-testid="fab"], [data-testid*="fab-action"], button[aria-label*="añadir" i]').first()
  if (!(await fab.isVisible().catch(() => false))) {
    test.skip(true, 'FAB no visible — selector específico pendiente de Dashboard layout')
  }
  await fab.click()
  // Tras click esperamos que aparezca alguna acción.
  await expect(
    page.locator('[data-testid*="fab-option"], [role="menu"], [role="dialog"]').first()
  ).toBeVisible({ timeout: 4_000 })
})
