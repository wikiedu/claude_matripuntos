# Auditoría — Backend Services (`src/backend/src/services/`)

**Fecha:** 2026-05-05
**Alcance:** 41 archivos en `src/backend/src/services/`.
**Auditor:** Subagente lógica de negocio Node/TS.
**Versión auditada:** v2.3.5 (`main`).
**Auditoría previa de referencia:** `docs/audits/2026-05-02-audit-pre-v1.7.md`.

---

## 0. Verificación de hallazgos previos

| ID previo | Estado actual | Evidencia |
|---|---|---|
| **S1-1** `compensationDiscount` no aplicado en pointsCalculator | ✅ **CORREGIDO** | `pointsCalculator.ts:131-134` aplica el factor antes del redondeo. Se aplica también en breakdown (`:154-158`). |
| **S0-3** PostHog no instalado | ✅ **CORREGIDO** | `posthog-node ^4.2.0` declarado en `src/backend/package.json:31` y `posthog-js ^1.181.0` en frontend. Ambos presentes en `node_modules/`. |
| **S0-4** Email reescrito a ghost | ✅ **CORREGIDO** | `accountDeletionService.ts:74` reescribe a `deleted-${userId}@deleted.local` antes de set `deletedAt`. |
| **S1-3** Ghost user duplicable | ⚠️ **PARCIAL** | `accountDeletionService.ts:32-54` usa email determinista `ghost-${coupleId}@deleted.local` y `try/catch` defensivo. Sin embargo, **no existe un UNIQUE compuesto** ni el constraint UNIQUE de email aplica con certeza dentro de `$transaction` en SQLite/Postgres con isolation default — ver S1 abajo. |
| **S1-2** `dataRetentionJob` `lt` vs `lte` | ❌ **NO CORREGIDO** | `src/backend/src/jobs/dataRetentionJob.ts:42` sigue con `lt: userPurgeCutoff`. Fuera de alcance (jobs/), pero confirmado. |

---

## 1. Resumen ejecutivo

| Severidad | Hallazgos | Servicios más afectados |
|---|---|---|
| **S0 — Crítico** | 1 | `negotiationEngine` |
| **S1 — Alto** | 11 | `negotiationEngine`, `accountDeletionService`, `recurrenceService`, `gamificationService`, `webPushService`, `digestService`, `streakService` |
| **S2 — Medio** | 18 | múltiples |
| **S3 — Cosmético** | 9 | múltiples |

**Veredicto:** los hotfix de v1.6.x cerraron los S0/S1 documentados. La nueva pasada destapa una **race condition en `negotiationEngine.respondToProposal` (acceptance flow)** — ya parcialmente mitigada con `updateMany`, pero las fases siguientes (negotiation create + pointsTransaction.create) no están atomicas y permiten saldo duplicado bajo concurrencia. El resto son issues de robustez (TZ, DST, edge cases, errores silenciados, dependencias circulares).

---

## 2. Findings S0

### S0-1 · `negotiationEngine.respondToProposal('accept')` no es transaccional → saldo duplicado posible
- **Archivo:** `src/backend/src/services/negotiationEngine.ts:152-197`
- **Problema:** la guarda `updateMany` previene la doble transición de status (línea 157-167) pero las tres operaciones siguientes ocurren **fuera de una `$transaction`**:
  1. `prisma.event.findUniqueOrThrow` (`:170`)
  2. `prisma.negotiation.create` (`:173-181`)
  3. `prisma.pointsTransaction.create` (`:186-195`)
- Si el proceso muere o la BD falla entre (1) y (3), el evento queda `accepted` sin `PointsTransaction`. Si Render reintenta el request (cliente), una segunda llamada al accept devuelve `Event already resolved`, pero **la transacción de puntos nunca se crea** → saldo perdido permanentemente.
- Adicionalmente, si entre la atomic transition y la creación del `PointsTransaction` un job concurrente recalcula puntos (catalog proposal accept, etc.), el `lastNegotiation.pointsProposed` puede no coincidir con el `pointsAgreed` ya escrito.
- **Riesgo:** divergencia entre `pointsAgreed` del Event y suma de `PointsTransaction` (la fuente real del saldo). Invariante "saldo == suma transacciones" rota.
- **Fix:** envolver toda la rama `accept` en `prisma.$transaction(async tx => { ... })`. Reescribir las creaciones con `tx.*`. Verificar también que `relatedEventId` (UNIQUE en `PointsTransaction`) protege contra inserción doble — añadir test hermético que llame `accept` 2× concurrente y verifique exactamente 1 transacción.
- **Esfuerzo:** 2h + test.

---

## 3. Findings S1

### S1-1 · `negotiationEngine.proposeEvent` no valida que el usuario no sea ya el último proposer (loop)
- **Archivo:** `src/backend/src/services/negotiationEngine.ts:29-106`
- **Problema:** la verificación es `event.createdBy !== proposerUserId` (`:45`). Pero después de una contraoferta (round 2) el `lastProposedBy` es el partner. No hay protección contra que el original creator vuelva a llamar `proposeEvent` y resetee `currentNegotiationRound: 1` (línea 63-66). El partner perdería su contraoferta.
- **Riesgo:** corruption del flujo de negociación; un usuario puede "sobrescribir" la contraoferta del partner.
- **Fix:** verificar `event.status === 'draft'` antes de permitir proposeEvent. Si ya está en `proposed`/`counter_proposal`, rechazar.
- **Esfuerzo:** 30 min + test.

