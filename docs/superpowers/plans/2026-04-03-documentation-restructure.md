# Documentation Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace ~21k lines of historical markdown noise with a lean CLAUDE.md + 4 reference docs + archive, reducing tokens per session by ~90%.

**Architecture:** Move all historical files to `archive/`, replace `docs/` and `DOCS_COMPLETAS/` with 4 focused reference files, create `CLAUDE.md` as the primary Claude context file.

**Tech Stack:** git mv (preserves history), markdown, bash

---

## Files Overview

| Action | Path |
|--------|------|
| CREATE | `CLAUDE.md` |
| CREATE | `docs/PUNTOS.md` |
| CREATE | `docs/API.md` |
| CREATE | `docs/FLUJOS.md` |
| CREATE | `docs/DATOS.md` |
| UPDATE | `README.md` |
| CREATE | `archive/` (30+ files moved here) |
| DELETE (via archive) | `DOCS_COMPLETAS/` (10 files) |
| DELETE (via archive) | `docs/TABLA_PUNTOS.md`, `docs/FLUJOS_UX.md`, `docs/MODELO_DATOS.md`, `docs/PANTALLAS_MVP.md`, `docs/MONETIZACION.md`, `docs/MVP_COMPLETADO.md` |

---

## Task 1: Archive Historical Root Files

**Files:**
- Create: `archive/` directory
- Move: ~25 root-level historical files

- [ ] **Step 1: Create archive directory**

```bash
mkdir -p archive
```

- [ ] **Step 2: Move phase completion reports**

```bash
git mv PHASE1_COMPLETE.md archive/
git mv PHASE2_COMPLETE.md archive/
git mv PHASE3_COMPLETE.md archive/
git mv PHASE4_COMPLETE.md archive/
git mv PHASE3_COMPLETE.md archive/ 2>/dev/null || true
```

- [ ] **Step 3: Move progress/status reports**

```bash
git mv V2_PROGRESS_REPORT.md archive/
git mv V3_PROGRESS_REPORT.md archive/
git mv V4_FINAL_PROGRESS.md archive/
git mv PROGRESS_UPDATE.md archive/
git mv PROGRESS_SUMMARY.md archive/ 2>/dev/null || true
git mv PROJECT_STATUS.md archive/
git mv ESTADO_FINAL.md archive/
```

- [ ] **Step 4: Move testing and demo files**

```bash
git mv PHASE1_TESTING_GUIDE.md archive/
git mv PHASE3_TESTING_GUIDE.md archive/
git mv TESTING_CHECKLIST.md archive/
git mv CHECKLIST_FINAL.txt archive/
git mv DEMO_READY.md archive/
git mv DEMO_SCRIPT.js archive/
git mv LISTO_PARA_PROBAR.md archive/
git mv TEST_API.md archive/ 2>/dev/null || true
```

- [ ] **Step 5: Move setup and fix logs**

```bash
git mv FIXES_APPLIED.txt archive/
git mv SETUP_FIXES.md archive/
git mv SETUP_SCRIPT.sh archive/ 2>/dev/null || true
git mv COPY_PASTE_SETUP.sh archive/
git mv setup.sh archive/
git mv setup.bat archive/
git mv run-backend.sh archive/
git mv run-frontend.sh archive/
```

- [ ] **Step 6: Move redundant entry points**

```bash
git mv START_HERE.md archive/
git mv INICIO_AQUI.md archive/ 2>/dev/null || true
git mv QUICK_START.md archive/ 2>/dev/null || true
git mv QUICKSTART.md archive/ 2>/dev/null || true
git mv GETTING_STARTED.md archive/ 2>/dev/null || true
git mv INDICE_MAESTRO.md archive/
```

- [ ] **Step 7: Move implementation/change logs**

```bash
git mv CAMBIOS_REALIZADOS.md archive/
git mv RESUMEN_CORRECCIONES.txt archive/ 2>/dev/null || true
git mv RESUMEN_IMPLEMENTACION_FINAL.txt archive/
git mv ANTES_Y_DESPUES.txt archive/
git mv FILES_COMPLETE_SUMMARY.md archive/
git mv FILES_MODIFIED_SUMMARY.md archive/
git mv IMPLEMENTATION_PLAN.md archive/
git mv MATRIPUNTOS_V2_SPEC.md archive/
```

