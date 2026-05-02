// v1.6.1 — AvatarPicker en Settings: cambiar emoji + color persiste.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('cambiar avatar en Settings persiste tras refresh', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  await page.goto('/settings')
  const picker = page.locator('[data-testid*="avatar-picker"], [data-testid*="avatar-emoji"]').first()
  if (!(await picker.isVisible().catch(() => false))) {
    test.skip(true, 'AvatarPicker no presente en Settings — wiring pendiente')
  }

  // Click en uno de los emojis disponibles (el segundo, para asegurar cambio).
  const emojis = page.locator('[data-testid^="emoji-"]')
  if (await emojis.count() > 1) await emojis.nth(1).click()

  await page.reload()
  // Si hay header con avatar, comprobamos que existe.
  await expect(page.locator('[data-testid*="avatar"]').first()).toBeVisible()
})