### S1-2 · `negotiationEngine.respondToProposal` permite contraoferta sin validar que NO seas el último proposer
- **Archivo:** `src/backend/src/services/negotiationEngine.ts:220-253` (caso `counter_propose`)
- **Problema:** la única guarda es `event.createdBy === responderId` (`:136`), que solo bloquea al creator inicial. En un flujo donde el partner contraoferta (round 2) y el creator original responde, no hay verificación de que el `responderId` sea distinto al `lastProposedBy` de la contraoferta. Eso permitiría al partner re-contraofertar su propia contraoferta.
- **Riesgo:** aunque la validación `lastNegotiation.roundNumber >= 2` (`:222`) mitiga el caso normal, no protege contra race conditions o flujos con `pending_conversation` intercalado.
- **Fix:** verificar `lastNegotiation.proposedBy !== responderId` antes de aceptar la contraoferta.
- **Esfuerzo:** 30 min.

### S1-3 · `accountDeletionService` ghost user race todavía no resuelta
- **Archivo:** `src/backend/src/services/accountDeletionService.ts:32-54`
- **Problema:** la auditoría previa cerró este como "fixed" porque ahora se usa email determinista. Pero el código sigue dependiendo de:
  1. `findFirst({ coupleId, email: ghostEmail, deletedAt: { not: null } })` (no UNIQUE compuesto)
  2. Un `try/catch` que captura conflict de email y refetcha
- En SQLite con `serializable` no es tan grave; en Postgres con `read committed` (default Supabase), **dentro de una transacción larga**, el `findFirst` de la línea 33 ve un snapshot anterior; la siguiente create podría intentar insertar un email ya existente y caer al catch. El catch sólo refetcha pero no garantiza que la transacción NO continue con `ghost = undefined` si el refetchOrThrow vuelve a fallar (poco probable pero posible bajo tx isolation rare cases).
- Más relevante: el `findFirst` filtra por `deletedAt: { not: null }` mientras el create asigna `deletedAt: new Date()`, pero la consulta no reconoce los registros que estén en otra transacción concurrente.
- **Riesgo:** tx aborta y el primer rollback. En la práctica raro pero documentar.
- **Fix:** sustituir por `prisma.user.upsert({ where: { email: ghostEmail }, ... })`. La unique constraint de email garantiza idempotencia con un solo round-trip a la BD, sin try/catch frágil.
- **Esfuerzo:** 30 min + actualizar test.

### S1-4 · `recurrenceService.advance` con MONTHLY rompe en fin de mes y años bisiestos
- **Archivo:** `src/backend/src/services/recurrenceService.ts:104-105`
- **Problema:** `cursor.setUTCMonth(cursor.getUTCMonth() + rule.interval)` con cursor el 31 de enero produce **3 de marzo** (Date salta el día porque febrero no tiene 31). Lo mismo en años bisiestos con día 29 de febrero. No hay normalización ni manejo de fin-de-mes (clamp).
- Ejemplo concreto: RRULE `FREQ=MONTHLY` con start `2026-01-31` produce: ene 31, mar 3, abr 3, may 3... saltándose febrero, marzo, abril del día correcto.
- **Riesgo:** eventos recurrentes mensuales caen en fechas inesperadas. Ya documentado RFC 5545 §3.3.10 que requiere clamp al último día del mes.
- **Fix:** después de `setUTCMonth`, comprobar si el día se desplazó; si sí, clamp al último día del mes anterior (`new Date(Date.UTC(y, m+1, 0))`).
- **Esfuerzo:** 1h + tests para 31-ene → 28-feb, 29-feb (bisiesto), 31-may → 30-jun.

### S1-5 · `recurrenceService.expandRecurrence` MONTHLY+BYDAY no implementado pero no falla
- **Archivo:** `src/backend/src/services/recurrenceService.ts:75-89`
- **Problema:** `BYDAY` se aplica como filtro en el bucle (`:79-81`) pero el `advance()` para MONTHLY salta de mes en mes; el filtro BYDAY nunca matcheará excepto si el cursor cae justo en el día. Para emular "primer lunes de cada mes" hay que avanzar día a día como en WEEKLY+BYDAY. Sin esa lógica, `FREQ=MONTHLY;BYDAY=MO` devuelve 0 ocurrencias o solo la inicial.
- **Riesgo:** silently-broken feature. Ningún error pero output vacío.
- **Fix:** o documentar que MONTHLY+BYDAY no soportado y rechazar en parse, o implementar con avance diario filtrado por mes objetivo.
- **Esfuerzo:** 1h docs + 3h impl si se quiere soportar.

### S1-6 · `gamificationService.updateDailyStreak` no respeta DST ni timezone del usuario
- **Archivo:** `src/backend/src/services/gamificationService.ts:108-187`
- **Problema:** usa `today.setHours(0,0,0,0)` (línea 116) que es **timezone del proceso** (UTC en Render). Una pareja en Madrid que hace una tarea a las 01:30 hora local (= 23:30 UTC del día anterior) será tratada como del día UTC anterior, rompiendo la racha cuando el user sí estuvo activo "ayer" según su perspectiva.
- En transición DST (último domingo octubre/marzo en Madrid), el cálculo `lastActivity.setHours(0,0,0,0)` puede crear un `yesterday` con offset distinto.
- **Riesgo:** rachas se rompen a las 00:00 UTC (= 02:00 verano Madrid o 01:00 invierno) en lugar de medianoche local. Pareja se queja "tenía 12 días de racha y se reseteó sin motivo".
- **Fix:** usar `Intl.DateTimeFormat` con `couple.timezone` (ya hay `User.timezone` en schema) para extraer dayKey local. Equivalente a lo ya hecho en `notificationDigestService.currentHourMinute`.
- **Esfuerzo:** 2h + test con timezone forzado.