- [ ] **Step 8: Verify root is clean**

```bash
ls *.md *.txt *.sh *.bat *.js 2>/dev/null
```

Expected output: only `README.md` and `CHANGELOG.md` in root (plus any config files).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: archive historical docs to archive/"
```

---

## Task 2: Archive DOCS_COMPLETAS/ and Old docs/

**Files:**
- Move: `DOCS_COMPLETAS/` (entire folder, 10 files)
- Move: 6 files from `docs/`

- [ ] **Step 1: Archive DOCS_COMPLETAS/**

```bash
git mv DOCS_COMPLETAS archive/DOCS_COMPLETAS
```

- [ ] **Step 2: Archive old docs/ files**

```bash
git mv docs/TABLA_PUNTOS.md archive/
git mv docs/FLUJOS_UX.md archive/
git mv docs/MODELO_DATOS.md archive/
git mv docs/PANTALLAS_MVP.md archive/
git mv docs/MONETIZACION.md archive/
git mv docs/MVP_COMPLETADO.md archive/
```

- [ ] **Step 3: Verify docs/ only has superpowers/ subfolder**

```bash
ls docs/
```

Expected: `superpowers/` only.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: archive DOCS_COMPLETAS and old docs/ — will be replaced by new lean docs"
```

---

## Task 3: Write docs/PUNTOS.md

**Files:**
- Create: `docs/PUNTOS.md`

- [ ] **Step 1: Create the file**

```bash
cat > docs/PUNTOS.md << 'ENDOFFILE'
# Sistema de Puntos — Matripuntos

## Tareas Recurrentes (Diarias) — Base Fija

| Tarea | Pts base | Modificadores |
|-------|----------|---------------|
| Cocina (desayuno/comida/cena) | 2.0 | +0.5 visita 5+ · +0.25 dietas especiales |
| Baños + poner a dormir niños | 1.5 | +0.5 con 3+ niños o enfermo · +1.0 rabieta (necesita validación) |
| Limpieza/orden diaria | 1.5 | +1.0 limpieza profunda · +1.5 post-fiesta |
| Compra/gestiones | 1.0 | — |
| Logística escolar/deberes | 1.0 | — |
| Cuidado directo (juego, actividades) | 1.5 | +0.5 actividad programada fuera |
| **Total si una persona hace todo** | **8.5** | — |

---

## Actividades Puntuales — Tabla Base (sin multiplicadores)

| Tipo | Duración | 0 hijos | 1 hijo | 2 hijos | 3+ hijos |
|------|----------|---------|--------|---------|----------|
| Cena + copas | 4-6h | 6-10 | 8-14 | 12-18 | 16-22 |
| Desayuno/brunch | 2-3h | 2-3 | 3-4 | 4-6 | 6-8 |
| Fin de semana | 24-36h | 20-30 | 28-42 | 40-56 | 56-72 |
| Despedida soltero | 12-24h | 15-25 | 20-35 | 30-50 | 42-70 |
| Maratón/evento deportivo | 4-8h | 6-12 | 8-16 | 12-24 | 16-32 |
| Viaje de trabajo | 24-48h+ | 30-50 | 42-70 | 60-100 | 84-140 |
| Deporte/yoga/gym | 1-2h | 2-3 | 3-4 | 4-6 | 6-8 |
| Cita médica/trámite | 1-3h | 1-2 | 2-3 | 3-4 | 4-6 |
| Compra/recados importantes | 2-4h | 2-4 | 3-6 | 4-8 | 6-10 |
| Cena familiar (ambos) | 3-4h | 0 | 0 | 0 | 0 |

---

## Multiplicadores

### Factor Tipo de Actividad
| Tipo | Multiplicador |
|------|--------------|
| Necesaria (médico, trabajo obligatorio) | ×0.7 |
| Salud (deporte, terapia, descanso) | ×0.85 |
| Ocio social (cena, fiesta, casual) | ×1.0 |
| Alto impacto (despedida, viaje con resaca) | ×1.2 |

### Factor Franja Horaria
| Franja | Multiplicador |
|--------|--------------|
| 07:00 – 09:30 (mañana rutina) | ×1.4 |
| 09:30 – 17:30 (día normal) | ×1.0 |
| 17:30 – 21:30 (tarde/cenas) | ×1.5 |
| 21:30 – 01:00 (noche) | ×1.2 |
| 01:00 – 07:00 (madrugada) | ×1.6 |

### Factor Duración
| Duración | Multiplicador |
|----------|--------------|
| 0 – 3 horas | ×1.0 |
| 3 – 8 horas | ×1.1 |
| 8 – 24 horas | ×1.25 |
| 24+ horas | ×1.35 |

### Factor Hijos (en el momento de la ausencia)
| Hijos | Multiplicador |
|-------|--------------|
| 0 | ×1.0 |
| 1 | ×1.4 |
| 2 | ×1.8 |
| 3+ | ×2.2 |

---

## Fórmula

```
Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos
```

Redondeo: al **0.5 más próximo**.

### Ejemplos

**Cena + copas viernes noche (4h, 0 hijos):**
```
8 × 1.0 × 1.2 × 1.0 × 1.0 = 9.6 → 10 pts
```

**Despedida soltero 24h (2 hijos, franja mixta):**
```
20 × 1.2 × 1.2 × 1.25 × 1.8 = 64.8 → 65 pts
```

**Médico rutina (1h, día normal, 1 hijo):**
```
1 × 0.7 × 1.0 × 1.0 × 1.4 = 0.98 → 1.0 pt
```

---

## Compensaciones

Reducen los puntos del evento antes de la negociación.

| Tipo | Efecto típico |
|------|--------------|
| Cocina especial | -10 a -20% |
| Contratar canguro | -15 a -25% |
| Levantarse mañana siguiente | -15 a -20% |
| Tarea futura vinculada | -pts fijos |

Se almacena en `Compensation.discountAmount` (fijo) o `discountPercent` (%). Estado: `pending → completed`.
ENDOFFILE
```

