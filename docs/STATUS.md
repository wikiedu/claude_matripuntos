# STATUS — Matripuntos

**Última actualización:** 2026-05-06
**Versión actual desplegada en producción:** `v2.8.0` · Sprints 1-26 hardening del audit profundo

> **Auditoría 2026-05-05** completada y cerrada: ~255 hallazgos en 12 dominios.
> Sprints 1-26 (v2.4.0 → v2.8.0) cierran los **25 S0 críticos**, **~85 S1**,
> **~60 S2** y **~15 S3**. Los items pendientes son específicos de producto
> (eliminación física de V1 achievements tras frontend migration, decisión
> sobre couple/pause unilateral o consenso, Render plan starter vs uptime-robot).

> **Handoff Claude Design 14 canvases iniciales completado al 100%.**
> **Canvas 15 (Tareas/Actividades rediseño)** desplegado en v2.3.0.
**Branch principal:** `main`
**URL prod:** https://matripuntos.com (frontend FTP) · backend Render · Supabase Postgres

> Para histórico completo de versiones ver `docs/ROADMAP.md`. Para decisiones razonadas ver `docs/DECISIONS.md`.

---

## 🟢 EN PRODUCCIÓN (deployable + público)

> Lo que está hoy mismo accesible al usuario en matripuntos.com.

### v2.8.0 Sprint 26 — achievements V2 canonical — **2026-05-06**
- **ADR docs/decisions/2026-05-06-achievements-canonical-v2.md**: V2 (per-couple) declarado canónico, V1 (per-user) deprecado (audit 02 S2-11)
- **achievementEngine.ts**: bloque @deprecated explícito + plan de eliminación
- **routes**: V1 calls detrás de feature flag `LEGACY_ACHIEVEMENTS_ENABLED` (default true). Cuando frontend migre, bastará setear false en Render
- **server.ts boot log**: indica el estado del flag

### v2.7.7 Sprint 25 — empty states + memo + iOS safe-area — **2026-05-06**
- **Journal feed empty state**: ilustración 📔 + CTA que enfoca el textarea (audit 09 S2-U-8)
- **TodayTasksSection**: React.memo evita re-renders en cada tick polling 60s (audit 06 S2-10)
- **MoodSelectorSheet, AddActivitySheet, AddTaskFromCatalogSheet**: paddingBottom env(safe-area-inset-bottom) para iPhone notch (audit 09 S1-U-2)

### v2.7.6 Sprint 24 — tokens legacy + dead code cleanup — **2026-05-06**
- **Dead code purgado**: AnalyticsPage.tsx, AnalyticsDashboard.tsx, StatCard.tsx, Card.tsx, Button.tsx, TaskPendingCard.tsx + ruta /analytics/advanced
- **TaskScheduleForm reescrito** con Tailwind v2 tokens + a11y (audit 06 S2-1)
- **WeeklyTaskView reescrito** con grid responsivo vertical-mobile/horizontal-sm+ (audit 06 S2-2)
- **OnboardingLanding reescrito** con bg-grad-page + tokens v2 (audit 09 S2-U-1)
- var(--matri-*) eliminado de runtime — solo queda en App.css legacy preservado defensivamente

### v2.7.5 Sprint 23 — frontend refresh tokens integration — **2026-05-06**
- **apiClient**: setTokensFromAuthResponse, getRefreshToken, tryRefresh con refreshInFlight singleton (audit 04 S1-6)
- **request() interceptor 401**: rotación automática + retry una vez antes de caer al onUnauthorized legacy
- **auth.login + registerWithCode**: header X-Want-Refresh:1
- **auth.logout()**: nuevo método POST /auth/logout
- **useAppStore.logout()**: best-effort llama backend

### v2.7.4 Sprint 22 — UX + infra S2/S3 — **2026-05-06**
- **render.yaml versionado**: blueprint con healthCheckPath, autoDeploy, multi-env (audit 10 S2-I-1, S2-I-7)
- **src/backend/.env.example**: consolidado de todas las env vars (audit 10 S2-I-2)
- **server.ts validateEnv()**: fail-fast al boot si JWT_SECRET/DATABASE_URL faltan o JWT_SECRET <32 chars (audit 10 S1-I-5)
- **Skeleton primitive** con SkeletonCard/SkeletonList: unifica los 4 patrones distintos de loading state, motion-reduce respeta prefers-reduced-motion (audit 09 S2-U-7, 06 S2-9)

### v2.7.3 Sprint 21 — security + frontend S2 — **2026-05-06**
- **emailService HTML**: escHtml() para userName/inviterName/link (audit 04 S2-1, XSS prevention)
- **taskProof**: whitelist data:image/{jpeg,png,webp} — bloquea SVG XSS (audit 04 S2-2)
- **CORS multi-origen** via FRONTEND_URLS CSV (audit 04 S2-7)
- **CSP en index.html** con allowlist Render API + PostHog + Sentry (audit 04 S2-4)
- **Tailwind tokens** page.deep, page.blur, accent.indigo-soft, accent.purple-soft (audit 06 S2-5)
- **CategoryPieChart eliminado** (dead code, audit 06 S2-4)
- **BottomNav focus-visible** (audit 06 S3-2)

### v2.7.2 Sprint 20 — services + DB S2/S3 — **2026-05-06**
- **pointsCalculator.getChildrenMultiplier**: respeta event.numChildren=0 estricto (audit 02 S2-3 / 08 S2-4)
- **redBalanceService**: respeta couple.pausedUntil + dayKey local-TZ via Intl (audit 02 S2-7, S2-8)
- **recurringTaskService MONTHLY**: clamp anchor-based fin-de-mes (audit 02 S2-9)
- **emailService**: 3 retries exp backoff + jitter para 5xx/429 transient (audit 02 S2-16, S2-17)
- **cryptoService.decrypt**: valida formato base64url por segmento (audit 02 S2-18)
- **birthdaysService**: clamp 29-feb a 28-feb en años no bisiestos (audit 02 S3-5)

### v2.7.1 Sprint 19 — backend routes S2 batch — **2026-05-06**
- **categories**: zod strict + cap basePoints + duplicate insensitive (audit 01 S2-R-1, R-2)
- **categories subcategory**: zod strict (audit 01 S2-R-3)
- **family Children/Pets**: zod schemas estrictos + dateOfBirth pasada + cap 12 hijos (audit 01 S2-R-3, R-4)
- **notifications**: filter por (userId + coupleId) defensa-en-profundidad (audit 01 S2-R-5)
- **analyticsV2 parseRange**: validar from <= to + dates parseable (audit 01 S2-R-7, R-8)
- **analyticsV2 /insights/:id/seen**: updateMany scope coupleId (audit 01 S2-R-20 IDOR)
- **todos**: .strict() schemas (audit 01 S2-R-16)
- **shopping**: take 500 en items activos (audit 01 S2-R-17)
- **gamificationV2 /replay/:key/seen**: regex validate replayKey (audit 01 S2-R-21)
- **taskRoutes /log**: cap pointsFinal a 500 tras multiplicadores (audit 01 S2-R-22)
- **eventRoutes GET /:id**: drop creator.email PII (audit 01 S2-R-23)
- **invitations /invite-partner**: zod email + lowercase canon (audit 01 S2-R-12)

