# Matripuntos — Roadmap de Versiones

> Estado actualizado: 2026-05-01  
> Spec original: `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md`  
> Replanteo de cola post-v1.5: 2026-05-01 (esta revisión)

---

## Estado actual

| Versión | Nombre | Estado | Branch | Tag |
|---|---|---|---|---|
| MVP 1 | Los Cimientos | ✅ En producción | `main` | `mvp1` |
| v1.1 | La Chispa | ✅ En producción | `main` | `v1.1` |
| v1.2 | El Juego | ✅ En producción | `main` | `v1.2` |
| v1.3 | La Casa | ✅ En producción | `main` | `v1.3` |
| v1.4 | La Evolución (diseño v2) | ✅ En producción | `feature/v1.4-la-evolucion` → `main` | `v1.4` |
| v1.4.1 | Hardening post-v1.4 (Actividades + join-code + audit sweep + onboarding/tasks fixes) | ✅ En producción (2026-04-22) | `main` | `v1.4.1` |
| v1.5 | Red de Seguridad (tests + CI + 16 quick-wins) | ✅ En producción (2026-04-23) | `main` | `v1.5` |
| **v1.5.1** | **Hotfix Supabase migrations** | ✅ Cerrado 2026-05-02 (script entregado + verificado en prod: 14 migraciones registradas, `migrate status` "up to date") | `main` (commit `3d378ad`) | — |
| **v1.6** | **La Personalidad** (frase + mood + avatares) | ✅ En producción (2026-05-02) | `main` | `v1.6` |
| **v1.6.1** | **Confianza** (privacy + telemetría + onboarding invitee + E2E) | ✅ En producción (2026-05-02) — privacy stack, telemetría opt-out, lifecycle (delete/leave), 23 specs Playwright, 122 tests CI | `main` | `v1.6.1` |
| **v1.6.2** | **Hotfix post-auditoría** (GDPR Art.20 export + Art.8 edad + PostHog instalado + WCAG fixes) | ⚠️ Tag aplicado pero deploy Render falló — bloqueado por bug shared package | `main` | `v1.6.2` |
| **v1.6.3** | **QA fixes + intento desbloqueo Render** | ⚠️ Tag aplicado pero deploy Render aún fallaba por symlink workspace | `main` | `v1.6.3` |
| **v1.6.4** | **Render deploy fix definitivo** (imports relativos al shared dist, sin symlink workspace) | ✅ Producción 2026-05-02 — primer deploy exitoso desde v1.6 | `main` | `v1.6.4` |
| **v1.6.5** | **Mood propio no aparecía** (auth/me + auth/couple no exponían moodUpdatedAt) | ✅ Producción 2026-05-02 | `main` | `v1.6.5` |
| **v1.6.6** | **Sprint 2 partial** (authMiddleware deletedAt filter + 15 tests accountDel/coupleLife) | ✅ Producción 2026-05-02 | `main` | `v1.6.6` |
| **v1.6.7** | **Sprint 2 final** (Resend email + ghost partial index) | ✅ Producción 2026-05-02 | `main` | `v1.6.7` |
| **v1.7** | **El Juego (segundo round)** | ✅ **En producción 2026-05-02** — niveles pareja, achievements 30, streaks, retos semanales, replays, web push | `main` | `v1.7` |
| **v2.0.1** | **Calendario 360** | ✅ **En producción 2026-05-02** (feature flag, Google OAuth pendiente v2.0.1.x) | `main` | `v2.0.1` |
| **v2.0.2** | **Journaling** | ✅ **En producción 2026-05-02** (esqueleto MVP, atachments diferidos) | `main` | `v2.0.2` |
| **v2.0.3** | **Analytics Pro** — aggregator con invariantes matemáticos + insights cards + heatmap | ✅ **En producción 2026-05-02** | `main` | `v2.0.3` |
| **v2.0.3.1** | **Hotfix técnico + UX must-fix** — IDOR journal, push unsubscribe, focus rings, BottomNav safe-area | ✅ **En producción 2026-05-02** | `main` | `v2.0.3.1` |
| **v2.0.4** | **Catálogo + consenso** — ActivityTemplate + ConfigurationProposal + ProposalsPanel | ✅ **En producción 2026-05-03** (pendiente seed + QA E2E manual) | `main` | `v2.0.4` |
| **v2.0.5** | **Quick wins** — anniversary timer + image proof tareas (data-URL <500KB) | ✅ **En producción 2026-05-03** | `main` | `v2.0.5` |
| **v2.3.x** | **KISS Actividades + refresh hardening** — múltiples polish releases | ✅ **En producción 2026-05-04** | `main` | `v2.3.5` |
| **v2.4.0** | **Audit hardening D1** — web-push + alerts/confirms + compensationDiscount + maxFreeRounds + isLoading split + sheetLock auto | ✅ **En producción 2026-05-05** | `main` | `v2.4.0` |
| **v2.4.1** | **Audit hardening D2** — `$transaction` en negotiationEngine.accept + force creator check + dispute reverte PT + reset-confirm doble confirm | ✅ **En producción 2026-05-05** | `main` | `v2.4.1` |
| **v2.4.2** | **Audit hardening D3** — deletedAt filter login/signup + IDOR journal + GDPR Art. 8 + categories schema + forgot-password real | ✅ **En producción 2026-05-05** | `main` | `v2.4.2` |
| **v2.4.3** | **Audit hardening D4** — deploy script sin --delete + plan baseline migrations Postgres + STATUS/ROADMAP al día | ✅ **En producción 2026-05-05** | `main` | `v2.4.3` |
| **v2.5.0** | **Sprint 2 audit** — Tasks.tsx → React Query · achievement engines layered (3 servicios documentados, no duplicados) · 6 hex hardcoded → tokens Tailwind · IDOR contract test inventory | ✅ **En producción 2026-05-05** | `main` | `v2.5.0` |
| **v2.5.1** | **Sprint 3 audit** — recurrenceService MONTHLY/YEARLY clamp anchor (RFC 5545) · streak en TZ local couple · digestService weekEnd ISO canónico · 15 tests nuevos | ✅ **En producción 2026-05-05** | `main` | `v2.5.1` |
| **v2.5.2** | **Sprint 4 audit** — prefers-reduced-motion · Inter self-hosted (@fontsource) GDPR · ConfirmDialog en force endpoint | ✅ **En producción 2026-05-05** | `main` | `v2.5.2` |
| **v2.5.3** | **Sprint 5 audit** — XP cuenta event_accepted/forced · partner_joined notif · invalidate tras notif · guard /login /signup · AppHeader refresh selectivo | ✅ **En producción 2026-05-05** | `main` | `v2.5.3` |
| **v2.5.4** | **Sprint 6 audit** — 401 sin reload · soft-delete filter más sites · dissolveCouple rota secretKey · V2 counter race lock | ✅ **En producción 2026-05-05** | `main` | `v2.5.4` |
| **v2.5.5** | **Sprint 7 audit** — pointsDisputed validation · TaskLog date ISO · analyticsV2 LIMIT | ✅ **En producción 2026-05-05** | `main` | `v2.5.5` |
| **v2.5.6** | **Sprint 8 audit** — Calendar RQ · 4 composite indexes · Onboarding deps · Tasks modales legacy a11y | ✅ **En producción 2026-05-05** | `main` | `v2.5.6` |
| **v2.5.7** | **Sprint 9 audit** — Task.defaultAssigneeId FK · /balance N+1 → groupBy · Tasks dead code | ✅ **En producción 2026-05-05** | `main` | `v2.5.7` |
| **v2.5.8** | **Sprint 10 audit** — /tasks/recurring N+1 → groupBy · CalendarEntry FKs · AppHeader memo · MIGRATIONS-BASELINE doc | ✅ **En producción 2026-05-05** | `main` | `v2.5.8` |
| **v2.6** | **Achievements unification** — V1 usa V2 internamente para evaluar catálogo declarativo | 📝 Backlog | — | — |
| **v2.7** | **Tokens unification full** — eliminar matri-* CSS vars + backgrounds opaque dark consolidados en surface tokens | 📝 Backlog | — | — |
| **v2.0.6** | **Refinos catálogo** — picker en EventCreate, contraoferta en propuestas, "proponer cambio" inline | 🤔 Por decidir tras D30 | `feature/v2.0.6-refinos` | — |
| **v2.1** | **Conectados** — Google sync bidireccional + push real + ICS + referidos | 📝 Spec aprobado (2026-05-02) | `feature/v2.1-conectados` | — |
| **v2.2** | **Multiidiomas** — i18n ES/EN/CA/PT (interfaz, prompts journal, emails) | 🧠 Brainstorm pendiente | `feature/v2.2-multiidiomas` | — |
| **v3.0** | **Premium** — Stripe + freemium B + AI Claude Haiku + Themes + RN opcional | 📝 Spec aprobado (2026-05-02) | `feature/v3.0-premium` | — |

