# TODO_REFACTOR — bloqueos y deuda diferida del refactor

Registro vivo de cosas que NO se pudieron cerrar en su fase y por qué, para no
perder el contexto. Cada entrada: qué, por qué bloquea, decisión, riesgo.

---

## 📍 PROGRESO DEL REFACTOR (mapeado al audit Top 10, `CLAUDE_AUDIT.md` §8)

> Plan del refactor = **Top 10 priorizado del audit** + **decisiones
> arquitectónicas** de `ESTADO_PRE_REFACTOR.md`. Esta es la lista maestra para
> retomar tras un `/clear`.

**Hecho:**
- ✅ #1 IDOR negociación V2 cerrado (commit `f8229d7`, Fase 0)
- ✅ #2 viewport-fit=cover (commit `c1839a6`, Fase 0)
- ✅ #5 baseline `ESTADO_PRE_REFACTOR.md` rellenado
- ✅ **Harness E2E (Fase 1·T1)** — `npm run test:e2e`, flujos #2 y #3, 3 suites/6 tests
- ✅ #7 cleanup timers (PointsBurst + MonthGrid) — commit `6b43ec0`
- ✅ #7-code-smell push N+1 paralelizado — commit `f583fa5`
- ✅ #2-code-smell auto-verify cron batch (updateMany+createMany) — commit `b7c5696`
- ✅ **#6 Logger central `pino`** — `src/lib/logger.ts` (sync stdout, JSON, silent
  en test) + 131 `console.*` sustituidos por callsite (objeto-primero, errores
  como `{ err }`). Override `LOG_LEVEL`. Commit `959f15a`
