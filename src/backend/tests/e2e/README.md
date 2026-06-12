# Tests E2E (backend) — Fase 1

E2E a nivel de **API HTTP**: se ejercita la `app` Express real (vía supertest,
sin abrir puerto) contra un **Postgres real de test**, sin mocks. Cubre los
flujos críticos de `ESTADO_PRE_REFACTOR.md` que "no se pueden romper".

## Correr

```bash
cd src/backend
npm run test:e2e        # NODE_ENV=test jest -c jest.e2e.config.mjs --runInBand
```

La primera ejecución descarga el binario de Postgres (embedded-postgres) y lo
cachea. No necesita Docker ni Postgres instalado.

`npm test` (unit/herméticos) **NO** corre estos E2E: `jest.config.mjs` los
excluye vía `testPathIgnorePatterns: ['<rootDir>/tests/e2e/']`. Son dos configs
de Jest separadas a propósito.

## Qué cubre

| Suite | Flujo |
|---|---|
| `smoke.e2e.test.ts` | Harness vivo: `GET /api/health` 200 + `register` crea pareja |
| `taskFlow.e2e.test.ts` | **#2** crear tarea → completar (A) → verificar (B) → balance suma. + guard P0-C (no auto-verificación) |
| `activityNegotiation.e2e.test.ts` | **#3** crear evento → proponer (A) → contraoferta (B) → aceptar (B) → balance del proponente baja. + guard: el creador no puede responder (403) |

Los asserts **no hardcodean puntos**: leen el valor calculado por el servidor
(`pointsFinal` / `pointsCalculated` / `pointsAgreed`) y comparan el balance
contra él, para no acoplarse a las constantes de `docs/PUNTOS.md`.

> **Nota flujo #3:** las rutas V2 de `negotiation.ts` están vivas pero su
> deprecación está aplazada (ver `TODO_REFACTOR.md`). El responder conduce todo
> el flujo (contraoferta **y** aceptación); el creador recibe 403 al intentar
> responder. El test fija ese comportamiento real, no el asumido en el plan.

## Cómo se levanta la DB de test

`tests/e2e/setup/`:

- **`globalSetup.mjs`** — arranca `embedded-postgres` en `localhost:54329`
  (DB `matripuntos_test`, no persistente) y aplica el schema (ver fallback abajo).
- **`globalTeardown.mjs`** — para el Postgres y borra el datadir temporal.
- **`env.ts`** (`setupFiles`, por worker) — fija `DATABASE_URL` y `JWT_SECRET`
  **antes** de que se importe el cliente Prisma. Debe mantener la misma URL/puerto
  que `globalSetup.mjs`.
- **`helpers/api.ts`** — `registerCouple()`, `authHeader()`, `resetDb()`
  (TRUNCATE … RESTART IDENTITY CASCADE entre tests). Corre `--runInBand` (una sola
  DB compartida, serie).

### Schema: `db push`, no `migrate deploy` ⚠️

Las migraciones de `prisma/migrations/` son de la **era SQLite** (la `init` usa
`datetime`, que no existe en Postgres). Por eso `prisma migrate deploy` **falla**
en la primera migración contra una DB Postgres limpia, y `globalSetup` cae al
fallback `prisma db push --skip-generate --accept-data-loss`, que materializa el
schema directamente desde `schema.prisma` (`provider = "postgresql"`).

Implicaciones:
- La DB de test refleja **`schema.prisma`**, no el historial de migraciones.
  Para E2E es lo correcto (queremos el schema actual).
- **No** valida que las migraciones apliquen limpio sobre Postgres fresco — eso
  es deuda separada (prod usa baseline/reconcile; ver `docs/MIGRATIONS-BASELINE.md`
  y la entrada en `TODO_REFACTOR.md`).

## CI (GitHub Actions)

Usar un **service container** de Postgres y exportar `DATABASE_URL_TEST`: si está
definida, `globalSetup` la usa y **no** arranca embedded-postgres (mismo
`npm run test:e2e`, sin cambios).

```yaml
jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: matripuntos_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL_TEST: postgresql://postgres:postgres@localhost:5432/matripuntos_test
      JWT_SECRET: test-secret-ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }   # embedded-postgres no se usa en CI
      - run: cd packages/shared && npm ci && npx tsc
      - run: cd src/backend && npm ci && npx prisma generate
      - run: cd src/backend && npm run test:e2e
```

(El mismo override sirve para correr local contra un Postgres de Homebrew:
`DATABASE_URL_TEST=postgresql://…@localhost:5432/matripuntos_test npm run test:e2e`.)
