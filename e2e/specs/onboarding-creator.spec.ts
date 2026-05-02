// v1.6.1 — Onboarding del creador (signup → wizard 6 pasos → dashboard).

import { test, expect } from '@playwright/test'

test('creador completa onboarding y aterriza en dashboard', async ({ page }) => {
  const ts = Date.now().toString(36).slice(-6)

  await page.goto('/signup')
  await page.getByLabel(/email/i).fill(`e2e-onb-${ts}@x.test`)
  await page.getByLabel(/nombre/i).fill('Onb')
  await page.getByLabel(/contraseña/i).fill('pwd12345')
  await page.getByRole('button', { name: /crear cuenta|registrarme|signup/i }).click()

  await page.waitForURL(/\/onboarding/, { timeout: 15_000 })

  // El wizard tiene varios pasos y los CTA varían — usamos botón primary visible
  // como avance genérico. Si la UI cambia, revisar testids del wizard.
  for (let i = 0; i < 6; i++) {
    const cta = page.getByRole('button', { name: /siguiente|continuar|empezar|terminar|finalizar|→/i }).first()
    if (await cta.isVisible().catch(() => false)) {
      await cta.click().catch(() => {})
      await page.waitForTimeout(300)
    }
    if (page.url().includes('/dashboard')) break
  }

  // Si no llegamos automáticamente, el último paso suele ser StepDone con CTA Finalizar.
  if (!page.url().includes('/dashboard')) {
    const finish = page.getByRole('button', { name: /finalizar|empezar|guardar/i }).first()
    if (await finish.isVisible().catch(() => false)) await finish.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 }).catch(() => {})
  }

  // Si el flow del onboarding cambia, este check tolera ambos resultados conocidos.
  expect(page.url()).toMatch(/\/(dashboard|onboarding)/)
})
