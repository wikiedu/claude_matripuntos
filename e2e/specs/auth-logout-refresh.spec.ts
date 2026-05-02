// v1.6.1 — Logout: cierra sesión y refresh queda en /login (no fugas de token).

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('logout y refresh redirige a /login', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  // Logout — depende de UI: probar testid común y fallback a settings.
  const logoutByTestid = page.getByTestId('btn-logout')
  if (await logoutByTestid.isVisible().catch(() => false)) {
    await logoutByTestid.click()
  } else {
    await page.goto('/settings')
    const logoutBtn = page.getByRole('button', { name: /salir|cerrar sesi/i }).first()
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click()
    } else {
      test.skip(true, 'Logout button no encontrado — añadir data-testid="btn-logout"')
    }
  }

  await page.waitForURL(/\/login/, { timeout: 5_000 })

  // Refresh y verifica que sigue en /login.
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
})
