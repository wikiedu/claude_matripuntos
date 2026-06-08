// Fase 1 — E2E globalSetup. Levanta un Postgres real de test (sin Docker) con
// embedded-postgres y aplica las migraciones. Plano .mjs (no TS) para evitar la
// fricción de ts-jest con globalSetup en modo ESM.
//
// Override: si DATABASE_URL_TEST está definida (CI con service container o
// Postgres local de Homebrew), se usa esa y NO se arranca embedded-postgres.
import EmbeddedPostgres from 'embedded-postgres'
import { execSync } from 'node:child_process'
import { rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 54329
const USER = 'postgres'
const PASSWORD = 'postgres'
const DB = 'matripuntos_test'
// Mantener en sync con tests/e2e/setup/env.ts
const url =
  process.env.DATABASE_URL_TEST ??
  `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB}`

export default async function globalSetup() {
  if (!process.env.DATABASE_URL_TEST) {
    const dir = mkdtempSync(join(tmpdir(), 'mp-e2e-pg-'))
    const pg = new EmbeddedPostgres({
      databaseDir: dir,
      user: USER,
      password: PASSWORD,
      port: PORT,
      persistent: false,
    })
    await pg.initialise()
    await pg.start()
    try {
      await pg.createDatabase(DB)
    } catch {
      // la DB ya existe en una re-ejecución persistente — ignorar
    }
    // Compartir la instancia con globalTeardown (mismo proceso jest runner).
    globalThis.__MP_EMBEDDED_PG__ = pg
    globalThis.__MP_EMBEDDED_PG_DIR__ = dir
    console.log(`[e2e] embedded postgres levantado en :${PORT}`)
  } else {
    console.log('[e2e] usando DATABASE_URL_TEST (Postgres externo)')
  }

  const env = { ...process.env, DATABASE_URL: url }
  try {
    execSync('npx prisma migrate deploy', { cwd: process.cwd(), env, stdio: 'inherit' })
  } catch {
    console.warn('[e2e] migrate deploy falló; fallback a `prisma db push`')
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    })
  }
}