### S1-7 · `webPushService` falla silenciosamente porque `web-push` NO está en `package.json`
- **Archivo:** `src/backend/src/services/webPushService.ts:26-46`
- **Problema:** `import('web-push')` con `.catch(() => null)` enmascara el hecho de que la dependencia **no está declarada en `src/backend/package.json`** (verificado: no aparece). El service vuelve `webPushModule = null` y `sendPushToSubscription` devuelve `{ ok: false, error: 'web-push not configured' }`. Push notifications nunca se envían en producción.
- Mismo patrón que S0-3 PostHog en la auditoría previa, pero esta vez con `web-push`.
- **Verificación:** `grep web-push src/backend/package.json` → vacío. `ls node_modules/web-push` → no existe en root ni backend.
- **Riesgo:** push (toda la feature de v1.7) está rota silenciosamente. El cliente VAPID-subscribe correctamente pero el servidor nunca despacha. `notificationDigestService` consume push y por tanto la feature digest tampoco entrega push.
- **Fix:** añadir `"web-push": "^3.6.7"` + `"@types/web-push": "^3.6.3"` a `src/backend/package.json`. `npm install`. Smoke test que invoque `sendPushToSubscription` con sub falsa y verifique que la importación NO devuelve null.
- **Esfuerzo:** 30 min + verificación CI.

### S1-8 · `digestService.sendWeeklyDigests` cálculo de `weekEnd` incorrecto si hoy es lunes/domingo
- **Archivo:** `src/backend/src/services/digestService.ts:28-35`
- **Problema:**
  ```
  weekEnd.setDate(now.getDate() - now.getDay()) // last Sunday (or today if Sunday)
  ```
  `getDay()` devuelve 0=domingo, 1=lunes, ..., 6=sábado. Si hoy es **lunes**, `now.getDate() - 1` = ayer (domingo) ✓. Si hoy es **martes**, `now.getDate() - 2` = domingo ✓. Si hoy es **domingo**, `now.getDate() - 0` = hoy mismo, lo cual incluye el día actual completo en el "last week" → puede mezclar tareas del día con el digest de la semana pasada.
  Más grave: si el cron corre lunes 06:00, se hace digest de la semana lunes-domingo correcta, pero si por algún retry el cron corre a la 1:00am martes, el cálculo `now.getDate() - 2` baja a domingo, lo cual significa que la "semana" ya no incluye el lunes que pasó; queda un agujero.
- **Riesgo:** digests con datos solapados o agujeros según el día/hora real de ejecución.
- **Fix:** anclar siempre al "lunes 00:00 UTC más reciente menos 7 días" usando `startOfIsoWeek` (ya existe en `challengeService.ts:76`). Reusar.
- **Esfuerzo:** 1h.

### S1-9 · `streakService.recordActivity` weekly logic con `Math.floor((gap)/(7*DAY_MS))` salta semanas en huecos
- **Archivo:** `src/backend/src/services/streakService.ts:79-94`
- **Problema:** la fórmula `weeksSinceLast = Math.floor((now - last)/(7*DAY_MS))` en gaps de >1 semana cuenta múltiples semanas como 1 sola. Si el user no entra durante 3 semanas y vuelve con `weeklyActiveDays >= 3`, suma `+1` al weekly, no resetea. En el comentario de cabecera (`:1-4`) dice que weekly debe ser ≥3 días con actividad en ventana 7d "continuous"; el código no garantiza continuidad: solo mira la semana actual.
- **Riesgo:** weekly streak inflada para users que aparecen esporádicamente.
- **Fix:** si `weeksSinceLast >= 2`, resetear weekly a 0 o 1 (según política), no incrementar.
- **Esfuerzo:** 1h + test.

### S1-10 · `gamificationService.calculateAndSaveXP` race condition en `couple.update`
- **Archivo:** `src/backend/src/services/gamificationService.ts:59-106`
- **Problema:** dos llamadas concurrentes (event accept + task verify del partner casi simultáneos) leen el mismo `couple.xp`, calculan dos valores nuevos y el segundo `update` sobrescribe el primero. La XP queda desincronizada con el saldo real.
- Adicionalmente, la notificación `level_up` se dispara **2 veces** si dos eventos de level transition concurrentes dan level diferente.
- **Riesgo:** XP calculada se desvía del estado real. Notificaciones duplicadas.
- **Fix:** usar `prisma.couple.update` con expresión computada en BD (`{ xp: { set: computedValue } }`) tras leer dentro de transacción `serializable`. O llamar este service desde un único worker secuencial.
- **Esfuerzo:** 1-2h.

### S1-11 · `coupleLifecycleService.dissolveCouple` no anonimiza `secretKey` antiguo
- **Archivo:** `src/backend/src/services/coupleLifecycleService.ts:9-31`
- **Problema:** marca `dissolvedAt` y crea couples nuevos pero deja el `secretKey` antiguo intacto. Si el secretKey original era usado para un join pendiente o estaba en cualquier link compartido, sigue siendo válido para acceder al couple histórico.
- **Riesgo:** acceso a histórico anonimizado vía secretKey reciclado.
- **Fix:** dentro del `$transaction`, rotar `secretKey` del couple disuelto a un valor random (`crypto.randomBytes(32).toString('hex')`) para invalidar links pendientes.
- **Esfuerzo:** 15 min + test.

