# PHASE 3 — Pasada profunda + refactor de calidad (Opus 4.8, agentes en paralelo)

> **Estado:** plan listo para ejecutar. Arranca en cuanto la sesión esté en
> **ultracode** (el `Workflow` tool requiere opt-in explícito). Pre-requisitos ya
> hechos esta sesión: graphify instalado + grafo de `src/` construido
> (`graphify-out/graph.json`), árbol git limpio (tests + audits Fable commiteados).

## 0. Objetivo (palabras del usuario)
Énfasis, por orden:
1. **Funcionalidades** que funcionen de verdad end-to-end.
2. **Backend + lógica entre los dos usuarios conectados** (pareja): aislamiento por
   `coupleId`, negociación, puntos, verificación de tareas, auth/refresh, lifecycle.
3. **Frontend bien** — en especial **responsiveness en Tareas y Responsabilidades**
   ("es un drama").
4. **Bug concreto:** se crean tareas solas en una cuenta sin que el usuario las cree.

## 1. Herramienta de contexto — graphify (token-saving)
- Grafo de `src/` (backend+frontend): **2047 nodos / 3830 edges / 160 comunidades**,
  construido por AST (0 tokens LLM). Salida en `graphify-out/`.
- **Cada agente del workflow consulta el grafo en vez de releer ficheros:**
  - `graphify query "<pregunta>" --budget 1200` → contexto BFS con `file:line`.
  - `graphify explain "<símbolo>"` → vecinos de un nodo.
  - `graphify path "A" "B"` → camino más corto entre dos conceptos.
  - `graphify update src` tras refactors que borran código (re-extrae, sin LLM).
- God nodes (núcleo): `prisma`, `apiClient`, `useAppStore`, `authMiddleware()`,
  `logger`, `AchievementEngine`, `parseJsonField()`.

## 2. Pista ya localizada del bug "tareas solas"
Sospechoso nº1: `src/backend/src/services/recurringTaskService.ts`
- `runWeeklyGeneration()` (L205) — itera **todas** las parejas con tareas
  `isRecurring` y llama `generateInstancesForCouple()` (cron lunes 08:00).
- `generateOnCreate()` (L118) — al crear/actualizar tarea recurrente.
- Otros vectores a descartar: seed de tareas por defecto en signup/onboarding,
  `bootstrapCatalog` / `ACTIVITY_TEMPLATES_SEED` + `runRetention()` (comunidad 6),
  `demoService`. Hay que **reproducir + root-cause**, no parchear a ciegas.

## 3. Diseño del Workflow (auditoría en olas → verificación → arreglo en olas)

### Fase A — AUDITORÍA (agentes en paralelo, read-only, salida estructurada)
Un agente por dominio. Cada uno arranca consultando graphify y devuelve
`findings[]` con `{severity, dominio, file, line, evidencia, fix_propuesto, confianza}`.

- **A1 · Lógica 2-usuarios + seguridad backend** — para CADA ruta/servicio: ¿se
  fuerza scoping por `coupleId`/`userId`? IDOR, fugas PII; integridad de
  `PointsTransaction` (saldo = Σ amount); negociación V1 (rondas, force,
  contraoferta); verify/dispute de TaskLog + auto-accept 24h; rotación de refresh
  tokens + reuse detection; invitación/link-partner; `account`/`couple` lifecycle
  (pause/leave/delete + anonimización).
- **A2 · Bug "tareas solas"** — trazado completo (§2), reproducción y causa raíz.
- **A3 · Responsiveness Tareas + Responsabilidades(Activities)** — `Tasks.tsx`,
  `components/v2/tasks/*`, `Activities.tsx`, `ActivityDetail.tsx`,
  `components/v2/activities/*`: anchos fijos, overflow, breakpoints grid/flex,
  viewport móvil, safe-area, tap targets. Findings con `file:line`.
- **A4 · Funcionalidad end-to-end** — flujos rotos/incompletos por dominio (puntos,
  calendario, journal, logros, shopping/todos, notificaciones, analytics);
  desajustes contrato front↔back (incl. `packages/shared`).
- **A5 · Calidad backend + arquitectura + dead code** — manejo de errores,
  validación Zod faltante, dead code, deuda V1/V2, N+1 restantes.

### Fase B — VERIFICACIÓN (adversarial, por finding)
Cada finding pasa por ≥1 verificador escéptico (prompt: "intenta refutarlo").
Se descartan los no reproducibles. Salida: findings confirmados con severidad final.

### Fase C — ARREGLO EN OLAS (prioridad descendente)
- **W1 — Bugs que duelen:** tareas-solas (A2) + responsiveness (A3).
- **W2 — Lógica 2-usuarios + seguridad (A1):** lo S0/S1 confirmado.
- **W3 — Funcionalidad (A4).**
- **W4 — Calidad/arquitectura (A5).**
Cada arreglo: implementar → verificar → commit lógico. Aislamiento en worktree
solo cuando varios agentes muten en paralelo y choquen; si no, serializado por
fichero. **No tocar V1; retirar V2 deprecada solo con consumidor migrado + E2E**
(regla CLAUDE.md §10).

### Puertas de verificación (obligatorias antes de cada commit)
- Backend: `npm run type-check` (0 errores) · `npm test` (unit verdes; las 6 suites
  DB-bound requieren Postgres/CI — no son regresión).
- Frontend: `tsc` (0) · `vite build` OK.
- E2E: `npm run test:e2e` (4 suites / ~11-12 tests verdes).

## 4. Reglas de sesión aplicables
- Documentar todo · dejar commiteado · optimizar tokens (CLAUDE.md §0).
- Aviso al 75% de contexto → punto de control + preguntar al usuario.
- Acciones destructivas / push --force / DROP → confirmar siempre.

## 5. Cómo se lanza
Con la sesión en **ultracode**, se invoca el `Workflow` tool con un script que
implementa A→B→C (pipeline por dominio, verificación adversarial por finding,
arreglo en olas con puertas de verificación). El script se versiona aparte cuando
se ejecute. Entre olas, el control vuelve al humano para revisar hallazgos.
