# Phase 3 deep refactor — COMPLETADO (pendiente QA + merge)

> Corrida `wf_04e82c27-30e` (lanzada 2026-06-18, sesión ultracode). Auditoría
> profunda en olas → verificación adversarial → arreglo serializado. La corrida
> se cortó a mitad de la Fase C por límite de sesión (reset 21:00 Madrid) y se
> reanudó (`resumeFromRunId`) tras el reset. Todo cerrado.

## Resultado
- **34 hallazgos** auditados · **25 confirmados** reales (tras verificación adversarial).
- **23 fixes commiteados** (`[p3:<id>]`): 22 por agentes + **A1-1 recuperado a mano**
  (el agente lo dejó editado pero murió por el límite antes de commitear; verificado
  type-check OK y commiteado como `b78c094`).
- **2 no-op correctos** (A2-4, A2-5): hallazgos de *descarte* S3 — verificado que NO
  hay bug, no procede cambio (no se fabricó commit).
- **0 pendientes.**

## Puertas de verificación (estado acumulado, no por-fix)
- Backend `tsc --noEmit`: **exit 0** ✓
- Frontend `tsc --noEmit`: **exit 0** ✓
- Frontend `npm run build` (vite + PWA): **OK** ✓
- Backend `npm test`: **595 passed / 36 failed**. Los 36 fallos = las **6 suites
  DB-bound** (`emailService`, `analyticsService`, `anniversaryService`,
  `gamificationService`, `redBalanceService`, `achievementEngine`) que requieren
  Postgres (local es SQLite) — **baseline conocido, NO regresión**. El paso de
  610→595 passed es por la retirada de dead-code (A5-4/5/6) que se llevó sus tests.

## ⚠️ Hallazgo separado (pre-existente, NO causado por este refactor)
La **suite de tests del frontend (Vitest) está 100% roja**: 40/40 ficheros, 169/169
tests fallan, 2 errores (incl. "Rendered more hooks than during the previous render"
en `ActivityDetail.test.tsx`). **Verificado con checkout a `8fe2820` (commit previo a
todos los fixes p3): falla idéntico.** Es un fallo global de setup de tests que
**ya existía antes de esta sesión** — el refactor no introdujo ninguna regresión de
test frontend (no había suite verde que romper). Las puertas del workflow eran
`tsc + build` (que sí pasan), no Vitest. **Recomendación:** abrir tarea aparte para
arreglar el setup de Vitest del frontend (no hay red de seguridad de tests de UI ahora).

## Fixes aplicados por ola

### W1 — Bug que duele
- `A2-3` `61006bf` — **bug "tareas que se crean solas"**: reset de `occurrenceCount`
  en `POST /tasks/:id/resume` (taskRoutes). Los ciclos pausa/reanuda inflaban el
  contador y `computeInstancesToCreate` suprimía la generación legítima (causa raíz
  del presupuesto `maxOccurrences` corrupto). Vectores A2-1/A2-2 quedan documentados
  como cursor real de placeholders (ver notas en confirmed-findings.json).

### W2 — Seguridad / lógica 2-usuarios
- `A1-1` `b78c094` — delete-cuenta y salir-de-pareja no invalidaban la auth-cache
  (TTL 60s) ni revocaban refresh tokens → acceso residual ~60s. Ahora `invalidateAuthCache`
  + `revokeAllForUser`; `dissolveCouple` devuelve los IDs reasignados.
- `A1-2` `36e17b6` — negociación V1: el proponente podía responder a su propia ronda
  (auto-resolver sin consenso). Guard `proposedBy === userId` → 403.
- `A1-3` `345a3c4` — rotación de refresh token ahora atómica (`$transaction` +
  `updateMany` guard); race revoke/issue cerrada, reuse-detection robusta.
- `A1-4` `11f088d` — TOCTOU en el cap de miembros de pareja (accept-invitation y
  accept-link-partner): check+move dentro de `$transaction` Serializable → 409 si lleno.

### W4 — Calidad / arquitectura
- `A5-1` `107c591` — **IDOR cross-couple (S1)** al aceptar propuesta `category_edit`:
  `category.update` ahora scopeado por `coupleId` + payload validado con Zod.
- `A5-2` `1dfdbde` — N+1 en `checkAllAchievements`: couple cacheado 1× + upsert solo
  si cambia el progreso (hot path de tareas/negociación).
- `A5-3` `728a4df` — validación Zod en `POST /api/rules/propose` y `PUT /:id/respond`.
- `A5-4` `974b995` — retirado `achievementEngineV2` + `achievementCatalog` + su test
  (experimento abandonado, no cableado; NO duplica el motor real).
- `A5-5` `53d8823` — `POST /api/achievements/check` gateado tras
  `LEGACY_ACHIEVEMENTS_ENABLED` (410 por defecto); GET V1 intactos (no se borra V1).
- `A5-6` `fd845d9` — eliminado cliente V1 analytics muerto del barrel; ruta backend
  marcada para sunset.

### W3 — Funcionalidad end-to-end
- `A4-1` `a7f67f9` — badge de racha del Dashboard nunca aparecía (leía `CoupleStreak`,
  tabla sin writes); ahora lee la fuente real (`Couple.dailyStreakDays/...`).
- `A4-2` `6a041a5` — reacciones del diario ahora alternables (toggle on/off), no add-only.
- `A4-3` `6c7d9be` — tipo `LevelInfo` del frontend sincronizado con el contrato real
  de `/gamification-v2/level` (quita `perks`, añade `levelOrdinal`/`emoji`/`progressPct`).
- `A4-4` `9846741` — retirados métodos huérfanos de reset de saldo del client (sin UI).
- `A4-5` `41398f9` — retirado hook `useLevel` muerto (sin consumidor).

## Para el usuario (siguiente paso)
1. **QA en browser** de la rama `refactor/opus-4-8-phase3`: arrancar back+front,
   y probar sobre todo:
   - **Tareas/Responsabilidades**: responsiveness en móvil (sheets con scroll, tap
     targets, 320px), pausar/reanudar una tarea recurrente y confirmar que NO se
     repueblan placeholders raros (A2-3).
   - **Flujo 2 usuarios**: negociación (no auto-responder), salir de pareja / borrar
     cuenta (sesión cae de inmediato), aceptar invitación con 2 a la vez.
   - **Dashboard**: badge de racha visible; nivel correcto.
   - **Diario**: quitar/poner reacción.
2. Si OK → **merge a `main`**. Si hay regresiones → reportar y se itera en la rama.
3. (Aparte) Considerar arreglar la suite Vitest del frontend (rota desde antes).