**Principios para todo lo post-v1.5:** versiones estables, test-first, contract testing back↔front, QA automatizado (Vitest + Jest unit + Playwright E2E desde v1.6.1), security-by-default, deploy reproducible.

---

## MVP 1 · Los Cimientos ✅

**Auth + invitaciones + onboarding · Eventos con negociación · Tareas + logs + verificación · Puntos: balance, historial · Configuración editable · Notificaciones in-app · Perfiles + familia · Categorías personalizadas · Logros base · Calendario · Analytics (overview/trends/equity)**

Bugs corregidos antes de lanzar:
- Calendario no mostraba TaskLogs
- Fechas en UTC en lugar de timezone local
- Notificaciones al crear (corregido: solo al responder)

---

## v1.1 · La Chispa

**Foco:** Rediseño UX/UI completo + primeros elementos de personalidad diaria.  
Primera versión presentable a usuarios externos.

**Features:**
- Rediseño visual completo (paleta warm+dark: `#0f0a1e` fondo, `#f59e0b` amber, `#a855f7` purple)
- Bottom navigation bar con botón ➕ central elevado (5 posiciones)
- Mood del día (6–10 estados, visible para la pareja)
- Frase motivacional diaria (biblioteca propia, no API)
- Dark mode toggle (base oscura; toggle a warm light)
- Avatares de perfil (biblioteca de ilustraciones)
- Onboarding mejorado con modo demo