---

## 4. Findings S2

### S2-1 · `pointsCalculator.getTimeMultiplier` rangos solapados en frontera 21:30-01:00
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:30-34`
- **Problema:** `if (totalMinutes >= 21*60+30 || totalMinutes < 1*60) return 1.2` y la siguiente `return 1.5` solo se alcanza para 01:00-07:00. Pero el rango 01:00-07:00 que en docs es ×1.5 incluye 01:00 inclusive; aquí 01:00 sale ×1.5 (correcto), 00:59 sale ×1.2 (correcto). OK, pero el comentario dice `01:00-07:00 → ×1.5` y la lógica de la línea 33 contiene `< 1*60` (un minuto), no `< 60` minutos lo cual sí es 01:00 — correcto, pero confuso. **Mejor**: extraer constantes nombradas.
- **Riesgo:** mantenimiento futuro; quien edite las franjas se equivocará.
- **Fix:** constantes `MORNING_START = 7*60`; etc.
- **Esfuerzo:** 30 min.

### S2-2 · `pointsCalculator.getImpactMultiplier` con keyword matching laxo
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:97-109`
- **Problema:** usa `t.includes(k)` para matchear slugs. "trabajo" matchea "trabajos", "viaje de trabajo" matchea ambos `necessary` y `highImpact` (hay `'viaje de trabajo'` y `'viaje largo'`). El primero que matchea gana, pero el orden es accidental.
- "salud" matchea como health pero también "saludable" o cualquier string que contenga "salud".
- **Riesgo:** clasificación errónea según orden y substring matching.
- **Fix:** usar match exacto (`t === k`) o regex con bordes de palabra. Idealmente normalizar el slug en el frontend a un enum cerrado.
- **Esfuerzo:** 1h.

### S2-3 · `pointsCalculator.getChildrenMultiplier` cae a `couple.numChildren` aunque `event.numChildren=0`
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:70-86`
- **Problema:** si el creador del evento explícitamente pone `numChildren=0` (no le tocan los hijos en esta ausencia) pero `hasChildren=true` (bug del frontend), la lógica fallback usa `registeredCount > 0 ? registeredCount : couple.numChildren`. Esto contradice el comentario "hijos afectados en esta ausencia concreta".
- **Riesgo:** sobreestimar puntos cuando el evento legítimamente no afecta a los niños.
- **Fix:** si `hasChildren=true` Y `event.numChildren === 0` (no null), respetar el 0 y devolver `1.0`. Solo caer al fallback si `numChildren === null/undefined`.
- **Esfuerzo:** 30 min + test.

### S2-4 · `pointsCalculator.calculateEventPoints` swallows errors y devuelve `pointsBase` original
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:141-144`
- **Problema:** `catch (error) { console.error(...); return event.pointsBase }`. Si falla el cálculo, el evento se acepta con `pointsBase` sin multiplicadores. Silent fallback peligroso: si la BD está mal o un campo viene con tipo incorrecto, el saldo se salta los multiplicadores.
- **Riesgo:** puntos inferiores a los esperados sin notificación al user. Test ciego.
- **Fix:** propagar el error al caller (route) que devolverá `500` legible. O loguear con Sentry.
- **Esfuerzo:** 30 min.

### S2-5 · `analyticsAggregator.toWeekKey` rompe ISO weeks que cruzan año
- **Archivo:** `src/backend/src/services/analyticsAggregator.ts:58-65`
- **Problema:** calcula lunes localmente pero no maneja casos donde el lunes ISO de la semana 1 cae en diciembre del año anterior (ej: 2024-12-30 es lunes de la semana ISO 1 de 2025). El `slice(0,10)` devuelve `2024-12-30`, sin embargo varios servicios de tests asumen que semana se identifica por el año actual.
- **Riesgo:** week buckets cross-year mezclan semanas.
- **Fix:** documentar que weekKey es el ISO date del lunes (no `YYYY-W##`). Tests deben verificar invariante de cross-year.
- **Esfuerzo:** 30 min docs + 1h tests.

### S2-6 · `analyticsAggregator.equityCurve` lógica de avance del cursor confusa
- **Archivo:** `src/backend/src/services/analyticsAggregator.ts:178-207`
- **Problema:** la condición `if (tDay === day || tDay < day) { ... txIdx++ }` en el while interno puede recorrer transacciones de días pasados varias veces si los días no son consecutivos en `days`. Aunque sí lo son (`dayKeysBetween` produce días contiguos), la lógica es frágil. Mejor usar un `for` simple agrupando por dayKey antes del bucle.
- **Riesgo:** off-by-one con timezone o múltiples txs en mismo día.
- **Fix:** agrupar txs por dayKey en un `Map<string, number>` y luego construir cumulative en una sola pasada.
- **Esfuerzo:** 1h.

### S2-7 · `redBalanceService.computeRedBalance` clave por `toISOString().slice(0,10)` ignora TZ del user
- **Archivo:** `src/backend/src/services/redBalanceService.ts:60-84`
- **Problema:** el bucket `k` es UTC. Una transacción a las 23:30 hora Madrid (= 22:30 UTC verano) se asigna al día UTC, no al día Madrid. La pareja vería "ayer en rojo" el día equivocado.
- **Riesgo:** UX confusa, no crítico funcionalmente.
- **Fix:** usar `Intl.DateTimeFormat` con timezone del user para calcular dayKey local (mismo patrón que digestService).
- **Esfuerzo:** 1h.

