# Phase 3.2: Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize Claude's session context into CLAUDE.md (~200 lines) and create 4 reference docs, archiving all historical files.

**Architecture:** Single CLAUDE.md per-session context + 4 modular reference docs + /archive/ for history.

**Tech Stack:** Markdown only, no code changes.

---

## File Structure

**Files to Create:**
- `CLAUDE.md` — Main session context (new location: repo root)
- `docs/PUNTOS.md` — Points system reference
- `docs/API.md` — API endpoints reference
- `docs/FLUJOS.md` — UX flows reference
- `docs/DATOS.md` — Data model reference
- `archive/` — Directory for historical files

**Files to Modify:**
- `README.md` — Update to reference new structure

**Files to Move to /archive/:**
- All PHASE*_COMPLETE.md, PHASE*_TESTING_GUIDE.md
- All V*_PROGRESS_REPORT.md, PROGRESS_*.md
- All DEMO_*.md, TESTING_*.md, LISTO_*.md, TEST_API.md
- All setup scripts (*.sh, *.bat)
- INDICE_MAESTRO.md, START_HERE.md, QUICK_START.md, etc.

---

## Tasks

### Task 1: Create CLAUDE.md (Main Context)

**Files:**
- Create: `CLAUDE.md` (root)

- [ ] **Step 1: Write CLAUDE.md**

Create `CLAUDE.md` in repo root. Content should be the exact structure from the current CLAUDE.md in the codebase (it already exists, we're just verifying it's correct and placed at root).

Current location: `/Users/edu/Web development/Claude/Matripuntos/` — verify it's at repo root (not in docs/).

If not at root, move it:

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
if [ ! -f CLAUDE.md ]; then
  echo "Creating/moving CLAUDE.md to root..."
  # Assuming it exists in docs/ or elsewhere, move it
fi
ls -la CLAUDE.md
```

If file doesn't exist, create it with sections (already have this content from earlier):

1. PROYECTO (5 lines)
2. STACK TÉCNICO (15 lines)
3. ESTRUCTURA DE CÓDIGO (30 lines)
4. CÓMO ARRANCAR (10 lines)
5. BASE DE DATOS (40 lines)
6. API ROUTES (40 lines)
7. SISTEMA DE PUNTOS (25 lines)
8. REGLAS DE NEGOCIO (20 lines)
9. ESTADO ACTUAL (10 lines)
10. CONVENCIONES (10 lines)

Target: ~205 lines total

- [ ] **Step 2: Verify location and format**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
wc -l CLAUDE.md  # Should be ~200-250 lines
head -20 CLAUDE.md  # Verify structure
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: place CLAUDE.md at repo root for session context"
```

---

### Task 2: Create PUNTOS.md Reference

**Files:**
- Create: `docs/PUNTOS.md`

- [ ] **Step 1: Write PUNTOS.md**

Create `docs/PUNTOS.md` with:

```markdown
# Sistema de Puntos — Referencia Completa

## Fórmula

Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos
(Redondea al 0.5 más próximo)

## Factores Multiplicadores

### FactorTipo (naturaleza del evento/tarea)
- Necesaria: 0.7
- Salud: 0.85
- Ocio: 1.0
- Alto impacto: 1.2

### FactorFranja (hora del día)
- 07:00-09:30: 1.4 (mañana temprano)
- 09:30-17:30: 1.0 (día laboral)
- 17:30-21:30: 1.5 (tarde/noche)
- 21:30-01:00: 1.2 (noche)
- 01:00-07:00: 1.6 (madrugada)

### FactorDuración (tiempo total)
- 0-3h: 1.0
- 3-8h: 1.1
- 8-24h: 1.25
- 24h+: 1.35

### FactorHijos (cantidad de hijos presentes)
- 0: 1.0
- 1: 1.4
- 2: 1.8
- 3+: 2.2

## Tareas Recurrentes (Base Fija)

- Cocina: 2.0
- Baños + niños: 1.5
- Limpieza: 1.5
- Compra: 1.0
- Logística: 1.0
- Cuidado: 1.5

## Ejemplos

### Ejemplo 1: Cena 4h noche 1 hijo
8 (base) × 1.0 (tipo ocio) × 1.2 (noche 17:30-21:30) × 1.0 (duración 0-3h) × 1.4 (1 hijo) = **13.5 pts**

### Ejemplo 2: Urgencia médica 2h madrugada 0 hijos
6 (base) × 1.2 (alto impacto) × 1.6 (madrugada) × 1.0 (duración 0-3h) × 1.0 (sin hijos) = **11.52 pts → 11.5 pts**

### Ejemplo 3: Cocina (tarea recurrente)
2.0 (base) × 1.0 (necesaria) × 1.0 (rango) × 1.0 (duración) × 1.0 (base) = **2.0 pts**

## Compensaciones

Descuentos en puntos de evento. Aplicar como multiplicador post-cálculo.

- Compensación: 20% descuento → multiplicador 0.8
- Descuento: multiplicador customizable

## Negociación

- Free plan: máx 2 rondas
- Premium: ilimitadas
- Sin acuerdo: proposer fuerza, paga de saldo propio
```

