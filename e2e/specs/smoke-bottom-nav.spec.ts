// v1.6.1 — Smoke E2E: las 4 tabs del bottom nav cargan sin errores de consola.

import { test, expect } from '@playwright/test'
import { createCouple } from '../helpers/createCouple'
import { signInUser, dismissCookieBannerIfPresent } from '../helpers/signInUser'

test('bottom nav tabs cargan sin error de consola', async ({ page, request }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  const { user1 } = await createCouple(request)
  await signInUser(page, user1.email, user1.password)
  await dismissCookieBannerIfPresent(page)

  // Recorrer las 4 tabs principales (orden v1.4: Inicio · Tareas · Calendario · Analítica).
  for (const path of ['/dashboard', '/home/tasks', '/calendar', '/analytics']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle', { timeout: 10_000 })
  }

  // Filter known noise (extensions, third-party). Solo nos interesan errores de la app.
  const appErrors = errors.filter(e =>
    !e.includes('extension') &&
    !e.includes('chrome-extension') &&
    !e.includes('Failed to load resource'),
  )
  expect(appErrors).toEqual([])
})
