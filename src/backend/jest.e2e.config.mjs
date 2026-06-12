// Fase 1 — Config Jest para los tests E2E (DB-bound, supertest contra la app
// real). Separada de jest.config.mjs (unit/herméticos) porque requiere levantar
// Postgres (globalSetup/teardown) y corre en serie (--runInBand, una sola DB).
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  globalSetup: '<rootDir>/tests/e2e/setup/globalSetup.mjs',
  globalTeardown: '<rootDir>/tests/e2e/setup/globalTeardown.mjs',
  setupFiles: ['<rootDir>/tests/e2e/setup/env.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
      },
    }],
  },
  moduleNameMapper: {
    '^.*packages/shared/dist/index(\\.js)?$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30_000,
}