- ✅ **strict:true backend (#5)** — en 2 pasos:
  - `cd4ae6f`: augmentación de `Express.Request` movida a `src/types/express.d.ts`
    + retirados los 124 `(req as any)` (compila bajo strict:false).
  - `cbfbb18`: flip a `strict:true` (+ quitado override `noImplicitAny:false`).
    68 errores resueltos sin `any`: helper `requireAuth(req)` para el contexto
    de auth (33×), `requireAuth(req).coupleId` en wheres con `user.coupleId`
    nullable, guards de null (invitations.fromUser/coupleId), arrays `never[]`
    tipados, fallback en rate-limit key. type-check 0 · E2E · unit verdes.
- ✅ **#4 CLAUDE.md** (commit `5f7f9ed`) — §10 Prisma ya estaba a singleton;
  matizada la nota V1/V2 (retirar V2 deprecada solo tras migrar consumidor + E2E;
  documentado el caso `negotiation.ts`). `pointsCalculator` front inexistente:
  ya no se afirma en el doc, sin cambio.
- ✅ **#9 Step B — parte de código** (commit `f3c9688`): refresh-pair en los 2
  endpoints de `invitations.ts` que emiten sesión (`/register-with-invitation`,
  `/accept-link-partner`) vía `maybeIssueRefreshPair` (opt-in X-Want-Refresh) +
  bcrypt 10→12 centralizado (`BCRYPT_ROUNDS` en authService, usado también en
  reset-password). Resuelta la NOTA #9. type-check 0 · E2E 4/4 suites, 11 tests.
- ✅ **T7 helper JSON-en-SQLite** — `src/lib/jsonField.ts` con `parseJsonField`
  (parse seguro: fallback tipado + warn en JSON corrupto, nunca throw→500) y
  `stringifyJsonField`. Sustituidos los 36 `JSON.parse` runtime de campos
  JSON-string en 13 archivos (routes: invitations, ruleProposals, authRoutes,
  profile, profileCompletion, googleCalendarOauth, journal, gamificationV2,
  configurationRoutes, analyticsV2; services: achievementCheckService,
  configurationProposalService, notificationPreferencesService). Los 62
  `JSON.stringify` de escritura se dejan tal cual a propósito (no pueden
  throw con datos planos; sustituirlos era churn sin beneficio). type-check 0
  · E2E 4/4 suites, 11 tests.
- ✅ **T6 partir `apiClient.ts` god-service** (938→63 ln) — transporte HTTP +
  interceptor JWT/refresh único extraído a `services/api/http.ts` (singleton
  `http`); 19 namespaces repartidos en 12 módulos de dominio
  (`services/api/auth|events|tasks|negotiations|points|configuration|
  notifications|profile|gamification|calendar|analytics|lists.ts`).
  `apiClient.ts` queda como fachada con la MISMA forma pública (token methods
  delegados con `.bind(http)`, namespaces, helpers sueltos y tipos
  re-exportados) → cero cambios en los 58 archivos consumidores. La V2
  deprecada `negotiation.*` queda marcada en `api/negotiations.ts` para su
  retirada en T3. type-check 0 (front y back) · E2E 4/4 suites, 11 tests
  (frontend no cubierto por E2E; verificado vía tsc — `vite build` falla en
  esta máquina por entorno: falta `@rollup/rollup-darwin-arm64`, bug npm
  optional-deps pre-existente, no relacionado).
- ✅ **T8 N+1 recurrente semanal** — `recurringTaskService.generateInstancesForCouple`
  batcheado: el cálculo de instancias se extrae al helper puro
  `computeInstancesToCreate` (compartido con `generateOnCreate`, cuyo
  comportamiento por-task no cambia). Por pareja pasa de ~3 queries/task a:
  2 lecturas (tasks + logs auto-generados de todas en un `taskId IN`) +
  1 transacción con un `createMany` global y `updateMany` de `occurrenceCount`
  agrupado por incremento. type-check 0 · E2E 4/4 suites, 11 tests.
- ✅ **T4 PWA Fase 1 (manifest + SW + push)** — commits `3f991dd` + `cdd389f`:
  - `vite-plugin-pwa` (injectManifest) con SW propio `src/frontend/src/sw.ts`:
    precache Workbox (48 entries), navigation fallback SPA (denylist `/api`),
    handlers `push`/`notificationclick` (payload backend `{title,body,url?,icon?,tag?}`).
  - `manifest.webmanifest` en build (standalone, theme/bg `#0f0a1e`, icons
    192/512 + maskable). Iconos nuevos en `public/` (icon.svg + PNGs + apple-touch;
    el `/vite.svg` que referenciaba index.html no existía → favicon real).
  - `index.html`: `theme-color` + metas `apple-mobile-web-app-*`.
  - `main.tsx` registra el SW (`virtual:pwa-register`, autoUpdate).
  - `useWebPush.ts`: `WEB_PUSH_ENABLED=true`; ya no registra `/push-sw.js`,
    usa `serviceWorker.ready` (timeout 5s para dev sin SW).
  - Verificación: front tsc 0 + `vite build` OK · backend type-check 0 ·
    E2E 4/4 suites, 11 tests. **Pendiente manual:** probar instalación +
    suscripción push en prod (HTTPS) — el hook hoy no tiene consumidores UI;
    falta un punto de entrada en Settings/Notifications para invocar
    `subscribe()` (decisión de producto, fuera del alcance T4).
  - Nota infra: el bug npm `@rollup/rollup-darwin-arm64` que impedía
    `vite build` en esta máquina (visto en T6) quedó resuelto tras el
    `npm install` de esta tarea.
- ✅ **T2 descomponer `Tasks.tsx` god-component** (2026-06-12, 3 commits
  `0528819`+`e76bf6c`+`02b2bc5`) — 1132→563 ln, mismo markup/comportamiento:
  - **T2a**: LogTaskModal, DisputeModal, Segment, tipos Task/TaskLog
    (`taskTypes.ts`) y TASK_CATALOG (`taskCatalog.ts`, con tipos
    CatalogGroup/CatalogTask) extraídos a `components/v2/tasks/`.
  - **T2b**: las 6 piezas de render a componentes propios:
    PendingVerificationList, TodaySection (header Hoy + AllDoneCard +
    lista/empty), WeekSection, CatalogSection (estado `showCatalog` ahora
    local), HistoryTab (Segment persona + listado), TasksWeekView (nav +
    WeekStrip + WeeklyTaskView). Tasks.tsx queda como orquestador
    (queries + estado + handlers + composición).
  - **T2c**: el bloque derivado completo (11 colecciones que comparten
    today/weekBounds/taskIdsHiddenFromToday) en UN `useMemo`; fallbacks
    estables EMPTY_TASKS/EMPTY_LOGS; payloads de props memoizados
    (VerifyBanner, existingTasks del catalog sheet); 14 handlers a
    `useCallback`.
  - Verificación por commit: front tsc 0 + `vite build` OK · backend
    type-check 0 · E2E 4 suites/11 tests. **UI no cubierta por E2E** —
    pendiente QA visual manual de la página Tareas (lista/semana/tabs/
    modales) en la próxima sesión con servidor.
- ✅ **T3 retirar V2 negociación deprecada** (2026-06-12, 3 commits
  `e9cfa80`+`5b84768`+`9b7e4fd`):
  - **T3a**: `EventNegotiationCard.tsx` (Calendar bottom-sheet) migrado de las
    rutas V2 event-status-based a la API canónica V1 `/api/negotiations`
    (negotiationId-based), misma semántica que ActivityDetail: useQuery
    `['events', eventId]` (cache compartida), proponer draft via
    `negotiations.create`, aceptar/rechazar la ronda `awaiting` via
    `negotiations.respond`, `isMyTurn` por `proposedBy` de la awaiting.
    Contraoferta/forzar delegan a `/home/activities/:id`. Retirado el botón
    "Hablamos en Persona" (`pending_conversation` era exclusivo V2, sin
    equivalente V1); estados legacy V2 quedan display-only. Retirado el
    namespace `apiClient.negotiation` (api/negotiations.ts + fachada). UI
    realineada al design system v2.
  - **T3b**: E2E flujo #3 reescrito contra V1 (abrir negociación → contraoferta
    → aceptar → balance + guard 409 ronda obsoleta + aceptación directa) y
    test NUEVO cross-couple (responder/forzar negociación ajena → 404, evento
    intacto). **Nueva línea base del harness: 4 suites / 12 tests** (antes 11).
  - **T3c**: borrados `routes/negotiation.ts` + su `app.use` en `server.ts` y
    `tests/negotiationIdorContract.test.ts` (importaba el router retirado; su
    cobertura la sustituye el test cross-couple V1).
  - **Deuda anotada:** `services/negotiationEngine.ts` queda SIN consumidores
    (solo lo usaba la ruta V2). No se borró en T3 (lista NO TOCAR del brief
    §2); candidato a retirarse en una limpieza futura junto con sus tests.
  - Verificación por commit: backend type-check 0 · E2E 4 suites/12 tests ·
    front tsc 0 + `vite build` OK. **UI no cubierta por E2E** — pendiente QA
    visual manual del card de negociación en Calendar (draft→proponer,
    aceptar/rechazar, historial, enlace a detalle).

