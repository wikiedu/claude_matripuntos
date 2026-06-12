// Fase 1 — E2E env (setupFiles, corre por worker ANTES de importar el cliente
// Prisma o la app). Fija las env vars que server.ts / authService / prisma leen
// en su import. La URL debe coincidir con la de globalSetup.mjs.
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://postgres:postgres@localhost:54329/matripuntos_test'

// authService exige JWT_SECRET >= 32 chars en su import (fail-fast).
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-please-change-1234567890'
}
