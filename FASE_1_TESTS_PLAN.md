# FASE 1 · Tarea 1 — Harness de tests E2E (PLAN)

**Estado:** propuesta. **NO ejecutar hasta aprobación explícita de Edu.**
**Fecha:** 2026-06-07 · **Rama:** `refactor/opus-4-8`

## Objetivo

Poder lanzar `npm run test:e2e` (en `src/backend`) y que cubra, contra el código
ACTUAL (sin tocar lógica de negociación ni migrar EventNegotiationCard):

- **Flujo crítico #2** (ESTADO_PRE_REFACTOR): crear tarea → completarla → el
  partner la verifica → los puntos suman → balance refleja el cambio.
- **Flujo crítico #3**: crear actividad → proponer → contraoferta → aceptar →
  los puntos restan/ajustan → balance refleja el cambio.

E2E = a nivel de API HTTP (no navegador): se ejercita la app Express real contra
una base de datos Postgres real de test.

---

## 1. Qué se va a tocar exactamente

### 1.1 `src/backend/src/server.ts` — exportar `app` (refactor mínimo)
Hoy `server.ts` (1) construye la app y monta rutas a nivel de módulo, pero además
(2) registra **5 cron jobs a nivel de módulo** (líneas 311-390, incluido uno que
corre *cada minuto*) y (3) hace `app.listen(PORT)` directo (línea 392). Importarlo
desde un test arrancaría el servidor y los crons (open handles, ejecuciones en
segundo plano que tocan la DB a mitad de un test → flakiness).

**Cambio mínimo, sin alterar comportamiento en producción:**
- `export { app }` (y `export default app`).
- Mover los `cron.schedule(...)` a una función `startCronJobs()` y el
  `app.listen(...)` + `bootstrapActivityCatalog()` a un guard:
  ```ts
  if (process.env.NODE_ENV !== 'test') {
    startCronJobs()
    app.listen(PORT, () => { ... })
  }
  ```
- `validateEnv()` e `initSentry()` se mantienen en el orden actual (son no-op /
  inofensivos en test; el harness define JWT_SECRET y DATABASE_URL antes).

Resultado: en prod/dev todo igual; en test (NODE_ENV=test) se obtiene `app`
montada **sin** listen ni crons. **No se toca ninguna ruta ni lógica de negocio.**

### 1.2 Harness de DB de test (infra nueva, NO toca código de la app)
- `tests/e2e/setup/globalSetup.ts` — levanta el Postgres de test (ver §3),
  ejecuta `prisma migrate deploy` contra él, deja la URL en un punto determinista.
- `tests/e2e/setup/globalTeardown.ts` — para el Postgres / limpia.
- `tests/e2e/setup/env.ts` (setupFiles, por worker) — fija
  `process.env.DATABASE_URL` y `JWT_SECRET` **antes** de que se importe el
  cliente Prisma.
- `tests/e2e/helpers/api.ts` — helpers: `registerCouple()` (registra user A +
  user B en la misma pareja vía `/register` y `/register-with-code`), `authed()`
  (header Bearer), `resetDb()` (TRUNCATE entre tests).

### 1.3 Config de test E2E separada
- `jest.e2e.config.mjs` — `roots: tests/e2e`, `globalSetup`, `globalTeardown`,
  `setupFiles`, **`--runInBand`** (serial: una sola DB compartida).
- `package.json` (backend): `"test:e2e": "NODE_ENV=test jest -c jest.e2e.config.mjs --runInBand"`.
- Excluir `tests/e2e` del `npm test` actual (`testPathIgnorePatterns`) para que la
  suite unit/hermética siga corriendo sin DB.

### 1.4 Los tests E2E (sobre el código actual)
- `tests/e2e/taskFlow.e2e.test.ts` — flujo #2.
- `tests/e2e/activityNegotiation.e2e.test.ts` — flujo #3 (usa las rutas V2
  actuales de `negotiation.ts`: `/propose`, `/respond` — **sin modificarlas**).

### Endpoints reales que ejercitarán (ya verificados en el código)
```
Auth/pareja:  POST /api/auth/register            (crea couple + user A, devuelve token + joinCode)
              POST /api/auth/register-with-code   (user B se une por joinCode)
Flujo #2:     POST /api/tasks                     (crear tarea)
              POST /api/tasks/:taskId/log         (user A completa; server calcula pointsFinal)
              PUT  /api/tasks/:taskId/logs/:logId/verify  (user B verifica → PointsTransaction)
              GET  /api/points/balance            (assert saldo)
Flujo #3:     POST /api/events                    (user A crea draft)
              POST /api/events/:id/propose        (user A propone)
              POST /api/events/:id/respond {action:'counter_propose', pointsProposed}  (user B)
              POST /api/events/:id/respond {action:'accept'}  (user A acepta la contraoferta)
              GET  /api/points/balance            (assert saldo)
```

