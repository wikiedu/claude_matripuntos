# TODO_PHASE2 — estado vivo de la Fase 2 (post v2.9.0)

> Registro vivo ordenado. El modelo siempre coge el **primer ítem sin marcar** y lo ejecuta.
> Al terminar un ítem: márcalo [x] y escribe la fecha. Al bloquearte: anota debajo del ítem.
> Ver brief completo: `docs/PHASE2_MASTERBRIEF.md`.

---

## COLA DE TRABAJO (en orden — el modelo siempre coge el primero sin [x])

### MÓDULO A — Seguridad (prioridad 1)
- [x] **A.1a** `account.ts:35` — Math.random() → `crypto.randomInt(100000, 1000000)` *(2026-06-12, commit 3908f91)*
- [x] **A.1b** `invitationService.ts:56,159` — Math.random() → `crypto.randomBytes(16).toString('hex')` en secretKey *(2026-06-12, commit 3908f91)*
- [x] **A.1c** `emailService.ts:49` — Math.random() → `crypto.getRandomValues` en jitter *(2026-06-12, commit 3908f91)*
- [x] **A.2** IDOR audit `invitations.ts` V2 *(2026-06-12, commit 5588143 — sin IDOR directo; cerrado gap de capacidad 2-usuarios en 4 entry points + bug de prod: mount order dejaba los endpoints públicos detrás del 401 de family.ts. Suite E2E nueva: baseline pasa de 4/12 a 5/17)*
- [x] **A.3** `npm audit fix` axios en frontend + backend *(2026-06-12, commit 98e111b — axios 1.17.0, react-router-dom 6.30.4, ws, qs/express. Quedan dev-only semver-major: vitest/vite/esbuild + cadena @typescript-eslint 6.x — ver BLOQUEOS)*
- [x] **A.4** seed audit *(2026-06-12, commit 31aa93f — prisma/seed.ts limpio; seed-prod-couple.mjs password hardcoded → aleatoria por ejecución)*
- [x] **A.5** [DECISIÓN — solo doc] localStorage JWT → httpOnly cookies *(2026-06-12 — plan escrito en BLOQUEOS/DECISIONES abajo; NO implementado)*

### MÓDULO B — Performance (prioridad 2)
- [x] **B.1** Code splitting + React.lazy + manualChunks *(2026-06-12, commit d416064 — index 898KB→195KB + vendor-react 156KB + vendor-query 49KB + ~18 chunks por página. Bonus ccfd787: fix Node 26 webstorage que rompía 166 tests de vitest. Hallazgo: recharts es dead code — AnalyticsChart.tsx sin importadores, anotar en C)*
- [x] **B.2** DB indexes *(2026-06-12, commit 9d27c4f — la mayoría ya existían de Sprint 12; añadidos los 2 que faltaban con queries hot-path reales: Event(coupleId,dateStart) y Notification(userId,createdAt). Migración 20261212000000)*
- [x] **B.3** N+1 analytics/calendar *(2026-06-12, commit ffa4ce9 — getWeeklyTrends 8 queries→1, getYearOverview 12 meses→Promise.all, +8 funciones paralelizadas. calendarService ya estaba batcheado)*
- [x] **B.4** Fuentes Inter latin+latin-ext *(2026-06-12, commit 8922f71 — 35 woff2→10, precache 1549→1361 KiB)*

