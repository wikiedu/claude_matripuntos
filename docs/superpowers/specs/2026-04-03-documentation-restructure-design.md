# Documentation Restructure — Design Spec
**Date:** 2026-04-03  
**Status:** Approved  
**Goal:** Reduce token consumption per session, improve Claude's long-term context quality

---

## Problem

The repo has ~21,873 lines of markdown. Most of it is historical noise: 4 phase completion reports, 3 version progress reports, 10+ setup/demo/testing guides, and 2 overlapping doc systems (`/docs` + `DOCS_COMPLETAS/`). Claude loads this context into every session, wasting tokens and burying signal in noise.

---

## Solution: Enfoque A — "CLAUDE.md Central"

One dense context file for Claude (`CLAUDE.md`) + 4 reference docs + archive for historical files.

---

## Final File Structure

```
Matripuntos/
├── CLAUDE.md                    ← NEW. ~200-250 lines. All Claude needs per session.
├── README.md                    ← UPDATED. Concise quickstart for humans.
├── CHANGELOG.md                 ← UNCHANGED.
│
├── docs/
│   ├── PUNTOS.md                ← Points system: formula, multipliers, examples
│   ├── API.md                   ← All endpoints with params and responses
│   ├── FLUJOS.md                ← Core UX flows (negotiation, tasks, onboarding)
│   └── DATOS.md                 ← Prisma schema summary with key relationships
│   └── superpowers/specs/       ← This file lives here
│
├── archive/                     ← NEW. All historical files moved here.
│   └── (30+ files — see list below)
│
└── src/                         ← UNCHANGED
```

---

## CLAUDE.md Structure

Sections in order of utility per session:

| Section | Lines | Content |
|---------|-------|---------|
| 1. PROYECTO | ~5 | What it is, who for, current status |
| 2. STACK TÉCNICO | ~15 | Frontend/backend/DB with exact versions and ports |
| 3. ESTRUCTURA DE CÓDIGO | ~30 | `src/` tree with what each key file does |
| 4. CÓMO ARRANCAR | ~10 | Exact dev/build commands |
| 5. BASE DE DATOS | ~40 | Key Prisma models with critical fields |
| 6. API ROUTES | ~40 | All endpoints organized by resource |
| 7. SISTEMA DE PUNTOS | ~25 | Formula + multipliers + 2 examples |
| 8. REGLAS DE NEGOCIO | ~20 | Negotiation rounds, compensations, auto-accept |
| 9. ESTADO ACTUAL | ~10 | What's done (MVP), what's pending (roadmap) |
| 10. CONVENCIONES | ~10 | Code patterns, naming, key decisions |

**Total target: ~205 lines** (dense, no narrative prose)

---

## docs/ Reference Files

Each file is an expanded version of the relevant CLAUDE.md section, for when deep context is needed:

- **PUNTOS.md** — Full points table (tasks + activities), all multipliers, 3 worked examples, compensations
- **API.md** — Every endpoint: method, path, auth required, request body, response shape, error codes
- **FLUJOS.md** — Step-by-step UX flows: event negotiation, task log, onboarding, notifications
- **DATOS.md** — Full Prisma schema (models + relations + indexes) as readable reference

These replace `docs/TABLA_PUNTOS.md`, `docs/FLUJOS_UX.md`, `docs/MODELO_DATOS.md`, `docs/PANTALLAS_MVP.md`, `docs/MONETIZACION.md`, `docs/MVP_COMPLETADO.md` and the entire `DOCS_COMPLETAS/` folder.

---

## Files to Archive

Move to `archive/` (preserve but remove from root):

**Phase/progress reports (historical):**
- PHASE1_COMPLETE.md, PHASE2_COMPLETE.md, PHASE3_COMPLETE.md, PHASE4_COMPLETE.md
- V2_PROGRESS_REPORT.md, V3_PROGRESS_REPORT.md, V4_FINAL_PROGRESS.md
- PROGRESS_UPDATE.md, PROGRESS_SUMMARY.md

**Testing/demo guides (no longer relevant):**
- PHASE1_TESTING_GUIDE.md, PHASE3_TESTING_GUIDE.md
- TESTING_CHECKLIST.md, CHECKLIST_FINAL.txt
- DEMO_READY.md, DEMO_SCRIPT.js
- LISTO_PARA_PROBAR.md, TEST_API.md

**Setup/fix logs (one-time, done):**
- FIXES_APPLIED.txt, SETUP_FIXES.md, SETUP_SCRIPT.sh
- COPY_PASTE_SETUP.sh, setup.sh, setup.bat
- run-backend.sh, run-frontend.sh

**Redundant entry points (replaced by README):**
- START_HERE.md, INICIO_AQUI.md
- QUICK_START.md, QUICKSTART.md, GETTING_STARTED.md
- INDICE_MAESTRO.md

**Implementation/change logs (historical):**
- CAMBIOS_REALIZADOS.md, RESUMEN_CORRECCIONES.txt
- RESUMEN_IMPLEMENTACION_FINAL.txt, ANTES_Y_DESPUES.txt
- FILES_COMPLETE_SUMMARY.md, FILES_MODIFIED_SUMMARY.md
- IMPLEMENTATION_PLAN.md, PROJECT_STATUS.md, ESTADO_FINAL.md

**Superseded specs:**
- MATRIPUNTOS_V2_SPEC.md (content absorbed into CLAUDE.md + docs/)
- DOCS_COMPLETAS/ (entire folder — 10 files, all absorbed)

**Old docs/ files (replaced by new docs/):**
- docs/TABLA_PUNTOS.md → docs/PUNTOS.md
- docs/FLUJOS_UX.md → docs/FLUJOS.md
- docs/MODELO_DATOS.md → docs/DATOS.md
- docs/PANTALLAS_MVP.md → archived
- docs/MONETIZACION.md → archived
- docs/MVP_COMPLETADO.md → archived

---

## Success Criteria

- [ ] CLAUDE.md loads complete project context in <250 lines
- [ ] No redundant information between CLAUDE.md and docs/ files
- [ ] Root directory has ≤5 markdown files visible (README, CLAUDE, CHANGELOG + docs/)
- [ ] All archived files preserved and findable in `archive/`
- [ ] docs/ has exactly 4 files (PUNTOS, API, FLUJOS, DATOS)
- [ ] README updated to reflect current working state (SQLite local, Vercel/Railway prod)
