// v1.6.1 — Signup E2E: registro nuevo crea cuenta y aterriza en /onboarding.

import { test, expect } from '@playwright/test'

test('signup nuevo usuario aterriza en onboarding', async ({ page }) => {
  const ts = Date.now().toString(36).slice(-6)
  const email = `e2e-signup-${ts}@x.test`

  await page.goto('/signup')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/nombre/i).fill('SignupE2E')
  await page.getByLabel(/contraseña/i).fill('pwd12345')
  await page.getByRole('button', { name: /crear cuenta|registrarme|signup/i }).click()

  await page.waitForURL(/\/onboarding/, { timeout: 15_000 })
  expect(page.url()).toContain('/onboarding')
})

test('signup con email duplicado muestra error', async ({ page, request }) => {
  // Pre-crear el usuario vía API.
  const ts = Date.now().toString(36).slice(-6)
  const email = `e2e-dup-${ts}@x.test`
  await request.post('/api/auth/register', {
    data: { email, password: 'pwd12345', name: 'Dup' },
  })

  await page.goto('/signup')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/nombre/i).fill('Dup2')
  await page.getByLabel(/contraseña/i).fill('pwd12345')
  await page.getByRole('button', { name: /crear cuenta|registrarme|signup/i }).click()

  // Permanece en /signup (no navega a onboarding) y muestra mensaje de error.
  await expect(page.locator('text=/ya|existe|duplicad|already/i').first()).toBeVisible({ timeout: 5_000 })
  expect(page.url()).toContain('/signup')
})
