# CLAUDE.md — Matripuntos

## 0. REGLAS DE SESIÓN
- **Aviso al 75% de contexto:** cuando el uso de contexto de la sesión se acerque al 75% (≈150k/200k tokens), detente en el siguiente punto de control natural (tras un commit, tras un deploy, al cerrar un bug) y **pregunta al usuario** si continuar o cerrar con `/compact`. En el aviso incluye: (1) resumen de lo hecho, (2) lo pendiente, (3) tu recomendación (seguir / compactar / abrir sesión nueva). NO arranques tareas nuevas pasado ese umbral sin OK explícito del usuario.
- Los permisos están en modo wildcard en `.claude/settings.local.json` — puedes ejecutar Bash/Edit/Write sin pedir confirmación, salvo acciones destructivas o de alcance compartido (push --force, drop table, envíos externos), que siempre confirman antes.

## 1. PROYECTO
App web gamificada para parejas: gestión equitativa de responsabilidades del hogar mediante puntos negociables. Repo: https://github.com/wikiedu/claude_matripuntos

**Versión actual en producción:** v2.7.0 · Sprints 1-18 hardening del audit profundo 2026-05-05 (tag `v2.7.0`)
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
- Node.js + Express + TypeScript
- Prisma ORM · Zod (validation) · JWT (auth)
- SQLite local → PostgreSQL/Supabase en producción

**Deploy:**
- Frontend: FTP → `ftp.keepitup.io` (dominio propio) — credenciales en `.deploy-credentials` (no en git)
- Backend: Render — auto-deploy desde `main` via GitHub
- DB producción: Supabase (PostgreSQL) — conectado a Render via env vars

## 3. ESTRUCTURA DE CÓDIGO

```
src/
├── frontend/src/
│   ├── pages/           # Login, Dashboard, Tasks, Calendar, Analytics, AnalyticsPage,
│   │                    # History, Settings, Onboarding, RequestActivity, RequestInbox, NotFound
│   ├── components/      # AchievementsPanel, AnalyticsDashboard, CalendarDashboard,
│   │                    # CalendarDay/Month/Week, CategoryManager, CounterProposalForm,
│   │                    # EventNegotiationCard, GamificationDashboard, NegotiationHistory,
│   │                    # NotificationBell, PointsBreakdown, StatCard, TaskVerificationCard
│   │                    # UI: Alert, Button, Card, AchievementBadge
│   ├── components/onboarding/  # OnboardingStep1-4, OnboardingJoinFlow
│   ├── store/           # useAppStore.ts — Zustand (auth, user, couple)
│   ├── services/        # apiClient.ts — axios con JWT interceptor
│   ├── hooks/           # useAuth.ts
│   ├── types/           # index.ts, analytics.ts, calendar.ts
│   └── utils/           # pointsCalculator.ts — fórmula de puntos en frontend
│
└── backend/src/
    ├── server.ts         # Express app, montaje de rutas, middleware
    ├── routes/           # authRoutes, eventRoutes, taskRoutes, negotiationRoutes,
    │                     # pointsRoutes, configurationRoutes, notificationRoutes,
    │                     # profile, family, invitations, categories, pointsV2,
    │                     # negotiation (V2), achievements, calendar, analytics
    ├── services/         # authService, pointsCalculator, negotiationEngine,
    │                     # achievementEngine, notificationService, analyticsService, calendarService
    ├── middleware/        # authMiddleware.ts — JWT → req.userId + req.coupleId
    ├── schemas/          # authSchemas.ts (Zod)
    └── types/            # v2.ts
```

## 4. CÓMO ARRANCAR

```bash
# Backend (SQLite — no setup adicional)
cd src/backend && npm install && npm run dev    # → localhost:3000

# Frontend
cd src/frontend && npm install && npm run dev   # → localhost:5173

# Utilidades DB
cd src/backend
npx prisma studio                               # Browser de BD
npx prisma migrate dev                          # Aplicar migraciones
npx ts-node prisma/seed.ts                      # Datos de prueba
```

Health check: `GET http://localhost:3000/api/health`