### v2.7.0 Sprint 17 — refresh token endpoints — **2026-05-06**
- **POST /auth/refresh**: rotación con reuse detection (audit 04 S1-6 / 01 S1-R-17). Token revocado entrante → revoca toda la chain del user.
- **POST /auth/logout**: revoca todos los refresh activos. Access JWT actual sigue válido hasta su expiry natural (no hay blacklist).
- **POST /auth/login** opt-in: si el cliente envía `X-Want-Refresh: 1` recibe además `refreshToken` + `refreshExpiresAt`. Sin header → respuesta legacy.
- Estrategia conservadora zero-downtime: JWT access TTL sigue 7d, frontend no obligado a integrar todavía.

### v2.6.5 Sprint 18 — DB-bound CI + tests faltantes — **2026-05-06**
- **CI ci.yml: nuevo job `backend-db`** con Postgres efímera (`db push`) que corre suites antes excluidos: analyticsService, anniversaryService, gamificationService, achievementEngine. Cierra audit 11 S0-T-1.
- **pointsCalculator tests + 4** para cap 500, roundToHalf asimétrico (audit 08 S2-1), franja madrugada/noche overnight (S1-T-1).

### v2.6.4 Sprint 16 — two-account flows — **2026-05-06**
- **AuthedLayout**: tras notif nueva ahora invalida también `['couple']` + `loadUserData(silent)` para que el inviter vea al partner sin esperar 60s (audit 12 Q-1).
- **/auth/couple-preview/:code y /register-with-code**: cap por usuarios ACTIVOS (deletedAt=null), no totales. Couples con ghost soft-deleted ya no se consideran "llenas" (audit 12 Q-10).

### v2.6.3 Sprint 15 — services hardening — **2026-05-06**
- **negotiationEngine.proposeEvent**: solo proposable si event.status='draft' (audit 02 S1-1, evita loop del proposer).
- **negotiationEngine.respondToProposal counter_propose**: rechaza si la última propuesta es del responder (audit 02 S1-2, evita loop).
- **streakService**: nueva fn `isoWeeksBetween()` que cuenta por frontera ISO (lunes), no por `Math.floor((now-last)/7d)`. Cierra audit 02 S1-9 + 08 S1-7. 5 tests añadidos.

### v2.6.2 Sprint 14 — components dark mode + a11y — **2026-05-06**
- **ActivityCatalogPicker, ProposalsPanel, ProposeChangeDialog, TaskProofUploader**: repintados con tokens dark del v2 design system (audit 06 S1-12, 13, 14).
- **RankingTab**: copy 'v1.5' → 'próximamente' (audit 06 S1-18).
- **lib/zIndex.ts**: tabla canónica de niveles z-index (audit 06 S1-17).

### v2.6.1 Sprint 13 — frontend pages a11y/UX — **2026-05-06**
- **Journal react()**: errores en banner en lugar de tragárselos (audit 05 4.2).
- **Journal entry.tags**: parse defensivo con console.warn cuando malformado (audit 05 4.3).
- **Settings LeaveCoupleWizard**: useNavigate + loadUserData(silent) en lugar de window.location.href full reload (audit 05 10.2).
- **Tasks 'Esta semana' contador**: cuenta logs reales del usuario en la semana ISO en lugar del hardcoded 0/N (audit 05 1.4).

### v2.6.0 Sprint 12 — schema hardening — **2026-05-06**
- **Compensation.linkedTaskId index** (audit 03 S1-6, hot-path al borrar Task con SetNull).
- **Invitation.fromUserId/toUserId Cascade → SetNull** para preservar audit trail (audit 03 S1-9).
- **ConfigurationProposal/ChangeLog: User refs Cascade → SetNull** idem (audit 03 S1-8).
- **RefreshToken: index compuesto (userId, revokedAt)** para queries 'tokens activos' (audit 03 S1-10).
- Migration `v2_6_0_audit_trail_fks_indexes` con DROP IF EXISTS + IF NOT EXISTS defensivos.

### v2.5.9 Sprint 11 — backend route hardening — **2026-05-06**
- **pointsV2 /recalculate**: restricción a draft + creator (audit 01 S1-R-3 IDOR).
- **eventRoutes PUT**: distinción undefined vs vacío para title/description/compensation (S1-R-5).
- **eventRoutes POST**: validación numChildren <= couple real (S1-R-16).
- **taskRoutes /:taskId/log**: updateMany guard contra race del placeholder (S1-R-8).
- **taskRoutes /dispute**: nueva columna disputedBy + disputedAt (S1-R-9, migration).
- **journal GET /entries**: filter author.deletedAt:null (S1-R-11).
- **notificationRoutes /:id/read**: 1 query, sin race + double-fetch (S1-R-12).
- **family /pets PUT**: undefined vs falsy para quantity 0 (S1-R-13).
- **family + categories**: scope por req.coupleId con findFirst (S1-R-14).
- **analyticsV2**: take:5000 defensivo en findMany hot-path (S1-R-18).

### v2.5.8 Sprint 10 — perf + integrity + memo — **2026-05-05**
- **/tasks/recurring N+1 → groupBy + findMany agregada**: para 50 tasks pasamos de 100 round-trips a 2. Map lookup O(1) (audit 01).
- **CalendarEntry.relatedEventId/relatedTaskId con FK explícita** → onDelete: SetNull. Migration limpia huérfanos antes de añadir constraints (audit 03 S1).
- **AppHeader React.memo**: ~20% menos re-renders del header en flujo típico (audit 06).
- **MIGRATIONS-BASELINE.md actualizado**: 4 migrations Postgres-nativas idempotentes documentadas (passwordReset, indexes, taskFK, calendarFK).

### v2.5.7 Sprint 9 — DB hardening + perf — **2026-05-05**
- **Task.defaultAssigneeId con FK explícita** → User onDelete SetNull. Migration limpia primero referencias huérfanas. Antes era String? sin foreign key (audit 03 S1).
- **/points/balance N+1 → groupBy**: una query en lugar de N findMany. Usa el composite index PointsTransaction(coupleId, createdAt) (audit 01).
- **Tasks 'verificar' tab eliminado**: dead code de v2.3.0 (-129 LOC) (audit 05).

