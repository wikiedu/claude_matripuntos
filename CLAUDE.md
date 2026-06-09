# CLAUDE.md — Matripuntos

> **Estado:** rama `refactor/opus-4-8` en curso. Existe `ESTADO_PRE_REFACTOR.md` (raíz) con el baseline de features funcionales antes del refactor. Las secciones §3/§5/§6 reflejan el árbol real a 2026-06-07.

## 0. REGLAS DE SESIÓN
- **Aviso al 75% de contexto:** cuando el uso de contexto de la sesión se acerque al 75% (≈150k/200k tokens), detente en el siguiente punto de control natural (tras un commit, tras un deploy, al cerrar un bug) y **pregunta al usuario** si continuar o cerrar con `/compact`. En el aviso incluye: (1) resumen de lo hecho, (2) lo pendiente, (3) tu recomendación (seguir / compactar / abrir sesión nueva). NO arranques tareas nuevas pasado ese umbral sin OK explícito del usuario.
- Los permisos están en modo wildcard en `.claude/settings.local.json` — puedes ejecutar Bash/Edit/Write sin pedir confirmación, salvo acciones destructivas o de alcance compartido (push --force, drop table, envíos externos), que siempre confirman antes.

## 1. PROYECTO
App web gamificada para parejas: gestión equitativa de responsabilidades del hogar mediante puntos negociables. Repo: https://github.com/wikiedu/claude_matripuntos

**Versión actual en producción:** v2.8.0 · Sprints 1-26 hardening del audit profundo 2026-05-05 (tag `v2.8.0`)
**Estado del proyecto:** ver `docs/STATUS.md` para snapshot completo (qué está en prod, qué está pendiente, qué decisiones quedan).
**Auditoría base:** `docs/audits/2026-05-05-full-audit/00-MASTER-REPORT.md` (12 dominios, ~255 hallazgos).
**Branch principal:** `main`

## 2. STACK TÉCNICO

**Frontend** (`src/frontend/`) — Puerto 5173
- React 18 + TypeScript + Vite
- Tailwind CSS + Lucide React
- Zustand (global state) · React Query (server state)
- Recharts (analytics charts)

**Backend** (`src/backend/`) — Puerto 3000
- Node.js + Express + TypeScript (ESM, `node --loader ts-node/esm`)
- Prisma ORM · Zod (validation) · JWT + refresh tokens (auth)
- SQLite local → PostgreSQL/Supabase en producción

**Monorepo / paquetes compartidos:**
- `packages/shared/` — Zod schemas compartidos back↔front (`schemas/auth|account|couple|profile|common.ts`) + catálogo de eventos de telemetría (`telemetry-events.ts`). Se compila a `dist/` y el backend lo importa; el `build` del backend lo compila **primero** (ver §4).
- `scripts/` — utilidades de operación: `reconcile-prisma-migrations.mjs` (reconcilia migraciones Prisma), `seed-prod-couple.mjs`, `patch-onboarded.mjs`, `start-server.sh` / `stop-server.sh`, `server.cjs`, `frame-template.html`.

**Deploy:**
- Frontend: build Vite → FTP. Dominio de producción: **matripuntos.com**. Host FTP de deploy: `ftp.keepitup.io`. Credenciales en `.deploy-credentials` (local, no en git).
- Backend: Render — auto-deploy desde `main` via GitHub
- DB producción: Supabase (PostgreSQL) — conectado a Render via env vars

## 3. ESTRUCTURA DE CÓDIGO

> El frontend está en plena migración a UI "v2". Los componentes nuevos viven en `components/v2/<dominio>/`; en la raíz de `components/` solo queda un puñado de componentes legacy/transversales todavía en uso.

### Frontend — `src/frontend/src/`

