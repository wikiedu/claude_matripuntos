# FABLE_REFACTOR_BRIEF — work-order quirúrgico, token-óptimo

> **Para qué:** este archivo es el **único contexto** que necesita el modelo
> `claude-fable-5` para ejecutar el refactor final de Matripuntos sin explorar el
> repo. Está "masticado": cada tarea trae archivo:línea, el fix, el comando de
> verificación y el commit. **Objetivo: máximo arreglo / mínimo token.**
>
> **Regla de oro de coste:** NO leas `CLAUDE_AUDIT.md` (auditoría completa, ~250
> hallazgos) ni `CLAUDE.md` entero salvo que una tarea lo pida. Todo lo que
> necesitas para el 90% del trabajo está aquí. Lee solo los archivos citados en
> la tarea que tengas entre manos.

---

## 0. Cómo se usa (flujo del operador, Edu)

1. En Claude Code: `/model` → `claude-fable-5`. Opcional `/effort` (ver §6).
2. Pega el **prompt de arranque** (§5) sustituyendo `<TAREA>` por una fila de §4.
3. **Una tarea por sesión.** Al cerrar cada tarea: `/clear` y siguiente. Esto
   mantiene la ventana pequeña → barato y preciso.
4. Fable commitea cada pieza y actualiza `TODO_REFACTOR.md`. Tú revisas el diff.

**Por qué una-tarea-por-sesión gana en tokens:** el coste crece con el tamaño de
la ventana en cada turno. Sesiones cortas y enfocadas con contexto pre-cargado
(este brief) baten a una sesión larga que explora. El brief es el ahorro.

---

## 1. Contexto mínimo (no necesitas más para empezar)

**Stack real** (verificado, no asumir otra cosa):
- Frontend: **Vite 5 + React 18 + TS (`strict:true`)** SPA. NO Next.js, NO SSR.
  `react-router-dom` 6. Zustand (auth/couple) + React Query (server state).
  Tailwind. Contenedor mobile-first `max-w-[500px]`. Puerto 5173.
- Backend: **Express 4 + TS (`strict:true`) ESM + Prisma 5**. Puerto 3000.
  Postgres en prod (Supabase como host, **sin RLS**), SQLite en local.
  Logger `pino` (`src/lib/logger.ts`) — NO `console.*`.
- Monorepo: `packages/shared` (Zod schemas back↔front, se compila primero).
- Sync A↔B = **polling** React Query 30s + `setInterval` 60s. NO hay realtime.

**Los 3 archivos core (si los tocas, tocas el corazón — cuidado):**
- `src/backend/src/server.ts` — Express app, monta 36 rutas, rate limiters, crons.
- `src/backend/src/middleware/authMiddleware.ts` — JWT → `req.userId`/`req.coupleId`.
  **Único aislamiento entre parejas** (filtro `coupleId` a nivel app, sin RLS debajo).
- `src/frontend/src/layout/AuthedLayout.tsx` — motor de polling/sincronización.

**Convenciones (cúmplelas, no las redescubras):**
- Prisma **singleton**: `import prisma from '../lib/prisma.js'`. NUNCA `new PrismaClient()`.
- Auth en handlers: `requireAuth(req).userId` / `.coupleId` (helper tipado, ya existe).
- Errores: `res.status(4xx).json({ error: 'mensaje legible' })`.
- Imports ESM con extensión `.js` (aunque el archivo sea `.ts`).
- Commits convencionales `feat:`/`fix:`/`refactor:`/`docs:`. Una pieza lógica por commit.
- Cierre de commit: línea `Co-Authored-By: claude-flow <ruv@ruv.net>`.

---

## 2. NO TOCAR (evita scope creep — esto YA está bien)

- Aislamiento por `coupleId` a nivel app. No migrar a RLS "de paso".
- Singleton de Prisma (`lib/prisma.ts`).
- Fórmula de puntos (`services/pointsCalculator.ts`, con tests). Fuente única.
- Concurrencia de negociación (`negotiationEngine.ts`: `$transaction` + status guards).
  Es correcta y sutil; romperla es fácil.
