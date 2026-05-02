// v1.6.1 — Cookie consent banner: 3 acciones + persistencia.

import { test, expect } from '@playwright/test'

test('banner aparece en primera visita y desaparece tras Solo esenciales', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/login')
  await expect(page.getByTestId('cookie-banner')).toBeVisible()
  await page.getByTestId('btn-only-essentials').click()
  await expect(page.getByTestId('cookie-banner')).not.toBeVisible()

  // Reload no vuelve a mostrar el banner.
  await page.reload()
  await expect(page.getByTestId('cookie-banner')).not.toBeVisible()
})

test('Aceptar todo persiste analytics:true en cookie', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/login')
  await page.getByTestId('btn-accept-all').click()

  const cookies = await context.cookies()
  const consent = cookies.find(c => c.name === 'mp_consent_v1')
  expect(consent).toBeDefined()
  expect(decodeURIComponent(consent!.value)).toContain('"analytics":true')
})

test('Personalizar abre modal con toggle de analítica', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/login')
  await page.getByTestId('btn-customize').click()
  await expect(page.getByTestId('toggle-analytics')).toBeVisible()
  await page.getByTestId('toggle-analytics').uncheck()
  await page.getByTestId('btn-save-custom').click()

  const cookies = await context.cookies()
  const consent = cookies.find(c => c.name === 'mp_consent_v1')
  expect(decodeURIComponent(consent!.value)).toContain('"analytics":false')
})