### v2.5.6 Sprint 8 — Calendar RQ + indexes + a11y — **2026-05-05**
- **Calendar.tsx → React Query**: mismo patrón que Tasks v2.5.0. Eliminado polling propio + setLoading flash (audit 05 S1).
- **4 composite indexes hot-path**: Event(coupleId,status,dateStart), TaskLog(coupleId,date,completedBy), PointsTransaction(coupleId,createdAt), Notification(userId,isRead). Migration idempotente (audit 03 S1).
- **Onboarding effect deps fix**: deps incompletas con eslint-disable arregladas (audit 05 S1).
- **Tasks LogTaskModal y DisputeModal con role/aria-modal/escape/sheetLock**: a11y + sheetLock auto (audit 06 S1).

### v2.5.5 Sprint 7 — Validación + LIMIT — **2026-05-05**
- **pointsDisputed positive() + max(100)**: antes aceptaba negativos/NaN (audit 08 S1-4).
- **TaskLog date ISO + max 30d futuro**: refine zod (audit 08 S1-4).
- **analyticsV2 insights/regenerate con LIMIT 5000 + filtro createdAt**: evita memory blow-up con histórico largo (audit 01).

### v2.5.4 Sprint 6 — 401 + soft-delete + dissolveCouple + race — **2026-05-05**
- **401 handler usa navigate()** sin full reload (audit 07).
- **soft-delete filter** en queries críticas balance/family (audit 03 S1-4).
- **dissolveCouple rota secretKey** y limpia joinCode (audit 02 S1).
- **V2 counter_propose lock optimista** contra race (audit 12 S1-Q-4).

### v2.5.3 Sprint 5 más S1 — **2026-05-05**
- **XP cuenta event_accepted/forced**: gamificación parcialmente arreglada. Antes el filtro `amount: { gt: 0 }` ignoraba transacciones negativas (eventos aceptados donde el proposer paga). Ahora suma valor absoluto excepto donations. (audit 08 S1-3)
- **partner_joined notif al aceptar email invitation**: User1 ahora recibe notif inmediata cuando User2 acepta el link del email (antes el otro flow register-with-code ya la tenía). (audit 12 S1-Q-1)
- **Invalidate balance/queries tras incrementarse unread count**: cuando llega notif del partner, el cliente refresca balance/eventos/tareas/gamificación sin esperar al próximo polling. Cierra el ciclo notif → UI update. (audit 12 S1-Q-5)
- **Guard ya-autenticado en /login y /signup**: redirect a /dashboard si el user llega ya con sesión. UX. (audit 05 S1)
- **AppHeader refresh button selectivo**: antes invalidateQueries() sin key disparaba >20 refetches en cascada. Ahora sólo las 7 queries que el user genuinamente quiere ver frescas. (audit 06 S1-11)

### v2.5.2 Sprint 4 audit pulido — **2026-05-05**
- **prefers-reduced-motion** respetado globalmente: animaciones reducidas a 0.01ms para usuarios con la preferencia (audit 09 S2-U-2).
- **Inter self-hosted** via @fontsource: privacidad GDPR (no ping a fonts.googleapis.com con cada visit) + perf + offline-friendly (audit 09 S2-U-6).
- **ConfirmDialog en force**: antes 1 click → pago inmediato. Ahora preview de puntos + variant danger + label "Pagar X MP y forzar". Mata el riesgo de tap accidental (audit 12 S1-Q-3).

### v2.5.1 Sprint 3 lógica fina services — **2026-05-05**
- **recurrenceService MONTHLY/YEARLY clamp con anchor** (RFC 5545 §3.3.10): 31-ene → 28-feb → 31-mar (no 28-mar). 29-feb 2024 → 28-feb 2025. (audit 02 S1)
- **gamificationService streak en TZ local del couple** (no UTC): user de Madrid completando a 23:30 local ya no se considera "ayer". Helper `dateKeyInTz` con `Intl.DateTimeFormat('en-CA', {timeZone})`. (audit 02 S1)
- **digestService weekEnd ISO canónico**: helper `lastIsoWeekRange(now)` que devuelve Lunes 00:00 → Domingo 23:59:59 de la semana ANTERIOR sin importar qué día sea now. Idempotente para cron retrasado. (audit 02 S1)
- 91 tests backend pass (15 nuevos en recurrence + digest).

### v2.5.0 Sprint 2 audit hardening — **2026-05-05**
- **Tasks.tsx → React Query**: causa B del refresh extraño resuelta. Eliminado el polling triple (focus + visibility + setInterval), reemplazado por useQuery con `refetchInterval: () => isSheetOpen() ? false : 30_000`. `isLoading` solo en bootstrap, no en refetches background. (audit 05 S0)
- **Achievements 3 servicios documentados**: tras análisis, `achievementEngine` (per-user write), `achievementCheckService` (read map UI), `achievementEngineV2` (catalog evaluator pure) son 3 capas, no duplicados. Plan unificación v2.6+ documentado inline. (audit 02 S2)
- **Hex hardcoded → tokens Tailwind**: 6 ocurrencias `text-[#a5b4fc]/[#c4b5fd]/[#fbbf24]` reemplazadas por `text-indigo-300 / text-violet-300 / text-amber-400` en Pill, FabActionSheet, DailyPhrase, HeatmapChart, PremiumOverlay. (audit 09 S1-U-1)
- **IDOR contract test inventory**: `tests/idorContract.test.ts` documenta los 30+ endpoints `:id` que deben filtrar por coupleId. Patrón canónico (findFirst con coupleId, updateMany con coupleId). Convertir a E2E real cuando exista harness DB+http. (audit 11 S1-T-3)

### v2.4.3 Sprint 1 hardening — **2026-05-05**
- **v2.4.0 — Quick wins críticos (D1):**
  - `web-push` instalado: push notifications vuelven a funcionar en prod
    (audit 10 S0-I-1; bug invisible desde v1.7).
  - Eliminadas TODAS las `window.alert()` y `confirm()` nativas: nuevo
    primitive `<AlertDialog />`, `EventNegotiationCard` migrado a
    `<ConfirmDialog />`, `Journal` también. `console.log('[DELETE-CODE]')`
    eliminado de `DeleteAccountWizard`.
  - `compensationDiscount` ahora se aplica al CREAR/EDITAR eventos (antes
    sólo al accept; el preview engañaba).
  - `maxFreeRounds` enforced en V1 con check de Subscription premium.
  - **Refresh extraño RESUELTO**: `useAppStore.loadUserData(silent=true)`
    desde polling no toca `isLoading`, mata el flash "Cargando…" cada 60s.
    `BottomSheet` y `ConfirmDialog` adquieren `sheetLock` automáticamente
    + `role="dialog"` + safe-area.