- [ ] **Step 2: Verify**

```bash
wc -l docs/PUNTOS.md
```

Expected: ~90-100 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/PUNTOS.md
git commit -m "docs: add PUNTOS.md — points system reference"
```

---

## Task 4: Write docs/API.md

**Files:**
- Create: `docs/API.md`

- [ ] **Step 1: Create the file**

```bash
cat > docs/API.md << 'ENDOFFILE'
# API Reference — Matripuntos

Base URL: `http://localhost:3000/api`  
Auth: `Authorization: Bearer <JWT>` en todas las rutas salvo donde se indica `[NO AUTH]`.

---

## AUTH — `/api/auth`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/register` | NO | `{ email, password, name, coupleSecretKey? }` | `{ token, user, couple }` |
| POST | `/login` | NO | `{ email, password }` | `{ token, user, couple }` |
| POST | `/invite` | YES | `{ inviteeEmail }` | `{ invitation }` |
| POST | `/join-couple` | YES | `{ token }` | `{ couple, user }` |

---

## EVENTS — `/api/events`

| Method | Path | Body / Query | Notes |
|--------|------|-------------|-------|
| GET | `/` | `?status=pending&limit=20` | List couple events |
| POST | `/` | `{ type, title?, description?, dateStart, dateEnd, hasChildren?, numChildren?, pointsBase, compensation?, compensationDiscount? }` | Creates event in `draft` status |
| GET | `/:id` | — | Includes negotiations array |
| PUT | `/:id` | Partial event fields | Only creator, only in draft/pending |
| DELETE | `/:id` | — | Only creator |
| POST | `/:id/accept` | — | Partner only. Sets `status=accepted`, creates PointsTransaction |
| POST | `/:id/reject` | — | Partner only. Sets `status=rejected` |
| POST | `/:id/counter` | `{ pointsProposed, message? }` | Counter-offer. Increments `negotiationRound`. Blocked if free rounds exhausted |
| POST | `/:id/force` | — | Proposer forces. Deducts from proposer's own balance |

**Event status flow:** `draft → pending → accepted | rejected | forced`

---