## 5. BASE DE DATOS

Schema: `src/backend/prisma/schema.prisma` · DB local: `src/backend/prisma/dev.db`

**Modelos core:**
```
Couple     id, secretKey(unique), numChildren, language
           → User[], Event[], Task[], Configuration(1), Subscription(1)

User       id, coupleId→Couple, email(unique), passwordHash, name,
           roleInHome, hasCompletedOnboarding

Event      id, coupleId, createdBy→User, type, dateStart, dateEnd,
           numChildren, pointsBase, pointsCalculated, pointsAgreed?,
           status(draft/pending/accepted/rejected/forced),
           negotiationRound, maxFreeRounds(def:2),
           lastProposedBy?, lastProposedPoints?,
           negotiationHistory(JSON), compensation?, compensationDiscount

Task       id, coupleId, name, category(cocina/baños/limpieza/compra/
           logistica/cuidado/mantenimiento/jardineria/mascotas),
           pointsBase, isDefault

TaskLog    id, coupleId, taskId, completedBy?, date,
           pointsBase, modifier?, modifierValue, pointsFinal,
           status(pending/verified/disputed),
           verifiedBy?, verifiedAt?

Negotiation id, eventId, roundNumber, proposedBy?, pointsProposed,
            message?, responseType(accepted/rejected/counter_proposed/
            awaiting/forced), respondedBy?, respondedAt?

PointsTransaction id, coupleId, userId?, type(event_accepted/
                  task_completed/donation/forced_payment),
                  amount, relatedEventId?(unique), relatedTaskLogId?(unique)

Compensation  id, eventId, coupleId, type, discountAmount,
              discountPercent?, status(pending/completed)

Configuration id, coupleId(unique), tasksConfig(JSON),
              multipliersConfig(JSON), activityTypes(JSON)

Notification  id, coupleId, userId, type, title, message, isRead
Subscription  id, coupleId(unique), plan(free/premium/pro), stripeId?
```

**Modelos V2:**
```
UserProfile    userId(unique) → surname, profilePhotoUrl, weeklyWorkHours,
               workMode, taskPreferencesLoves(JSON), taskPreferencesDislikes(JSON)
CoupleProfile  coupleId(unique) → homeType, homeSizeM2, externalServices(JSON)
Child          coupleId → name, dateOfBirth, livesWithUser1/2, hasSpecialNeeds
Pet            coupleId → name, type, quantity
Invitation     coupleId → inviteeEmail, token(unique), status(pending/accepted/rejected), expiresAt
Category       coupleId → name, emoji, type(event/chore/service), basePoints,
               isCustom, isActive → Subcategory[]
Achievement    coupleId → type(solo/couple), name, rarity(common/rare/epic/legendary)
UserAchievement userId+achievementId(unique) → unlockedAt
CoupleScore    coupleId+weekStartDate(unique) → user1Score, user2Score, overallScore,
               equilibrium, activity, consensus, constancy
CalendarEntry  coupleId → type(event/task/service/birthday/holiday), title, date
```

## 6. API ROUTES

Todas requieren `Authorization: Bearer <JWT>` salvo `/auth/register` y `/auth/login`.