- **v2.4.1 — Integridad transaccional (D2):**
  - `negotiationEngine.respondToProposal()` envuelto en `$transaction`
    (antes: invariante saldo rota si crash a mitad).
  - `/negotiations/:id/force` valida que el caller sea el creador del
    evento + `$transaction`.
  - `/tasks/logs/:id/dispute` revierte `PointsTransaction` si el TaskLog
    estaba `verified` (antes: saldo inflado).
  - `/points/reset-confirm` hardening: doble confirmación textual
    (`{ confirmText: "RESET" }`), expiry 24h, audit notif a ambos users.
- **v2.4.2 — Acceso & GDPR (D3):**
  - `loginUser` y `signupUser` filtran `deletedAt: null` (defensa
    profundidad contra ghost emails).
  - IDOR fix en `/journal/retrospectives/:id/seen` (filtraba sólo por id).
  - `signupSchema` legacy couple exige `ageConfirmed1/2` (GDPR Art. 8).
  - `/categories/:id/propose-change` con schema zod estricto.
  - **Forgot-password real**: backend (`PasswordResetToken` model +
    migración + endpoints + email template) + frontend
    (`/forgot-password`, `/reset-password`). Reemplaza el mailto
    temporal de v2.0.3.1.
- **v2.4.3 — Deploy & migrations baseline (D4):**
  - `deploy-frontend.sh` ya NO usa `--delete` (preserva uploads de
    usuarios cuando se añadan en /uploads/) + `--only-newer` + `--parallel`
    + `DRY_RUN=1` para preview.
  - `docs/MIGRATIONS-BASELINE.md` documentado: plan ejecutable para
    cuando producción necesite reconcile de las 6 primeras migraciones
    SQLite vs Postgres.

**Tests:** 73 backend + 160/166 frontend pass. 6 fallos pre-existentes
en main (`ActivityActionCard.test.tsx`, `BottomNav.test.tsx`) marcados
para Sprint 2.

### Core (MVP1 → v1.7)
- Auth (signup, login, demo, invitaciones, partner linking, password reset).
- Onboarding 4 pasos + join flow.
- Eventos con sistema de negociación V1 + V2 (counter, force, compensaciones).
- Tareas (CRUD, logs, verificación, disputas, recurrentes, auto-accept 24h).
- Sistema de puntos: balance, historial, leaderboard, transacciones, factor tipo/franja/duración/hijos, redondeo 0.5, cap 500.
- Configuración editable (tasksConfig, multipliersConfig, activityTypes).
- Notificaciones in-app + web push (VAPID).
- Categorías/subcategorías personalizadas.
- Logros y achievements (unlock + UnlockedSheet).
- Calendario (overview/month/week/day) + service providers.
- Analytics overview/trends/equity.
- Frase del día (mood + autoría rotativa).
- Avatares animales personalizables.
- Mood log + mood week + propuestas/sugerencias post-mood.
- Privacy + telemetría (PostHog).
- Account lifecycle (delete + leave couple wizards).
- E2E tests con Playwright.
- Refresh tokens preparados (lib + service, no activos).
- Niveles de pareja (10) · achievements 30 · streaks · retos semanales · replays · push.

### Calendario 360 (v2.0.1)
- `CalendarEntry` extendido (event/task/service/birthday/holiday).
- Recurrence engine simplificado (RRULE FREQ + INTERVAL/UNTIL/COUNT/BYDAY).
- Holidays + birthdays seed.
- Google Calendar OAuth esqueleto (sync diferido a v2.1).
- `CalendarV2Section` montado al final de `/calendar`.

### Journaling (v2.0.2)
- Página `/journal` completa.
- Entries CRUD + reactions.
- Prompts diarios (cyrb53 hash, idempotente por día).
- Retrospectivas semanales/mensuales.
- IDOR fixed (v2.0.3.1 hotfix S1-1).

### Analytics Pro (v2.0.3 + v2.0.3.1)
- `analyticsAggregator` PURE service con invariantes matemáticos (41 tests).
- Insights heurísticos + heatmap 24×7.
- `AnalyticsProSection` insertado en /analytics.
- Hotfixes: focus rings, BottomNav safe-area, "olvidé contraseña" mailto:, "Hogar"→"Tareas".

### Catálogo + Consenso (v2.0.4)
- `ActivityTemplate` (catálogo global + custom por pareja).
- `ConfigurationProposal` + `ConfigurationChangeLog` (accept/reject/cancel + log de cambios aplicados).
- `ActivityCatalogPicker` (UI de selección con búsqueda, agrupado).
- `ProposalsPanel` + sección "Propuestas pendientes" en Settings.
- `/api/activity-templates` + `/api/config-proposals` (flags `CATALOG_ENABLED` y `CONFIG_PROPOSALS_ENABLED`, default ON).

### v2.3.5 KISS Actividades + refresh hardening — **acaba de deployear 2026-05-04**
- **Desambiguación 'plantilla' vs 'actividad'**: en la pestaña Catálogo de Actividades el botón se llama '+ Nueva plantilla' (no '+ Nueva actividad'); el editor usa títulos 'Editar plantilla' / 'Nueva plantilla del catálogo'.
- **Botón superior** '+ Nueva actividad' se oculta en pestaña Catálogo (allí solo tiene sentido la acción de gestión de plantillas, no la de crear actividad real).
- **AddActivitySheet simplificado**: eliminada la pestaña '✏️ Crear nueva' (era explainer + redirect). Ahora una sola vista con search + chips + listado catálogo y un CTA secundario 'Crear desde cero' que va directo al wizard.
- **Refresh hardening**:
  - QueryClient global con `refetchOnWindowFocus: false` — alt-tab/blur ya no refetchea todas las queries.
  - Polling de notifications (30s) ahora también respeta `isSheetOpen()` además del de `loadUserData` (60s).
  - Import estático de sheetLock — sin warning de Vite por dynamic vs static import.

### v2.3.4 Polish — **2026-05-04**
- **Chips de categoría** en `AddTaskFromCatalogSheet` (amber): filtra el listado del catálogo de tareas para no scrollear largo.
- **AddActivitySheet** (nuevo): sheet unificado simétrico al de Tareas con dos pestañas — "📚 Del catálogo" (default, con search + chips de categoría purple + listado agrupado) y "✏️ Crear nueva" (explainer + botón al wizard `/request-activity`). El botón `+ Nueva actividad` ahora abre este sheet en lugar de navegar directo al wizard. Misma decisión de UX que en Tareas.
- **Scroll-to-day**: `WeekStrip.onDayClick` hace `scrollIntoView` sobre `#day-{iso}` (anchor añadido a cada columna de `WeeklyTaskView`). Tap en un día de la tira → centra la columna correspondiente.