### S2-8 · `redBalanceService` no respeta `couple.pausedUntil`
- **Archivo:** `src/backend/src/services/redBalanceService.ts:32-98`
- **Problema:** la pareja en pausa (vacation mode) sigue acumulando "días en rojo" porque el service no consulta `couple.pausedUntil`. Otros services (`gamificationService.updateDailyStreak`, `notificationDigestService`) ya respetan la pausa.
- **Riesgo:** la pausa pretendía silenciar el conteo emocional pero el rojo sigue acumulándose.
- **Fix:** filtrar txs durante el periodo `pausedUntil` o devolver `severity: null` si la pareja está en pausa.
- **Esfuerzo:** 30 min.

### S2-9 · `recurringTaskService.getNextOccurrences` no aplica clamp en MONTHLY (mismo bug que S1-4)
- **Archivo:** `src/backend/src/services/recurringTaskService.ts:43-49`
- **Problema:** `next.setMonth(next.getMonth() + 1)` con `next` el 31 de enero produce 3 de marzo. Mismo problema fin-de-mes. La diferencia con `recurrenceService` es que aquí usa `setMonth` (local), pero el bug es idéntico.
- **Riesgo:** TaskLogs auto-generados con fechas saltadas en meses cortos.
- **Fix:** clamp similar a S1-4.
- **Esfuerzo:** 1h compartido con S1-4.

### S2-10 · `recurringTaskService.generateOnCreate` `dates.toISOString` como key puede colisionar tras DST
- **Archivo:** `src/backend/src/services/recurringTaskService.ts:87-93`
- **Problema:** el `existingDates` set usa `toISOString()` exacto. Si una task se generó antes de DST y se vuelve a llamar después, el offset cambia (en UTC sigue igual, pero si la fecha original se construyó con `setHours(0,0,0,0)` local, varía).
- En este código las fechas se construyen con `getTime() + ms` (línea 32-48), así que son UTC consistentes. Bajo riesgo.
- **Fix:** documentar invariante o normalizar a slice(0,10) si solo importa el día.
- **Esfuerzo:** 30 min.

### S2-11 · `achievementEngine.ts` y `achievementCheckService.ts` y `achievementEngineV2.ts` — DUPLICACIÓN
- **Archivos:**
  - `src/backend/src/services/achievementEngine.ts` (505 líneas, "v1" lega CMV)
  - `src/backend/src/services/achievementCheckService.ts` (212 líneas, sistema basado en `AchievementDefinition` + `CoupleAchievement`)
  - `src/backend/src/services/achievementEngineV2.ts` (82 líneas, pure functions catalog-based)
- **Problema:** **TRES sistemas paralelos** de achievements:
  1. `achievementEngine` opera sobre `Achievement` + `UserAchievement` (per-user).
  2. `achievementCheckService` opera sobre `AchievementDefinition` + `CoupleAchievement` (per-couple, con XP).
  3. `achievementEngineV2` es pure y usa un catálogo embebido (`ACHIEVEMENT_CATALOG`).
- No hay docs de cuál es la canónica. Las migraciones tienen ambas tablas. `gamificationService.calculateAndSaveXP` usa `coupleAchievement` (sistema 2), pero `eventRoutes` y `taskRoutes` quizá llaman a sistema 1.
- **Riesgo:** features divergentes; un fix en uno no aplica al otro. Confusión cognitiva.
- **Fix:** decidir cuál es la canónica (recomendado: sistema 2 + V2 pure helpers), deprecar sistema 1, migrar datos en una sola release.
- **Esfuerzo:** 1 día (migración + cleanup).

### S2-12 · `achievementCheckService.evaluateCondition('no_forced_events_days')` lógica errónea
- **Archivo:** `src/backend/src/services/achievementCheckService.ts:62-81`
- **Problema:** primero cuenta forced events en ventana, si hay alguno devuelve `current: 0`. Si no, busca el último forced event histórico y calcula días desde entonces. **Pero si un user nunca tuvo forced events, `lastForced` es null y cae a `couple.createdAt`** — devuelve los días que tiene la pareja en la app como progreso, lo cual no era el intent. Una pareja recién creada con 1 hora puede tener `current = 0` y `target = 30` con un crecimiento misterioso.
- **Riesgo:** progreso del logro incoherente.
- **Fix:** si `!lastForced`, devolver `current = target` (logro desbloqueado por defecto si nunca hubo forced) o documentarlo.
- **Esfuerzo:** 30 min + test.

### S2-13 · `gamificationService.updateWeeklyStreak` umbral 40 hardcodeado, mismatch con `equityBand` (5/15)
- **Archivo:** `src/backend/src/services/gamificationService.ts:227-237`
- **Problema:** la racha semanal sube si `equilibrium >= 40` (escala 0-100), pero la banda visual de `analyticsAggregator.equityBand` usa `≤5 green, ≤15 yellow`. Diferente unidad; difícil de razonar para el usuario.
- **Riesgo:** UX inconsistente — la pareja "ve verde" en analytics pero su weekly streak no sube.
- **Fix:** documentar la fórmula de `equilibrium` en `CoupleScore` y unificar (o usar un único umbral exportado).
- **Esfuerzo:** 1h.

### S2-14 · `notificationDigestService.runDigestForCurrentMinute` carga TODOS los users en cada minuto
- **Archivo:** `src/backend/src/services/notificationDigestService.ts:49-58`
- **Problema:** cada minuto `prisma.user.findMany({ where: { notificationsPush: true } })` devuelve la lista completa. Con 10k users, son 10k×1440 = 14M lookups/día solo en este endpoint.
- **Riesgo:** O(N) por minuto. Escalabilidad pobre.
- **Fix:** filtrar en BD por hora local actual usando un campo precomputado `digestUtcMinute` (recalculado en `setPreferences`). Solo se lee la pequeña ventana relevante.
- **Esfuerzo:** 4h (incluye migration + recompute).

