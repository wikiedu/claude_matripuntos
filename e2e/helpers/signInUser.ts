// v1.6.1 — Helper E2E para login UI. Permite elegir si pasamos cookie banner.

import type { Page } from '@playwright/test'

export async function signInUser(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/contraseña/i).fill(password)
  await page.getByRole('button', { name: /entrar|iniciar|login/i }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 10_000 })
}

export async function dismissCookieBannerIfPresent(page: Page) {
  const btn = page.getByTestId('btn-only-essentials')
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
  }
}