## TASKS — `/api/tasks`

| Method | Path | Body / Query | Notes |
|--------|------|-------------|-------|
| GET | `/` | — | List couple's tasks |
| POST | `/` | `{ name, category, pointsBase?, isDefault? }` | category: `cocina|baños|limpieza|compra|logistica|cuidado|mantenimiento|jardineria|mascotas` |
| PUT | `/:id` | Partial task fields | — |
| DELETE | `/:id` | — | — |
| GET | `/logs` | `?date=2026-04-01&userId=xxx` | List task logs |
| POST | `/logs` | `{ taskId, date, pointsBase, modifier?, modifierValue?, pointsFinal }` | Log completed task. Status = `pending` |
| PUT | `/logs/:id` | `{ status: 'verified' | 'disputed' }` | Partner verifies or disputes |
| POST | `/logs/:id/dispute` | `{ reason }` | Opens dispute |

**TaskLog auto-accept:** After 24h without partner response → `status = verified` automatically.

---

## POINTS — `/api/points`

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/balance` | — | `{ user1: { name, balance }, user2: { name, balance }, net }` |
| GET | `/history` | `?limit=50&offset=0` | Array of PointsTransaction |
| GET | `/leaderboard` | `?period=week|month` | Points earned per user in period |

---

## NEGOTIATIONS — `/api/negotiations`

| Method | Path | Response |
|--------|------|----------|
| GET | `/pending` | All events awaiting current user's response |

---

## NOTIFICATIONS — `/api/notifications`

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/` | `?unread=true` | User's notifications |
| PUT | `/:id/read` | — | Mark single as read |
| PUT | `/read-all` | — | Mark all as read |

---

## CONFIGURATION — `/api/configuration`

| Method | Path | Body |
|--------|------|------|
| GET | `/` | — |
| PUT | `/` | `{ tasksConfig?, multipliersConfig?, activityTypes? }` (all JSON strings) |

---

## PROFILE — `/api/profile`

| Method | Path | Body |
|--------|------|------|
| GET | `/me` | — |
| PUT | `/me` | `{ surname?, profilePhotoUrl?, weeklyWorkHours?, workMode?, taskPreferencesLoves?, taskPreferencesDislikes? }` |

---

## FAMILY — `/api`

| Method | Path | Body |
|--------|------|------|
| GET | `/children` | — |
| POST | `/children` | `{ name, dateOfBirth, livesWithUser1?, livesWithUser2?, hasSpecialNeeds? }` |
| DELETE | `/children/:id` | — |
| GET | `/pets` | — |
| POST | `/pets` | `{ name, type, quantity? }` |
| DELETE | `/pets/:id` | — |

---

## CATEGORIES — `/api/categories`

| Method | Path | Body |
|--------|------|------|
| GET | `/` | — (includes subcategories) |
| POST | `/` | `{ name, emoji, type, basePoints?, description? }` |
| PUT | `/:id` | Partial fields |
| DELETE | `/:id` | — |

---

## ACHIEVEMENTS — `/api/achievements`

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | Couple achievements with unlock status |
| GET | `/user` | Current user's unlocked achievements |

---

## CALENDAR — `/api/calendar`

| Method | Path | Query / Body |
|--------|------|-------------|
| GET | `/` | `?month=4&year=2026` |
| POST | `/` | `{ type, title, date, relatedEventId?, relatedTaskId?, description?, color? }` |

---

## ANALYTICS — `/api/analytics`

| Method | Path | Response |
|--------|------|----------|
| GET | `/overview` | 30-day totals: events, tasks, points per user |
| GET | `/trends` | Weekly data array for charts |
| GET | `/equity` | `{ equilibrium, activity, consensus, constancy, overallScore }` |

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Validation error (Zod) — body has `error` with details |
| 401 | Missing or invalid JWT |
| 403 | Action not allowed (e.g. partner trying to accept own event) |
| 404 | Resource not found |
| 409 | Conflict (e.g. negotiation round limit reached) |
| 500 | Internal server error |
ENDOFFILE
```

- [ ] **Step 2: Verify**

```bash
wc -l docs/API.md
```

Expected: ~130-160 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/API.md
git commit -m "docs: add API.md — complete endpoint reference"
```