```
pages/                      # Una página por ruta de React Router
  Home.tsx                  # Dashboard principal post-login (selector Home v2)
  Dashboard.tsx             # Vista de saldo/gamificación (legacy, aún enlazada)
  Tasks.tsx                 # Tareas recurrentes + verificación
  Activities.tsx            # Lista de actividades/eventos negociables
  ActivityDetail.tsx        # Detalle + negociación de una actividad
  RequestActivity.tsx       # Crear/solicitar actividad
  Calendar.tsx              # Calendario 360 (mes/semana/día)
  Analytics.tsx             # Analytics (basic + pro con overlay premium)
  Achievements.tsx          # Logros + nivel + ranking
  Journal.tsx               # Diario de pareja (entries + reacciones + retros)
  Notifications.tsx         # Centro de notificaciones
  ShoppingListPage.tsx      # Lista de la compra compartida
  TodoListPage.tsx          # To-dos (propios/compartidos)
  Settings.tsx              # Ajustes de cuenta/pareja/preferencias
  Login.tsx · Signup.tsx    # Auth
  ForgotPassword.tsx · ResetPassword.tsx   # Recuperación de contraseña
  Onboarding.tsx            # Wrapper del flujo de onboarding
  NotFound.tsx              # 404
  legal/                    # Terms.tsx, Privacy.tsx, Cookies.tsx, LegalPage.tsx
  onboarding/               # Flujo paso a paso: StepWelcome, StepPair, StepProfile,
                            #   StepCategories, StepRules, StepDone, StepJoinAccount,
                            #   StepInviteeAvatar, StepInviteeWork, OnboardingLanding,
                            #   PartnerCatchUp

components/                 # Raíz: legacy/transversales aún en uso
  Alert.tsx                 # Banner de alerta
  AnalyticsChart.tsx        # Wrapper Recharts
  CookieConsentBanner.tsx   # Consentimiento de cookies (GDPR)
  EventNegotiationCard.tsx  # Card de negociación de evento (legacy)
  Footer.tsx · RuleProposalCard.tsx · TaskScheduleForm.tsx · WeeklyTaskView.tsx
  v2/                       # UI nueva, 19 subcarpetas por dominio:
    primitives/             # Design system: Button, Card, Input, Avatar, BottomSheet,
                            #   AlertDialog, ConfirmDialog, Pill, ProgressBar, Skeleton, AvatarPicker
    layout/                 # AppHeader, BottomNav, FabActionSheet, HeaderMenu
    home/                   # HomeSelector (router de la home)
    dashboard/             # ~30 cards de la home: BalanceLevelHero, LevelBar/LevelUpModal,
                            #   StreakBadge/StreakStrip, ChallengeCard, MoodCard/MoodNudge/MoodPairCard,
                            #   DailyPhrase, ReplayCard, RedBalanceCard, TodayTasksSection,
                            #   VerifyTasksBanner, ActivitiesBanner, ProfileCompletionBanner,
                            #   PauseBanner, NoPartnerBanner, QuickPreviews, PointsBurst, AnimatedNumber…
    tasks/                  # AddTaskSheet, AddTaskFromCatalogSheet, RecurringTaskManager,
                            #   TaskItemLarge/Medium, TaskRow, WeekStrip, CategoryFilterStrip, VerifyBanner…
    activities/             # ActivityActionCard, ActivityWaitingCard, AddActivitySheet,
                            #   CounterOfferSheet (contraoferta), HistoryFilters
    calendar/               # CalendarMonthViewV2, MonthGrid, WeekStripChart, EventCardV2, CalendarV2Section
    analytics/              # BasicAnalytics, AdvancedAnalytics, AnalyticsProSection/Teaser,
                            #   PremiumOverlay, MovementsTab, AnalyticsTabs, charts/, analyticsUtils.ts
    achievements/           # LevelHero, AchievementsTabs, AchievementBadgeV2, RankingTab, HistoryTab
    catalog/                # ActivityCatalogManager/Picker, AddActivityTemplateSheet
    consensus/              # ProposalsPanel, ProposeChangeDialog, RealRulesSection (config-proposals)
    couple/                 # CoupleHealthCard
    anniversary/            # AnniversaryCard
    premium/                # PremiumInterestModal
    proof/                  # TaskProofUploader (imagen prueba de tarea)
    profile/                # MyMoodWeek
    sheets/                 # MoodSelectorSheet
    wizards/                # DeleteAccountWizard, LeaveCoupleWizard
    tour/                   # DashboardTour (onboarding guiado)

store/      useAppStore.ts  # Zustand: auth, user, couple global
services/   apiClient.ts    # axios + interceptor JWT/refresh · telemetry.ts · consent.ts
hooks/                      # ~23 hooks React Query, uno por dominio: useAuth, useActivities,
                            #   useActivityCatalog, useAnalyticsV2, useAnniversary, useCalendarV2,
                            #   useConfigProposals, useConsent, useGamificationV2, useJournal,
                            #   useShoppingList, useTaskProof, useTodos, useWebPush, useWeeklyTasks…
utils/      cyrb53.ts (hash) · dailyPhrase.ts · dateUtils.ts · shoppingCategory.ts
data/ · layout/ · lib/ · styles/ · types/ · test/   # constantes, layout shell, helpers, estilos, tipos, setup tests
```

### Backend — `src/backend/src/`

