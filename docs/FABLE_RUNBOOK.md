# FABLE_RUNBOOK — cómo ejecutar el refactor final con `claude-fable-5`

> Runbook operativo para Edu. Sobrevive a un `/clear` (por eso es archivo, no chat).
> El **qué** de cada tarea vive en `docs/FABLE_REFACTOR_BRIEF.md`; aquí está el
> **cómo conducir las sesiones**. Una tarea por sesión, ventana pequeña = barato.

---

## Paso 0 — Justo después del `/clear`

Tres comandos (uno por uno):

```
/model claude-fable-5
```
```
/effort medium
```
(Sube a `high` solo en T2 y T3 — ver tabla de orden.)

Confirma la rama:
```
! git -C "/Users/wikimetralla3/Web Development/Claude/Matripuntos" branch --show-current
```
Debe decir `refactor/opus-4-8`.

---

## Paso 1 — Orden de las sesiones

**T1 NO es para Fable**: es ops tuyo (setear `JWT_ACCESS_EXPIRY=15m` en Render +
verificar refresh-on-401 en prod). Hazlo cuando quieras, sin chat.

Sesiones de Fable, una por `/clear`:

| Sesión | Tarea | `/effort` |
|---|---|---|
| 1ª | **T7** — helper JSON-en-SQLite | `medium` |
| 2ª | **T6** — partir `apiClient.ts` god-service | `medium` |
| 3ª | **T8** — N+1 recurrente semanal | `medium` |
| 4ª | **T4** — PWA Fase 1 (manifest + SW + push) | `medium` |
| 5ª | **T2** — descomponer `Tasks.tsx` | **`high`** |
| 6ª | **T3** — retirar V2 negociación | **`high`** |
| aparte | **T5** — imágenes a object storage | preguntar antes si la feature se usa |

Razón del orden: empezar por lo de menor riesgo (T7) valida el flujo del brief
antes de meterse en lo estructural (T2/T3).

---

## Paso 2 — Prompt de la PRIMERA sesión (T7) — copiar entero

```
Eres el ejecutor del refactor final de Matripuntos (rama refactor/opus-4-8).

Lee SOLO estos dos archivos antes de empezar:
- docs/FABLE_REFACTOR_BRIEF.md  (tu work-order completo)
- TODO_REFACTOR.md  (estado vivo: Hecho / Pendiente)

NO leas CLAUDE_AUDIT.md ni CLAUDE.md entero — optimiza tokens; el brief ya tiene
todo lo necesario. Lee del código solo los archivos citados en la tarea.

Tarea de esta sesión: T7 — helper JSON-en-SQLite (§4 del brief).

Reglas (brief §2 y §3, resumidas):
- Respeta la lista NO TOCAR del brief §2.
- Una pieza lógica por commit. Antes de CADA commit, en src/backend:
  npx prisma generate && npm run type-check (0 errores) && npm run test:e2e
  (4 suites / 12 tests verdes). Si tocas frontend, dilo (E2E no cubre UI).
- Si te bloqueas, anota el bloqueo en TODO_REFACTOR.md y para; no improvises
  arquitectura.
- Al terminar: mueve T7 de Pendiente a Hecho en TODO_REFACTOR.md.
- Cierra cada commit con: Co-Authored-By: claude-flow <ruv@ruv.net>

Primero dime en 2 líneas tu plan para T7. Luego ejecútalo.
```

---

## Paso 3 — Plantilla para CADA sesión siguiente

Entre tareas: **`/clear`** → `/model claude-fable-5` → `/effort <medium|high>` →
pegar el mismo prompt cambiando solo esta línea:

```
Tarea de esta sesión: <fila de la tabla, p.ej. "T6 — partir apiClient.ts (§4 del brief)">
```

Para **T2 y T3** (riesgo alto) añade esta línea al prompt:

```
Esta tarea es de riesgo alto: ve test-first, verifica cada paso, y si es T3 NO borres
negotiation.ts hasta tener el reemplazo + el E2E del flujo #3 reescritos y verdes.
```

---

## Paso 4 — Entre sesiones, revisión rápida (tú, 30s)

```
! git -C "/Users/wikimetralla3/Web Development/Claude/Matripuntos" log --oneline -5
! git -C "/Users/wikimetralla3/Web Development/Claude/Matripuntos" status --short
```
- ¿1 commit limpio por tarea? ¿El mensaje cita la T? ¿`status` limpio?
- Si algo huele raro, antes del siguiente `/clear` pide explicación o revertir.

---

## Resumen de una línea

> `/clear` → `/model claude-fable-5` → `/effort <medium|high>` → pegar prompt
> cambiando `Tarea de esta sesión` → dejar trabajar → revisar diff → `/clear` y siguiente.

Archivos que Fable lee al inicio (y solo esos): **`docs/FABLE_REFACTOR_BRIEF.md`**
y **`TODO_REFACTOR.md`**. El resto, bajo demanda según la tarea.
