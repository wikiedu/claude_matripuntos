# Tests Coverage Audit — 2026-05-05

**Resumen:**
- Backend: **37 archivos `.test.ts`** (~37 suites Jest).
- Frontend: **39 archivos `.test.{ts,tsx}`** (Vitest + RTL).
- E2E: **28 specs Playwright**, ~109 casos de test agregados, en chromium + webkit (matrix).
- CI: `.github/workflows/ci.yml` con 3 jobs (backend / frontend / e2e con matrix). E2E sólo se corre tras backend+frontend OK. Postgres 16 service en CI.

**Veredicto general:** cobertura **alta para una app pequeña** (≈100 suites + 109 cases E2E) pero hay **lagunas críticas** en servicios de v1.7+ y en los flows multi-cuenta. Algunos tests son contract-only (mocked Prisma) y no atrapan regressions de schema.

| Severidad | Hallazgos |
|---|---|
| S0 | 1 |
| S1 | 5 |
| S2 | 7 |
| S3 | 3 |

---

## S0

### S0-T-1 · CI ejecuta sólo subset de tests; los DB-bound NO corren ni en push ni en PR
- **Archivo:** `.github/workflows/ci.yml`, línea `--testPathPatterns=...`.
- **Problema:** el workflow sólo corre tests "hermetic" (mocked prisma + pure units). Los DB-bound (achievement, analytics, **negotiationEngine integration**, **notificationDigestService**, **redBalanceService**, **digestService**) **NO se ejecutan en CI**. El comentario dice "DB-bound suites run in the nightly full pipeline (future)" — la palabra "future" indica que no existe.
- **Riesgo:** una regresión que afecta sólo a integration tests pasa CI y se mergea a main. Nadie se entera hasta que un usuario reporta.
- **Fix:** ya hay servicio `postgres:16` declarado en el job E2E — replicarlo para el job backend y eliminar el filtro `testPathPatterns` (o expandirlo).
- **Esfuerzo:** 2h (incluye arreglar tests que asumían no-DB).

---

## S1

### S1-T-1 · `pointsCalculator.test.ts` no cubre el `compensationDiscount` ni cap=500 ni overnight franja
- **Archivo:** `src/backend/tests/pointsCalculator.test.ts`.
- **Problema:** según el audit de servicios, compensationDiscount fue corregido en código (`pointsCalculator.ts:131-134`), pero es probable que NO haya un test que verifique 10 × 0.8 = 8. Idem cap=500 y eventos que cruzan la franja 21:30-01:00.
- **Fix:** añadir 6 tests:
  1. compensationDiscount = 0.5 → puntos × 0.5
  2. compensationDiscount = 1.0 → no-op
  3. cap=500: input que daría 700 → output 500
  4. franja overnight 23:00→02:00 (¿qué franja? ¿se prorratea?)
  5. duración exacta 3h (boundary 1.0 vs 1.1)
  6. numChildren=3 → factor 2.2
- **Esfuerzo:** 1h.

### S1-T-2 · No hay tests de `negotiationEngine.respondToProposal('accept')` con transactional integrity
- **Archivo:** `src/backend/tests/` — busca `negotiation`. Hay `eventsContract.test.ts` pero es contract (no transaction).
- **Problema:** el audit de services reportó S0: el accept NO es transaccional. Test que falte.
- **Fix:** test que mockea `prisma.$transaction` para fallar a mitad y verifica que NO queda evento `accepted` sin pointsTransaction.
- **Esfuerzo:** 1h.

### S1-T-3 · No hay tests de IDOR por endpoint
- **Problema:** ningún test verifica que User de Couple A no puede leer/escribir recursos de Couple B. Audit anterior arregló IDOR Journal en v2.0.3.1, pero sin test no hay regresión protegida.
- **Fix:** crear `tests/idorContract.test.ts` que itere sobre TODOS los endpoints `/:id` y verifique 403/404 con cross-couple token. Patron del test:
  ```
  for endpoint in [events/:id, tasks/logs/:id, journal/:id, ...]:
    setup user1, couple1; user2, couple2
    create resource in couple1
    GET endpoint with user2 token → assert 403/404
  ```
- **Esfuerzo:** 4h (un día completo de cobertura).

### S1-T-4 · `digestService`, `notificationDigestService`, `redBalanceService` sin tests
- **Archivos:** `src/backend/tests/` no tiene `digest`, `notificationDigest`, `redBalance`.
- **Problema:** servicios introducidos en v2.2.5/v2.2.6 sin red de seguridad. Bugs sutiles: `weekEnd` con `getDay()` (audit services S1), severity transitions, scheduling de digest cada minuto.
- **Fix:** añadir tests unitarios con casos:
  - digest: bordes domingo/lunes, semana cross-year.
  - redBalance: 14d lookback, transitions soft→warn→crit.
  - notificationDigest: respeta quiet hours, respeta tier, no duplica.
- **Esfuerzo:** 4h.

### S1-T-5 · No hay tests cliente del `useAppStore`, `apiClient` interceptor, ni `sheetLock`
- **Archivos:** `src/frontend/src/store/`, `src/frontend/src/services/apiClient.ts`, `src/frontend/src/lib/sheetLock.ts` — sin `.test`.
- **Problema:** core de la app frontend sin tests. El sheetLock que se introdujo en v2.3.2 para arreglar el "refresh extraño" nunca tuvo test. Ahora sabemos que **es opt-in** y la mitad de los sheets no lo usan — un test podría haberlo detectado (test que monta cada sheet y verifica que `acquireSheetLock` se llama al abrir).
- **Fix:** 3 tests críticos:
  - `useAppStore`: bootstrap vs background `loadUserData` separados.
  - `apiClient`: 401 redirect, JWT injection.
  - `sheetLock`: contador correcto, leak si error.