```
server.ts                   # Express app: rate limiters, montaje de las 36 rutas, middleware
routes/                     # 36 archivos — inventario completo en §6
middleware/  authMiddleware.ts          # JWT → req.userId + req.coupleId (+ optionalAuthMiddleware)
schemas/     authSchemas.ts (Zod)       # (la mayoría de schemas compartidos viven en packages/shared)
types/       v2.ts
services/                   # ~40 servicios (lógica de dominio). Principales:
  authService                # registro/login/JWT · refreshTokenService (rotación) · cryptoService (AES-256-GCM)
  accountDeletionService     # borrado de cuenta con anonimización · coupleLifecycleService (salir/pausar pareja)
  pointsCalculator · taskLogPoints   # fórmula de puntos (pura, testeada) · redBalanceService (saldo en rojo)
  negotiationEngine          # motor de negociación de eventos
  achievementEngine · achievementEngineV2 · achievementCheckService   # logros (V1 legacy + V2 canónico)
  gamificationService · challengeService · streakService · replayService   # nivel/XP, retos, rachas, replays
  analyticsService · analyticsAggregator · insightHeuristic · insightsGenerator   # analytics + insights server-side
  calendarService · recurrenceService · recurringTaskService · holidaysService · birthdaysService   # calendario 360
  journalPromptsService · journalRetrospectiveService    # diario: prompts diarios + retrospectivas
  notificationService · notificationDigestService · notificationPreferencesService   # notificaciones + digest
  webPushService             # web-push (VAPID/RFC 8030)
  activityTemplateService · bootstrapCatalog   # catálogo de actividades + auto-seed global
  configurationProposalService    # propuestas de cambio de config con consenso
  invitationService · emailService · telemetry · demoService · digestService
prisma/      schema.prisma · migrations/ · seed.ts · dev.db (local)
tests/       Jest (unit + integration) — ver §4
```

## 4. CÓMO ARRANCAR

```bash
# Backend (SQLite — no setup adicional)
cd src/backend && npm install && npm run dev    # → localhost:3000

# Frontend
cd src/frontend && npm install && npm run dev   # → localhost:5173

# Utilidades DB
cd src/backend
npm run studio          # = prisma studio (browser de BD)
npm run migrate         # = prisma migrate dev (aplicar migraciones en local)
npm run seed            # = ts-node --esm prisma/seed.ts (datos de prueba)
```

**Build (monorepo):** `npm run build` en el backend compila **primero** `packages/shared` (`tsc`), luego `prisma generate`, y por último el backend. No se puede compilar el backend de forma aislada sin `shared` build.

**Scripts npm útiles del backend:**
```
npm run type-check        # tsc --noEmit
npm run lint              # eslint src
npm test                  # jest (todo)
npm run test:unit         # solo unit puro (pointsCalculator, insightHeuristic, joinCode)
npm run test:integration  # tests que tocan BD
npm run migrate:deploy    # prisma migrate deploy (prod / CI)
npm run migrate:status    # estado de migraciones
npm run migrate:reconcile # node scripts/reconcile-prisma-migrations.mjs (reconcilia historial Prisma)
npm start                 # prisma migrate deploy && node dist/server.js (prod)
```

Health check: `GET http://localhost:3000/api/health`

## 5. BASE DE DATOS

Schema: `src/backend/prisma/schema.prisma` · DB local: `src/backend/prisma/dev.db` · **47 modelos**.

> **🔗 = couple-level** (tiene `coupleId`; entra en la lógica de los 2 usuarios y en el aislamiento por pareja). Sin marca = user-scoped (vía `userId`) o global/secundario (vía FK a otro modelo).

**Núcleo pareja / usuario / auth:**
```
🔗 Couple            secretKey(unique), joinCode, numChildren, language, relationshipStartDate,
                     pausedUntil/pausedReason, dissolvedAt, xp/level/streaks · raíz de casi todo
🔗 User              coupleId, email(unique), passwordHash, name, roleInHome, hasCompletedOnboarding,
                     deletedAt (soft-delete), notificationPreferences(JSON)
   UserProfile       userId(unique) → surname, foto, dateOfBirth, weeklyWorkHours, workMode/workSchedule,
                     taskPreferencesLoves/Dislikes(JSON), avatar, currentMood
🔗 CoupleProfile     coupleId(unique) → homeType, homeSizeM2, cohabitation, externalServices(JSON)
🔗 Child             name, dateOfBirth, livesWithUser1/2, hasSpecialNeeds
🔗 Pet               name, type, quantity
🔗 Invitation        fromUserId, toEmail/toUserId, token(unique), type, status, expiresAt
   RefreshToken      userId → tokenHash, expiresAt, revokedAt, rotatedFrom, deviceFingerprint (rotación)
   PasswordResetToken userId → tokenHash, expiresAt, usedAt
```