### v2.3.3 WeekStrip vista Semana — **2026-05-04**
- `WeekStrip` 7 columnas (L M X J V S D) con número del día y pip color (amber=tarea, purple=actividad, both=ambos). Hoy resaltado.
- Cabecera con rango "4 may – 10 may" + navegación ‹ ›.

### v2.3.2 Bugfixes críticos sheet — **2026-05-04**
- **Crear nueva tarea desde sheet**: 2 pestañas internas en `AddTaskFromCatalogSheet` (canvas 15): "📚 Del catálogo" + "✏️ Crear nueva". El form crear nueva tiene checkbox "Guardar en catálogo de pareja para reusar" (default ON).
- **Recurrencia recuperada**: tanto en flow catálogo como crear nueva, opción "Es recurrente" + selector de frecuencia (diaria/semanal/quincenal/mensual/cada 2 días).
- **Sheet lock**: nuevo `lib/sheetLock.ts` con contador global. Cada sheet/wizard hace `acquireSheetLock` al abrir y `releaseSheetLock` al cerrar. AuthedLayout polea `loadUserData` cada 60s pero salta tick si `isSheetOpen()`. Aplicado a `AddTaskFromCatalogSheet`, `AddTaskSheet`, `AddActivityTemplateSheet`, `RequestActivity`. Cierra el bug "el refresh automático interrumpe acciones".

### v2.3.1 Polish contenido Tareas/Actividades — **2026-05-04**
- Header secciones "🔥 Hoy" y "📅 Esta semana" con day stamp + count amber siguiendo SectionH del canvas 15.
- `AllDoneCard` activo cuando todos los logs de hoy están done — muestra "+X MP entre los dos" con verde success y peek a mañana.
- Link "Ver historial completo →" al final de Mis Tareas.
- `ActivityActionCard` rediseñada según `act-card` canvas 15: emoji 36x36, price morado grande, status box explicativo, 3 botones con jerarquía (Aceptar verde / Negociar ghost / Rechazar danger).

### v2.3.0 Refactor visual Tareas/Actividades — **2026-05-04**
- Canvas 15 Claude Design (Tareas/Actividades rediseño v2.2). De 4 niveles de UI apilados a 2.
- **MPTabs** top: Tareas con chip "+ MP" verde (suman) y Actividades con chip "− MP" morado (consumen). Diferencia económica visible al instante.
- **HeaderStrip** único: segment Mías/Todas/Recurrentes + icono toggle Lista/Semana + botón "+" primario (gradient amber para Tareas, purple para Actividades).
- **VerifyBanner** condicional sustituye la inner tab "Verificar" que estaba vacía 80% del tiempo. Ocupa 0px si no hay nada.
- 2 botones "+ Añadir tarea" + "+ Crear nueva" unificados en 1 solo "+" (el sheet ya tiene ambas opciones internamente).
- Activities simétrico: MPTabs + título + segment Activas/Historial/Catálogo en mismo pattern.
- 5 componentes nuevos (`MPTabs`, `HeaderStrip`, `VerifyBanner`, `TaskRow`, `AllDoneCard`).
- Bundle Claude Design canvas 15 guardado en `docs/design/claude-design-bundle/project/ui_kits/refactor_v2/`.

### v2.2.11 Presence indicator — **2026-05-04**
- AppHeader muestra el partner con dot verde "en línea ahora" cuando hace <2min, gris "hace X min" hasta 7d. Coexiste con su mood (antes el mood ocultaba la presence).
- AuthedLayout polea `loadUserData()` cada 60s solo cuando la pestaña está visible.
- Cierra canvas 12 en su forma mínima sin websockets.

### v2.2.10 Empty states restantes — **2026-05-04**
- AnalyticsTeaser cuando la pareja tiene <7 días desde createdAt.
- Banner "🌱 Primer día" en /achievements cuando 0 logros desbloqueados.
- Cierra canvas 11 al 100%.

### v2.2.9 Microinteracciones extras — **2026-05-04**
- **LevelUpModal**: cuando el couple sube de nivel, modal con confeti + emoji nivel + CTA "Genial". Detección via localStorage. Auto-dismiss 5s.
- **AnimatedNumber**: el balance del hero anima de su valor previo al nuevo (700ms cubic ease-out) cada vez que cambia. Mount inicial directo.
- **Flame flicker**: el 🔥 del streak parpadea sutilmente cada 2.4s (scale + opacity).
- Cierra 4 de 7 microinteracciones del canvas 13 (PointsBurst v2.2.0 + progress bar mount v2.2.2 + estos 3). Quedan: success haptic, ripple, undo swipe — bajo impacto, backlog.

### v2.2.8 Vacation mode MVP — **2026-05-04**
- `Couple.pausedUntil` + `pausedReason` (migración 20261115000000).
- `/api/couple/pause { days, reason? }` + `/resume` + `/pause-status`.
- `updateDailyStreak` y `notificationDigestService` respetan pausa.
- `PauseBanner` en Dashboard: gradient indigo, fecha-hasta y botón "Reanudar ahora". Solo visible si `pausedUntil > now`.
- MVP minimalista: el activación es manual desde Settings. Detección automática (calendar event "Vacaciones" o saldo rojo >14d) queda diferida.

### v2.2.7 Empty state hero día 1 — **2026-05-04**
- Cuando el couple no tiene actividad (xp=0 y balances=0), Dashboard sustituye `BalanceLevelHero` por `EmptyStateHero` con CTA "Apuntar tarea" + consejo "no ajustéis reglas el primer día".

### v2.2.6 Saldo en rojo crónico — **2026-05-04**
- Diferenciador conceptual: cuando un user lleva días con saldo negativo neto vs su pareja, la app sale del modo "contador" y entra en "asistente de pareja" (canvas 09).
- Backend: `redBalanceService.computeRedBalance` detecta días consecutivos en rojo (últimos 14). 3 umbrales: soft (3 días) / warn (7) / crit (14+).
- `/api/points/red-balance` devuelve `daysInRed`, `severity`, `myDailyDelta[14]`, `partnerName`.
- Frontend: `RedBalanceCard` con copy escalada (sin drama → buen momento para hablarlo → considera pausar conteo).
- **Privacidad asimétrica**: solo lo ve quien está en rojo. El partner no recibe ninguna alerta. Decisión clave para no convertir el saldo en fuente de tensión.

### v2.2.5 Digest scheduler — **2026-05-04**
- Cron cada minuto que detecta users cuyo `digestHour` matchea hora local en su tz, agrega saldo del día + saldo del partner + notifs unread y manda 1 push consolidada con tag `daily-digest`.
- Si no hay actividad ni unread, omite (no spamea).
- Cierra canvas 10 al 100%.