---

## v1.2 · El Juego

**Foco:** Gamificación potente como corazón visible + configurabilidad de reglas.

**Features:**
- Sistema de niveles de pareja (Nido → Brote → Hogar → Raíces → Diamante → Leyenda → Eterno)
- Mapa de logros estilo Duolingo (camino serpentante, nodos, nunca termina)
- Categorías de logros: Constancia, Equilibrio, Consenso, Rendimiento, Pareja, Secretos
- Rareza: Común/Poco común/Raro/Épico/Legendario
- Rachas con multiplicador de puntos (×1.1 a ×2.0, congelador de racha semanal)
- Editor de categorías de actividades con aprobación bilateral
- Panel "Reglas del Juego" con propuesta y aprobación
- FactorMascotas en puntos de tareas (×1.0 / ×1.1 / ×1.2)

---

## v1.3 · La Casa ✅

**Foco:** Hub de gestión doméstica real.

**Features enviadas:**
- Tareas 2.0: tipos puntual/recurrente, planificador semanal/mensual, instancias automáticas (cron semanal)
- Lista de la compra compartida con categorías (ShoppingList/ShoppingItem)
- Módulo To-dos personal (sin puntos, sin gamificación)
- Digest semanal in-app (lunes 08:00: balance, logros, rachas)
- WeeklyTaskView: toggle lista/semana en Tareas
- FAB con action sheet: quick-add shopping + todo

**Mejoras técnicas incluidas:**
- Security hardening: rate-limit /api/auth, CORS allowlist, JWT_SECRET min 32 chars, crypto.randomBytes para secretKey, body limit 1mb, validación zod con bounds y longitudes
- Auto-accept TaskLogs pendientes >24h (cron horario)
- Auth middleware consolidado en una sola implementación

---

## v1.4 · La Evolución (diseño v2)

**Foco:** Rediseño UX completo end-to-end según Claude Design v2 + pantalla Analytics dedicada + Premium teaser.

**Spec aprobado:** `docs/superpowers/specs/2026-04-20-v1.4-la-evolucion-design.md`

**Scope cerrado:**
- Navegación nueva: Inicio · Tareas · Calendario · Analítica (Logros → menú ⋯ del header)
- Dashboard condensado: BalanceLevelHero fusionado, StreakStrip compacto, frase diaria, tareas arriba del fold
- FAB menú con 📅 Actividad / 🛒 Compra / 📝 To-do
- Nueva pantalla Analytics: 3 tabs (Básico 4 gráficos · Avanzado 5 gráficos blur+overlay · Movimientos)
- Header con saludo temporal, mood partner, bell + menú ⋯ (Logros, Perfil, Pareja, Reglas, Ajustes, Ayuda, Logout)
- Redesign full de las 16 pantallas (incluyendo Login/Signup/Onboarding 6 pasos/Calendar/Settings/Achievements/Shopping/Todos/History→Movements/RequestActivity/RequestInbox/NotFound)
- Dark-only: se elimina el toggle theme
- Tokens del bundle v2 vía `tailwind.config.js` extend + `globals.css`
- Backend: 4 endpoints analytics nuevos (time-invested, heatmap, completion-rate, insight heurístico) + tabla `PremiumInterest` + `POST /api/premium/interest`
- Google/Apple OAuth botones visibles pero disabled (backend OAuth real → v2.1)
- Stripe → v3.0 (en v1.4 el CTA Premium solo captura email de interés)

---

## v1.5 · Red de Seguridad

**Foco:** Cerrar la deuda histórica de tests del frontend y pasar a una política *test-first* para todo lo que venga después. Cobertura retroactiva de los flujos que más duelen si se rompen (auth, balance, negociación, disputa de tareas), no cobertura exhaustiva línea por línea.

**Contexto:** el backend ya tiene Jest configurado con tests en `auth`, `recurringTaskService`, `gamificationService`, `analyticsService` y `achievementEngine`. El frontend, hasta v1.4, se valida a mano vía `npm run dev`. El módulo Actividades (2026-04-21) introduce Vitest + RTL como parte de su Fase 0; v1.5 consolida ese setup y extiende la cobertura al resto del código.

**Scope cerrado:**

### 1. Infraestructura común (heredada de Actividades)
- Vitest + @testing-library/react + jsdom ya instalados como efecto colateral del módulo Actividades.
- `vitest.config.ts`, `src/test/setup.ts`, `src/test/renderWithProviders.tsx` ya existen.
- v1.5 añade: CI en GitHub Actions que corre `npm run test` (front) + `npm run test` (back) + `npm run type-check` en cada push a `main` y en cada PR.

### 2. Cobertura retroactiva del frontend — flujos críticos
Un test de integración (RTL) por flujo, no más. Preferimos ancho antes que profundidad.

