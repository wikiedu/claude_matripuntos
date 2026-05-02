// v1.6.1 — Playwright config para E2E. 22 specs en chromium + webkit.
// Backend dockerizado con SQLite efímero por test run.
//
// Ejecutar:
//   cd e2e && npx playwright test                    # todos
//   cd e2e && npx playwright test --project=chromium # solo Chrome
//   cd e2e && npx playwright test specs/auth         # subset

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // webServer: el setup real lo hará el script run-e2e.sh para no bloquear
  // el config en imports de paquetes que pueden no estar instalados.
})