---

## Task 5: Write docs/FLUJOS.md

**Files:**
- Create: `docs/FLUJOS.md`

- [ ] **Step 1: Create the file**

```bash
cat > docs/FLUJOS.md << 'ENDOFFILE'
# Flujos UX — Matripuntos

## Flujo 1: Solicitar Actividad

1. Dashboard → "Solicitar Actividad"
2. Formulario: tipo, fecha inicio/fin, ¿con hijos?, tipo actividad, compensación (opcional)
3. App calcula puntos en tiempo real mostrando preview
4. Si hay compensación → preview actualizado con descuento
5. Enviar → Event status: `pending`, notificación al partner
6. Partner ve en bandeja: acepta / rechaza / contraoferta

**Negociación (max 2 rondas free, ilimitadas premium):**
- Ronda 1: Proposer propone X pts
- Ronda 2: Partner contraoferta Y pts → proposer acepta o rechaza
- Si sin acuerdo: proposer puede "forzar" (paga de su propio saldo)
- Si rechazado: Event queda en `rejected`, sin cambio de saldo

---

## Flujo 2: Registrar Tarea

1. Tasks page → seleccionar tarea de la lista (o crear nueva)
2. Registrar: fecha, modificadores opcionales (limpieza profunda, etc.)
3. App calcula puntos finales
4. Log creado en status `pending`
5. Partner recibe notificación: "verificar o disputar"
6. Partner verifica → status `verified`, crea PointsTransaction
7. Partner disputa → status `disputed`, ambos pueden renegociar
8. Si no hay respuesta en 24h → auto-accept (status `verified`)

---

## Flujo 3: Onboarding (Nuevo Usuario)

**Step 1 — Crear cuenta:** email + password + nombre
**Step 2 — ¿Crear o unirse?**
  - Crear nueva pareja → genera `secretKey`
  - Unirse → introduce token de invitación

**Step 3 — Perfil:** hijos, mascotas, tipo de hogar
**Step 4 — Configuración inicial:** tareas base, multiplicadores
**Join Flow:** partner recibe link con token → acepta → vinculado al couple

---

## Flujo 4: Dashboard (Pantalla Principal)

- Saldo neto actual (ambos usuarios, con indicador quién debe a quién)
- Gráfico últimos 30 días (puntos por semana)
- Últimas actividades (events + task logs)
- Bandeja: eventos pendientes de respuesta
- Accesos rápidos: Solicitar actividad · Registrar tarea

---

## Flujo 5: Notificaciones

Triggers automáticos:
- Nuevo evento propuesto → al partner
- Respuesta a evento (aceptado/rechazado/contraoferta) → al proposer
- Tarea registrada → al partner (para verificar)
- Disputa de tarea → al registrador
- Logro desbloqueado → a ambos
- Recordatorio de tarea pendiente de verificar (si 20h sin respuesta)

Regla: máx 1-2 notificaciones/día por usuario para no saturar.

---

## Flujo 6: Analytics

- Resumen 30 días: total pts, eventos, tareas por usuario
- Gráfico semanal de tendencia
- Equity score: equilibrium (saldo), activity (participación), consensus (% acuerdos), constancy (regularidad)
- Vista: semana / mes / todo el historial (premium)
ENDOFFILE
```

- [ ] **Step 2: Verify**

```bash
wc -l docs/FLUJOS.md
```

Expected: ~70-80 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/FLUJOS.md
git commit -m "docs: add FLUJOS.md — core UX flows reference"
```

---

## Task 6: Write docs/DATOS.md

**Files:**
- Create: `docs/DATOS.md`

- [ ] **Step 1: Create the file**

```bash
cat > docs/DATOS.md << 'ENDOFFILE'
# Modelo de Datos — Matripuntos

DB: SQLite (local `src/backend/prisma/dev.db`) → PostgreSQL/Supabase (producción)  
ORM: Prisma. Schema completo: `src/backend/prisma/schema.prisma`

---

## Relaciones Principales

