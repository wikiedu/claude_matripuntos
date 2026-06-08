export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  // Los E2E (tests/e2e) tienen su propia config (jest.e2e.config.mjs) porque
  // requieren levantar Postgres. Se excluyen del `npm test` unit/hermético.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/e2e/'],
  // setup.ts carga DATABASE_URL antes de que cualquier import de Prisma se
  // evalúe (globalSetup corre en un worker distinto, por eso usamos setupFiles).
  setupFiles: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
      },
    }],
  },
  moduleNameMapper: {
    // v1.6.4: el primer mapping desreferencia .js → sin extensión para
    // imports relativos clásicos. El segundo redirige los imports al dist
    // del shared a la fuente .ts para que tests no necesiten dist compilado.
    '^.*packages/shared/dist/index(\\.js)?$': '<rootDir>/../../packages/shared/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
}