**Eventos · negociación · puntos:**
```
🔗 Event             createdBy→User, type, dateStart/End, numChildren, pointsBase/Calculated/Agreed,
                     status(draft/pending/accepted/rejected/forced), negotiationRound, maxFreeRounds,
                     negotiationHistory(JSON), compensation, compensationDiscount
   Negotiation       eventId, roundNumber, proposedBy, pointsProposed, message,
                     responseType(accepted/rejected/counter_proposed/awaiting/forced)
🔗 PointsTransaction userId, type(event_accepted/task_completed/donation/forced_payment), amount,
                     relatedEventId(unique)?, relatedTaskLogId(unique)? · fuente de verdad del saldo
🔗 Compensation      eventId, type, discountAmount, discountPercent?, status(pending/completed), linkedTaskId
```

**Tareas:**
```
🔗 Task              name, category, pointsBase, isDefault, scheduledFor, isRecurring/frequency/
                     recurrenceStart-End/maxOccurrences, defaultAssigneeId
🔗 TaskLog           taskId, completedBy, date, pointsBase/modifier/pointsFinal,
                     status(pending/verified/disputed), verifiedBy/disputedBy, proofImageUrl
```

**Configuración · consenso · catálogo:**
```
🔗 Configuration         coupleId(unique) → tasksConfig/multipliersConfig/activityTypes (JSON)
🔗 ConfigurationProposal proposedBy→User, field/oldValue/newValue, rationale, status, expiresAt (consenso)
🔗 ConfigurationChangeLog field/oldValue/newValue, appliedBy, proposalId (auditoría de cambios aplicados)
🔗 ActivityTemplate      category, name, pointsBaseSuggested, defaultDuration/Impact, emoji,
                         instancesThisMonth, pointsApproved (catálogo de actividades)
🔗 Category              name, emoji, type(event/chore/service), basePoints, isCustom, isActive
   Subcategory           categoryId → name, basePointsModifier
🔗 RuleProposal          proposedBy/respondedBy, type, payload(JSON), status, comments (propuestas de regla)
```

**Gamificación · ánimo:**
```
   Achievement           (V1 legacy) coupleId, type(solo/couple), name, rarity, condition
   UserAchievement       userId+achievementId(unique) → unlockedAt
   AchievementDefinition (V2 canónico, global) name, rarity, category, condition, xpReward, orderIndex
🔗 CoupleAchievement     achievementDefinitionId, progress(JSON), unlockedAt (V2, por pareja)
🔗 CoupleLevel           coupleId(unique) → xp, level
🔗 CoupleStreak          coupleId(unique) → dailyStreak/weeklyStreak, longestDaily/Weekly
🔗 CoupleChallenge       weekStart, type, config(JSON), status, progress/goal, rewardXp
🔗 CoupleReplaySeen      replayKey, seenByUser1/2 (cards de re-engagement vistas)
🔗 CoupleScore           coupleId+weekStartDate(unique) → user1/2Score, overallScore,
                         equilibrium, activity, consensus, constancy
🔗 MoodLog               userId, moodKey, createdAt (ánimo diario)
```

**Calendario:**
```
🔗 CalendarEntry         type(event/task/service/birthday/holiday), title, date/endDate, allDay,
                         relatedEventId/relatedTaskId, recurrence, externalSource/externalId
   GoogleCalendarSync    userId(unique) → refreshToken(cifrado), syncEnabled, lastSyncToken, filters
🔗 ServiceProvider       name, type, recurrence, active (servicios externos recurrentes del hogar)
```

**Diario de pareja (journaling):**
```
🔗 JournalEntry          authorId/recipientId, type, title, body, shared, attachments/tags, promptId
   JournalReaction       entryId, userId, emoji
   JournalPrompt         (global) text, category, weight — prompts diarios
🔗 JournalRetrospective  period, startDate/endDate, data(JSON), seenByUser1/2
```

**Listas compartidas:**
```
🔗 ShoppingList          coupleId, isActive, archivedAt
   ShoppingItem          listId → text, isChecked, checkedBy/checkedAt
🔗 Todo                  userId, coupleId, text, isCompleted, dueDate, isShared
```

**Analytics · notificaciones · premium · subscripción:**
```
🔗 AnalyticsInsight      kind, title/body, payload(JSON), trend, validUntil, seenByUser1/2
🔗 Notification          userId, type, title/message, relatedEventId/TaskLogId, isRead
🔗 PushSubscription      userId, endpoint, p256dh/auth, userAgent (web-push)
🔗 Subscription          coupleId(unique) → plan(free/premium/pro), stripeId
🔗 PremiumInterest       userId, email, source, notified (lista de espera premium)
```

## 6. API ROUTES

Todas requieren `Authorization: Bearer <JWT>` salvo auth público (`register/login/signup/refresh/forgot-password/reset-password`, `demo-login`, `couple-preview`). 36 archivos de rutas montados en `server.ts`. Mismo prefijo `/api/...` puede tener 2 archivos (V1 + V2 conviven).

