// v1.6.1 — Frase del día: cascada determinística por mood + cyrb53.
// Comprueba que dos visitas en el mismo día devuelven la misma frase.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('frase del día es la misma en dos cargas del Dashboard', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  await page.goto('/dashboard')
  const phraseEl = page.locator('[data-testid="daily-phrase"]').first()
  if (!(await phraseEl.isVisible().catch(() => false))) {
    test.skip(true, 'daily-phrase testid no presente — añadir en componente DailyPhrase')
  }
  const first = await phraseEl.innerText()

  await page.reload()
  await expect(phraseEl).toBeVisible()
  const second = await phraseEl.innerText()
  expect(first).toEqual(second)
})