- Patrón mobile-first Tailwind (`max-w-[500px]`, base + `sm:`/`md:`). No invertir a desktop-first.
- Estructura por verticales de dominio (routes/services/hooks/components por feature).
- `validateEnv` fail-fast de env vars.
- Rutas V1 (MVP). **No eliminar V1.** (Las V2 deprecadas sí, pero con red — ver T3.)

---

## 3. Reglas de ejecución (idénticas para toda tarea)

```bash
# Backend (la mayoría de tareas)
cd src/backend
npx prisma generate          # checkout fresco lo necesita antes del type-check
npm run type-check           # tsc --noEmit → DEBE dar 0 errores
npm run test:e2e             # Postgres embebido, sin Docker. DEBE: 4 suites / 11 tests verdes
```
- **Antes de CADA commit:** `type-check` 0 + `test:e2e` verde. Sin excepciones.
- Si una tarea toca frontend, el E2E NO cubre UI → verificación manual o Playwright;
  dilo explícitamente en el commit ("verificado a mano / no cubierto por E2E").
- Si te bloqueas, **no improvises arquitectura**: anota el bloqueo en
  `TODO_REFACTOR.md` (qué, por qué bloquea, decisión, riesgo) y para.
- Deuda de infra conocida (no la "arregles de paso", solo tenla presente):
  migraciones era-SQLite no recrean Postgres limpio (prod usa baseline/reconcile);
  24 unit tests DB-bound siguen rojos (fuera de alcance del harness E2E).

---

## 4. Backlog quirúrgico (lo que queda — ordenado por valor/riesgo)

> Origen: Top 10 del audit ya ejecutado. **Hecho:** #1 IDOR, #2 viewport, #3 push
> (desactivado), #4 CLAUDE.md, #5 baseline, #6 logger pino, #7 timers,
> strict:true, #9 (código). **Queda lo de abajo.**

| T | Tarea | Archivos clave | Fix en una línea | Esf | Riesgo |
|---|---|---|---|---|---|
| **T1** | Activar refresh + JWT corto (final) | env Render | setear `JWT_ACCESS_EXPIRY=15m` + verificar refresh-on-401 en prod | 1 | 2 |
| **T2** | Descomponer `Tasks.tsx` (god-component) | `src/frontend/src/pages/Tasks.tsx` (~775 ln, fn `Tasks()` 357-1132) | extraer lista/filtros/modales a archivos propios + memoizar 10+ handlers inline | 4 | 3 |
| **T3** | Retirar V2 negociación deprecada | `routes/negotiation.ts`, `EventNegotiationCard.tsx`, `apiClient.ts` (`negotiation.*` 680-700), `Calendar.tsx:450` | migrar el card a API canónica V1 `/api/negotiations` (negotiationId-based) + reescribir E2E flujo #3, LUEGO borrar `negotiation.ts` + su `app.use` en server.ts | 4 | 4 |
| **T4** | PWA Fase 1 (manifest + SW + reactivar push) | `public/`, `index.html`, `vite.config`, `hooks/useWebPush.ts` (flag `WEB_PUSH_ENABLED=false`) | `vite-plugin-pwa`/Workbox: crear `manifest.webmanifest` + SW real con handler push, metas `apple-mobile-web-app-*` + `theme-color`, flag a `true` | 3 | 2 |
| **T5** | Imágenes prueba → object storage | `proof/TaskProofUploader.tsx:54,72`, `schema.prisma` (`proofImageUrl`), `routes/taskProof.ts` | sacar base64 de Postgres → Supabase Storage/S3, guardar solo URL. **Confirmar antes si la feature se usa de verdad** (si no, desactivar flag y cerrar) | 4 | 3 |
| ~~**T6**~~ | ~~God-service `apiClient.ts`~~ ✅ HECHO — core en `services/api/http.ts` + 12 módulos de dominio, fachada intacta | `src/frontend/src/services/apiClient.ts` | dividir por dominio (auth/tasks/events/...) manteniendo el interceptor JWT/refresh único | 3 | 2 |
| ~~**T7**~~ | ~~Helper JSON-en-SQLite~~ ✅ HECHO — `lib/jsonField.ts`, 36 callsites sustituidos | backend global | `parseJsonField`/`stringifyJsonField` en un util, sustituir callsites | 2 | 1 |
| **T8** | N+1 recurrente semanal (baja) | `services/recurringTaskService.ts:140` | `createMany` por couple en vez de loop por task | 2 | 2 |

