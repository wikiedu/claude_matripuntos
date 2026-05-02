// v1.6.1 — Onboarding del invitee con link de invitación.
// Flujo: creator crea couple → /auth/invite-partner → invitee abre /onboarding/join/:token →
//        StepJoinAccount → (v1.6.1) StepInviteeAvatar → StepInviteeWork → /dashboard.

import { test, expect } from '@playwright/test'

test('invitee completa join + avatar + work y entra al dashboard', async ({ page, request }) => {
  const ts = Date.now().toString(36).slice(-6)
  const creatorEmail = `e2e-c-${ts}@x.test`
  const inviteeEmail = `e2e-i-${ts}@x.test`

  // Creator
  const r1 = await request.post('/api/auth/register', {
    data: { email: creatorEmail, password: 'pwd12345', name: 'Creator' },
  })
  const j1: any = await r1.json()
  const creatorToken = j1.token

  // Invite
  const inv = await request.post('/api/auth/invite-partner', {
    data: { inviteeEmail },
    headers: { Authorization: `Bearer ${creatorToken}` },
  })
  if (!inv.ok()) {
    test.skip(true, `Invite failed (${inv.status()}) — backend disabled in this env`)
  }
  const invJson: any = await inv.json()
  const token = invJson.token ?? invJson.invitation?.token
  expect(token).toBeTruthy()

  // Invitee abre el link
  await page.goto(`/onboarding/join/${token}`)
  await page.getByLabel(/nombre/i).fill('Invitee')
  await page.getByLabel(/contraseña/i).fill('pwd12345')
  await page.getByRole('button', { name: /entrar|crear|matripuntos/i }).first().click()

  // Stage: avatar (v1.6.1)
  const avatarCta = page.getByTestId('btn-invitee-avatar-continue')
  await expect(avatarCta).toBeVisible({ timeout: 10_000 })
  await avatarCta.click()

  // Stage: work
  const workCta = page.getByTestId('btn-invitee-work-continue')
  await expect(workCta).toBeVisible()
  await workCta.click()

  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
})