**Auth + invitaciones** — `authRoutes.ts` + `invitationRoutes` (ambos en `/api/auth`)
```
/api/auth
  POST /register · /register-with-code · /signup     Alta de usuario/pareja
  POST /login · /logout · /refresh                   Sesión (JWT + refresh token rotation)
  POST /forgot-password · /reset-password            Recuperación de contraseña
  GET  /me · /couple · /partner-summary              Datos sesión/pareja/partner
  GET  /couple-preview/:code                          Preview pública por joinCode
  POST /invite · /accept-invite · /reject-invite      Invitar partner por email
  POST /propose-partner · /accept-proposal · /reject-proposal · GET /proposals   Vincular partner existente
  POST /demo-login · GET /demo-available             Modo demo
  (invitationRoutes) POST /invite-partner · /link-partner · /accept-link-partner · /reject-link-partner
                     GET /invitation/:token · /pending-link-requests · POST /register-with-invitation
```

**Eventos + negociación V2** — `eventRoutes.ts` + `negotiation.ts` (ambos en `/api/events`)
```
/api/events
  GET  /  ·  POST /  ·  GET /:id  ·  PUT /:id  ·  DELETE /:id     CRUD de actividades/eventos
  (V2)  POST /:eventId/propose · /:eventId/respond               Proponer / responder negociación
  (V2)  GET  /:eventId/negotiation · /:eventId/negotiation/history · /user/pending
```

**Negociación V1** — `negotiationRoutes.ts` (`/api/negotiations`)
```
  GET /event/:eventId · POST / · POST /:negotiationId/force · PUT /:negotiationId/respond
```

**Tareas + logs** — `taskRoutes.ts` (`/api/tasks`)
```
  GET / · POST / · DELETE /:id                         CRUD tareas
  POST /:id/pause · /:id/resume · /:id/schedule        Recurrencia
  GET  /recurring · /logs · /all-logs · /:taskId/logs  Consultar logs
  POST /:taskId/log                                    Registrar tarea hecha
  PUT  /:taskId/logs/:logId/verify · /dispute          Verificar / disputar log
```

**Prueba de tarea (imagen)** — `taskProof.ts` (`/api/task-logs`, flag TASK_PROOF_ENABLED)
```
  GET / POST / DELETE  /:logId/proof    proofImageUrl (solo el completer)
```

**Puntos** — `pointsRoutes.ts` + `pointsV2.ts` (ambos en `/api/points`)
```
  GET /balance · /history · /transactions/:id · /chart-data · /stats · /red-balance
  POST /reset-request · /reset-confirm                  Reset de saldo (con rate limit)
  (V2) POST /calculate · /preview · /recalculate/:eventId · GET /category/:categoryId
```

**Configuración + consenso** — `configurationRoutes.ts` + `configurationProposals.ts` + `ruleProposals.ts`
```
/api/configuration        GET / · PUT / · POST /reset         tasksConfig/multipliers/activityTypes
/api/config-proposals     GET / · /history · /changelog       Propuestas de cambio con consenso
                          POST / · /:id/accept · /:id/reject · /:id/cancel
/api/rules                GET / · POST /propose · PUT /:id/respond    RuleProposal (propuestas de regla)
```

**Catálogo de actividades** — `activityTemplates.ts` (`/api/activity-templates`, flag CATALOG_ENABLED)
```
  GET / · POST / · PUT /:id · DELETE /:id · POST /:id/use
```

**Categorías** — `categories.ts` (`/api/categories`)
```
  GET / · /default · /:categoryId · POST / · PUT /:categoryId · DELETE /:categoryId
  POST /:categoryId/subcategories · /propose · PUT /:id/propose-change
```

**Familia** — `family.ts` (`/api`)
```
  GET/POST /children · PUT/DELETE /children/:childId
  GET/POST /pets · PUT/DELETE /pets/:petId
```

**Perfil** — `profile.ts` + `profileCompletion.ts` (`/api/profile`)
```
  GET/PUT /me · GET /user/:userId · POST /user · GET/POST /couple
  GET/PUT /notification-preferences · GET /mood-history · GET /completion
```

**Logros + gamificación** — `achievements.ts` + `gamification.ts` + `gamificationV2.ts`
```
/api/achievements    GET / · /user · /couple-score · /map · POST /check
/api/gamification     GET /status
/api/gamification-v2  GET /level · /streak · /challenge · /replay · POST /replay/:key/seen
```

**Calendario** — `calendar.ts` + `calendarV2.ts` + `googleCalendarOauth.ts`
```
/api/calendar         GET /month/:y/:m · /week/:y/:w · /day/:date · /by-type/:type · /upcoming · /special-dates
                      POST /entry · PUT /entry/:id · DELETE /entry/:id
/api/calendar/v2      CRUD /entries + CRUD /service-providers
/api/calendar/google  GET /auth · /status · POST /callback · /sync · DELETE /disconnect   (OAuth Google, token cifrado)
```