### S2-15 · `webPushService.getWebPush` initialization race
- **Archivo:** `src/backend/src/services/webPushService.ts:23-46`
- **Problema:** dos llamadas concurrentes en el primer arranque pueden ambas entrar al `if (webPushModule || webPushInitialized) return webPushModule` y llamar `import` dos veces, llamar `setVapidDetails` dos veces. Second call OK porque es idempotente, pero el `webPushInitialized` flag se setea solo en uno de los caminos.
- **Riesgo:** bajo; un init duplicado al boot.
- **Fix:** memoizar la promesa de import:
  ```
  if (!modulePromise) modulePromise = import(...).catch(...)
  return modulePromise
  ```
- **Esfuerzo:** 30 min.

### S2-16 · `emailService` sin retry/backoff ni jitter
- **Archivo:** `src/backend/src/services/emailService.ts:23-60`
- **Problema:** un fallo `5xx` o timeout de Resend devuelve `{ ok: false }` sin reintento. La caller route normalmente registra y sigue. Para emails críticos (delete-account code, invite) un fallo transitorio = email perdido.
- **Riesgo:** users que no reciben código de verificación → no pueden eliminar la cuenta sin contactar soporte.
- **Fix:** wrapper con 3 reintentos exponential backoff (200ms, 600ms, 1.8s) para 5xx y network errors. Mantener logs estructurados (Sentry) para errores definitivos.
- **Esfuerzo:** 1h + test.

### S2-17 · `emailService.sendEmail` el log de error trunca a 500 chars
- **Archivo:** `src/backend/src/services/emailService.ts:50`
- **Problema:** `text.slice(0, 500)` puede ocultar el error real de Resend si éste viene con detalle largo (validation errors típicamente vienen verbose). Combinar con retry: si truncamos no podemos diagnosticar.
- **Fix:** loguear todo si NODE_ENV !== 'production', o mandar a Sentry con tags estructurados.
- **Esfuerzo:** 15 min.

### S2-18 · `cryptoService.decrypt` no normaliza padding base64url
- **Archivo:** `src/backend/src/services/cryptoService.ts:33-46`
- **Problema:** `Buffer.from(s, 'base64url')` en Node 20+ acepta unpadded base64url. En versiones previas o si la string fue manipulada externamente, podría fallar silentemente. No es bug actual pero sí robustez.
- **Fix:** validar formato antes de `Buffer.from` con regex `/^[A-Za-z0-9_-]+$/`. Lanzar error legible.
- **Esfuerzo:** 30 min.

---

## 5. Findings S3

### S3-1 · `negotiationEngine` usa `new PrismaClient()` implícito y crea Notification fuera de tx
- **Archivo:** `src/backend/src/services/negotiationEngine.ts:88-99,293-306`
- **Problema:** notifs se crean con `prisma.notification.create` después de las mutaciones del evento, sin transacción. Si la app crashea entre evento y notif, el partner no se entera.
- **Fix:** mover dentro del `$transaction` del S0-1.

### S3-2 · `accountDeletionService.deleteAccount` el delete sin couple no anonimiza email
- **Archivo:** `src/backend/src/services/accountDeletionService.ts:21-24`
- **Problema:** rama `if (!coupleId)` hace `delete` directo. OK porque no hay relaciones. Pero si más adelante existen registros child (PointsTransaction de un user solo), el constraint FK fallará. Resilience-wise mejor que sigue la misma rutina de soft-delete + ghost.
- **Fix:** unificar comportamiento.

### S3-3 · `recurrenceService.parseUntil` no valida horario
- **Archivo:** `src/backend/src/services/recurrenceService.ts:53-62`
- **Problema:** acepta `YYYYMMDDTHHMMSSZ` (15 chars) y `YYYYMMDD` (8 chars). Si UNTIL viene `20261231T235959Z` parsea OK; si viene `20261231` lo trata como `T23:59:59Z` (final del día). Razonable pero no documentado.
- **Fix:** comentar el helper.

### S3-4 · `holidaysService` solo soporta ES 2026 hardcodeado
- **Archivo:** `src/backend/src/services/holidaysService.ts:6-21`
- **Problema:** explícito ya en el comentario. Cuando llegue 2027 los users dejarán de ver holidays.
- **Fix:** crear job o seed automático ANTES de fin de año.

### S3-5 · `birthdaysService.deriveBirthdaysForYear` no maneja 29-feb en años no bisiestos
- **Archivo:** `src/backend/src/services/birthdaysService.ts:32-44`
- **Problema:** un niño nacido 29-feb-2024 en 2025 produce `Date.UTC(2025, 1, 29)` que se normaliza a 1-mar-2025. UX: cumple el 1 marzo, ok pero confunde.
- **Fix:** clamp explícito a 28-feb en años no bisiestos.

### S3-6 · `journalPromptsService.cyrb53` algoritmo ok pero sin tests del determinismo cross-day
- **Archivo:** `src/backend/src/services/journalPromptsService.ts:8-19`
- **Fix:** test que verifique que para dos días distintos el output es típicamente distinto, y para mismo día y coupleId siempre igual.