```
Couple (1) ──< User (2 máx)
Couple (1) ──< Event
Couple (1) ──< Task ──< TaskLog
Event (1) ──< Negotiation
Event (1) ── PointsTransaction (1)
TaskLog (1) ── PointsTransaction (1)
Couple (1) ── Configuration (1)
Couple (1) ── Subscription (1)
```

---

## Modelos Core

### Couple
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| secretKey | String unique | Para que partner se una |
| numChildren | Int | Default 0 |
| language | String | Default "es" |

### User
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| email | String unique | — |
| passwordHash | String | bcrypt |
| name | String | — |
| roleInHome | String | Default "equal" |
| hasCompletedOnboarding | Boolean | Default false |

### Event
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| createdBy | String? | FK → User |
| type | String | cena, viaje, despedida, etc. |
| dateStart / dateEnd | DateTime | — |
| numChildren | Int | Hijos presentes durante la ausencia |
| pointsBase | Decimal | Valor tabla base |
| pointsCalculated | Decimal | Tras aplicar multiplicadores |
| pointsAgreed | Decimal? | Valor acordado en negociación |
| status | String | draft→pending→accepted/rejected/forced |
| negotiationRound | Int | Ronda actual |
| maxFreeRounds | Int | Default 2 |
| lastProposedBy | String? | userId |
| lastProposedPoints | Decimal? | — |
| negotiationHistory | String | JSON array de rondas |
| compensation | String? | Descripción compensación |
| compensationDiscount | Decimal | Multiplicador (default 1.0 = sin descuento) |

### Task
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId | String | FK → Couple |
| name | String | — |
| category | String | cocina/baños/limpieza/compra/logistica/cuidado/mantenimiento/jardineria/mascotas |
| pointsBase | Decimal | Default 1.0 |
| isDefault | Boolean | true = tarea predefinida del sistema |

### TaskLog
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| coupleId / taskId / completedBy | String | FKs |
| date | DateTime | Día de la tarea |
| pointsBase / modifier? / modifierValue / pointsFinal | Decimal | — |
| status | String | pending→verified/disputed |
| verifiedBy / verifiedAt | String? / DateTime? | Partner que verifica |
| disputeReason / disputedAt | String? / DateTime? | — |

### Negotiation
| Campo | Tipo | Notas |
|-------|------|-------|
| eventId | String | FK → Event |
| roundNumber | Int | 1, 2, 3... |
| proposedBy | String? | userId |
| pointsProposed | Decimal | — |
| message | String? | Justificación |
| responseType | String? | accepted/rejected/counter_proposed/awaiting/forced |
| respondedBy / respondedAt | String? / DateTime? | — |

### PointsTransaction
| Campo | Tipo | Notas |
|-------|------|-------|
| coupleId / userId? | String | FKs |
| type | String | event_accepted/task_completed/donation/forced_payment |
| amount | Decimal | Positivo = ganados, negativo = pagados |
| relatedEventId / relatedTaskLogId | String? unique | FK al origen |

### Configuration
| Campo | Tipo | Notas |
|-------|------|-------|
| coupleId | String unique | FK → Couple |
| tasksConfig | String | JSON: lista de tareas y sus puntos |
| multipliersConfig | String | JSON: factores personalizados |
| activityTypes | String | JSON: tipos de actividad y sus bases |

---

## Modelos V2 (Extended)

| Modelo | FK | Campos clave |
|--------|-----|-------------|
| UserProfile | userId unique | surname, profilePhotoUrl, weeklyWorkHours, workMode, taskPreferencesLoves(JSON), taskPreferencesDislikes(JSON) |
| CoupleProfile | coupleId unique | homeType, homeSizeM2, externalServices(JSON) |
| Child | coupleId | name, dateOfBirth, livesWithUser1/2, hasSpecialNeeds |
| Pet | coupleId | name, type, quantity |
| Invitation | coupleId+inviterUserId | inviteeEmail, token(unique), status(pending/accepted/rejected), expiresAt |
| Category | coupleId | name, emoji, type(event/chore/service), basePoints, isCustom, isActive → has Subcategory[] |
| Subcategory | categoryId | name, basePointsModifier |
| Achievement | coupleId | type(solo/couple), name, rarity(common/rare/epic/legendary), condition(JSON) |
| UserAchievement | userId+achievementId (unique) | unlockedAt |
| CoupleScore | coupleId+weekStartDate (unique) | user1Score, user2Score, overallScore, equilibrium, activity, consensus, constancy |
| CalendarEntry | coupleId | type(event/task/service/birthday/holiday), title, date, relatedEventId?, relatedTaskId? |