---

## 2. Stack de testing elegido y por qué

**Elección: Jest + ts-jest (ESM) + supertest** — el stack que el backend YA usa.

- **Por qué no Playwright:** Playwright es para E2E de navegador (UI). Los flujos
  #2/#3 son flujos de **API** (crear/completar/negociar vía HTTP). No hace falta
  navegador. Playwright añadiría complejidad sin valor aquí. (Sí tendría sentido
  más adelante para E2E de la SPA en Fase 1.x, pero no para esta tarea.)
- **Por qué no Vitest:** el backend está en Jest (`jest.config.mjs`, ts-jest ESM,
  37 suites). Vitest es del *frontend*. Introducir Vitest en el backend duplicaría
  toolchain. supertest ya es dependencia del backend.
- **supertest** ataca directamente la `app` exportada (sin abrir puerto real),
  rápido y determinista.

**Sin dependencias nuevas de testing** (jest, ts-jest, supertest ya están). La
única dependencia potencialmente nueva es la del Postgres de test → §3.

---

## 3. Postgres de test — cómo se levanta (DECISIÓN REQUERIDA)

El `schema.prisma` es **`provider = "postgresql"`** (no SQLite). Por eso los tests
DB-bound actuales fallan localmente (`.env.test` apunta a SQLite, incompatible).
Un E2E fiable necesita un **Postgres real** de test. **Docker NO está disponible
en este entorno** (daemon caído), así que docker-compose/testcontainers quedan
descartados *para correr en local ahora mismo*.

Tres opciones (elige una; recomiendo **A**):

### Opción A — `embedded-postgres` (recomendada: cero setup, sin Docker)
Paquete npm que descarga y corre un binario real de Postgres en local (incluye
`@embedded-postgres/darwin-arm64`). El `globalSetup` lo arranca en un puerto fijo
(p.ej. 54329), `migrate deploy`, corre tests, `globalTeardown` lo para.
- ✅ `npm run test:e2e` "just works" sin Docker ni instalar nada manual.
- ✅ Postgres real → `prisma migrate deploy` y toda la lógica funcionan igual que prod.
- ⚠️ Dependencia nueva (devDep) + descarga del binario en la 1ª ejecución (~caché local).
- ⚠️ Riesgo de compatibilidad con **Node v26** y macOS Darwin 25 (muy recientes);
  hay que validarlo en el primer commit del harness (si falla, caer a Opción B).

### Opción B — Postgres local vía Homebrew (deps mínimas, setup manual)
`brew install postgresql@16 && brew services start postgresql@16`, crear DB
`matripuntos_test`. El harness usa `DATABASE_URL_TEST` apuntando a ella.
- ✅ Sin dependencias npm nuevas; Postgres "de verdad".
- ⚠️ Setup manual una vez (documentado en README). Menos "one-command".

### Opción C — Docker (mejor para CI; requiere arrancar Docker)
`docker compose -f docker-compose.test.yml up -d` con un servicio `postgres:16`.
- ✅ Idéntico a CI (service container de GitHub Actions).
- ❌ Requiere que arranques Docker Desktop (ahora no está disponible).

**Recomendación:** **A para local** + dejar el harness preparado para **C en CI**
vía variable `DATABASE_URL_TEST`: si está definida (CI/Homebrew), se usa esa;
si no, el `globalSetup` arranca `embedded-postgres`. Así el mismo `npm run test:e2e`
sirve local (embedded) y CI (service container) sin cambios.

---

## 4. Cambios al schema / migraciones

**Ninguno al `schema.prisma` ni a las migraciones.** El harness aplica las **33
migraciones existentes** con `prisma migrate deploy` sobre la DB de test limpia
(mismo camino que producción). 

- Si `migrate deploy` revela drift histórico en alguna migración (posible, no
  confirmado), **fallback documentado**: `prisma db push` (crea el schema sin
  historial de migraciones) solo para el entorno de test. Se decide en ejecución
  según resultado; no se modifican migraciones de prod.
- Posible necesidad de **seed mínimo** en `globalSetup` o por test (p.ej.
  `Configuration`/`Category` por defecto si algún handler los asume). Se detecta al
  escribir los tests; si hace falta, se siembra lo mínimo vía Prisma en los helpers
  (no se toca `prisma/seed.ts` de prod).