### MÓDULO C — Deuda técnica (prioridad 3)
- [x] **C.0** (nuevo, hallazgo B.1) `AnalyticsChart.tsx` + `recharts` dead code *(2026-06-12 — componente borrado, recharts desinstalado, CLAUDE.md §2/§3 limpio, tsc + build verdes)*
- [x] **C.1** `negotiationEngine.ts` retirado *(2026-06-12 — 0 consumidores verificados en src/routes/frontend/scripts/packages; borrado servicio + test file con OK explícito del usuario [estaba en lista NO TOCAR]; type-check 0 + e2e 5/17 verdes)*
- [x] **C.2** Achievements V1→V2 *(2026-06-12 — mapeo: frontend solo consume V2 (/achievements/map + /gamification/status + /gamification-v2); 0 consumidores V1. Flag invertido a opt-in (`=== 'true'`, default OFF) en taskRoutes/negotiationRoutes/server.ts. API client frontend: 7 funciones V1 muertas retiradas. ADR + STATUS.md actualizados. E2E nuevo: verify no crea UserAchievement + map V2 responde → baseline 5/18. PENDIENTE MANUAL: `.env.example:55` dice `=true`, bloqueado por permisos — cambiar a `false` a mano)*
- [x] **C.3** ErrorBoundary global *(2026-06-12 — `components/ErrorBoundary.tsx` nuevo: class boundary + Sentry.captureException (no-op sin DSN) + fallback con recargar/ir al inicio. Montado en App.tsx como `RouteErrorBoundary` keyed por pathname (navegar resetea el error). 3 tests unitarios verdes; suite frontend 161 passed + 8 preexistentes)*
- [x] **C.4** `any` explícitos en críticos *(2026-06-12 — backend: authRoutes 12→0 (IncomingHttpHeaders, campos User reales, httpStatus tipado), taskRoutes 6→0 (TaskLog, Prisma.TaskLogWhereInput, ReturnType del engine), eventRoutes 4→0 (EventDraftForPoints Pick + cast estrecho, Prisma.EventWhereInput), pointsRoutes 3→0 (PointsTransactionWhereInput, Record), invitations req.headers ×2. Frontend críticos: auth.ts registerWithInvitation tipado, StepJoinAccount res tipado, http.ts import.meta sin cast. pointsCalculator NO TOCADO (sus 6 any quedan). Restantes no-críticos: ~25 backend (configurationProposals 5, analyticsV2 4, telemetry 3…) + ~50 frontend (Settings 7, api/profile 6, api/configuration 6…) — sin riesgo, candidatos a sprint de tipos)*
- [x] **C.5** Plan migración `invitations.ts` V2 *(2026-06-12 — mapeo completo en DECISIÓN C.5 abajo: 8 rutas, 2 consumidores reales (StepJoinAccount, flujo email por token), sin equivalente V1; recomendación: declarar canónico el flujo email + decidir con producto las 4 link-partner. Solo doc, sin código)*

### MÓDULO D — Brainstorming (prioridad 4) ⚠️ SIN CÓDIGO — solo produce docs/PHASE2_FEATURE_PROPOSALS.md
- [x] **D.all** Análisis completo D.1-D.8 + propuestas libres + ranking top 5 → `docs/PHASE2_FEATURE_PROPOSALS.md` *(2026-06-12 — doc completo: 8 análisis con situación/problema/propuestas S-M-L/recomendación, 3 propuestas libres (nudge verificación, check-in semanal, deep links invitación), ranking top 5. Hallazgos clave: useWebPush.subscribe() con 0 consumidores [push backend al 95% rindiendo 0%], StepCategories no persiste [TODO Onboarding.tsx:140], 0 telemetría de funnel onboarding, achievementEngineV2 aislado. Veredictos para G: D.5→G.3 Realtime NO favorable a corto plazo; quedan 5 decisiones de producto listadas al final del doc)*
  - D.1 Flujo de negociación (UX, wizard, historial)
  - D.2 Gamificación engagement (retos, streaks, celebraciones)
  - D.3 Push notifications strategy (UI suscripción, eventos, iOS)
  - D.4 Analytics Pro (utilidad real, resumen email, comparativa)
  - D.5 Supabase Realtime vs polling (coste/beneficio, selectivo)
  - D.6 Sistema de puntos (inflación, bonificaciones, equilibrio)
  - D.7 Onboarding (tasa completado, simplificación, DashboardTour)
  - D.8 Features nuevas (modo vacaciones, acuerdos recurrentes, widget, export PDF, modo solo)

### MÓDULO E — UX/UI polish (prioridad 5)
- [ ] **E.1** Empty states audit: Shopping, Todos, Notifications, Achievements tabs
- [ ] **E.2** PWA install prompt: `beforeinstallprompt` + banner manual iOS
- [ ] **E.3** Accessibility: aria-labels en BottomNav, FabActionSheet, modales
- [ ] **E.4** Loading skeletons: audit adoption de `Skeleton` primitive en Activities, Calendar, Analytics, Achievements
- [ ] **E.5** `Settings.tsx` — organizar + añadir sección "Notificaciones Push" con toggle `useWebPush().subscribe()`
- [ ] **E.6** Calendar day view UX + link EventCard → ActivityDetail
- [ ] **E.7** Journal: prompt del día visible sin scroll + retrospectivas CTA
- [ ] **E.8** Dark mode: buscar `bg-white`/`text-black` sin variante `dark:`

