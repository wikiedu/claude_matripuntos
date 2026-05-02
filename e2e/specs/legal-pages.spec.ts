// v1.6.1 — Páginas legales /privacy /terms /cookies cargan y rinden markdown.

import { test, expect } from '@playwright/test'

for (const slug of ['/privacy', '/terms', '/cookies'] as const) {
  test(`página ${slug} carga sin error y muestra contenido`, async ({ page }) => {
    await page.goto(slug)
    // Heading principal del markdown debe ser visible.
    await expect(page.locator('article h1, article h2').first()).toBeVisible()
    // Footer global en todas.
    await expect(page.getByTestId('global-footer')).toBeVisible()
  })
}
