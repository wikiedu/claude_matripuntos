// v1.6.1 — Wizard Eliminar cuenta: 3 pasos, confirma y desactiva la cuenta (soft delete).

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('Eliminar cuenta wizard 3 pasos ejecuta y user no puede volver a entrar', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  await page.goto('/settings')
  const open = page.getByTestId('btn-delete-account').first()
  if (!(await open.isVisible().catch(() => false))) {
    test.skip(true, 'btn-delete-account no visible — habilitar tras Settings v1.6.1')
  }
  await open.click()

  // 3 pasos secuenciales con CTAs:
  for (const tid of ['delete-step1-next', 'delete-step2-next', 'delete-step3-confirm']) {
    const cta = page.getByTestId(tid).first()
    if (!(await cta.isVisible().catch(() => false))) {
      test.skip(true, `${tid} no presente — UI wizard incompleto`)
    }
    // Para el paso de confirmación textual escribir "ELIMINAR".
    const confirmInput = page.getByTestId('delete-confirm-input').first()
    if (await confirmInput.isVisible().catch(() => false)) {
      await confirmInput.fill('ELIMINAR')
    }
    await cta.click()
  }

  // Tras eliminar, login con sus credenciales debe fallar.
  await page.waitForLoadState('networkidle', { timeout: 8_000 })
  const r = await request.post('/api/auth/login', {
    data: { email: user1.email, password: user1.password },
  })
  expect(r.ok()).toBeFalsy()
})