**Diario** — `journal.ts` (`/api/journal`, v2.0.2)
```
  GET/POST/PUT/DELETE /entries · POST/DELETE /entries/:id/react
  GET /prompts/today · /retrospectives · POST /retrospectives/:id/seen
```

**Analytics** — `analytics.ts` + `analyticsV2.ts`
```
/api/analytics     GET /couple · /users · /heatmap · /weekly-trends · /points-by-category · /time-invested
                   /completion-rate · /daily-activity · /daily-breakdown · /negotiations · /insight
                   /monthly/:y/:m · /yearly/:y
/api/analytics/v2  GET /summary · /compare · /equity-curve · /heatmap · /mood-timeline · /insights
                   POST /insights/:id/seen · /insights/regenerate
```

**Notificaciones + push** — `notificationRoutes.ts` + `notificationsPush.ts`
```
/api/notifications       GET / · /unread-count · PUT /:id/read · /read-all · DELETE / · /:id
/api/notifications/push  GET /vapid-key · POST /subscribe · /unsubscribe · /test
```

**Listas** — `shopping.ts` (`/api/shopping`) + `todos.ts` (`/api/todos`)
```
/api/shopping  GET / · POST /items · /archive · PUT /items/:id · DELETE /items/:id
/api/todos     GET / · POST / · PUT /:id · DELETE /:id
```

**Anniversary** — `anniversary.ts` (`/api/anniversary`, flag ANNIVERSARY_ENABLED)
```
  GET /  ·  PUT / { startDate }  ·  DELETE /
```

**Ciclo de vida cuenta/pareja** — `account.ts` + `couple.ts`
```
/api/account  GET /export (GDPR) · POST /delete-request · /delete
/api/couple   GET /pause-status · POST /pause · /resume · /leave
```

**Otros** — `history.ts` · `activityRoutes.ts` · `premium.ts`
```
/api/history          GET /past-couples        Parejas disueltas anteriores
/api/recent-activity  GET /                     Feed de actividad reciente
/api/premium          POST /interest           Apuntarse a lista de espera premium (rate-limited)
```

## 7. SISTEMA DE PUNTOS

```
Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos
```

```
FactorTipo:     Necesaria ×0.7 · Salud ×0.85 · Ocio ×1.0 · Alto impacto ×1.4
FactorFranja:   07-09:30 ×1.3 · 09:30-17:30 ×1.0 · 17:30-21:30 ×1.2 · 21:30-01 ×1.2 · 01-07 ×1.5
FactorDuración: 0-3h ×1.0 · 3-8h ×1.1 · 8-24h ×1.25 · 24h+ ×1.35
FactorHijos:    0 ×1.0 · 1 ×1.4 · 2 ×1.8 · 3+ ×2.2
```

Redondeo al 0.5 más próximo. Ejemplo: cena 4h noche 1 hijo = 10 × 1.0 × 1.2 × 1.1 × 1.4 = **18.5 pts** (base Gastronomía 10).

No hay factor "día de semana" ni "trabajó ese día". La fuente de verdad es `docs/PUNTOS.md` + `src/backend/src/services/pointsCalculator.ts` (con tests unitarios en `src/backend/tests/pointsCalculator.test.ts`).

Tareas recurrentes (base fija): Cocina 2.0 · Baños+niños 1.5 · Limpieza 1.5 · Compra 1.0 · Logística 1.0 · Cuidado 1.5

Ver referencia completa: `docs/PUNTOS.md`

## 8. REGLAS DE NEGOCIO

**Negociación:**
- Free: máx 2 rondas. Premium: ilimitadas.
- Flujo: proponer → partner acepta/rechaza/contraoferta → nueva ronda
- Sin acuerdo: proposer puede "forzar" (paga de su propio saldo)
- Rutas V1 (`/api/negotiations`) y V2 (`/api/events/:id/counter`) coexisten

**Tareas:**
- Auto-accept de TaskLog: 24h sin respuesta → status=verified automático
- Disputa: partner marca como disputed, pueden renegociar puntos

**Compensaciones:** Reducen puntos del evento. `compensationDiscount` es multiplicador (ej: 0.8 = 20% descuento). Estado: pending→completed.

**Saldo:** Suma de `PointsTransaction.amount` por usuario. Positivo = a favor. Negativo = debe.

**Hijos:** Se usa `Event.numChildren` (cuántos hijos afectados en esa ausencia concreta), no el total de la pareja.

## 9. VERSIONES Y ROADMAP