```
/api/auth
  POST /register          { email, password, name, coupleSecretKey? }
  POST /login             { email, password } → { token, user, couple }
  POST /invite            { inviteeEmail }
  POST /join-couple       { token }

/api/events
  GET  /                  ?status=pending&limit=20
  POST /                  { type, dateStart, dateEnd, numChildren, pointsBase, compensation? }
  GET  /:id               → event + negotiations[]
  PUT  /:id / DELETE /:id
  POST /:id/accept        Partner acepta → crea PointsTransaction
  POST /:id/reject        Partner rechaza
  POST /:id/counter       { pointsProposed, message? } — bloqueado si rondas agotadas
  POST /:id/force         Proposer fuerza, paga de su propio saldo

/api/tasks
  GET|POST /              CRUD de tareas de la pareja
  PUT|DELETE /:id
  GET  /logs              ?date=2026-04-01&userId=xxx
  POST /logs              { taskId, date, pointsBase, pointsFinal }
  PUT  /logs/:id          { status: 'verified'|'disputed' }
  POST /logs/:id/dispute  { reason }

/api/points
  GET  /balance           → { user1: {name,balance}, user2: {name,balance}, net }
  GET  /history           ?limit=50&offset=0
  GET  /leaderboard       ?period=week|month

/api/negotiations
  GET  /pending           Eventos esperando respuesta del usuario actual

/api/notifications
  GET  /                  ?unread=true
  PUT  /:id/read
  PUT  /read-all

/api/configuration
  GET|PUT /               { tasksConfig?, multipliersConfig?, activityTypes? }

/api/activity-templates  (v2.0.4 — flag CATALOG_ENABLED, default ON)
  GET  /                  ?grouped=true → templates globales + propios de la pareja
  POST /                  { category, name, pointsBaseSuggested, ... } — crea custom
  PUT|DELETE /:id         (solo own templates)
  POST /:id/use           Marca uso (instrumentación, no bloqueante)

/api/config-proposals    (v2.0.4 — flag CONFIG_PROPOSALS_ENABLED, default ON)
  GET  /                  Propuestas activas
  GET  /history           Histórico (rejected/expired/cancelled/accepted)
  GET  /changelog         Cambios aplicados
  POST /                  { field, oldValue, newValue, rationale?, expiryDays? }
  POST /:id/accept        Solo el partner; aplica cambio + log
  POST /:id/reject        Solo el partner
  POST /:id/cancel        Solo el proposer

/api/anniversary         (v2.0.5 — flag ANNIVERSARY_ENABLED, default ON)
  GET  /                  Breakdown años/meses/días + próximo hito
  PUT  /                  { startDate: ISO } — fija fecha (no futura)
  DELETE /                Limpia la fecha

/api/task-logs           (v2.0.5 — flag TASK_PROOF_ENABLED, default ON)
  GET  /:logId/proof      proofImageUrl + proofUploadedAt
  POST /:logId/proof      { proofImageUrl } — solo el completer
  DELETE /:logId/proof    solo el completer

/api/profile
  GET|PUT /me

/api  (family)
  GET|POST /children      { name, dateOfBirth, livesWithUser1?, livesWithUser2? }
  DELETE   /children/:id
  GET|POST /pets          { name, type, quantity? }
  DELETE   /pets/:id

/api/categories           CRUD + subcategories
/api/achievements         GET / · GET /user
/api/calendar             GET ?month=4&year=2026 · POST
/api/analytics            GET /overview · /trends · /equity
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
| **v2.7.0** | **Sprint 17 — refresh token endpoints (audit 04 S1-6)** | ✅ Producción 2026-05-06 | `main` (tag `v2.7.0`) |
| **v2.0.6** | **Refinos catálogo** — picker en EventCreate, contraoferta, "proponer" inline | 🤔 Por decidir tras D30 | `feature/v2.0.6-refinos` |
| **v2.1** | **Conectados** — Google sync + push real + ICS + referidos | 📝 Spec aprobado | `feature/v2.1-conectados` |
| **v2.2** | **Multiidiomas** — i18n ES/EN/CA/PT | 🧠 Brainstorm pendiente | `feature/v2.2-multiidiomas` |
| v3.0 | Premium | 📝 Spec aprobado | `feature/v3.0-premium` |

Roadmap completo: `docs/ROADMAP.md` · Decisiones: `docs/DECISIONS.md` · Spec original (2026-04-11): `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md` · Spec v1.6: `docs/superpowers/specs/2026-04-26-v1.6-la-personalidad-design.md`

**Principios para todo lo post-v1.5:** versiones estables, test-first, contract testing back↔front, QA automatizado (Vitest + Jest unit + Playwright E2E desde v1.6.1), security-by-default, deploy reproducible.

## 10. CONVENCIONES

- **Auth:** `authMiddleware` inyecta `req.userId` y `req.coupleId` en cada request protegido
- **Prisma:** `new PrismaClient()` por archivo de ruta (no instancia compartida)
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
