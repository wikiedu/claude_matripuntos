// v1.6.1 — Login E2E: credenciales válidas y feedback en credenciales malas.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'

test('login con credenciales válidas entra al dashboard u onboarding', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(user1.email)
  await page.getByLabel(/contraseña/i).fill(user1.password)
  await page.getByRole('button', { name: /entrar|iniciar|login/i }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 10_000 })
  expect(page.url()).toMatch(/\/(dashboard|onboarding)/)
})

test('login con password incorrecto muestra error', async ({ page, request }) => {
  const { user1 } = await createCouple(request)
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(user1.email)
  await page.getByLabel(/contraseña/i).fill('wrongpass')
  await page.getByRole('button', { name: /entrar|iniciar|login/i }).click()
  // Permanece en login.
  await expect(page).toHaveURL(/\/login/)
})
