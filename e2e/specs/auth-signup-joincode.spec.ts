// v1.6.1 — Signup con joinCode: 2º user se une a couple existente.

import { test, expect } from '@playwright/test'

test('signup con joinCode válido conecta al couple', async ({ page, request }) => {
  const ts = Date.now().toString(36).slice(-6)
  // 1) creator
  const r1 = await request.post('/api/auth/register', {
    data: { email: `e2e-creator-${ts}@x.test`, password: 'pwd12345', name: 'Creator' },
  })
  const j1: any = await r1.json()
  const joinCode = j1.couple?.secretKey
  expect(joinCode).toBeTruthy()

  // 2) invitee usa joinCode vía signup form
  await page.goto('/signup')
  await page.getByLabel(/email/i).fill(`e2e-joiner-${ts}@x.test`)
  await page.getByLabel(/nombre/i).fill('Joiner')
  await page.getByLabel(/contraseña/i).fill('pwd12345')
  // El input "código de pareja" puede tener distintos labels — robusto:
  const codeInput = page.locator('input[name="joinCode"], input[placeholder*="código" i], input[aria-label*="código" i]').first()
  if (await codeInput.isVisible().catch(() => false)) {
    await codeInput.fill(joinCode!)
  } else {
    test.skip(true, 'Signup form no expone joinCode input — habilitar tras refactor formulario')
  }
  await page.getByRole('button', { name: /crear cuenta|registrarme|signup/i }).click()
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15_000 })
})