**Pendiente (orden sugerido para retomar):**
1. **#9 Step B — activación final (env, NO código)** — ⏳ acción de Edu en Render:
   setear `JWT_ACCESS_EXPIRY=15m` y verificar manualmente en prod que el
   refresh-on-401 funciona end-to-end (login con cliente real → esperar expiry →
   confirmar que el interceptor renueva con el refresh token) **antes** de dejarlo
   permanente. El código ya soporta JWT corto sin dejar sesiones sin renovar.
2. **#10 Imágenes de prueba a object storage** (sacar base64 de Postgres). Grande,
   necesita infra (Supabase Storage/S3). Preguntar antes a Edu si la feature
   imagen-prueba se usa de verdad (si no: desactivar flag y cerrar).

**Decisiones arquitectónicas tomadas (de `ESTADO_PRE_REFACTOR.md`):** mantener
Vite SPA (futuro Capacitor) · mantener polling (Supabase Realtime selectivo
después) · activar PWA en este refactor · activar strict:true · activar refresh
tokens · retirar V2 deprecadas.

---

## Fase 0 (2026-06-07) — retirada de rutas V2 deprecadas: APLAZADA a Fase 1

### `src/backend/src/routes/negotiation.ts` — ✅ CERRADO en T3 (2026-06-12)

> El bloque siguiente se conserva como historia. La "Acción Fase 1" descrita
> abajo se ejecutó tal cual en T3 (ver entrada en "Hecho"): card migrado a V1,
> E2E reescrito (4 suites/12 tests) y `negotiation.ts` + `app.use` borrados.

Rutas V2 con `Sunset: 01 Jun 2026` (vencido) que **no se pueden retirar todavía**:
`POST /:eventId/propose`, `POST /:eventId/respond`, `GET /:eventId/negotiation`,
`GET /:eventId/negotiation/history`, `GET /user/pending`.

**Por qué bloquea:**
- `EventNegotiationCard.tsx` está **vivo**: se renderiza en `Calendar.tsx:450` y
  consume estas rutas vía `apiClient.negotiation.*` (`apiClient.ts:680-700`).
