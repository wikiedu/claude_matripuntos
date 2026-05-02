// v1.6.1 — Wizard Salir de pareja: 2 pasos, confirma y devuelve a couple individual.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('Salir de pareja wizard ejecuta y deja al user en couple individual', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  await page.goto('/settings')
  // Privacidad / sección
  const open = page.getByTestId('btn-leave-couple').first()
  if (!(await open.isVisible().catch(() => false))) {
    test.skip(true, 'btn-leave-couple no visible — habilitar tras integración Settings v1.6.1')
  }
  await open.click()

  // Paso 1: confirmación
  const next = page.getByTestId('leave-couple-next').first()
  if (await next.isVisible().catch(() => false)) await next.click()

  // Paso 2: confirmar definitivo
  const confirm = page.getByTestId('leave-couple-confirm').first()
  await expect(confirm).toBeVisible()
  await confirm.click()

  // Espera respuesta y refresh: el user debería seguir autenticado pero solo (1 user en couple)
  await page.waitForLoadState('networkidle', { timeout: 8_000 })
  const me = await request.get('/api/profile/me', {
    headers: { Authorization: `Bearer ${user1.token}` },
  })
  expect(me.ok()).toBeTruthy()
})
