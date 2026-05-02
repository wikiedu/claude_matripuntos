#!/usr/bin/env node
// Reconcile Prisma migrations against a remote database (typically Supabase).
//
// Use case: when `_prisma_migrations` is corrupted or out-of-sync with the
// actual schema (typical after manual DDL via SQL editor, or after Render
// skipped `prisma migrate deploy` for several releases). This script marks
// every migration directory under `src/backend/prisma/migrations/` as
// `--applied` so future `prisma migrate deploy` invocations work cleanly.
//
// Run: DATABASE_URL='postgresql://...' node scripts/reconcile-prisma-migrations.mjs
// Optional: DRY_RUN=1 to only print what would be done.
//
// Idempotent: safe to re-run. If a migration is already marked applied, the
// `prisma migrate resolve` call returns an error which we capture and skip.

import { readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const BACKEND_DIR = join(REPO_ROOT, 'src/backend')
const MIGRATIONS_DIR = join(BACKEND_DIR, 'prisma/migrations')

const DRY_RUN = process.env.DRY_RUN === '1'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required.')
  console.error('Example: DATABASE_URL="postgresql://user:pass@host:5432/db" node scripts/reconcile-prisma-migrations.mjs')
  process.exit(1)
}

console.log(`[reconcile] Reading migrations from ${MIGRATIONS_DIR}`)
console.log(`[reconcile] Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will mark migrations applied)'}`)

const entries = readdirSync(MIGRATIONS_DIR)
const migrations = entries
  .filter(e => statSync(join(MIGRATIONS_DIR, e)).isDirectory())
  .sort()

console.log(`[reconcile] Found ${migrations.length} migrations to reconcile`)

const results = { applied: [], skipped: [], failed: [] }

for (const migration of migrations) {
  const args = ['prisma', 'migrate', 'resolve', '--applied', migration]
  console.log(`\n[reconcile] → ${migration}`)
  if (DRY_RUN) {
    console.log(`  (dry run) would run: npx ${args.join(' ')}`)
    results.skipped.push(migration)
    continue
  }

  const r = spawnSync('npx', args, {
    cwd: BACKEND_DIR,
    env: { ...process.env },
    encoding: 'utf-8',
  })

  const stdout = r.stdout ?? ''
  const stderr = r.stderr ?? ''
  const combined = stdout + stderr

  if (r.status === 0) {
    console.log('  ✓ marked applied')
    results.applied.push(migration)
  } else if (/already (applied|recorded)/i.test(combined) || /P3008/.test(combined)) {
    console.log('  ↷ already applied — skipping')
    results.skipped.push(migration)
  } else {
    console.error('  ✗ FAILED')
    console.error('    stdout:', stdout.trim().slice(0, 500))
    console.error('    stderr:', stderr.trim().slice(0, 500))
    results.failed.push(migration)
  }
}

console.log('\n[reconcile] Running prisma migrate status...')
const status = spawnSync('npx', ['prisma', 'migrate', 'status'], {
  cwd: BACKEND_DIR,
  env: { ...process.env },
  encoding: 'utf-8',
})
console.log(status.stdout)
if (status.stderr) console.error(status.stderr)

console.log('\n[reconcile] === SUMMARY ===')
console.log(`  Applied (newly marked): ${results.applied.length}`)
console.log(`  Skipped (already applied): ${results.skipped.length}`)
console.log(`  Failed: ${results.failed.length}`)
if (results.failed.length > 0) {
  console.log('  Failed migrations:')
  for (const m of results.failed) console.log(`    - ${m}`)
  process.exit(1)
}

const ok = /Database schema is up to date/i.test(status.stdout)
if (!ok) {
  console.error('[reconcile] WARNING: prisma migrate status does NOT report "up to date".')
  console.error('[reconcile] Investigate manually before declaring v1.5.1 done.')
  process.exit(1)
}

console.log('[reconcile] ✓ Database schema is up to date.')
process.exit(0)