- Es el **flujo crítico #3 de ESTADO_PRE_REFACTOR** (negociación de actividades,
  "NO se puede romper").
- **No hay reemplazo drop-in.** `eventRoutes.ts` (el otro router en `/api/events`)
  solo tiene CRUD (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`), **no**
  `accept/reject/counter`. La única alternativa real es la API **V1
  `/api/negotiations`**, que es *negotiationId-based* — modelo de datos distinto
  al *event-status-based* que usa EventNegotiationCard. Migrar no es trivial.
- `tests/idorContract.test.ts` lista `/api/events/:id/accept|reject|counter` como
  endpoints "protegidos", pero **esos endpoints NO existen** en el código: ese
  test es un documento estático/aspiracional, no refleja la realidad.

**Decisión:** migración aplazada a **Fase 1**, cuando se rediseñe el flujo de
negociación y exista harness E2E para verificarlo sin romper el core.

**Riesgo de seguridad:** **MITIGADO en Fase 0** — el IDOR cross-couple se cerró
en el commit `f8229d7` (Tarea 1). Mantener las rutas vivas ya no es un riesgo de
seguridad, solo deuda técnica.

**Acción Fase 1:** reescribir `EventNegotiationCard.tsx` (o su equivalente v2)
contra la API canónica, migrar `apiClient.negotiation.*`, añadir E2E del flujo
proponer→contraoferta→aceptar/forzar, y solo entonces borrar `negotiation.ts` +
su registro en `server.ts` (`app.use('/api/events', negotiationV2Routes)`).

### `src/backend/src/routes/invitations.ts` (montado en `/api/auth`)

También tiene `Sunset: 01 Jun 2026` (vencido). **No se retira:** el flujo de
invitación por email (`/invite-partner`, `/invitation/:token`,
`/accept-invitation`, `/register-with-invitation`, `/link-partner`) sigue usado
por `Onboarding.tsx` y `StepJoinAccount.tsx` (ver comentario en el propio archivo).
No se auditó IDOR aquí en Fase 0; revisar en Fase 1 junto con la migración del
onboarding al flujo de join-code de `authRoutes.ts`.

---

## Fase 1 PWA — reactivar web push: ✅ HECHO (2026-06-11, T4)

Cerrado en T4 (ver entrada en "Hecho"). Queda como seguimiento: (1) QA manual
en prod (instalación PWA iOS/Android + suscripción push end-to-end por HTTPS) y
(2) decidir el punto de entrada UI que invoque `useWebPush.subscribe()` —
el hook sigue sin consumidores (candidato: toggle en Settings/Notifications).

## Fase 1 · Tarea 1 — Harness E2E: HECHO (2026-06-09)

Cerrado el bloqueo "harness DB-bound inexistente". `server.ts` ya exporta `app`
(listen/crons bajo guard `NODE_ENV!=='test'`), y `npm run test:e2e` levanta un
Postgres real (embedded-postgres, sin Docker; override `DATABASE_URL_TEST` para
CI/Homebrew) y cubre los flujos críticos #2 y #3. Ver `src/backend/tests/e2e/README.md`.
Estado: 3 suites / 6 tests verdes.

### Deuda descubierta al montar el harness

- **Migraciones de la era SQLite incompatibles con Postgres fresco:** la
  migración `init` (y otras) usan tipos SQLite (`datetime`), así que
  `prisma migrate deploy` **falla** en la 1ª migración contra un Postgres limpio.
  El harness E2E lo sortea con fallback a `prisma db push` (schema desde
  `schema.prisma`), pero esto significa que **no se puede recrear la DB desde el
  historial de migraciones en Postgres** — prod depende de baseline/reconcile
  (`docs/MIGRATIONS-BASELINE.md`, `scripts/reconcile-prisma-migrations.mjs`).
  Acción futura: squash/baseline de migraciones a Postgres-nativo para que
  `migrate deploy` reproduzca el schema sin `db push`.
- **24 tests unit DB-bound siguen rojos:** no migrados a este harness (fuera del
  alcance de la Tarea 1). Camino: o reusan el Postgres de test del harness E2E,
  o se les da su propia config. Pendiente.
- **`npm run type-check` sin `prisma generate` previo:** un checkout fresco falla
  el type-check hasta generar el cliente. Considerar un `pretest`/`pretype-check`
  que genere el cliente.