### v2.2.4 Notification preferences — **2026-05-04**
- Modelo de 3 tiers (critical / digest / off) por categoría según handoff Claude Design canvas 10.
- Quiet hours configurables (default 22:00-09:00). Digest hour configurable (default 20:30).
- 6 categorías: peticiones / negociación / calendario / propuestas reglas (defaults critical), achievements (digest), rachas (off).
- Backend: `notificationPreferencesService` con `shouldSendPush(prefs, category, now)` que respeta quiet hours (critical bypassa) y tiers.
- `User.notificationPreferences` (campo JSON ya existente) usado para persistir.
- Settings → Notificaciones rediseñada con Card resumen diario + Card silencio + 6 categorías con select de tier.
- Pendiente v2.2.5: scheduler real del digest (acumular las "digest" y mandar una sola push diaria).

### v2.2.3 Onboarding partner catch-up — **2026-05-04**
- Cuando un user se une a una pareja **ya activa**, en lugar del wizard normal de 5 pasos ve un catch-up de 4 pasos.
- Backend: `/api/auth/partner-summary` devuelve nivel pareja, saldo partner, tareas semana, racha, top reglas configuradas y multipliers activos. Si la pareja es nueva sin actividad, devuelve null → cae al flow normal.
- Frontend: `PartnerCatchUp.tsx` con 4 pasos: Welcome (avatar partner + tú) → Catch-up (qué lleva el partner) → Primera tarea (grid 6 comunes, saltable) → Done (confeti + tip primera semana).
- Hereda config — no re-configura nada. Reduce 6 pasos a 4. "No llegas tarde a una fiesta".

### v2.2.1 Reglas reales — **2026-05-04**
- Cierra el banner "estado provisional" que llevaba desde v2.0.7. Las propuestas en Settings → Reglas **sí aplican** al cálculo real de puntos.
- Backend: `configurationProposalService.accept()` detecta `tasks.<cat>` y `multipliers.<grupo>.<key>` y muta `Configuration.tasksConfig`/`multipliersConfig` en la misma transacción que el changelog.
- Frontend: `RealRulesSection` reemplaza al editor legacy con DEFAULT_RULES hardcoded. Lee `Configuration` real y muestra Tareas (puntos base por categoría) + Factor hijos / franja / duración. Cada item con botón ✏️.
- Audit log de últimos 5 cambios aplicados visible al final de la sección.

### v2.2.0 Dashboard refactor
- **Hero unificado** balance + nivel pareja con eyebrow conversacional, glow radial, perk próximo, barra amber. Una sola card grande, no dos banners.
- **MoodCard unificada** sustituye `MoodNudge` + `MoodPairCard`. Estados A (sin mood: CTA gradient amber/purple) y B (filled: yo + partner con divisor).
- **PointsBurst** — microinteracción "+X MP" flotante al completar tarea (1400ms cubic-bezier ease-out, anclado al botón).
- Reordenado del Dashboard según jerarquía del canvas 01: Hero → Frase → Mood → Anniversary → Streak → Tareas hoy.
- Estado completo en `docs/design/CLAUDE-DESIGN-IMPLEMENTATION-STATUS.md` (mapeo de los 14 canvases con su estado real).

### v2.1.1 Refactor flujo Tareas/Actividades
- **Tareas — dos botones diferenciados**:
  - Primario "Añadir tarea" → sheet del catálogo (TASK_CATALOG estático + tareas custom de la pareja). Selección → mini-form con puntos editables, día programado, recurrencia + frecuencia, asignación.
  - Secundario "Crear nueva" (ghost) → form en blanco para tareas que no están en el catálogo.
  - Sin consenso para tareas (decisión founder).
- **Actividades — wizard limpio + consenso de puntos en plantillas**:
  - Botón "🔎 Catálogo" del wizard `RequestActivity` retirado. Vuelve al flujo histórico.
  - Tab Catálogo de `/home/activities` mantiene gestión de plantillas.
  - Categorías cerradas (8 fijas).
  - Consenso híbrido (opción C): nuevo template / cambio de puntos lanza `ConfigurationProposal` con field `activity_template:<id>:points`. Hasta que el partner acepta, badge "pts pendientes" + valor tachado.
  - Migración `20261110000000`: backfill defensivo (globales + custom previas como ya aprobadas).
  - Banner explicativo en AddActivityTemplateSheet.

### v2.1.0 Gamificación unificada
- **Eliminados los dos sistemas de niveles paralelos** ('Vecinos · Lv 1' arriba y 'Brote · Nivel 2' abajo). Ahora uno solo.
- 10 niveles temáticos: **Encuentro 🌱 · Confianza 🌿 · Compañía 🤝 · Complicidad 💫 · Refugio 🏡 · Raíces 🌳 · Tribu 🔥 · Legado 💎 · Eterno ♾️ · Mito ⭐**.
- XP thresholds: 0/100/300/700/1500/3000/6000/12000/24000/100000.
- Migración SQL `20261105000000_v2_1_0_levels_rename` mapea slugs viejos a nuevos (defensiva: cualquier valor inesperado vuelve a 'encuentro').
- `LevelBar` retirado del dashboard. `BalanceLevelHero` queda como única fuente.
- Borrados: `levelService.ts`, `levelTable.ts` (sistema A nunca llegó a producción real). `/api/gamification-v2/level` reescrito para devolver el sistema unificado.

### v2.0.8 Actividades full-CRUD — **acaba de deployear 2026-05-03 noche**
- Tab nueva "Catálogo" en `/home/activities` (junto a Activas e Historial).
- `ActivityCatalogManager`: lista templates globales + propios, agrupados por categoría con filtro chip.
- Templates propios: editar (Pencil) + eliminar (Trash) con confirm.
- Templates globales: badge "global", read-only.
- `AddActivityTemplateSheet`: form completo (categoría, subcategoría, emoji, puntos, duración, impacto, descripción).
- Botón "Nueva actividad" siempre visible en activas/historial.

### v2.0.7 Bugfixes críticos
- Mood ahora se resetea al cambiar de día (`useMoodVigent` exige mismo día local en vez de sliding 24h).
- Replay "Vuestro mejor día reciente" muestra fecha (`Lunes 28 abr · 3 actividades · 37 pts`).
- Calendar: añadidos botones "Tarea" + "Actividad".
- Settings → Reglas de puntos: banner WARN explícito de que las propuestas no aplican aún al backend (eso llega en v2.1.x).
- Auto-seed del catálogo de actividades en arranque del backend.