### S3-7 · `replayService.computeAvailableReplays` "anniversary" busca mismo MM-DD un solo año atrás
- **Archivo:** `src/backend/src/services/replayService.ts:40-56`
- **Problema:** solo "Hace 1 año…", no 2 ni 3 años. Decisión de producto, pero documentar.

### S3-8 · `analyticsService.CATEGORY_HOURS` con alias `banos` sin tilde
- **Archivo:** `src/backend/src/services/analyticsService.ts:13-25`
- **Problema:** el alias defensivo está bien, pero el dato canónico debería migrarse para que solo exista una key.
- **Fix:** migration que normalice `task.category` y elimine el alias.

### S3-9 · `notificationService` tiene 3 funciones casi-iguales (notifyEventProposed/Responded/TaskCompleted) que duplican lookup de couple+users
- **Archivo:** `src/backend/src/services/notificationService.ts:81-237`
- **Fix:** helper `getCoupleAndPartner(coupleId, excludeUserId)` para evitar duplicación.

---

## 6. Dependencias entre servicios

Mapa observado (extraído de imports):
```
notificationService ←── digestService, gamificationService, achievementCheckService, notificationDigestService (sendPush)
webPushService     ←── notificationDigestService
notificationPreferencesService ←── notificationDigestService
gamificationService ←── taskLogPoints, achievementCheckService(level_reached)
analyticsAggregator ←── insightsGenerator
authService        ←── demoService
```

**No hay imports circulares** (verificado). El acoplamiento más fuerte es `gamificationService ↔ achievementCheckService ↔ notificationService`. La separación V2 (pure) vs services con DB (impure) es razonable pero no consistente — `analyticsAggregator` y `streakService` y `challengeService` y `replayService` son puras (correcto), mientras `gamificationService` mezcla cálculo y persistencia (debería separarse).

---

## 7. Cobertura de tests por servicio

| Servicio | Test unitario | Cobertura aprox | Comentario |
|---|---|---|---|
| `pointsCalculator` | ✅ `pointsCalculator.test.ts` | alta | Falta test de compensationDiscount end-to-end. |
| `taskLogPoints` | ✅ `taskLogPoints.test.ts` | alta | OK. |
| `negotiationEngine` | ⚠️ contract en `eventsContract.test.ts` | media | **Falta test de race S0-1** (accept concurrente). |
| `achievementEngine` (v1) | ✅ `achievementEngine.test.ts` | media | Sistema en deprecación silenciosa (S2-11). |
| `achievementEngineV2` | ✅ `achievementEngineV2.test.ts` | alta | OK pure functions. |
| `achievementCheckService` | ❌ | 0 | Sin tests; lógica condicional compleja. |
| `accountDeletionService` | ✅ `accountDeletionService.test.ts` | media | OK happy path. Falta test concurrencia ghost. |
| `coupleLifecycleService` | ✅ `coupleLifecycleService.test.ts` | media | Falta test secretKey rotation (S1-11). |
| `recurrenceService` | ✅ `recurrenceService.test.ts` | media | **Falta test fin-de-mes/bisiesto/DST (S1-4)**. |
| `recurringTaskService` | ✅ `recurringTaskService.test.ts` | media | Falta test MONTHLY clamp (S2-9). |
| `streakService` | ❌ | 0 | Sin tests pese a ser pure y simple (S1-9). |
| `gamificationService` | ✅ `gamificationService.test.ts` | media | Sin test DST/timezone (S1-6). |
| `redBalanceService` | ❌ | 0 | Sin tests; lógica de bucket TZ (S2-7). |
| `analyticsAggregator` | ✅ `analyticsAggregator.test.ts` | alta | Tiene invariant tests. OK. |
| `analyticsService` | ✅ `analyticsService.test.ts` | media | OK. |
| `insightsGenerator` | ✅ `insightsGenerator.test.ts` | media | OK. |
| `cryptoService` | ✅ `cryptoService.test.ts` | media | OK. |
| `webPushService` | ❌ | 0 | Sin tests (depende de `web-push` que no está instalado, S1-7). |
| `emailService` | ❌ | 0 | Sin tests (Resend dep externa). |
| `notificationDigestService` | ❌ | 0 | Sin tests; cálculo de hour matching delicado. |
| `notificationPreferencesService` | ❌ | 0 | Sin tests; lógica `isInQuietHours` cross-midnight. |
| `digestService` | ❌ | 0 | Sin tests; cálculo weekStart erróneo (S1-8). |
| `journalPromptsService` | ✅ `journalPromptsService.test.ts` | alta | OK. |
| `journalRetrospectiveService` | ✅ `journalRetrospectiveService.test.ts` | alta | OK. |
| `challengeService` | ✅ `challengeService.test.ts` | alta | OK. |
| `replayService` | ❌ | 0 | Sin tests pese a ser pure. |
| `anniversaryService` | ✅ `anniversaryService.test.ts` | alta | OK. |
| `birthdaysService` | ✅ `birthdaysService.test.ts` | media | Falta test 29-feb (S3-5). |
| `holidaysService` | ✅ `holidaysService.test.ts` | media | OK. |
| `bootstrapCatalog` | ❌ | 0 | Sin tests de idempotencia. |
| `activityTemplateService` | ❌ | 0 | Sin tests. |
| `configurationProposalService` | ❌ | 0 | Sin tests de accept con tasksMatch + multMatch. |
| `notificationService` | ❌ | 0 | Sin tests. |
| `invitationService` | ❌ | 0 | Sin tests. |
| `activityService` | ❌ | 0 | Sin tests. |
| `calendarService` | ❌ | 0 | Sin tests; lógica de week boundaries. |
| `authService` | ✅ contract | alta | OK. |
| `demoService` | ❌ | 0 | Sin tests. |
| `refreshTokenService` | ❌ | 0 | Sin tests pese a ser security-sensitive. Lazy fix porque está unused en prod. |
| `telemetry` | ❌ | 0 | Sin tests; depende de PostHog. |
| `insightHeuristic` | ✅ `insightHeuristic.test.ts` | alta | OK. |