---

## Nota sobre JSON en SQLite

Los campos de tipo JSON (negotiationHistory, tasksConfig, multipliersConfig, activityTypes, taskPreferencesLoves, etc.) se almacenan como **strings JSON** en SQLite. Usar `JSON.parse()` / `JSON.stringify()` al leer/escribir en el backend.
ENDOFFILE
```

- [ ] **Step 2: Verify**

```bash
wc -l docs/DATOS.md
```

Expected: ~110-130 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/DATOS.md
git commit -m "docs: add DATOS.md — data model reference"
```

---

## Task 7: Write CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create the file**

```bash
cat > CLAUDE.md << 'ENDOFFILE'
# CLAUDE.md — Matripuntos

## 1. PROYECTO
App web gamificada para parejas: gestión equitativa de responsabilidades del hogar mediante puntos negociables. MVP funcional. Branch activo: `feature/matripuntos-mvp`. Repo: https://github.com/wikiedu/claude_matripuntos

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

**Deploy:** Vercel (frontend) · Railway/Render (backend) · Supabase (DB prod)

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
FactorTipo:     Necesaria ×0.7 · Salud ×0.85 · Ocio ×1.0 · Alto impacto ×1.2
FactorFranja:   07-09:30 ×1.4 · 09:30-17:30 ×1.0 · 17:30-21:30 ×1.5 · 21:30-01 ×1.2 · 01-07 ×1.6
FactorDuración: 0-3h ×1.0 · 3-8h ×1.1 · 8-24h ×1.25 · 24h+ ×1.35
FactorHijos:    0 ×1.0 · 1 ×1.4 · 2 ×1.8 · 3+ ×2.2
```

Redondeo al 0.5 más próximo. Ejemplo: cena 4h noche 1 hijo = 8 × 1.0 × 1.2 × 1.0 × 1.4 = **13.5 pts**

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

## 9. ESTADO ACTUAL

**MVP completo en `feature/matripuntos-mvp`:**
- Auth + invitaciones + onboarding (4 steps)
- Eventos: CRUD, negociación, forzar
- Tareas: CRUD, logs, verificación, disputa
- Puntos: balance, historial, transacciones
- Configuración editable (tareas, multiplicadores, tipos)
- Notificaciones in-app
- Perfiles + familia (V2)
- Categorías personalizadas (V2)
- Logros/Achievements (V2)
- Calendario (V2)
- Analytics: overview, trends, equity (V2)

**Pendiente (roadmap):**
- Stripe: plan premium con pagos reales
- App móvil (React Native)
- Google Calendar integration
- Notificaciones push
- Export de datos

## 10. CONVENCIONES

- **Auth:** `authMiddleware` inyecta `req.userId` y `req.coupleId` en cada request protegido
- **Prisma:** `new PrismaClient()` por archivo de ruta (no instancia compartida)
- **Tipos numéricos:** Usar `Decimal` de `@prisma/client/runtime/library` para puntos
- **Errores:** `res.status(4xx).json({ error: 'mensaje legible' })`
- **JSON en SQLite:** negotiationHistory, tasksConfig, etc. son strings. Parsear con `JSON.parse()`/`JSON.stringify()`
- **V1 vs V2:** Las rutas V1 (MVP básico) y V2 (extended) coexisten en `server.ts`; no eliminar V1
- **Frontend state:** Zustand para auth/couple global, React Query para datos del servidor
- **Commits:** `feat:` · `fix:` · `chore:` · `docs:` convencionales

---

*Docs de referencia: `docs/PUNTOS.md` · `docs/API.md` · `docs/FLUJOS.md` · `docs/DATOS.md`*
ENDOFFILE
```

- [ ] **Step 2: Verify line count is reasonable**

```bash
wc -l CLAUDE.md
```

Expected: ~200-230 lines.

- [ ] **Step 3: Verify key sections present**

```bash
grep "^## " CLAUDE.md
```

Expected: 10 section headers (1. PROYECTO through 10. CONVENCIONES).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md — primary context file for AI sessions"
```