- [ ] **Step 2: Commit**

```bash
git add docs/PUNTOS.md
git commit -m "docs: create PUNTOS.md reference (points system)"
```

---

### Task 3: Create API.md Reference

**Files:**
- Create: `docs/API.md`

- [ ] **Step 1: Write API.md**

Create `docs/API.md` with all endpoints from CLAUDE.md's "API ROUTES" section, expanded with:
- Full request/response bodies
- Error codes
- Auth requirements
- Query parameters

Extract from existing `src/backend/src/routes/*.ts` files and consolidate.

Outline:
```
# API Endpoints Reference

## Auth (/api/auth)
- POST /signup — [body, response, errors]
- POST /login — [body, response, errors]
- POST /invite — [body, response, errors]
- POST /accept-invite — [body, response, errors]
- ... (all 7 auth endpoints)

## Events (/api/events)
- GET / — [query params, response]
- POST / — [body, response]
- GET /:id
- ... (all event endpoints)

## Tasks (/api/tasks)
... (all task endpoints)

## Points, Negotiations, Notifications, Config, Profile, Achievements, Calendar, Analytics
... (all organized by resource)
```

- [ ] **Step 2: Commit**

```bash
git add docs/API.md
git commit -m "docs: create API.md reference (all endpoints)"
```

---

### Task 4: Create FLUJOS.md Reference

**Files:**
- Create: `docs/FLUJOS.md`

- [ ] **Step 1: Write FLUJOS.md**

Create `docs/FLUJOS.md` with step-by-step UX flows:

```
# Flujos de Usuario — Referencia Completa

## Flujo 1: Registro y Onboarding

1. Usuario hace click "Sign Up"
2. Página /signup con form (email, password, name, language)
3. POST /auth/signup → User creado, token guardado
4. Redirect a /onboarding
5. Step 1: Family (# hijos, mascotas)
6. Step 2: Work (horas, modo)
7. Step 3: Preferences (tareas love/dislike)
8. Step 4: Summary + botón "Start"
9. User.hasCompletedOnboarding = true

## Flujo 2: Invitar Pareja (Email)

1. User 1 abre /settings → "Add Partner"
2. Input email pareja → POST /auth/invite
3. Backend: crea Invitation, genera token
4. Frontend: muestra link copiable
5. User 2 recibe link o email
6. Click link → /onboarding/join?token=XXX&email=YYY
7. Página pre-llena email, pide password + name
8. POST /auth/accept-invite → Couple creado, ambos vinculados

## Flujo 3: Proponer Pareja (Usuario Diferente)

1. User 1 ya registrado
2. User 2 se registra independientemente
3. User 2 abre /settings → "Find Partner"
4. Input email User 1 → POST /auth/propose-partner
5. User 1 ve notificación: "User 2 wants to be your partner"
6. User 1 click "Accept" → POST /auth/accept-proposal
7. Couple creado, ambos vinculados

...
```

- [ ] **Step 2: Commit**

```bash
git add docs/FLUJOS.md
git commit -m "docs: create FLUJOS.md reference (user flows)"
```

---

### Task 5: Create DATOS.md Reference

**Files:**
- Create: `docs/DATOS.md`

- [ ] **Step 1: Write DATOS.md**

Create `docs/DATOS.md` with Prisma schema reference:

```
# Modelo de Datos — Referencia Completa

## Entidades Core

### Couple
- id: cuid
- secretKey: unique string
- numChildren: int
- language: string (es, en, etc.)
- users: User[] (exactly 2)
- events, tasks, points: relations
- createdAt: DateTime

### User
- id: cuid
- coupleId: string (nullable — NULL = single user)
- email: unique string
- passwordHash: string
- name: string
- roleInHome: enum (parent1, parent2, equal)
- hasCompletedOnboarding: boolean
- invitationsSent: Invitation[]
- invitationsReceived: Invitation[]

### Event
- id, coupleId, createdBy→User
- type: string (dinner, trip, help, anniversary, etc.)
- dateStart, dateEnd: DateTime
- numChildren, pointsBase, pointsCalculated, pointsAgreed: Decimal
- status: (draft, pending, accepted, rejected, forced)
- negotiationHistory: JSON
- compensation, compensationDiscount: optional

### Task
- id, coupleId, name, category
- pointsBase: Decimal
- isDefault: boolean

### TaskLog
- id, coupleId, taskId→Task, completedBy→User
- date: DateTime
- pointsBase, modifier, modifierValue, pointsFinal: Decimal
- status: (pending, verified, disputed)
- verifiedBy, verifiedAt: optional

### Invitation
- id, fromUserId→User, toEmail (nullable), toUserId→User (nullable)
- token: unique
- type: (email_invite, user_proposal)
- status: (pending, accepted, rejected)
- expiresAt: DateTime
- coupleId: nullable

...
```

