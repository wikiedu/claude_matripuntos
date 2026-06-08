// Fase 1 — E2E globalTeardown. Para el Postgres embebido y limpia su data dir.
import { rmSync } from 'node:fs'

export default async function globalTeardown() {
  const pg = globalThis.__MP_EMBEDDED_PG__
  if (pg) {
    try {
      await pg.stop()
    } catch {
      // ya parado
    }
    const dir = globalThis.__MP_EMBEDDED_PG_DIR__
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // best-effort
      }
    }
    console.log('[e2e] embedded postgres parado')
  }
}