### Convención de versiones
Formato: `vX.Y · Nombre`. Branches: `feature/vX.Y-nombre-kebab`. Tags git: `mvp1`, `v1.1`, `v1.2`...

| Versión | Nombre | Estado | Branch |
|---|---|---|---|
| MVP 1 | Los Cimientos | ✅ Producción | `main` (tag `mvp1`) |
| v1.1 | La Chispa | ✅ Producción | `main` (tag `v1.1`) |
| v1.2 | El Juego | ✅ Producción | `main` (tag `v1.2`) |
| v1.3 | La Casa | ✅ Producción | `main` (tag `v1.3`) |
| v1.4 | La Evolución | ✅ Producción | `main` (tag `v1.4`) |
| v1.4.1 | Hardening + Actividades | ✅ Producción | `main` (tag `v1.4.1`) |
| v1.5 | Red de Seguridad | ✅ Producción 2026-04-23 | `main` (tag `v1.5`) |
| v1.5.1 | Hotfix Supabase migrations | ✅ Cerrado 2026-05-02 (script + verificación) | `main` (commit `3d378ad`) |
| v1.6 | La Personalidad (frase + mood + avatares) | ✅ Producción 2026-05-02 | `main` (tag `v1.6`) |
| v1.6.1 | Confianza (privacy + telemetría + lifecycle + E2E) | ✅ Producción 2026-05-02 | `main` (tag `v1.6.1`) |
| v1.6.2 | Hotfix post-auditoría (4 S0 + 11 S1) | ⚠️ Render fail — desbloqueado por v1.6.3 | `main` (tag `v1.6.2`) |
| v1.6.3 | QA bugs + intento desbloqueo Render | ⚠️ Tag aplicado pero deploy fallaba | `main` (tag `v1.6.3`) |
| v1.6.4 | Render deploy fix definitivo (imports relativos shared) | ✅ Producción 2026-05-02 | `main` (tag `v1.6.4`) |
| v1.6.5 | Fix mood propio no aparecía (auth/me + auth/couple) | ✅ Producción 2026-05-02 | `main` (tag `v1.6.5`) |
| v1.6.6 | Sprint 2 partial (auth deletedAt filter + 15 service tests) | ✅ Producción 2026-05-02 | `main` (tag `v1.6.6`) |
| v1.6.7 | Sprint 2 final (Resend email + ghost partial index) | ✅ Producción 2026-05-02 | `main` (tag `v1.6.7`) |
| v1.7 | El Juego (2º round) — niveles + achievements + streaks + retos + replays + push | ✅ Producción 2026-05-02 (feature flag) | `main` (tag `v1.7`) |
| v2.0.1 | Calendario 360 — CalendarEntry extendido + recurrence + holidays + birthdays + Google OAuth esqueleto | ✅ Producción 2026-05-02 | `main` (tag `v2.0.1`) |
| v2.0.2 | Journaling — entries CRUD + reactions + prompts diarios + retrospectivas | ✅ Producción 2026-05-02 | `main` (tag `v2.0.2`) |
| **v2.0.3** | **Analytics Pro** — aggregator con invariantes mat. + insights + heatmap | ✅ Producción 2026-05-02 | `main` (tag `v2.0.3`) |
| **v2.0.3.1** | **Hotfix v2.0.3** — IDOR journal, push unsubscribe, focus rings, BottomNav safe-area | ✅ Producción 2026-05-02 | `main` (tag `v2.0.3.1`) |
| **v2.0.4** | **Catálogo + Consenso** — ActivityTemplate + ConfigurationProposal + ProposalsPanel | ✅ Producción 2026-05-03 (pendiente seed + QA E2E manual) | `main` (tag `v2.0.4`) |
| **v2.0.5** | **Quick wins** — anniversary timer + image proof tareas | ✅ Producción 2026-05-03 | `main` (tag `v2.0.5`) |
| v2.4.x → v2.5.8 | Sprints 1-10 hardening (16 S0 + 35 S1 cerrados) | ✅ Producción 2026-05-05 | `main` |
| v2.5.9 | Sprint 11 — backend route hardening (10 fixes audit 01) | ✅ Producción 2026-05-06 | `main` (tag `v2.5.9`) |
| v2.6.0 | Sprint 12 — schema hardening (FKs SetNull + indexes) | ✅ Producción 2026-05-06 | `main` (tag `v2.6.0`) |
| v2.6.1 | Sprint 13 — frontend pages a11y/UX | ✅ Producción 2026-05-06 | `main` (tag `v2.6.1`) |
| v2.6.2 | Sprint 14 — components dark mode + a11y + zIndex | ✅ Producción 2026-05-06 | `main` (tag `v2.6.2`) |
| v2.6.3 | Sprint 15 — services hardening (negociación + ISO weeks) | ✅ Producción 2026-05-06 | `main` (tag `v2.6.3`) |
| v2.6.4 | Sprint 16 — two-account flows (Q-1, Q-10, Q-5) | ✅ Producción 2026-05-06 | `main` (tag `v2.6.4`) |
| v2.6.5 | Sprint 18 — DB-bound CI job + tests faltantes | ✅ Producción 2026-05-06 | `main` (tag `v2.6.5`) |
| v2.7.0 | Sprint 17 — refresh token endpoints (audit 04 S1-6) | ✅ Producción 2026-05-06 | `main` (tag `v2.7.0`) |
| v2.7.1 | Sprint 19 — backend routes S2 batch (audit 01) | ✅ Producción 2026-05-06 | `main` (tag `v2.7.1`) |
| v2.7.2 | Sprint 20 — services + DB S2/S3 (audit 02) | ✅ Producción 2026-05-06 | `main` (tag `v2.7.2`) |
| v2.7.3 | Sprint 21 — security + frontend S2 (audit 04, 06) | ✅ Producción 2026-05-06 | `main` (tag `v2.7.3`) |
| v2.7.4 | Sprint 22 — UX + infra S2/S3 (audit 09, 10) | ✅ Producción 2026-05-06 | `main` (tag `v2.7.4`) |
| v2.7.5 | Sprint 23 — frontend refresh tokens integration | ✅ Producción 2026-05-06 | `main` (tag `v2.7.5`) |
| v2.7.6 | Sprint 24 — tokens legacy + dead code cleanup | ✅ Producción 2026-05-06 | `main` (tag `v2.7.6`) |
| v2.7.7 | Sprint 25 — empty states + memo + iOS safe-area | ✅ Producción 2026-05-06 | `main` (tag `v2.7.7`) |
| **v2.8.0** | **Sprint 26 — achievements V2 canonical (ADR + flag)** | ✅ Producción 2026-05-06 | `main` (tag `v2.8.0`) |
| **v2.0.6** | **Refinos catálogo** — picker en EventCreate, contraoferta, "proponer" inline | 🤔 Por decidir tras D30 | `feature/v2.0.6-refinos` |
| **v2.1** | **Conectados** — Google sync + push real + ICS + referidos | 📝 Spec aprobado | `feature/v2.1-conectados` |
| **v2.2** | **Multiidiomas** — i18n ES/EN/CA/PT | 🧠 Brainstorm pendiente | `feature/v2.2-multiidiomas` |
| v3.0 | Premium | 📝 Spec aprobado | `feature/v3.0-premium` |