- [ ] **Step 2: Commit**

```bash
git add docs/DATOS.md
git commit -m "docs: create DATOS.md reference (data model)"
```

---

### Task 6: Archive Historical Files

**Files:**
- Move multiple files to `archive/`

- [ ] **Step 1: Create archive directory**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
mkdir -p archive
```

- [ ] **Step 2: Move historical files**

```bash
# Find all files to archive
cd "/Users/edu/Web development/Claude/Matripuntos"

# Move PHASE reports
git mv PHASE1_COMPLETE.md archive/ 2>/dev/null || true
git mv PHASE1_VERIFICATION.md archive/ 2>/dev/null || true
git mv PHASE2_COMPLETE.md archive/ 2>/dev/null || true
git mv V1_PROGRESS_REPORT.md archive/ 2>/dev/null || true
git mv V2_PROGRESS_REPORT.md archive/ 2>/dev/null || true

# Move testing guides
git mv *TESTING_GUIDE.md archive/ 2>/dev/null || true
git mv TESTING_CHECKLIST.md archive/ 2>/dev/null || true
git mv DEMO_*.md archive/ 2>/dev/null || true
git mv LISTO_*.md archive/ 2>/dev/null || true
git mv TEST_API.md archive/ 2>/dev/null || true

# Move setup files
git mv *.sh archive/ 2>/dev/null || true
git mv *.bat archive/ 2>/dev/null || true

# Move other start guides
git mv START_HERE.md archive/ 2>/dev/null || true
git mv QUICK_START.md archive/ 2>/dev/null || true
git mv INDICE_MAESTRO.md archive/ 2>/dev/null || true
```

- [ ] **Step 3: Check what was moved**

```bash
ls -la archive/ | head -20
```

- [ ] **Step 4: Commit**

```bash
git add archive/
git commit -m "docs: archive historical files (phase reports, testing guides, setup scripts)"
```

---

### Task 7: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README**

Replace README.md content with concise quickstart, referencing new structure:

```markdown
# Matripuntos

Aplicación gamificada para parejas: gestión equitativa de responsabilidades del hogar mediante puntos negociables.

## Inicio Rápido

### Requisitos
- Node.js 18+
- npm
- SQLite (incluido)

### Desarrollo

**Backend (puerto 3000):**
```bash
cd src/backend
npm install
npm run dev
```

**Frontend (puerto 5173):**
```bash
cd src/frontend
npm install
npm run dev
```

Abre http://localhost:5173

### Para Claude: Ver CLAUDE.md

Toda la información por sesión está en [CLAUDE.md](CLAUDE.md).

Para profundidad, ver:
- [docs/PUNTOS.md](docs/PUNTOS.md) — Sistema de puntos
- [docs/API.md](docs/API.md) — Endpoints
- [docs/FLUJOS.md](docs/FLUJOS.md) — Flujos UX
- [docs/DATOS.md](docs/DATOS.md) — Modelo datos

### Stack

- **Frontend:** React 18 + TypeScript + Tailwind + Zustand + React Query
- **Backend:** Node.js + Express + Prisma + SQLite
- **Deploy:** Vercel (frontend) + Railway (backend) + Supabase (DB prod)

### Licencia

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with new structure and references"
```

---

## Success Criteria for Phase 3.2

✅ **Documentation:**
- [ ] CLAUDE.md exists at repo root (~200 lines)
- [ ] docs/PUNTOS.md is comprehensive (points system, examples, multipliers)
- [ ] docs/API.md lists all endpoints with details
- [ ] docs/FLUJOS.md covers all user journeys
- [ ] docs/DATOS.md has complete Prisma schema reference
- [ ] /archive/ contains all historical files
- [ ] README.md is concise and references new structure
- [ ] No "TBD" or placeholders remain
- [ ] Session context reduced by ~80% (fewer files to load)

---

## Notes

- This is independent of auth refactor — can run in parallel
- No code changes, purely documentation reorganization
- Historical files preserved in archive for reference but not loaded by default