- **Esfuerzo:** 3h.

---

## S2

### S2-T-1 · Tests `Activities.test.tsx`, `ActivityDetail.test.tsx`, `Home.test.tsx` — verificar profundidad
- Existen ✓ pero ¿son "smoke" (renderiza sin crashear) o "behavior" (interacción + assert resultado)? Auditar manualmente.
- **Esfuerzo:** 1h revisión.

### S2-T-2 · Tests E2E no cubren flujos two-account
- 28 specs incluyen `auth-signup-joincode.spec.ts`, `onboarding-invitee.spec.ts`, `activity-create-accept.spec.ts`. ¿Realmente registran 2 cuentas y hacen el flujo completo? O son single-user con mocks?
- **Fix:** verificar specs y añadir si faltan: invite full cycle (User1 invita, User2 acepta, ambos llegan al dashboard con couple linked), evento end-to-end (User1 crea, User2 contraoferta, User1 acepta, ambos ven balance update).
- **Esfuerzo:** 3h.

### S2-T-3 · No hay tests de accesibilidad
- WCAG AA importante para este producto (parejas mayores, uso prolongado). No hay axe-core, no hay E2E de keyboard nav.
- **Fix:** añadir `@axe-core/playwright` y un spec por página clave.
- **Esfuerzo:** 4h.

### S2-T-4 · No hay tests de performance
- Sin Lighthouse CI, sin medición de bundle size, sin tests de tiempo de carga.
- **Fix:** Lighthouse CI en workflow (no bloqueante, sólo report).
- **Esfuerzo:** 2h.

### S2-T-5 · Snapshot tests vs behavior tests
- Algunos `.test.tsx` podrían usar snapshots (verifica si los hay obsoletos).
- **Fix:** auditar y migrar snapshots débiles a assertions explícitas.

### S2-T-6 · Tests no cubren `recurringTaskService` mensual con clamp fin-de-mes
- Audit services reportó bug RFC 5545 en MONTHLY 31-ene → 28-feb. Sin test no se detectó.
- **Fix:** test parametrizado con casos: 31→28/29 feb, 31→30 abr, 31→30 jun, etc.
- **Esfuerzo:** 1h.

### S2-T-7 · `streakService` test no cubre vacation pause
- v2.2.8 añadió pausedUntil pero el test de streak es probable que no lo verifique.
- **Fix:** test "streak no se rompe si couple en pausa".

---

## S3

- **S3-T-1** Snapshots desactualizados — limpiar.
- **S3-T-2** Tests con timeouts arbitrarios — revisar y reemplazar por waitFor.
- **S3-T-3** `e2e/specs` baseURL `:5174` no documentado — añadir comentario o `webServer:` config.

---

## Tabla — Áreas críticas vs cobertura

| Área | Tests existentes | Cobertura estimada | Gap más urgente |
|---|---|---|---|
| pointsCalculator | sí | 70% | compensationDiscount, cap, overnight |
| negotiationEngine | contract only | 30% | transactional integrity |
| recurrenceService | sí | 50% | clamp fin-de-mes MONTHLY |
| recurringTaskService | sí | 40% | DST, año bisiesto |
| streakService | sí | 50% | vacation pause |
| achievementEngine vs V2 | sí ambos | 50% c/u | confusión: ¿cuál se usa? |
| accountDeletionService | sí | 70% | race ghost duplicado |
| coupleLifecycleService | sí | 60% | secretKey rotation post-dissolve |
| digestService | **NO** | 0% | scheduling, weekEnd boundary |
| notificationDigestService | **NO** | 0% | quiet hours, tier respect |
| redBalanceService | **NO** | 0% | severity transitions, lookback 14d |
| webPushService | NO | 0% | (sin web-push instalado, **N/A**) |
| analyticsAggregator | sí (41 tests) | 95% | invariantes ya cubiertos ✓ |
| insightHeuristic | sí | 85% | ok |
| useAppStore (front) | NO | 0% | bootstrap vs polling |
| apiClient interceptor | NO | 0% | 401, JWT |
| sheetLock | NO | 0% | contador correcto |
| IDOR cross-couple | NO | 0% | TODO endpoint |
| E2E two-account flows | parcial | 40% | invite full, event full, force, dispute |
| E2E accesibilidad | NO | 0% | axe, keyboard |

---

## Plan top-10 tests que faltan, ordenado por impacto/coste

1. **CI corre tests DB-bound** (S0-T-1) — desbloquea regression detection.
2. **IDOR contract test global** (S1-T-3) — protege contra el riesgo legal #1 de la app.
3. **negotiationEngine transactional accept** (S1-T-2) — protege invariante saldo.
4. **pointsCalculator compensationDiscount + cap + overnight** (S1-T-1) — protege la fórmula core.
5. **digestService + notificationDigestService + redBalanceService** (S1-T-4) — sirve servicios v2.2 sin red.
6. **useAppStore bootstrap vs polling** (S1-T-5) — protege el fix del refresh.
7. **sheetLock contador** (S1-T-5) — protege la mitigación de v2.3.2.
8. **E2E two-account event flow** (S2-T-2) — único E2E que detecta bugs reales del producto.
9. **recurringTaskService MONTHLY 31** (S2-T-6) — bug RFC 5545.
10. **a11y E2E con axe** (S2-T-3) — WCAG protect.