**Notas por tarea:**
- **T1** es env, no código (el código ya lo soporta tras commit `f3c9688`). Es lo
  primero porque cierra seguridad con esfuerzo ~0. Solo verificación en prod.
- **T2 y T3 son los dos grandes.** Hazlos con TDD/verificación reforzada (§6).
  T3 **no se puede empezar borrando** `negotiation.ts`: primero el reemplazo + E2E,
  luego el borrado. El IDOR ya está cerrado, así que no hay prisa de seguridad.
- **T5**: pregunta a Edu si la feature de imagen-prueba se usa antes de invertir.
- T6/T7/T8 son limpieza de bajo riesgo, ideales para "calentar" o cerrar huecos.

---

## 5. Prompt de arranque (pegar tal cual, sustituir `<TAREA>`)

```
Eres el ejecutor del refactor final de Matripuntos (rama refactor/opus-4-8).
Lee SOLO: docs/FABLE_REFACTOR_BRIEF.md (este brief) y los archivos citados en la
fila <TAREA> de su §4. NO leas el audit completo ni CLAUDE.md entero salvo que la
tarea lo exija — optimiza tokens.

Tarea de esta sesión: <TAREA>  (p.ej. "T2 — descomponer Tasks.tsx")

Reglas (del brief §2 y §3):
- Respeta la lista NO TOCAR (§2). No metas RLS, no toques la fórmula de puntos ni
  la concurrencia de negociación, no elimines V1.
- Una pieza lógica por commit. Antes de cada commit: `npm run type-check` (0) +
  `npm run test:e2e` (4 suites/11 verdes) en src/backend. Si tocas frontend, dilo
  (E2E no cubre UI) y verifica a mano.
- Si te bloqueas, anota el bloqueo en TODO_REFACTOR.md y para — no improvises
  arquitectura.
- Documenta lo hecho en TODO_REFACTOR.md (mueve la tarea de Pendiente a Hecho).
- Cierra cada commit con: Co-Authored-By: claude-flow <ruv@ruv.net>

Empieza confirmando en 2 líneas tu plan para <TAREA>, luego ejecútalo.
```

---

## 6. Nivel de esfuerzo recomendado (respuesta a "¿qué effort?")

El nivel óptimo **depende de la tarea**, no es uno global. Recomendación:

| Tarea | `/effort` | Por qué |
|---|---|---|
| T1 (env) | **low** | No es código; es setear una var y verificar. Pensar poco. |
| T6, T7, T8 | **medium** | Mecánico y de bajo riesgo; el brief ya da el qué. Sin sobre-análisis. |
| T4 (PWA) | **medium** | Camino conocido (`vite-plugin-pwa`); medium basta. |
| **T2, T3** | **high** | Refactor estructural con riesgo 3-4 y juicio de diseño. Aquí sí pagas el coste extra: más tests, más verificación, menos regresiones. |
| T5 | **medium** (high si se confirma que se implementa) | Necesita decisión de infra + Edu primero. |

**Regla simple:** `low/medium` cuando el brief ya hizo el pensar (tareas masticadas);
`high` solo donde queda juicio arquitectónico real (T2, T3). Subir el effort en las
mecánicas quema tokens sin mejorar el resultado — el ahorro está en no sobre-pensar
lo que ya viene resuelto aquí.

**¿"Upgrade impresionante" con este enfoque?** Sí, pero el salto no viene del
modelo: viene de (1) este brief que elimina la exploración, (2) una-tarea-por-sesión
que mantiene la ventana barata, y (3) effort calibrado por tarea. El modelo es el
multiplicador; el contexto masticado es la palanca.

---

*Mantenimiento: cuando una T se cierre, muévela a "Hecho" en `TODO_REFACTOR.md` y
táchala en §4. Este brief y `TODO_REFACTOR.md` deben contar la misma historia.*