### Refinos + bugfixes (v2.0.6)
- **Fix crítico**: rutas v2.0.4/v2.0.5 devolvían `Route not found` en cold-start de Render. Convertidas de dynamic import a static import → garantizado el orden del middleware stack.
- **Fix bug "tareas fantasma"**: una tarea sin `scheduledFor` aparecía en "Hoy" todos los días, en ambas cuentas, para siempre. Ahora "Hoy" requiere `scheduledFor <= hoy`.
- **Wiring del catálogo de actividades** (v2.0.4 que faltaba): botón "🔎 Catálogo" en `RequestActivity` step 1; al seleccionar un template prefilla título/descripción/duración.
- **Botón "Proponer cambio"** por cada regla en Settings → Reglas de puntos. Crea `ConfigurationProposal` consensuada para el partner.
- **AnniversaryCard rediseñada**: estilo dark coherente con el dashboard, chip discreto en vez de banner rosa.
- **CI E2E arreglado**: `prisma db push` en vez de `migrate deploy` contra la BD efímera (la init migration usa `DATETIME` de SQLite, incompatible con Postgres CI).

### Quick wins (v2.0.5)
- **Anniversary timer**: `Couple.relationshipStartDate` + `anniversaryService` PURE (años/meses/días + hito siguiente). `AnniversaryCard` en dashboard. `/api/anniversary` GET|PUT|DELETE.
- **Image proof opcional**: `TaskLog.proofImageUrl` + `proofUploadedAt`. `TaskProofUploader` en `Tasks.tsx` (mis pendientes, edit) y en `TaskPendingCard` (verificador, read-only). `/api/task-logs/:logId/proof` GET|POST|DELETE.
- Diseño sin almacenar binarios: data-URL <500KB o https:// hosteada por el usuario.

---

## ⚠️ PENDIENTE DE OPERACIÓN MANUAL EN PROD (one-time)

> El código está mergeado a `main` y desplegado, pero requiere acción humana en infraestructura.

1. **Confirmar que Render aplicó las migraciones v2.0.4 + v2.0.5**
   - Migraciones: `20261020000000_v2_0_4_catalog_consensus`, `20261101000000_v2_0_5_quick_wins`.
   - Si Render saltó migrate (bug histórico desde 2026-04-10): ejecutar `npx prisma migrate deploy` con `DATABASE_URL` de Supabase.
   - Verificación: `\d "ActivityTemplate"`, `\d "ConfigurationProposal"`, columna `relationshipStartDate` en `Couple`, columnas `proofImageUrl` + `proofUploadedAt` en `TaskLog`.

2. **Seed del catálogo global de actividades** (sólo una vez, idempotente)
   ```bash
   cd src/backend
   DATABASE_URL=<supabase> npx ts-node prisma/seedActivityTemplates.ts
   ```
   Inserta ~50 templates globales (`coupleId=null`).

3. **QA en dos cuentas reales** del flujo end-to-end:
   - Crear evento eligiendo template del catálogo (v2.0.4).
   - Proponer cambio de multiplicador desde A → aceptar desde B → ver entry en changelog.
   - Fijar fecha de aniversario, ver el timer en dashboard.
   - Completar tarea, subir foto de prueba (data-URL <500KB), partner verifica viendo la foto.

---

## 🟡 IMPLEMENTADO PERO NO INTEGRADO TODAVÍA

> Componentes/servicios listos en código pero falta enchufarlos al flujo principal.

- ~~**`ActivityCatalogPicker` en creación de eventos.**~~ ✅ Enchufado en v2.0.6 (botón "🔎 Catálogo" en RequestActivity).
- ~~**Botón "Proponer cambio" en cada regla de Settings.**~~ ✅ Enchufado en v2.0.6.
- **CRUD completo en página de Actividades** (feedback usuario 2026-05-03): la sección "Actividades" del nav es mucho menos completa que "Tareas". Falta poder añadir, editar, eliminar actividades del catálogo desde una página dedicada (no sólo el modal del picker). → Backlog v2.0.7.
- **`refreshTokenService` con rotación + reuse detection.** Implementado en backend, pero el flujo de auth todavía emite JWT puro. Activar al introducir mobile RN en v3.0.
- **Anuario PDF preview** (mencionado en spec v3.0 como gancho freemium). Servicio Puppeteer no implementado todavía.
- **Seed del catálogo global en Supabase**: ejecutar `npx ts-node prisma/seedActivityTemplates.ts` una vez. Sin esto, el picker mostrará "No hay actividades".

---

## 🔴 PENDIENTE DE IMPLEMENTAR

### Próximas versiones con spec aprobado o brainstorm
- **v2.0.6 Refinos catálogo** (por decidir tras D30)
  - Picker en EventCreate (sustituir entrada libre).
  - Contraoferta en propuestas de configuración.
  - "Proponer cambio" inline en cada slider de Settings.
- **v2.1 Conectados** (spec aprobado, branch pendiente)
  - Push notifications PWA reales (lib `web-push` ya viene de v1.7, falta loop scheduler real).
  - Sync Google Calendar bidireccional (OAuth scaffolding ya existe, falta sync engine + tokens cifrados).
  - Email transaccional via Resend.
  - Export CSV/PDF de historial.
  - Sistema de referidos con código + recompensa.
  - ICS feed.
- **v2.2 Multiidiomas** (brainstorm pendiente, spec por escribir)
  - i18n con react-i18next, locales `es/en/ca/pt`.
  - Toggle de idioma en Settings con persistencia (`User.locale`).
  - Catálogo de prompts journal localizado.
  - Plantillas email localizadas.
  - `name_i18n` JSON en `ActivityTemplate` para traducciones.
- **v3.0 Premium** (spec aprobado)
  - Stripe Checkout + Customer Portal.
  - Trial 14 días sin tarjeta.
  - AI assistant (Anthropic Claude Haiku ZDR).
  - Themes premium (5 paletas).
  - Anuario PDF anual (Puppeteer).
  - Multi-couple history.
  - React Native app (opcional).

### Out-of-scope MVP de v2.0.4 (diferidos)
- Contraoferta en propuestas (sólo accept/reject hoy).
- Notificaciones push para nuevas propuestas (requiere v2.1 push real).
- "Proponer cambio" inline en cada slider de Settings (panel + endpoint manual hoy).

### Out-of-scope MVP de v2.0.5 (diferidos)
- Almacenamiento real de imágenes (cloud storage). Hoy se usa data-URL <500KB.
- Reglas anti-fraude duras: hoy la imagen es opcional; no bloquea verificación si falta.
- Mosaico/galería de pruebas en analytics ("últimas tareas con foto").

---

## ❓ DECISIONES PENDIENTES

> Cosas que requieren input del producto antes de decidir cómo construirlas.

1. **¿Imágenes reales en cloud storage o data-URL es suficiente?**
   Hoy v2.0.5 acepta data-URLs <500KB. Si la pareja sube muchas fotos, esto crece el row de TaskLog. Decidir cuándo migrar a S3/Cloudflare R2 (probablemente cuando data D30 muestre uso real).