---

## Task 8: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README content**

```bash
cat > README.md << 'ENDOFFILE'
# Matripuntos

App web gamificada que ayuda a parejas a gestionar responsabilidades del hogar de forma equitativa mediante un sistema de puntos negociables.

**[Ver contexto completo → CLAUDE.md](./CLAUDE.md)**

---

## Quick Start

```bash
# Backend (SQLite, sin setup adicional)
cd src/backend && npm install && npm run dev    # localhost:3000

# Frontend
cd src/frontend && npm install && npm run dev   # localhost:5173
```

Health check: `http://localhost:3000/api/health`

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + Zustand
- **Backend:** Node.js + Express + TypeScript + Prisma + Zod
- **DB local:** SQLite · **DB producción:** PostgreSQL (Supabase)
- **Deploy:** Vercel (frontend) + Railway (backend)

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [CLAUDE.md](./CLAUDE.md) | Contexto completo del proyecto (stack, rutas, DB, reglas) |
| [docs/PUNTOS.md](./docs/PUNTOS.md) | Sistema de puntos: fórmula, multiplicadores, ejemplos |
| [docs/API.md](./docs/API.md) | Referencia completa de endpoints |
| [docs/FLUJOS.md](./docs/FLUJOS.md) | Flujos UX principales |
| [docs/DATOS.md](./docs/DATOS.md) | Schema de base de datos |
| [CHANGELOG.md](./CHANGELOG.md) | Historial de cambios |

---

## Comandos Útiles

```bash
cd src/backend
npx prisma studio          # Browser de base de datos
npx prisma migrate dev     # Aplicar migraciones
npx ts-node prisma/seed.ts # Seed de datos de prueba
```

---

## Producto

**Eduardo Calderón** — https://github.com/wikiedu/claude_matripuntos
ENDOFFILE
```

- [ ] **Step 2: Verify**

```bash
wc -l README.md
```

Expected: ~50-55 lines.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: simplify README — links to CLAUDE.md for full context"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Check root directory is clean**

```bash
ls -la *.md *.txt *.sh *.bat *.js 2>/dev/null
```

Expected: only `README.md`, `CLAUDE.md`, `CHANGELOG.md`.

- [ ] **Step 2: Check docs/ has exactly 4 reference files + superpowers/**

```bash
ls docs/
```

Expected: `API.md  DATOS.md  FLUJOS.md  PUNTOS.md  superpowers/`

- [ ] **Step 3: Check archive/ has the historical files**

```bash
ls archive/ | wc -l
```

Expected: 25+ files/folders.

- [ ] **Step 4: Verify CLAUDE.md sections**

```bash
grep "^## " CLAUDE.md
```

Expected:
```
## 1. PROYECTO
## 2. STACK TÉCNICO
## 3. ESTRUCTURA DE CÓDIGO
## 4. CÓMO ARRANCAR
## 5. BASE DE DATOS
## 6. API ROUTES
## 7. SISTEMA DE PUNTOS
## 8. REGLAS DE NEGOCIO
## 9. ESTADO ACTUAL
## 10. CONVENCIONES
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git status  # should be clean
git log --oneline -8
```

Expected: 8 commits visible from this work (Tasks 1-8).

---

## Self-Review

**Spec coverage:**
- ✅ CLAUDE.md ~200-250 lines: Task 7 delivers this
- ✅ archive/ with 30+ files: Tasks 1-2 deliver this
- ✅ docs/ with exactly 4 files: Tasks 3-6 deliver this
- ✅ README updated: Task 8 delivers this
- ✅ All archived files preserved: Tasks 1-2 use `git mv` (preserves history)

**Placeholder scan:** No TBDs, TODOs, or vague steps. All file contents are complete.

**Type/naming consistency:** File names match throughout (PUNTOS.md, API.md, FLUJOS.md, DATOS.md). CLAUDE.md references these exact names in section 10.