### MÓDULO F — Testing (prioridad 6)
- [ ] **F.1a** E2E visual Tasks.tsx: marcar tarea, navegar semanas, catalog flow
- [ ] **F.1b** E2E visual Calendar EventNegotiationCard: proponer, aceptar, link a detalle
- [ ] **F.2** Contract tests `invitations.ts` V2: cross-couple, token expirado, reutilizado
- [ ] **F.3** Unit tests: `activityTemplateService.ts`, `calendarService.ts`
- [ ] **F.4** Ejecutar suite completa + documentar tests DB-bound en rojo esperables

### MÓDULO G — Architecture (prioridad 7)
- [ ] **G.1** Capacitor readiness: APIs web-only, router, deep links
- [ ] **G.2** Rate limiting audit: forgot-password, login, register, upload
- [ ] **G.3** [DECISIÓN] Supabase Realtime selectivo — solo si D.5 favorable
- [ ] **G.4** [DECISIÓN] httpOnly cookies JWT — solo si A.5 aprobado

---

## BLOQUEOS / DECISIONES

### DECISIÓN A.5 — localStorage JWT → httpOnly cookies (plan, NO implementado)
- **Qué:** `auth_token` y `refresh_token` viven en localStorage (`src/frontend/src/services/api/http.ts:28,36`). Un XSS puede exfiltrarlos.
- **Por qué no se hace ahora:** migración transversal backend+frontend+CORS+CSRF. Requiere sesión dedicada (G.4) — hacerlo "de paso" rompería login/refresh en prod.
- **Plan de implementación (cuando se apruebe G.4):**
  1. Backend `POST /auth/login|refresh|register*`: emitir `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api` (+ refresh con `Path=/api/auth/refresh`). Mantener respuesta JSON con token durante el periodo de transición (dual-mode con flag `COOKIE_AUTH_ENABLED`).
  2. Backend `authenticateToken`: aceptar token desde cookie si no hay header Bearer (orden: header > cookie). Añadir `cookie-parser`.
  3. CSRF: con `SameSite=Lax` las mutaciones cross-site quedan bloqueadas, pero añadir double-submit token (`X-CSRF-Token` emitido en login, validado en POST/PUT/DELETE) para defensa en profundidad.
  4. CORS: `credentials: true` en cors() del backend + `withCredentials: true` en axios. Verificar FRONTEND_URL exacto (no wildcard con credentials).
  5. Frontend `http.ts`: eliminar lectura/escritura localStorage; el interceptor de refresh pasa a llamar `/auth/refresh` confiando en la cookie.
  6. Logout: endpoint que haga `Set-Cookie` con `Max-Age=0` (el frontend ya no puede borrar la cookie).
  7. **Capacitor (G.1):** las cookies httpOnly funcionan en WebView pero con caveats de dominio (capacitor://localhost) — evaluar `CapacitorCookies` o mantener dual-mode header para native. Esto es el mayor riesgo del plan.
- **Riesgo de no hacerlo:** un XSS roba sesión completa. Mitigantes actuales: CSP, sanitización de inputs, escHtml en emails, JWT corto (15m) + refresh rotation.

### DECISIÓN C.5 — plan de retirada `invitations.ts` V2 (mapeo 2026-06-12, NO implementado)
- **Inventario (8 rutas, montadas en `/api/auth`):**
  - Con `deprecationMiddleware` (Sunset vencido): `POST /invite-partner` · `GET /invitation/:token` · `POST /accept-invitation` · `POST /register-with-invitation`
  - Sin deprecation: `POST /link-partner` · `GET /pending-link-requests` · `POST /accept-link-partner` · `POST /reject-link-partner`
- **Consumidores frontend reales (solo 2):** `StepJoinAccount.tsx` llama `GET /invitation/:token` (validar token) y `POST /register-with-invitation` (alta del invitee). Es el flujo de **invitación por email** (`/onboarding/join/:token`). Las otras 6 funciones del API client (`invitations.*` en `api/auth.ts`) tienen **0 consumidores**.
- **Matiz de producto:** `StepPair.tsx` oculta la opción de invitar por email desde 2026-04-22 (flujo join-code la cubre) pero el comentario dice explícitamente que las rutas de email se mantienen montadas **para reactivar sin cambio de schema**. No es dead code accidental: es funcionalidad aparcada.
- **Equivalentes V1:** NO exactos. `POST /register-with-code` (V1) es por joinCode; el flujo por token de email no tiene equivalente V1. Migrar el consumidor a V1 = eliminar el flujo email, decisión de producto, no técnica.
- **Plan recomendado (sesión dedicada, no "de paso"):**
  1. Declarar **canónicas** las 4 rutas del flujo email: quitar `deprecationMiddleware`/header Sunset (la deprecación está vencida y no se va a cumplir — mantenerla es ruido y los clientes podrían respetarla).
  2. Las 4 rutas link-partner: confirmar con producto si el flujo "vincular usuario existente" se va a usar; si no → retirarlas junto con sus 6 funciones muertas del API client.
  3. Red de seguridad existente: `invitations.e2e.test.ts` ya cubre 5 de las 8 rutas (capacidad pareja, cross-couple, tokens). Ampliar para las que se toquen.
- **Riesgo de no hacer nada:** bajo — A.2 ya cerró capacidad-2-usuarios y mount order. Es deuda de claridad (V2 "deprecada" que en realidad es canónica), no riesgo de seguridad.

### NOTA A.3 — vulns dev-only restantes (sin fix non-breaking)
- `vitest`/`@vitest/ui` (critical) + `vite`/`esbuild`/`vite-node` (moderate): fix = vite 8 / vitest 4 (semver-major). Solo afectan al dev server/test runner, no al bundle de prod. Programar upgrade de toolchain en sprint propio.
- Cadena `@typescript-eslint` 6.x (minimatch ReDoS, high): fix = major bump del plugin (v8). Solo lint. Mismo sprint de toolchain.

**Formato:**
```
### BLOQUEO en [ítem]
- Qué: ...
- Por qué bloquea: ...
- Decisión: ...
- Riesgo: ...
```

---

## HECHO

- **2026-06-12 — MÓDULO A completo (Seguridad)**: A.1a/b/c (crypto), A.2 (IDOR audit + capacidad pareja + mount fix de prod), A.3 (npm audit fix runtime), A.4 (seed passwords), A.5 (plan httpOnly cookies documentado). Commits: 3908f91 · 5588143 · 98e111b · 31aa93f. Baseline E2E ahora **5 suites / 17 tests**.
- **2026-06-12 — MÓDULO B completo (Performance)**: B.1 code splitting (898KB→195KB main), B.2 indexes hot-path, B.3 N+1 analytics, B.4 fuentes. Commits: d416064 · ccfd787 · 9d27c4f · ffa4ce9 · 8922f71. Bonus: fix Node 26 webstorage (vitest 166 fallos→8 preexistentes).
- **2026-06-12 — MÓDULO D completo (Brainstorming)**: D.all → `docs/PHASE2_FEATURE_PROPOSALS.md` v1. Sin código. Top 5: (1) activar push [toggle+prompt contextual, S], (2) telemetría onboarding + fix StepCategories [S], (3) resumen semanal push accionable [S-M], (4) negociación historial legible + caducidad [S/M], (5) acuerdos recurrentes [M-L]. G.3 (Realtime) → veredicto NO favorable: usar push como señal de invalidación.
- **2026-06-12 — MÓDULO C completo (Deuda técnica)**: C.0 recharts+AnalyticsChart retirados (−444 líneas), C.1 negotiationEngine retirado con OK del usuario (−749 líneas), C.2 achievements V1 apagado por defecto (flag opt-in + E2E nuevo), C.3 ErrorBoundary global keyed por ruta (+3 tests), C.4 any críticos eliminados (auth/tasks/events/points/invitations + frontend auth), C.5 plan invitations.ts documentado. Commits: ddb59df · a2e8bb3 · 2bf7423 · cd1e33f · 7f48ef4 · a289208. Baseline E2E ahora **5 suites / 18 tests**. Pendiente manual: `.env.example` LEGACY_ACHIEVEMENTS_ENABLED=true→false (bloqueado por permisos).

### NOTA F.4 (adelantada) — tests en rojo esperables en local
- Backend: suites DB-bound (analyticsService.test.ts, etc.) fallan sin Postgres local — el gate canónico es `npm run test:e2e` (postgres embebido).
- Frontend: 8 fallos preexistentes en Activities/ActivityDetail/ActivityActionCard/BottomNav (4 archivos) — ya fallaban antes de Fase 2, pendiente diagnóstico en F.4.