| Origen | Flujo | Qué prueba |
|---|---|---|
| MVP 1 | Login + Signup | Redirect según auth, validaciones de formulario |
| MVP 1 | Onboarding (4 pasos) | Avanzar/retroceder, no se puede saltar pasos |
| MVP 1 | Crear actividad (wizard RequestActivity) | Validaciones, preview de puntos, submit |
| MVP 1 | Balance + historial | `BalanceLevelHero` renderiza nombres y números correctos |
| MVP 1 | Disputa de tarea | Panel de disputa, submit, invalidaciones |
| v1.1 | `DailyPhrase` + mood partner | Render condicional, click de mood abre sheet |
| v1.2 | `AchievementBadge` + mapa de logros | Render de estado unlocked/locked |
| v1.2 | `StreakStrip` | Multiplier + freezer disponibles |
| v1.3 | Shopping list add/check | Toggle, borrado, persistencia |
| v1.3 | To-dos personal | Crear, completar, filtrar mios/compartidos |
| v1.4 | Analytics tabs (Básico/Avanzado/Movimientos) | Cambio de tab, blur overlay en Premium |
| v1.4 | FAB action sheet | Abrir, 3 opciones, navegación correcta |
| Actividades | Banner + /home/* | Ya cubierto por el propio módulo — se hereda |

### 3. Cobertura retroactiva del backend
- `pointsCalculator` — test unitario completo con la tabla de factores del `docs/PUNTOS.md`.
- `negotiationEngine` — aceptar, rechazar, contraofertar, forzar, rondas agotadas.
- `eventRoutes` — happy path + 401 + 404 + rondas agotadas.
- `taskRoutes` + auto-accept 24h cron — crear log, disputar, cron marca verified.
- `notificationService` — sólo se crea al responder (no al crear).

### 4. Política *test-first* a partir de v2.0
- Plantilla de PR con casilla "tests incluidos para el cambio". 
- Cobertura mínima 70% **de los archivos modificados** (no del repo entero). Se mide con `vitest --coverage` + `jest --coverage`.
- Cualquier bug cerrado añade test de regresión antes de cerrar el ticket.

**No-objetivos:**
- No se persiguen porcentajes globales de cobertura ni tests E2E con Playwright (se evaluará en v2.1 si hace falta).
- No se reescriben features existentes para facilitar testing; si una zona resiste test, se documenta y se deja TODO.

**Branch:** `feature/v1.5-red-de-seguridad` · **Tag al merge:** `v1.5`

### Entregado en v1.5 (2026-04-22)

Code shipped a `main` directo (sin feature branch). Se etiqueta `v1.5` tras QA real con dos cuentas.

**Paso 1 — Hotfix recurrentes:** regeneración de instancias futuras al editar tarea recurrente; backend no crea placeholders "fantasma" con puntos 0.

**Paso 2 — Panel Recurrentes:** pausar / reactivar / anular tareas recurrentes desde Settings > Tareas, con ConfirmDialog y filtro mías/pareja.

**Paso 3 — Red de Seguridad:**
- Contract tests Zod V2 auth (join-code register) + taskRoutes (create/log) — 12 casos.
- Shape contract test de `/api/health` con prisma mockeado (hermético, 2 casos).
- CI GitHub Actions: typecheck + build + subset hermético de jest (`pointsCalculator|taskLogPoints|joinCode|insightHeuristic|taskRoutesContract|healthShape`) en cada push/PR.

**16 quick-wins UX/infra:**
1. `#3` — `defaultAssigneeId` persistido por tarea (schema + migration + AddTaskSheet con IDs reales).
2. `#5` — Presencia: `User.lastSeenAt` con throttle 60s en authMiddleware; pill "en línea ahora / hace X" bajo el nombre del usuario en el header.
3. `#6` — Notificaciones por rama: chips Eventos/Tareas/Pareja/Otras con contador, icono por categoría, routing inteligente al hacer click.
4. `#7` — Empty states de Tareas (Verificar / Historial / Hoy) con icono + CTA contextual.
5. `#8` — Refresh global en AppHeader: invalida todas las queries de React Query con spinner ≥400 ms.
6. `#11` — Sentry wiring (backend `@sentry/node` + frontend `@sentry/react`), no-op sin DSN.
7. `#12` — `/api/health` enriquecido: `version`, `commit`, `uptimeSeconds`, `lastMigration`, `db`, `env`.
8. `#13` — Contract tests V2 (ver Paso 3).
9. `#14` — Demo mode: `/auth/demo-available` + `/auth/demo-login` env-gated por `DEMO_MODE_ENABLED=true`; botón "Probar con datos de ejemplo" en /login visible solo si la probe responde disponible.
10. `#15` — Tour interactivo de 5 pasos en el Dashboard en la primera visita tras onboarding (localStorage `matripuntos_tour_v1_seen`).
11. `#16` — `CoupleHealthCard` en Settings > Pareja: balance neto, movimientos últimos 7 días, última actividad por persona, copia de join-code.
12. Empty states mejorados en Recurrentes / Analytics / Inbox (incluidos en Paso 2 y #7).
13. Iconografía y tone consistentes en notificaciones (parte de #6).
14. Quick-wins menores embebidos en los commits anteriores: aislamiento de placeholders de recurrencia, ConfirmDialog reutilizable, filtro mías/pareja en tareas, avatar con mood en header.

**QA y hotfixes post-tag (2026-04-23):**
- Paso 4 — QA real dos cuentas completado; checklist en `docs/QA-CHECKLIST-v1.5.md`.
- Hotfix delta: actividad aceptada siempre resta puntos al creador (antes se veía
  positivo desde el dashboard del otro miembro de la pareja). Commit `3ff81b5`.
- Hotfix CI: workspaces comparten un único `package-lock.json` en raíz; el
  workflow y `.gitignore` ajustados. Commits `f38dee4` + `9cfdc31`.
- Hotfix UX post-QA (commit `f761bd2`): (a) refresco no expulsa al login
  (Zustand arranca `isLoading=true` si hay token), (b) iconos del historial se
  despachan por `tx.type` y muestran emoji de categoría, (c) recurrentes
  pausadas ya no reaparecen en "Hoy".
- Tag `v1.5` aplicado en `main` tras validación del usuario.

---

## v1.5.1 · Hotfix Supabase migrations 🛠️

**Foco:** desbloquear el camino de migraciones Prisma → Supabase antes de aplicar la migración nueva de v1.6 (`MoodLog`).

**Contexto:** Desde 2026-04-10 la tabla `_prisma_migrations` en Supabase ha tenido episodios de corrupción (memoria `project_prisma_supabase_gotcha`). v1.4 hizo un reconcile manual puntual; v1.5.1 lo automatiza para que el procedimiento sea reusable en futuros incidentes.

**Entregado** (2026-05-02, en `main`):
- ✅ Script `scripts/reconcile-prisma-migrations.mjs` — recorre `src/backend/prisma/migrations/`, ejecuta `prisma migrate resolve --applied <name>` por cada una, idempotente (skipea las ya aplicadas), valida estado final con `prisma migrate status`.
- ✅ Soporte `DRY_RUN=1` para preview sin tocar nada.
- ✅ Scripts npm: `migrate:status` y `migrate:reconcile` en `src/backend/package.json`.
- ✅ Documentación completa en `docs/DEPLOY.md` (topología, env vars, configuración Render, procedimiento de release, reconcile §5, verificación, rollback).

**Verificación en prod** (2026-05-02): el dry-run del script confirmó vía `prisma migrate status` que **las 14 migraciones de `prisma/migrations/` están registradas en `_prisma_migrations`** y la base de datos está sana. El reconcile manual hecho en v1.4 (2026-04-22) ha mantenido la integridad. La nueva migración de v1.6 (`20260427000000_v1_6_mood_log_and_mood_keys`) se aplicará automáticamente vía `prisma migrate deploy` en el `start` de Render cuando v1.6 se mergee a `main`.

El script `scripts/reconcile-prisma-migrations.mjs` queda como herramienta reusable para futuros incidentes.

---

## v1.6 · La Personalidad 📝

**Foco:** convertir Matripuntos de "herramienta de gestión" a "espacio compartido con personalidad" mediante 3 piezas pequeñas y diarias.

**Spec aprobado:** `docs/superpowers/specs/2026-04-26-v1.6-la-personalidad-design.md`

**Scope cerrado:**
- **Frase del día:** biblioteca ampliada a ~280 frases en 8 categorías (`reconciliacion`, `animo`, `celebrar`, `agradecer`, `calma`, `animo-suave`, `hito`, `neutra-positivo`). Cascada por urgencia emocional (disputa abierta → reconciliación, racha rota → ánimo, weekend → celebrar, etc.). Determinismo `coupleId+día+categoría` via hash `cyrb53`. Componente `DailyPhrase` rediseñado con tipografía mejor.
- **Mood:** catálogo fijo de 10 moods (4 positivos, 2 neutros, 2 bajos, 2 negativos no hostiles — sin moods hostiles). Caducidad 24h rolling. Header con badge mood propio + texto mood partner. `MoodPairCard` en dashboard. `MoodNudge` solo si user no tiene mood vigente. `MyMoodWeek` (7 días, solo propio) en perfil. Sin notificación al partner al cambiar mood.
- **Avatares:** catálogo único `data/avatarCatalog.ts` (30 emojis + 12 colores). `AvatarPicker` reutilizable que reemplaza código duplicado en `Settings.tsx` y `StepProfile.tsx`.
- **Backend:** tabla `MoodLog` + migración `20260427000000_v1_6_mood_log_and_mood_keys` + refactor `PUT /api/profile/me` con validación zod + transacción + anti-spam log <5min + endpoint nuevo `GET /api/profile/mood-history?days=7&tz=Europe/Madrid` (sin partner).

**Deuda técnica heredada que se cierra en este branch:**
Cobertura prometida en v1.5 y no completada — se aprovecha el touch en `profile.ts` para cerrar la deuda:
- `negotiationEngine` — aceptar, rechazar, contraofertar, forzar, rondas agotadas.
- `eventRoutes` — happy path + 401 + 404 + rondas agotadas.
- `taskRoutes` + auto-accept 24h cron — crear log, disputar, cron marca verified.
- `notificationService` — solo se crea al responder, no al crear.

**No-objetivos (van a backlog):** frases co-creadas / con IA, vista pareja-mood-week, push partner mood, avatares B (SVG), avatares C (accesorios), mood compuesto, sugerencias accionables.

**Branch:** `feature/v1.6-la-personalidad` · **Tag al merge:** `v1.6`

---

## v1.6.1 · Confianza 🛡️

**Foco:** convertir Matripuntos en una app pública seria — privacidad legal, telemetría real, onboarding invitee completo, QA automatizado E2E. No introduce features de producto pero quita riesgos críticos antes de empujar a más usuarios.

**Estado:** brainstorming pendiente (este es el scope tentativo a discutir).

**Scope tentativo:**

### 1. Privacy & legal stack
- Política de privacidad (en `/privacy`) + Términos de uso (en `/terms`) + página de cookies con consentimiento real (banner GDPR-friendly).
- **Borrar mi cuenta** desde Settings → flow con confirmación + email + delete cascade preservando datos de la pareja anonimizados.
- **Salir de la pareja** sin borrar cuenta → conserva tu `User` + `UserProfile` + tus `PointsTransaction` históricas pero rompe la relación con `Couple`. Vista propia "Histórico de mi etapa con X".
- Auditoría de datos sensibles: revisar qué se loguea en Sentry (PII off), qué se envía a frontend, qué se persiste.

### 2. Telemetría producto
- PostHog (free tier) o alternativa (Plausible + custom events).
- Eventos custom para validar KPIs de v1.6: `mood_set`, `mood_changed`, `daily_phrase_seen`, `avatar_changed`, `tour_completed`, `activity_accepted`, `activity_rejected`, `activity_force_paid`.
- Dashboard interno (Notion / página simple) con KPIs semanales.
- Banner de consentimiento que respeta opt-out (sin telemetría si el user dice no).

### 3. Onboarding del invitado completo
- Hoy `StepJoinAccount` (v1.4.1) hace login rápido pero salta `taskPreferencesLoves/Dislikes`, `weeklyWorkHours`, `workMode`. El partner queda con perfil vacío.
- Flujo "Completa tu perfil" tras primer login del invitado (no obligatorio, descartable, recordatorio amable durante 7 días).
- Widget en Settings > Perfil que muestra "Tu perfil está al X% — completa Y" mientras falten campos clave.

### 4. QA automatizado E2E (Playwright)
- 5–8 happy paths críticos: login, signup-con-joinCode, crear actividad, aceptar actividad, completar tarea + verificación, cambiar mood, balance correcto, salir de pareja.
- Workflow GitHub Actions corre Playwright en cada PR (paralelo con jest+vitest+typecheck) usando un backend dockerizado con SQLite efímero.
- Screenshots/videos en fallo subidos como artifacts.

### 5. Contract testing back↔front extendido
- Hoy hay shape contract test de `/api/health`. Extender a las 5 rutas más usadas: `/api/auth/login`, `/api/events`, `/api/tasks/logs`, `/api/profile/me`, `/api/notifications`.
- Generar tipos TS del backend (Zod → `z.infer`) y compartirlos con frontend (`packages/shared` o symlink) para que el frontend use **los mismos tipos** que el backend valida.

### 6. Hardening de rate-limit y validación
- Rate-limit global en API (no solo `/api/auth`) con buckets distintos por endpoint. Aplicar también a `/api/profile/me` (mood spam) y endpoints write-heavy.
- Audit de zod schemas: cualquier ruta sin `.parse()` se documenta o se cubre.

**Branch:** `feature/v1.6.1-confianza` · **Tag al merge:** `v1.6.1`

---

## v1.7 · El Juego (segundo round) 🎮

**Foco:** profundización de gamificación. v1.2 dejó el motor (niveles, mapa de logros, rachas, FactorMascotas); v1.7 llena el juego de contenido y de identidad visual.

**Estado:** brainstorming pendiente (este es el scope tentativo a discutir).

**Scope tentativo:**
- **Avatares B:** 12-16 ilustraciones SVG diseñadas estilo plano warm/dark, reemplazan al sistema emoji+color como primera opción visible (el sistema A queda como alternativa).
- **Avatares C:** sistema de base + accesorios (gorras, gafas, fondos, marcos) desbloqueables al subir niveles y al ganar logros legendarios. Gancho de gamificación: el avatar evoluciona con la pareja.
- **Catálogo completo de logros:** poblar las 6 categorías × 5 rarezas con ~60-80 logros concretos (hoy hay solo el motor + algunos seeds). Cada logro con criterio claro, copy redactado, recompensa (puntos o accesorio).
- **Tour del sistema de puntos:** mini-tutorial interactivo que enseña al user nuevo cómo se calculan los puntos (`PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos × FactorMascotas`) con un caso real. Aparece la primera vez que el user crea una actividad.
- **Mejoras del mapa de logros:** animaciones al desbloquear, vista "próximos logros sugeridos" en dashboard, filtro por categoría.
- **Logros secretos** (categoría 🌙): se revelan al desbloquearse, no antes. Probablemente 8-12 piezas de copy bien cuidadas.

**Branch:** `feature/v1.7-el-juego-2` · **Tag al merge:** `v1.7`

---

## v2.0.1 · Calendario 360 📅

**Foco:** convertir el calendario en hub de planificación real, no solo lista de eventos.

**Scope tentativo:**
- Vista día completo por horas (timeline 00-24h) con tareas + eventos + to-dos en su franja real.
- Click en día → abre vista día con timeline horario.
- Crear/editar tareas y to-dos directamente desde calendario (hoy solo se puede crear actividad).
- Mostrar TaskLogs recurrentes en el mes, no sólo eventos.
- Drag & drop para reprogramar tareas entre días (con validación de puntos al cambiar de franja horaria).
- Eventos sin puntos: citas médicas, cumpleaños, vacaciones, reuniones colegio. Vistas día/semana/mes.
- Schema: campo `googleCalendarId` añadido a `CalendarEntry` pero sync real diferido a v2.1.

**Branch:** `feature/v2.0.1-calendario-360` · **Tag:** `v2.0.1`

---

## v2.0.2 · Journaling 📓

**Foco:** espacio íntimo de reflexión de pareja sin features sociales.

**Scope tentativo:**
- Entrada diaria opcional por usuario.
- Privada por defecto; puede marcarse como "compartida con pareja" post-escritura.
- Sin comentarios ni reacciones del partner — espacio de reflexión, no chat.
- Vista timeline tipo feed dentro del módulo + búsqueda por fecha.
- **Aniversarios e hitos:** registro de fechas especiales (aniversario, primer piso juntos, nacimiento de hijos). Aparecen destacados en el calendario y desbloquean logro de categoría 💑 Pareja al cumplirse.
- **Vista pareja-mood-week** (heredada del backlog v1.6): ver mood histórico del partner solo si AMBOS han optado in. Empaquetada aquí porque comparte la sensibilidad emocional del journaling.

**Branch:** `feature/v2.0.2-journaling` · **Tag:** `v2.0.2`

---

## v2.0.3 · Analytics Pro 📊

**Foco:** llevar la pestaña Avanzado de analytics (que en v1.4 quedó con blur+overlay como teaser Premium) a producto real.

**Scope tentativo:**
- Tendencias 3/6/12 meses con comparativas mes-a-mes.
- Predicción de desequilibrio: "si el ritmo actual sigue, en 2 semanas tu balance será X".
- Heatmap de actividad por día de semana × hora del día.
- Insights heurísticos extendidos (hoy hay 1 endpoint, ampliar a 5-10 patrones detectados).
- **Sugerencias accionables según mood** (heredada del backlog v1.6): "Has estado cansado 3 días seguidos → considera delegar X tarea". Requiere motor de recomendación simple.
- Exportación de gráficas como PNG (preparación para PDF mensual de v2.1).

**Branch:** `feature/v2.0.3-analytics-pro` · **Tag:** `v2.0.3`

---

## v2.0.4 · Catálogo + Consenso 📚

**Foco:** llevar el modelo de "consenso de pareja" (ya activo en negociación de eventos) a la configuración del sistema, y formalizar un catálogo de actividades reutilizable.

**Decisión clave (checkpoint 2026-05-03):** el core de la app es la gamificación; las **actividades restan** matripuntos, las **tareas suman**. Por eso necesitamos un catálogo limpio de actividades (paralelo al de tareas) en el que los puntos base sugeridos sean editables y consensuados.

**Features:**
- `ActivityTemplate`: catálogo de actividades global (visible para todas las parejas) + custom por pareja, con `pointsBaseSuggested`, `defaultDurationMinutes`, `defaultImpact`, `emoji`. ~50 templates seed en 8 categorías (trabajo, salud, ocio, social, alto_impacto, viaje, cuidado, personal) con subcategorías.
- Picker visual al crear evento: el usuario elige un template, los campos del formulario se rellenan automáticamente (puntos, duración, impacto), pero sigue siendo editable y negociable como cualquier evento.
- `ConfigurationProposal`: cualquier campo de `Configuration` (puntos base de tareas, multiplicadores) se puede proponer cambiar; el partner acepta/rechaza/cancela; al aceptar, se aplica + se logea en `ConfigurationChangeLog`.
- Nueva sección "Propuestas pendientes" en Settings.
- Feature flags `CATALOG_ENABLED` y `CONFIG_PROPOSALS_ENABLED` (default ON), `VITE_*` correspondientes en frontend.

**Out-of-scope MVP** (diferidos):
- Contraoferta en propuestas (MVP: solo accept/reject).
- Notificaciones push para nuevas propuestas (se verá en v2.1 push real).
- UI de "proponer cambio" inline en cada slider de Settings (de momento solo el panel + endpoint).

**Branch:** `feature/v2.0.4-catalog-consensus` · **Tag pendiente:** `v2.0.4`

---

## v2.0.5 · Quick wins ⚡

**Foco:** wins rápidos identificados en el análisis de competencia (Lasting, Paired, Splitwise, ChoreList) que aportan diferenciación con poco esfuerzo.

**Features:**
- **Anniversary timer**: `Couple.relationshipStartDate` + `anniversaryService` PURE (años/meses/días + próximo hito redondo). Card en dashboard con CTA inline para fijar fecha. Tests con invariantes (same-day, month-underflow, milestones 1/5/10/25 años).
- **Image proof opcional en tareas**: `TaskLog.proofImageUrl` + `proofUploadedAt`. Uploader con captura de cámara, validación de tamaño (≤500KB), data-URL embebida. Visible en `Tasks.tsx` (mis pendientes, edit) y `TaskPendingCard` (verificador, read-only). Sin almacenar binarios en BD: data-URL <500KB o https:// hosteada por el usuario.

**Out-of-scope (diferidos):**
- Cloud storage real para imágenes — decidir tras D30 según uso.
- Reglas anti-fraude duras (foto obligatoria) — la imagen sigue siendo opcional.
- Galería/mosaico de pruebas en analytics.

**Branch:** `feature/v2.0.5-quick-wins` · **Tag:** `v2.0.5`

---

## v2.0.6 · Refinos catálogo 🪄 (tentativo)

**Foco:** mejorar el catálogo + consenso de v2.0.4 según feedback de D30.

**Features candidatas (a confirmar tras métricas):**
- `ActivityCatalogPicker` integrado en EventCreate/Calendar (sustituye o complementa entrada libre).
- Contraoferta en `ConfigurationProposal` (hoy sólo accept/reject).
- Botón "Proponer cambio" inline en cada slider de Settings, en lugar de un panel separado.
- `name_i18n` JSON en `ActivityTemplate` preparando v2.2.

**Branch:** `feature/v2.0.6-refinos` · **Tag pendiente:** `v2.0.6`

---

## v2.1 · Conectados 🌐

**Foco:** integraciones externas y crecimiento.

**Features:**
- Push notifications (PWA con Web Push API; nativa diferida a v3.0).
- Sync Google Calendar bidireccional: eventos Matripuntos → GCal y GCal → Matripuntos en lectura.
- Backend OAuth real para Google/Apple (los botones llevan visibles desde v1.4 con disabled state).
- Email transaccional (Resend o SendGrid): invitaciones por email, recordatorios, digest semanal por email.
- Export de datos: CSV de historial de puntos y tareas, PDF de resumen mensual.
- Sistema de referidos: invitar otras parejas con código propio + recompensa en puntos o logro especial.
- Notificación al partner al cambiar mood (heredada del backlog v1.6, opcional, opt-in).

**Branch:** `feature/v2.1-conectados` · **Tag:** `v2.1`

---

## v2.2 · Multiidiomas 🌍

**Foco:** internacionalizar la app para que funcione en castellano, inglés, catalán y portugués (mínimos viables; otros idiomas si la demanda lo justifica).

**Scope:**
- i18n con `react-i18next` o equivalente; estructura `locales/{es,en,ca,pt}/common.json`.
- Toggle de idioma en Settings con persistencia por usuario (`User.locale`).
- Catálogo de prompts de Journal (v2.0.2) localizado por idioma.
- Plantillas de email (v2.1) localizadas.
- Catálogo global de actividades (v2.0.4) con campo `name_i18n` JSON para traducciones.
- ¿Geolocalización al primer login para sugerir idioma? (opt-in vía Accept-Language).
- Tests E2E mínimos en cada idioma para asegurar no se rompe el layout.

**Out-of-scope:**
- Localización fina de fechas/monedas (date-fns ya cubre, mantener default UTC).
- RTL (no relevante con ES/EN/CA/PT).
- Voice prompts traducidos (Journal voice → diferido).

**Branch:** `feature/v2.2-multiidiomas` · **Tag pendiente:** `v2.2`

---

## v3.0 · Premium 💎

**Foco:** monetización con base de usuarios real.

**Modelo freemium B:** Todo gratis hasta tener datos de uso. Luego:
- **Free:** límites en actividades/mes (por definir con datos), máx X tareas recurrentes, analytics histórico a 3 meses, 2 rondas negociación.
- **Premium:** sin límites + rondas ilimitadas + analytics histórico completo + acceso prioritario + badge en perfil + frases generadas por IA (heredada del backlog v1.6).

**Implementación:**
- Stripe para pagos (suscripción mensual/anual + trial 14 días).
- App móvil React Native (iOS + Android) con paridad funcional.
- Frases co-creadas por la pareja como feature Premium (heredada del backlog v1.6).

**Branch:** `feature/v3.0-premium` · **Tag:** `v3.0`

---

## Backlog sin versión asignada

Items diferidos sin compromiso de release todavía:
- Mood compuesto / multi-etiqueta ("cansado pero feliz") — revisar tras 2 meses de uso real de v1.6.
- Soft delete y corrección retroactiva de puntos (si la pareja descubre que una actividad debería haber valido distinto).
- Rate-limit avanzado por usuario (más allá del global de v1.6.1).
- Internacionalización: catalán, gallego, euskera, latam (`Couple.language` ya existe en schema, sin uso).
- Tests de carga / performance budgets en CI.