**Gap crítico:** servicios con DB y lógica condicional compleja sin tests: `achievementCheckService`, `gamificationService.updateDailyStreak`, `digestService`, `redBalanceService`, `streakService`, `configurationProposalService.accept`.

---

## 8. Issues TypeScript

`as any` y casts inseguros encontrados (8 ocurrencias):

| Archivo:línea | Cast | Necesidad |
|---|---|---|
| `pointsCalculator.ts:132,155` | `event.compensationDiscount as any` | Decimal del ORM; reemplazar por `Number(event.compensationDiscount)` o `event.compensationDiscount.toNumber()`. |
| `telemetry.ts:31` | `'posthog-node' as any` | Puede tiparse correctamente con `import type`. |
| `telemetry.ts:55` | `r.data as any` | El validator devuelve tipo conocido. |
| `achievementEngineV2.ts:48,65` | `(metrics as any)[def.condition.metric]` | Metric keys son `keyof CoupleMetrics`. Indexar tipado. |
| `gamificationService.ts:223` | `(previousScore.equilibrium as any).toNumber()` | Mejor `instanceof Decimal` check. |
| `insightsGenerator.ts:174` | `({ dateStart: l.date }) as any` | Crear tipo unión `EventOrTaskDate`. |

Ninguno es bug funcional pero todos debilitan el sistema de tipos.

---

## 9. Errores silenciados (`.catch(() => null)` y similares)

| Archivo:línea | Patrón | Impacto |
|---|---|---|
| `webPushService.ts:29` | `.catch(() => null)` import | **Enmascara S1-7** (falta de dep). |
| `telemetry.ts:31` | `.catch(() => null)` import | OK (graceful degradation). |
| `notificationDigestService.ts:93` | `prisma.delete(...).catch(() => {})` | Aceptable (subscription muerta). |
| `pointsCalculator.ts:142-143` | `console.error + return event.pointsBase` | **S2-4 silent fallback peligroso**. |
| `notificationService.ts:31-33` | `console.error` sin throw | Notif perdida silenciosa; aceptable pero documentar. |
| `digestService.ts:60-62` | `console.error` sin throw | OK (digest no debe romper cron). |
| `gamificationService.ts:259` | `.catch(...)` en update | OK (reconciliación best-effort). |
| `calendarService.ts:42,79,115` | `.catch(err => [])` | Aceptable (taskLog opcional). |

---

## 10. Plan de remediación sugerido

### Sprint hotfix (1-2 días)
1. **S0-1** — `negotiationEngine.respondToProposal('accept')` en `$transaction` única (2h + test).
2. **S1-7** — `web-push` declarado en backend `package.json` (30 min + smoke test).
3. **S1-4** — Clamp fin-de-mes en `recurrenceService.advance` y `recurringTaskService.getNextOccurrences` (1.5h + tests).
4. **S1-8** — `digestService.sendWeeklyDigests` usar `startOfIsoWeek` (1h).
5. **S1-2** y **S1-1** — Validaciones extra en `negotiationEngine` (1h + tests).

### Sprint robustez (3-4 días)
6. **S1-3** — `accountDeletionService` con `upsert` (30 min).
7. **S1-6** — `gamificationService.updateDailyStreak` con timezone del user (2h).
8. **S1-9** — `streakService.recordActivity` weekly continuity (1h).
9. **S1-10** — `gamificationService.calculateAndSaveXP` con tx serializable (2h).
10. **S1-11** — `coupleLifecycleService.dissolveCouple` rota secretKey (15 min).
11. **S2-11** — Decisión sobre achievement engines (1 día migración + cleanup).
12. **S2-16** — Retry/backoff en `emailService` (1h).

### Sprint hygiene (2-3 días)
13. Tests faltantes para servicios con cobertura 0 (sección 7): `streakService`, `redBalanceService`, `digestService`, `notificationDigestService`, `notificationPreferencesService.isInQuietHours`, `configurationProposalService.accept` (1.5 días).
14. **S2-1** a **S2-10** edge cases y constants (1 día).
15. **S2-14** Optimización `notificationDigestService` (4h).

---

## 11. Conclusión

El estado actual de `services/` es **maduro pero asimétrico**:
- **Bien:** lógica de puntos sólida, refactor a pure functions (analytics aggregator, anniversary, challenge, replay, retrospective), tests hermetic en lo crítico.
- **Mal:** transaccionalidad incompleta en `negotiationEngine` (S0-1), 3 sistemas paralelos de achievements (S2-11), `web-push` no declarado (S1-7), timezone-blind en streak/redBalance (S1-6, S2-7), edge cases recurrence sin clamp (S1-4).
- **Cobertura de tests:** ~50% de los servicios tienen tests; los que faltan son justamente los que más lógica condicional tienen.

Los hallazgos de la auditoría previa mayormente cerrados (compensationDiscount, ghost user fix parcial, PostHog instalado). El riesgo principal hoy es la atomicidad del flujo de aceptación de eventos y la dep faltante de `web-push`.

---

*Auditoría consolidada por subagente Explore — sesión 2026-05-05.*