Roadmap completo: `docs/ROADMAP.md` · Decisiones: `docs/DECISIONS.md` · Spec original (2026-04-11): `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md` · Spec v1.6: `docs/superpowers/specs/2026-04-26-v1.6-la-personalidad-design.md`

**Principios para todo lo post-v1.5:** versiones estables, test-first, contract testing back↔front, QA automatizado (Vitest + Jest unit + Playwright E2E desde v1.6.1), security-by-default, deploy reproducible.

## 10. CONVENCIONES

- **Auth:** `authMiddleware` inyecta `req.userId` y `req.coupleId` en cada request protegido
- **Prisma:** **singleton** — `import prisma from '../lib/prisma.js'` (instancia única compartida, importada por ~57 archivos). NO crear `new PrismaClient()` por archivo (anti-patrón obsoleto que agotaba el pool); única excepción: `prisma/seed.ts`.
- **Tipos numéricos:** Usar `Decimal` de `@prisma/client/runtime/library` para puntos
- **Errores:** `res.status(4xx).json({ error: 'mensaje legible' })`
- **JSON en SQLite:** negotiationHistory, tasksConfig, etc. son strings. Parsear con `JSON.parse()`/`JSON.stringify()`
- **V1 vs V2:** Las rutas V1 (MVP básico) y V2 (extended) coexisten en `server.ts`; no eliminar V1
- **Frontend state:** Zustand para auth/couple global, React Query para datos del servidor
- **Commits:** `feat:` · `fix:` · `chore:` · `docs:` convencionales
- **Branches:** `feature/vX.Y-nombre-kebab` (ej: `feature/v1.1-la-chispa`)
- **Tags:** `mvp1`, `v1.1`, `v1.2`... aplicados en `main` al hacer merge de cada versión
- **Worktrees:** `~/.config/superpowers/worktrees/Matripuntos/<branch>` (global, fuera del repo)
- **Credenciales deploy:** `.deploy-credentials` (local, en .gitignore, nunca commitear)

---

*Docs de referencia: `docs/PUNTOS.md` · `docs/API.md` · `docs/FLUJOS.md` · `docs/DATOS.md` · `docs/ROADMAP.md` · `docs/DECISIONS.md`*
