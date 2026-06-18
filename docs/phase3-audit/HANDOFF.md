# HANDOFF — Phase 3 deep refactor (lanzar tras /clear)

> Este doc es el punto de entrada para una sesión nueva. Si acabas de hacer `/clear`,
> lee esto y actúa; no necesitas re-explorar nada.

## Estado actual (preparado, sin lanzar todavía)
- **Rama de trabajo:** `refactor/opus-4-8-phase3` (creada desde `main`). Los agentes
  editan y commitean AQUÍ. Se mergea a `main` solo tras QA del usuario en browser.
- **graphify:** instalado (CLI en `~/.local/bin`, requiere `export PATH="$HOME/.local/bin:$PATH"`).
  Grafo de `src/` en `graphify-out/graph.json` (2047 nodos). Consulta: `graphify query "..."`.
- **Plan completo:** `docs/PHASE3_REFACTOR_PLAN.md`.
- **Script del workflow:** `scripts/workflows/phase3-deep-refactor.js` (self-contained, idempotente).

## Ritual de lanzamiento (lo que hace el usuario)
1. `/clear`
2. `/effort` → **ultracode** (imprescindible: el `Workflow` tool requiere ese opt-in).
3. Escribe: **"lanza"** (o "lanza el workflow phase3").

## Lo que debe hacer Claude al recibir "lanza"
1. Confirmar rama: `git branch --show-current` → debe ser `refactor/opus-4-8-phase3`
   (si no, `git checkout refactor/opus-4-8-phase3`).
2. Lanzar el workflow:
   `Workflow({ scriptPath: "scripts/workflows/phase3-deep-refactor.js" })`
3. Es background: llega `<task-notification>` al terminar. Al acabar, resumir
   hallazgos + fixes aplicados y decir al usuario que QA-ee la rama en el browser.

## Resiliencia (corte de tokens / cierre a media corrida)
El diseño NO obliga a reempezar:
- **Auditoría (Fase A):** cada dominio escribe `docs/phase3-audit/<key>.json`. Al
  relanzar, el agente detecta el fichero y lo devuelve sin re-auditar.
- **Hallazgos confirmados:** en `docs/phase3-audit/confirmed-findings.json`.
- **Fixes (Fase C):** serializados, **1 commit por fix** con marcador `[p3:<id>]`.
  Al relanzar, cada fix hace `git log | grep [p3:<id>]`; si ya está, lo salta.
- El bucle de fixes para con gracia si quedan <60k tokens de presupuesto; lo
  commiteado persiste y un relanzamiento retoma el resto.

### Reanudar exactamente (dos vías)
- **Misma sesión** (sin /clear), tras un corte: usar el `runId` que devolvió el
  Workflow → `Workflow({ scriptPath, resumeFromRunId: "<runId>" })` (cachea el prefijo).
- **Sesión nueva** (tras /clear) o si no hay runId: relanzar normal
  `Workflow({ scriptPath })` — la idempotencia (ficheros + commits `[p3:<id>]`)
  evita repetir trabajo. Apunta aquí el último runId conocido:

  **Último runId:** _(ninguno todavía — se anota al primer lanzamiento)_

## Fases del workflow
A. **Audit** — 5 dominios en paralelo (read-only): A2 tareas-solas, A3 responsiveness,
   A1 lógica 2-usuarios/seguridad, A4 funcionalidad, A5 calidad/dead-code.
B. **Verify** — verificación adversarial por hallazgo (descarta falsos positivos).
C. **Fix** — arreglo serializado por olas (W1 bugs que duelen → W2 seguridad →
   W3 funcionalidad → W4 calidad), puertas type-check/test/build, 1 commit por fix.

## Al terminar (usuario)
1. QA en browser de la rama `refactor/opus-4-8-phase3` (arrancar back+front, ver
   Tareas/Responsabilidades, probar flujo 2 usuarios, comprobar que no aparecen
   tareas solas).
2. Si OK: merge a `main`. Si hay regresiones: reportar y se itera en la rama.