2. **¿UI inline para "proponer cambio" en cada slider de Settings?**
   Hoy hay panel + endpoint, pero no un botón "Proponer este cambio" en cada control. Decidir si conviene en v2.0.6 o esperar a feedback.
3. **¿v2.1 Conectados o v2.2 Multiidiomas primero?**
   Conectados aporta retención (notifs + sync); Multiidiomas amplía mercado. Brainstorm en sesión nueva tras D30.
4. **¿Activar refresh tokens en webapp ya o esperar a RN v3.0?**
   Listo en backend, pero introduce complejidad (rotación + reuse detection). Por ahora JWT plano basta para web.
5. **¿Replantear el nombre/etiqueta de "alto_impacto" en el catálogo de actividades?**
   La categoría incluye bodas, comuniones, despedidas, funerales — agrupar mejor por "social vs ritual" o dejar como está.
6. **¿El picker del catálogo debe sustituir o coexistir con la entrada libre de eventos?**
   Si sustituye → más higiene de datos para analytics. Si coexiste → más libertad pero menos consistencia.

---

## 🧪 MÉTRICAS / OBSERVACIONES PRE-D30

> A revisar 30 días tras v2.0.4/v2.0.5 en prod.

- Adopción del catálogo: ¿qué % de eventos usa template vs entrada libre?
- Adopción del consenso: ¿cuántas propuestas se crean por semana, % aceptadas, tiempo medio de respuesta?
- Adopción del anniversary timer: ¿qué % de parejas activas tiene fecha fijada?
- Adopción de image proof: ¿qué % de tareas verificadas tiene foto? ¿correlaciona con menos disputas?
- Datos para decidir v2.0.6 (refinos) vs saltar a v2.1.

---

## 🗺️ Roadmap resumido

| Versión | Estado | Notas |
|---|---|---|
| MVP1 → v1.7 | ✅ Producción | Core + gamificación 2º round |
| v2.0.1 Calendario 360 | ✅ Producción | Google sync diferido a v2.1 |
| v2.0.2 Journaling | ✅ Producción | Atachments diferidos |
| v2.0.3 Analytics Pro | ✅ Producción | Invariantes matemáticos |
| v2.0.3.1 Hotfix | ✅ Producción | IDOR + UX must-fix |
| v2.0.4 Catálogo + Consenso | ✅ Producción 2026-05-03 | Pendiente seed + QA E2E |
| v2.0.5 Quick wins | ✅ Producción 2026-05-03 | Anniversary + image proof |
| v2.0.6 Refinos + bugfixes | ✅ Producción 2026-05-03 (tarde) | Wiring v2.0.4 + fix routes 404 + fix tareas fantasma + UX anniversary + CI |
| v2.0.7 Bugfixes mood/replay/calendar/rules | ✅ Producción 2026-05-03 (noche) | Mood reset día, fecha en mejor día, botones calendar, banner reglas honesto, auto-seed catálogo |
| v2.0.8 Actividades full-CRUD | ✅ Producción 2026-05-03 (noche) | Tab Catálogo + add/edit/delete templates |
| v2.1.0 Gamificación unificada | ✅ Producción 2026-05-03 (noche) | 10 niveles Encuentro→Mito, eliminado el dual-banner |
| v2.1.1 Tareas/Actividades flow | ✅ Producción 2026-05-03 (noche tardía) | Añadir vs Crear + consenso puntos en plantillas |
| v2.2.0 Dashboard refactor | ✅ Producción 2026-05-04 | Hero unificado + MoodCard + PointsBurst (canvas 01/03/13) |
| v2.2.1 Reglas reales | ✅ Producción 2026-05-04 | Consensus aplica a Configuration (canvas 06) |
| v2.2.2 Progress bar microanimation | ✅ Producción 2026-05-04 | Hero progress 0→pct mount animation (canvas 13) |
| v2.2.3 Onboarding partner | ✅ Producción 2026-05-04 | Catch-up 4 pasos cuando llega segundo (canvas 08) |
| v2.2.4 Notification preferences | ✅ Producción 2026-05-04 | 3 tiers + quiet hours + 6 categorías (canvas 10) |
| v2.2.5 Digest scheduler | ✅ Producción 2026-05-04 | Cron diario que agrega y manda 1 push (cierra canvas 10) |
| v2.2.6 Red balance card | ✅ Producción 2026-05-04 | Saldo en rojo crónico escalado (canvas 09) |
| v2.2.7 Empty state hero | ✅ Producción 2026-05-04 | Día 1 motivador (canvas 11 estado 1/4) |
| v2.2.8 Vacation mode | ✅ Producción 2026-05-04 | Couple.pausedUntil + banner + respeto en streaks/digest (canvas 14) |
| v2.2.9 Microinteracciones extras | ✅ Producción 2026-05-04 | Level-up modal con confeti + balance counter tween + flame flicker (canvas 13) |
| v2.2.10 Empty states restantes | ✅ Producción 2026-05-04 | AnalyticsTeaser + banner achievements (cierra canvas 11) |
| v2.2.11 Presence indicator | ✅ Producción 2026-05-04 | Dot verde + polling 60s (cierra canvas 12 mínimo) |
| v2.3.0 Tareas/Actividades canvas 15 | ✅ Producción 2026-05-04 | MPTabs + HeaderStrip + VerifyBanner — 4 niveles de UI a 2 |
| v2.3.1 Polish contenido | ✅ Producción 2026-05-04 | SectionH + AllDoneCard + ActivityActionCard rediseñada |
| v2.3.2 Sheet bugfixes | ✅ Producción 2026-05-04 | Crear nueva en sheet + recurrencia + sheetLock para no interrumpir acciones |
| v2.3.3 WeekStrip vista Semana | ✅ Producción 2026-05-04 | 7 columnas con pip color por día (canvas 15 S03) |
| v2.3.4 Polish UX | ✅ Producción 2026-05-04 | Chips catálogo tareas + AddActivitySheet simétrico + scroll-to-day |
| v2.3.5 KISS Actividades | ✅ Producción 2026-05-04 | Desambiguar plantilla vs actividad, sheet 1 vista, refetchOnWindowFocus off |
| v2.2.x Más microinteracciones | 🔴 Pendiente | level-up confetti + balance counter + streak flame + undo swipe (canvas 13 restantes) |
| v2.2 Multiidiomas | 🧠 Brainstorm pendiente | i18n ES/EN/CA/PT |
| v3.0 Premium | 📝 Spec aprobado | Stripe + AI + RN |
| v2.1 Conectados | 📝 Spec aprobado | Push real + Google sync + email |
| v2.2 Multiidiomas | 🧠 Brainstorm pendiente | i18n ES/EN/CA/PT |
| v3.0 Premium | 📝 Spec aprobado | Stripe + AI + RN |