---

## 5. Estimación de commits y orden

| # | Commit | Contenido | Verificación |
|---|--------|-----------|--------------|
| 1 | `refactor(server): exportar app y aislar listen/crons bajo NODE_ENV!=test` | Refactor §1.1. Sin cambio de comportamiento en prod. | `npm test` (unit) sigue igual; arranque manual `npm run dev` sigue levantando server + crons |
| 2 | `test(e2e): harness Postgres de test + config test:e2e + smoke` | Infra §1.2/§1.3 + Opción de DB elegida + un smoke test (health 200 + register crea pareja). | `npm run test:e2e` pasa el smoke; `npm test` no intenta correr e2e |
| 3 | `test(e2e): flujo #2 crear tarea → completar → verificar → balance` | `taskFlow.e2e.test.ts` | `npm run test:e2e` verde |
| 4 | `test(e2e): flujo #3 proponer → contraoferta → aceptar → balance` | `activityNegotiation.e2e.test.ts` | `npm run test:e2e` verde |
| 5 | `docs: README e2e + notas CI + excluir e2e de npm test` | README `tests/e2e/`, snippet CI (service Postgres), actualizar TODO_REFACTOR.md | — |

**Regla:** un commit por paso; no se empieza el N+1 sin el N verde. Si la Opción A
de DB falla en el commit 2, paro y consulto antes de cambiar a B/C.

---

## 6. Riesgos identificados

1. **DB sin Docker (alto):** la Opción A depende de `embedded-postgres` funcionando
   en Node v26 / Darwin 25 arm64. Mitigación: validar en commit 2; fallback a
   Homebrew (B). Es el principal riesgo de la tarea.
2. **Refactor de `server.ts` (medio):** aislar crons/listen podría alterar orden de
   boot (Sentry, bootstrap). Mitigación: mantener orden exacto, solo envolver en
   guard; verificar `npm run dev` arranca igual y `/api/health` responde.
3. **Propagación de env a workers de jest (medio):** `DATABASE_URL` debe estar
   puesta ANTES de importar el cliente Prisma. Mitigación: URL/puerto **determinista**
   fijado por `setupFiles` (por worker), no depender de env exportada desde
   `globalSetup`. Correr e2e con `--runInBand` (una DB, serial).
4. **Aislamiento entre tests (medio):** DB compartida → datos residuales. Mitigación:
   `resetDb()` (TRUNCATE de todas las tablas con `RESTART IDENTITY CASCADE`) en
   `beforeEach`, y `--runInBand`.
5. **`migrate deploy` con drift (medio):** 33 migraciones podrían no aplicar limpio.
   Mitigación: fallback `db push` solo en test.
6. **Efectos colaterales de gamificación (bajo):** verify/accept disparan XP/
   achievements/streaks que hacen queries extra. No deberían romper el flujo, pero
   pueden requerir seed mínimo o tolerancia en asserts. Se ajusta al escribir tests.
7. **Cálculo de puntos en asserts (bajo):** el server calcula `pointsFinal` desde
   `pointsBase` + modificadores. Los asserts deben leer el balance real / calcular
   con la fórmula de `PUNTOS.md`, no hardcodear, para no acoplarse a constantes.
8. **Node v26 muy nuevo (bajo-medio):** posibles incompatibilidades de tooling
   (ya vimos `rollup` nativo romper en frontend). Si jest/ts-jest E2E diera
   problemas con Node 26, lo reporto antes de seguir.

---

## 7. Lo que esta tarea NO hace (límites explícitos)
- ❌ No migra EventNegotiationCard ni toca `negotiation.ts`/`negotiationEngine`
  (los tests usan las rutas V2 tal cual están hoy).
- ❌ No arregla los 24 tests unit DB-bound que fallan (eso es otra tarea: o se
  migran a usar este harness, o se les da su propia DB). Solo, en commit 5, se
  documenta el camino.
- ❌ No añade E2E de navegador (Playwright) ni toca el frontend.
- ❌ No cambia `schema.prisma` ni migraciones de producción.

---

## Decisiones que necesito de Edu antes de ejecutar
1. **Opción de Postgres de test: ¿A (embedded-postgres), B (Homebrew) o C (Docker)?**
   Recomiendo A (+ override `DATABASE_URL_TEST` para CI).
2. ¿OK con añadir `embedded-postgres` como **devDependency** del backend (si A)?
3. ¿OK con el refactor de `server.ts` para exportar `app` (necesario, bajo riesgo)?
