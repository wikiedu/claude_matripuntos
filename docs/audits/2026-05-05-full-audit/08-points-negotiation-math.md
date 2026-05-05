# Auditoría — Motor de Puntos & Negociación

**Fecha:** 2026-05-05
**Alcance:** Fórmula canónica `Puntos = PuntosBase × FactorTipo × FactorFranja × FactorDuración × FactorHijos`, sistema de negociación (free 2 rondas / force / counter), idempotencia de transacciones, niveles, streaks.
**Referencia:** `docs/PUNTOS.md`
**Archivos auditados:**
- `src/backend/src/services/pointsCalculator.ts`
- `src/backend/tests/pointsCalculator.test.ts`
- `src/backend/src/services/negotiationEngine.ts`
- `src/backend/src/services/taskLogPoints.ts` + tests
- `src/backend/src/services/redBalanceService.ts`
- `src/backend/src/services/streakService.ts`
- `src/backend/src/services/gamificationService.ts`
- `src/backend/src/routes/eventRoutes.ts`
- `src/backend/src/routes/negotiationRoutes.ts` (V1 canon)
- `src/backend/src/routes/negotiation.ts` (V2 deprecated)
- `src/backend/src/routes/pointsRoutes.ts`
- `src/backend/src/routes/pointsV2.ts`
- `src/backend/src/routes/taskRoutes.ts` (verify/dispute)
- `src/backend/src/server.ts` (cron auto-accept)
- `src/frontend/src/pages/RequestActivity.tsx` (calculator cliente)
- `src/backend/prisma/schema.prisma`

## Resumen ejecutivo

| Severidad | Hallazgos |
|-----------|-----------|
| **S0** (crítico)  | 5 |
| **S1** (alto)     | 7 |
| **S2** (medio)    | 6 |
| **S3** (cosmético)| 3 |

**Top issues:**
1. **El frontend calcula puntos con una fórmula DISTINTA al backend** — omite `FactorTipo` y trata `compensationDiscount` con semántica invertida. El usuario ve preview que NO coincide con lo que se persiste.
2. **`maxFreeRounds` no se enforce en producción** — la columna existe (`@default(99)`) y los comentarios dicen "MVP: no premium plan implementation yet, so we do not enforce the cap". CLAUDE.md y `docs/PUNTOS.md` prometen "Free: máx 2 rondas". El motor V1 está abierto a contraproposición infinita.
3. **`compensationDiscount` se IGNORA al crear y al editar eventos** (eventRoutes.ts:46-55, 270-279) porque el `draftEvent`/`merged` que se pasa a `calculateEventPoints` no incluye el campo.
4. **Disputar una `taskLog` ya verificada NO revierte la `PointsTransaction`** — el creador retiene los puntos aunque la pareja los esté impugnando.
5. **`force` permite que el responder fuerce** (no valida `event.createdBy === req.userId`); CLAUDE.md dice "el proposer fuerza".

---

## Findings S0 (críticos)

### S0-1 · Discrepancia frontend vs backend: el preview omite `FactorTipo` y la semántica de compensación está invertida
- **Archivo:** `src/frontend/src/pages/RequestActivity.tsx:83-90` y `:283-309` vs `src/backend/src/services/pointsCalculator.ts:120-145`
- **Escenario:** Usuario crea un evento "médico 1h, 1 hijo" con base 7. Backend aplica `7 × 0.7 (necesaria) × 1.0 × 1.0 × 1.4 (1 hijo) = 6.86 → 7 pts`. Frontend muestra `7 × 1.0 × 1.0 × 1.4 = 9.8 → 10 pts` (omite el 0.7). Para "boda 10h base 8, 2 hijos" backend hace `8 × 1.4 × 1.2 × 1.25 × 1.8 = 30.24 → 30 pts`; frontend muestra `8 × 1.2 × 1.25 × 1.8 = 21.6 → 21.5 pts` (omite el 1.4 alto-impacto).
- **Esperado:** El frontend debe usar el preview server-side (`POST /api/points/preview` en `pointsV2.ts:26-52`) o aplicar la misma fórmula. El comentario en RequestActivity:37-43 dice "these helpers mirror src/backend/src/services/pointsCalculator.ts" — pero NO espejan `getImpactMultiplier`.
- **Real:** Bug de información: el usuario decide negociar contra un número mostrado en pantalla que no es el que el backend va a almacenar. Como el usuario también envía `pointsProposed: pointsCalc.total` a `POST /api/negotiations` (RequestActivity:381), la primera ronda se inicia con un número del frontend, pero `event.pointsCalculated` queda con otro número distinto del backend → divergencia visible en eventos posteriores.
- **Adicional — semántica compDiscount invertida:**
  - Frontend (RequestActivity:88): `raw = base × ... × (1 - compDiscount)`. Es decir compDiscount=0.15 → multiplica por 0.85.
  - Frontend al persistir (RequestActivity:372): `compensationDiscount: 1 - pointsCalc.compDiscount` → manda 0.85 al backend.
  - Backend (pointsCalculator:131-134) usa `compensationDiscount` como factor directo (1.0=sin descuento, 0.8=20% descuento).
  - Resultado: si frontend y backend hablan correctamente la conversión es coherente, **PERO** si alguna otra ruta (por ejemplo edición desde otro componente, o un cliente externo) manda compensationDiscount como "porcentaje a descontar" (interpretación más natural), persistirá un valor inverso. La doble convención sin validación es trampa para el siguiente desarrollador.
- **Fix:** Reemplazar el `calcPoints` local por una llamada debounced a `POST /api/points/preview` y hacer que ese endpoint acepte además `compensation`/`compensationDiscount`. Eliminar la versión cliente de los multiplicadores. Documentar en pointsCalculator.ts el contrato `compensationDiscount = factor remanente, no porcentaje descontado`.
- **Esfuerzo:** 4-6h (incluye debounce, fallback offline, contract test).

### S0-2 · `compensationDiscount` se ignora al crear y al editar eventos
- **Archivo:** `src/backend/src/routes/eventRoutes.ts:46-55` y `:270-279`
- **Escenario:** Creo evento con `pointsBase=20, compensationDiscount=0.7` (30% descuento). Backend construye `draftEvent` SIN `compensationDiscount`, llama `calculateEventPoints` → no aplica el descuento. Persiste `pointsCalculated=18` y luego en una columna distinta `compensationDiscount=0.7`. Cuando el responder mira `pointsCalculated` ve los 18 pts, pero al recalcular vía `POST /api/points/recalculate/:eventId` (pointsV2.ts:116-169) la ruta SÍ pasa el `event` completo y `compensationDiscount` se aplica → el número cambia a 12.5. Igual con `PUT /events/:id` (línea 270-279).
- **Esperado:** El `pointsCalculated` que se persiste al crear ya debe incluir todos los multiplicadores, incluido `compensationDiscount`.
- **Real:** El número que el partner negocia (o que el creator usa como base de propuesta) está sin descontar. El sistema crea un fix temporal recalculando luego, pero el pointsCalculated inicial que llega vía `GET /events` es el incorrecto.
- **Fix:**
```diff
 const draftEvent = {
   coupleId: req.coupleId,
   type: data.type,
   dateStart: new Date(data.dateStart),
   dateEnd: new Date(data.dateEnd),
   hasChildren: data.hasChildren,
   numChildren: data.numChildren,
   pointsBase: new Decimal(data.pointsBase),
+  compensationDiscount: new Decimal(data.compensationDiscount),
 } as any
```
Y lo mismo en el `merged` del PUT.
- **Esfuerzo:** 15min + tests.

### S0-3 · `maxFreeRounds` NO se enforce en V1; rondas ilimitadas para todos los planes
- **Archivo:** `src/backend/src/routes/negotiationRoutes.ts:246-263` (V1) + `prisma/schema.prisma:274` (`maxFreeRounds Int @default(99)`)
- **Escenario:** Pareja free hace contrapropuesta ronda 1, ronda 2, ronda 3 … infinitas. CLAUDE.md y `docs/PUNTOS.md` prometen "Free: máx 2 rondas. Premium: ilimitadas".
- **Esperado:** Si `event.negotiationRound + 1 > event.maxFreeRounds` Y la pareja no es premium → 403 "Has alcanzado el límite de rondas para tu plan".
- **Real:** Comentario explícito en línea 249-252: `MVP: no premium plan implementation yet, so we do not enforce the maxFreeRounds cap`. El default de la columna se subió a 99 para que ninguna fila tropiece. **Solo el motor V2 (`negotiationEngine.respondToProposal` línea 222) enforce el `>= 2`**, pero V2 está deprecated (Sunset 2026-06-01) y solo se llama desde EventNegotiationCard (Calendar). El flujo principal Activities/RequestInbox usa V1 → ilimitado.
- **Fix:** Añadir check antes de la transacción:
```ts
if (data.responseType === 'counter_proposed') {
  const subscription = await tx.subscription.findUnique({ where: { coupleId: req.coupleId } })
  const isPremium = subscription?.plan && subscription.plan !== 'free'
  if (!isPremium && nextRound > negotiation.event.maxFreeRounds) {
    throw new RespondError(403, `Plan free: máximo ${negotiation.event.maxFreeRounds} rondas. Hazte premium o fuerza el acuerdo.`)
  }
}
```
Y bajar el default de schema a 2 en una migración (solo afecta a eventos nuevos; los existentes ya tienen 99 y se respetan).
- **Esfuerzo:** 2h (lógica + check de premium + tests + migración).

### S0-4 · Disputar una `TaskLog` ya verificada NO revierte la `PointsTransaction`
- **Archivo:** `src/backend/src/routes/taskRoutes.ts:580-589` (PUT dispute)
- **Escenario:** Pareja A completa "fregar platos" (pointsFinal=8). Cron auto-verifica a las 24h → crea `PointsTransaction(amount=+8, userId=A)`. B se da cuenta y disputa: pasa el log a `status='disputed'` pero el ledger ya tiene los +8 acreditados a A. Spec dice: "Disputa: partner marca como disputed, pueden renegociar puntos" — no se especifica si revertir, pero al menos el saldo no debe quedar inflado por una tarea bajo disputa.
- **Esperado:** El PUT dispute debería revertir la transacción (crear inverso o `delete` por `relatedTaskLogId`) o marcarla como `voided` mientras dura la disputa. Y reaplicar al resolverla.
- **Real:** Solo flip de status. La `PointsTransaction` queda intacta, A sigue con +8 a su favor.
- **Fix:** En la disputa, dentro de un `$transaction`:
```ts
await tx.taskLog.update({...})
await tx.pointsTransaction.deleteMany({ where: { relatedTaskLogId: req.params.logId } })
```
Y al resolver la disputa (verify después de dispute) recrear con el `pointsDisputed` o `pointsFinal` final.
- **Esfuerzo:** 3h (incluye flujo de resolución de disputa, que hoy no existe formalmente).

### S0-5 · `force` no valida que sea el creador del evento y la `pointsTransaction.create` no está en transacción con el cambio de status
- **Archivo:** `src/backend/src/routes/negotiationRoutes.ts:454-479`
- **Escenario A (anyone-force):** Pareja en disputa, ronda 5 (V1 sin cap por S0-3). El responder, harto de negociar, hace `POST /api/negotiations/:id/force` → paga de su propio saldo y queda forzado. Pero CLAUDE.md dice: "Sin acuerdo: proposer puede 'forzar' (paga de su propio saldo)". El responder no debería poder forzar.
- **Escenario B (split-brain):** Si la `pointsTransaction.create` falla (por ejemplo error de DB transitorio entre línea 463 y 470), el evento queda `status='forced'` con `pointsAgreed` pero SIN entrada en el ledger. El user no paga.
- **Esperado:** (a) Validar `negotiation.event.createdBy === req.userId`; (b) Envolver event.updateMany + pointsTransaction.create en `prisma.$transaction()`.
- **Real:** Cualquier miembro de la pareja puede forzar; y la atomicidad atómica está dividida en dos statements separados.
- **Fix:**
```ts
if (negotiation.event.createdBy !== req.userId) {
  res.status(403).json({ error: 'Solo el proposer puede forzar el acuerdo' })
  return
}

await prisma.$transaction(async (tx) => {
  const transition = await tx.event.updateMany({
    where: { id: negotiation.eventId, status: { in: ['draft', 'pending'] } },
    data: { status: 'forced', pointsAgreed: negotiation.pointsProposed },
  })
  if (transition.count === 0) throw new ConflictError()
  await tx.pointsTransaction.create({...})
})
```
- **Esfuerzo:** 30min.

---

## Findings S1 (alto)

### S1-1 · `relatedEventId` NO es UNIQUE en `PointsTransaction` (CLAUDE.md y docs lo afirman, schema no lo refleja)
- **Archivo:** `src/backend/prisma/schema.prisma:413`
- **Escenario:** CLAUDE.md sección "QUÉ BUSCAR #10" dice "PointsTransaction.relatedEventId UNIQUE". Schema dice `relatedEventId String?` con `@@index([relatedEventId])` (no unique). Solo `relatedTaskLogId` tiene `@unique`.
- **Esperado:** Igual constraint que en taskLog para idempotencia atómica a nivel BD.
- **Real:** La defensa contra double-spend depende del guard `event.updateMany({ where: { status: { in: ['draft','pending'] } } })` (negotiationRoutes:217-227, 454-466). Funciona, pero si en el futuro alguien añade otra ruta de aceptación (por ejemplo desde el motor V2 deprecated, o un script de seed) y olvida el guard, hay riesgo. Idempotencia "in code" en lugar de "in BD".
- **Fix:** Migración:
```sql
CREATE UNIQUE INDEX "PointsTransaction_relatedEventId_type_key"
  ON "PointsTransaction"("relatedEventId", "type")
  WHERE "relatedEventId" IS NOT NULL;
```
(Compuesto con `type` para permitir `event_accepted` + `forced_payment` distintos sobre el mismo evento si el flujo lo requiriese; alternativa más estricta es solo (`relatedEventId`)).
- **Esfuerzo:** 1h (migración + repair script para limpiar duplicados existentes).

### S1-2 · El motor V2 (negotiationEngine.ts:175-196 / accept) crea PointsTransaction fuera del `updateMany` atómico
- **Archivo:** `src/backend/src/services/negotiationEngine.ts:155-197`
- **Escenario:** Atómicamente cambia status a 'accepted' (línea 157-169), pero el `pointsTransaction.create` (línea 186-195) está después del `updateMany` y fuera de cualquier `$transaction`. Si la creación de la transacción falla, el evento queda accepted sin debit.
- **Esperado:** Envolver en `prisma.$transaction()` igual que V1 negotiationRoutes:201-280.
- **Real:** Split-brain bajo error transitorio.
- **Fix:** Wrap en `prisma.$transaction(async (tx) => {...})`. V2 está deprecated pero todavía expuesto en `/api/events/:id/respond`.
- **Esfuerzo:** 30min.

### S1-3 · `calculateAndSaveXP` solo cuenta transacciones positivas → eventos aceptados/forzados nunca generan XP
- **Archivo:** `src/backend/src/services/gamificationService.ts:63-66`
- **Escenario:** Una pareja que solo hace eventos (cenas, viajes, bodas) y no tareas, jamás sube de nivel. `event_accepted` y `forced_payment` se persisten con `amount` negativo (debit del proposer). El partner no recibe transacción positiva. La query `where: { coupleId, amount: { gt: 0 } }` ignora todo lo de eventos.
- **Esperado:** XP debería contar el "movimiento total" entre la pareja (suma de absolute values), o crear una transacción pareada (debit a A + crédito virtual a la pareja para XP).
- **Real:** Solo `task_completed` (positivo) genera XP. La gamificación está sesgada hacia tareas. Streaks tampoco se mueven con eventos: `updateDailyStreak` solo se llama desde `negotiationRoutes:305` y `taskRoutes:530` — el primero sí cubre eventos, ok. Pero el agregado de `calculateAndSaveXP` NO mide volumen de eventos.
- **Fix:**
```ts
const ptResult = await prisma.pointsTransaction.aggregate({
  where: { coupleId, type: { in: ['event_accepted','forced_payment','task_completed'] } },
  _sum: { amount: true },  // y luego Math.abs sobre el resultado, o una segunda query con type-aware
})
```
O mejor: `Math.abs(_sum.amount)` no funciona porque DB suma signed. Hay que sumar absolutos: cambiar a un `findMany` y reducir, o crear un agregado positivo separado para events.
- **Esfuerzo:** 2h.

### S1-4 · No hay validación de duración cero/negativa en taskLog ni en preview
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:43-50` + `routes/eventRoutes.ts:23-26`
- **Escenario:** `getDurationMultiplier` hace `Math.max(0, ms / 3600000)`. Si `dateEnd < dateStart`, devuelve 0 horas → multiplicador 1.0. El zod schema `createEventSchema.refine(d => new Date(d.dateStart) < new Date(d.dateEnd))` previene la creación, OK. Pero `routes/pointsV2.ts:17-24` (preview) **NO** valida que dateStart < dateEnd. El preview con dateEnd=dateStart devuelve 1.0 silenciosamente.
- **Esperado:** Mismo refine en preview schema.
- **Real:** Preview tolera datos incoherentes; UI puede mostrar puntos para un evento de 0 minutos sin avisar.
- **Fix:** Añadir `.refine(d => new Date(d.dateStart) < new Date(d.dateEnd), {message: 'dateEnd > dateStart'})` al `previewSchema`.
- **Esfuerzo:** 5min.

### S1-5 · Eventos de varios días aplican `FactorDuración × 1.35` linealmente — vacaciones de 14 días = 1.35
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:43-50`
- **Escenario:** Un viaje de trabajo de 14 días (336h) recibe el mismo factor que uno de 25h: ×1.35. Es decir, vacaciones largas valen lo mismo que un fin de semana largo. Eso es coherente con la spec ("24h+ ×1.35") pero genera una asimetría brutal: pequeño base × 1.35 en 24h y misma fórmula en 14 días.
- **Esperado:** Decisión de producto. La spec actual lo permite, pero si el feedback de usuarios reporta "mi pareja se fue 2 semanas y solo le costó 30 pts", añadir un factor `daysExtra` o cap superior contextual.
- **Real:** Spec valida, código respeta spec. Es S1 porque hay riesgo conceptual, no técnico.
- **Fix:** Producto: ¿queremos un cap a partir de 7 días? ¿Multiplicador escalonado? Sin decisión, no fix.
- **Esfuerzo:** 0 (es debate, no fix).

### S1-6 · Las tareas recurrentes ignoran `FactorFranja` y `FactorDuración` — limpiar el baño a las 7am vale igual que a las 14h
- **Archivo:** `src/backend/src/services/pointsCalculator.ts:182-189`
- **Escenario:** `calculateTaskPoints(taskLog)` solo aplica `roundToHalf(taskLog.pointsBase)` — no aplica franja, duración ni hijos. CLAUDE.md sección 7 dice "Tareas recurrentes (base fija): Cocina 2.0 · Baños+niños 1.5 · …". Es decir, el diseño actual es base fija. PERO `taskLogPoints.ts` SÍ aplica modifier (`extra`/`partial`/`profunda`), streak (`getDailyMultiplier`), pet factor (`factorMascotas`). La inconsistencia: el `pointsCalculator.calculateTaskPoints` (importado desde achievementEngine.ts y otros) no usa esos modificadores; el handler real usa `taskLogPoints.calculateTaskLogPoints`. Hay dos motores distintos para "tarea": uno (calculator) crudo, otro (taskLogPoints) con bonos.
- **Esperado:** Documentar cuál es la canónica. La fórmula PUNTOS.md no menciona streak ni mascotas para tareas; eso es una capa de gamificación añadida en v1.7. Conviene unificar: `calculateTaskPoints` debería delegar en `taskLogPoints`.
- **Real:** Dos rutas distintas para calcular puntos de tarea, divergen en ~40%. Los achievement checks usan la cruda y los handlers la enriquecida.
- **Fix:** Refactor: `calculateTaskPoints` debe ser un wrapper que llame `calculateTaskLogPoints` con valores de streak/factorMascotas resueltos por DB.
- **Esfuerzo:** 2h.

### S1-7 · `streakService.ts` cuenta "weeksSinceLast" con `Math.floor((now-last)/7d)` ignorando boundary semana ISO
- **Archivo:** `src/backend/src/services/streakService.ts:80-94`
- **Escenario:** Usuario activo lunes 8d. `weeksSinceLast = floor(8/7) = 1`. Si `weeklyActiveDays >= 3`, weekly++. Si lunes anterior y nuevo lunes están en la misma semana ISO ya inflas; si están en semanas distintas pero con gap de 7d natural y ambos cumplen >=3, también suma. Conceptualmente es "una semana se cuenta una vez si tiene >=3 días". El cálculo por `weeksSinceLast >= 1` es ambiguo en bordes (gap 6.5d o 7.5d).
- **Esperado:** Calcular por `getCurrentWeekStart()` (ya existe en gamificationService:198) y mover a "completed weeks", no `weeksSinceLast`.
- **Real:** Tests pasan pero el modelo es heurístico; bajo offsets de zona horaria y horas tope (Sundayseguidos por gap minutal) puede dar saltos.
- **Fix:** Reemplazar por `getCurrentWeekStart(now) > getCurrentWeekStart(last)` para detectar cambio de semana, y separar el conteo de la longitud del gap.
- **Esfuerzo:** 1h + tests.

---

## Findings S2 (medio)

### S2-1 · `Math.round(x * 2) / 2` aplica half-up positivo, no symmetric — `roundToHalf(-0.25)` devuelve 0, no -0.5
- **Archivo:** `pointsCalculator.ts:112-114` y `taskLogPoints.ts:59` y `RequestActivity.tsx:89`
- **Escenario:** Math.round en JS redondea half-up al positivo: `Math.round(0.5)=1, Math.round(-0.5)=0`. Para puntos siempre positivos no hay drama, pero si en algún momento se calculan deltas (compensación que reste, ajustes manuales) hay asimetría. No es bug funcional hoy.
- **Esperado:** Documentar la convención. El test (`pointsCalculator.test.ts:105-115`) cubre 13.25→13.5 y 13.75→14.0 (correcto half-up).
- **Real:** Cero bugs en uso real; fragilidad latente.
- **Fix:** Añadir comentario explícito en `roundToHalf`: "half-up positive — assumes value >= 0".
- **Esfuerzo:** 5min.

### S2-2 · Cap 500 aplicado tras redondeo; valor 500.4 redondea a 500.5 y luego cap a 500. Coherente, pero tests no lo verifican explícitamente
- **Archivo:** `pointsCalculator.ts:138-140`
- **Escenario:** `if (rounded.greaterThan(500)) return new Decimal(500)` después del redondeo. OK. Pero tests no cubren el borde "raw=500.4 → rounded=500.5 → cap=500".
- **Fix:** Añadir caso al test (ver tabla al final).
- **Esfuerzo:** 5min.

### S2-3 · Bordes de `getDurationMultiplier` ambiguos respecto a la spec
- **Archivo:** `pointsCalculator.ts:43-50`
- **Escenario:** Spec dice "0–3 horas ×1.0", "3–8 horas ×1.1". A 3h exactos: backend `if (hours < 3) return 1.0` → 3.0h cae en `< 8` → ×1.1. A 8h exactos: ×1.25. A 24h exactos: ×1.35. Es la convención "inclusive lower bound", coherente con spec si la leemos como "[3,8)". El comentario en código no explicita.
- **Fix:** Documentar en pointsCalculator.ts y PUNTOS.md el criterio "[lower, upper)".
- **Esfuerzo:** 5min.

### S2-4 · El cálculo de `getChildrenMultiplier` cuenta hijos registrados (V2) si `event.numChildren==0` — viola la spec "afectados en esa ausencia"
- **Archivo:** `pointsCalculator.ts:61-87`
- **Escenario:** Pareja con 3 hijos registrados. Crean evento con `hasChildren=true, numChildren=0` (interpretación: "los hijos están con la abuela"). Backend dice "eventChildren=0 → caer a registeredCount=3 → multiplier=2.2". Viola spec ("Factor Hijos en el momento de la ausencia").
- **Esperado:** Si `numChildren=0` Y `hasChildren=true`, debería ser 1.0 (no hay hijos a cargo); o el frontend debería convertir a `hasChildren=false`.
- **Real:** Una ausencia "sin niños porque están con los abuelos" puntúa como si los tuvieran. Sobrepuntuación.
- **Fix:** Cambiar fallback:
```ts
const effective = eventChildren > 0 ? eventChildren : 0  // explícito: 0 = sin hijos esa noche
```
Y dejar `couple.numChildren` solo como sanity (no como override).
- **Esfuerzo:** 30min + tests.

### S2-5 · `getImpactMultiplier` por keyword sobre slug — `viaje_de_trabajo` matchea `trabajo` (necesaria 0.7), pero `viaje_largo` matchea `viaje largo` (alto 1.4) — orden lexicográfico no determinista
- **Archivo:** `pointsCalculator.ts:97-109`
- **Escenario:** El input es slug normalizado (RequestActivity:363 hace `.replace(/\s+/g, '_')` etc). El slug "viaje_de_trabajo" pasaría el primer if (`'trabajo'.includes('trabajo')` → true → 0.7). Si yo creo "viaje_de_negocios_largo" matchea `viaje largo`? NO, porque el slug es `viaje_de_negocios_largo`, y `t.includes('viaje largo')` es false (con underscores no coincide la cadena con espacios). Así que el matching es frágil al slug exacto.
- **Esperado:** O bien matching por slug enum predefinido, o bien `t.replace('_',' ').includes(...)`.
- **Real:** En la mayoría de casos un slug "trabajo" entra en "Necesaria". Slug "viaje_largo" no entra en "Alto impacto" porque la keyword tiene espacio. Subpuntuación silenciosa.
- **Fix:** Normalizar antes de match:
```ts
const t = (eventType ?? '').toLowerCase().trim().replace(/_/g, ' ')
```
- **Esfuerzo:** 10min.

### S2-6 · `redBalanceService.ts` define día por `t.createdAt.toISOString().slice(0,10)` — UTC, no local
- **Archivo:** `src/backend/src/services/redBalanceService.ts:60-64`
- **Escenario:** Una transacción a las 23:30 hora España (UTC+1 verano) con `createdAt = 2026-05-04T22:30:00Z` cae en day key '2026-05-04'. Hora local sería 5 mayo. La franja de "días en rojo" baila respecto al calendario del usuario.
- **Esperado:** Usar zona horaria del cliente o del couple. `pointsRoutes:157-158` ya usa `localDateKey` con getFullYear/getMonth — pero ahí el server time es la referencia, no la del user.
- **Real:** En verano (UTC+2) un evento a las 1:30am se cuenta en el día anterior. Inducirá falsos positivos/negativos en streaks de "días en rojo".
- **Fix:** Aceptar timezone del usuario en `computeRedBalance` o normalizar a un offset configurable.
- **Esfuerzo:** 1h.

---

## Findings S3 (cosmético)

### S3-1 · `getCalculationBreakdown` calcula `finalPoints` con `Math.min/max` directos, mientras `calculateEventPoints` usa Decimal — divergencia de tipos
- **Archivo:** `pointsCalculator.ts:148-179` vs `:120-145`
- Cosmético: ambos producen el mismo número, pero la conversión Decimal/number entre los dos puede acumular precisión bajo bases con muchos decimales (no se usa hoy).
- **Fix:** Unificar usando un solo helper que tome `raw` y devuelva `final`.
- **Esfuerzo:** 15min.

### S3-2 · Catálogo `FALLBACK_CATEGORIES` en frontend hard-codea bases que pueden divergir del backend `bootstrapCatalog.ts`
- **Archivo:** `RequestActivity.tsx:102-148`
- Documentar como "solo fallback si backend cae". Hoy las bases son 8/12/10/6/4/5/3/3/5; el backend tiene su propio set.
- **Esfuerzo:** N/A (decisión de producto).

### S3-3 · `negotiationEngine.proposeEvent` (V2 deprecated) escribe `negotiation.responseType` como `null` en la primera ronda; V1 escribe `'awaiting'`. Inconsistencia de schema implícito
- **Archivo:** `negotiationEngine.ts:70-78` vs `negotiationRoutes.ts:64-72`
- **Esfuerzo:** Eliminar V2 cuando se cumpla el sunset 2026-06-01.

---

## Casos de prueba que recomiendo añadir

Lista deliberadamente exhaustiva para `pointsCalculator.test.ts` y un nuevo `negotiation.integration.test.ts`. Inputs concretos y outputs esperados según `docs/PUNTOS.md`:

| # | Escenario | Input | Output esperado | Cubre |
|---|-----------|-------|-----------------|-------|
| 1 | Boda noche 10h con 2 hijos (PUNTOS.md ejemplo) | base=8, type='boda', dateStart=2026-04-25T20:00, dateEnd=2026-04-26T06:00, hasChildren=true, numChildren=2 | 8 × 1.4 × 1.2 × 1.25 × 1.8 = 30.24 → **30** | impact 1.4 × franja 1.2 × dur 1.25 × hijos 1.8 |
| 2 | Médico rutina (PUNTOS.md ejemplo) | base=7, type='medico', dateStart=11:00 mismo día +1h, numChildren=1 | 7 × 0.7 × 1.0 × 1.0 × 1.4 = 6.86 → **7** | impact 0.7 × franja normal × dur <3h × hijos 1 |
| 3 | Despedida 24h (PUNTOS.md ejemplo) | base=6, type='despedida', start 12:00 → +24h, 2 hijos | 6 × 1.4 × 1.0 × 1.35 × 1.8 = 20.41 → **20.5** | dur 24h+ × hijos 2 |
| 4 | Cena 4h viernes noche 0 hijos (PUNTOS.md ejemplo) | base=10, type='cena', start 20:00 → +4h, hasChildren=false | 10 × 1.0 × 1.2 × 1.1 × 1.0 = 13.2 → **13** | franja noche × dur 3-8h |
| 5 | Borde franja 09:30 exacto | base=10, type='ocio', dateStart=09:30 +1h | 10 × 1.0 × 1.0 × 1.0 × 1.0 = 10 → **10** | franja 09:30 = día normal, NO mañana ×1.3 |
| 6 | Borde franja 21:30 exacto cruzando medianoche | base=10, type='ocio', dateStart=21:30 → +4h | 10 × 1.0 × 1.2 × 1.1 × 1.0 = 13.2 → **13** | franja noche desde 21:30 inclusive |
| 7 | Cap 500 — base alta + multiplicadores grandes | base=200, type='boda', start=02:00, end=+30h, 3 hijos | raw = 200 × 1.4 × 1.5 × 1.35 × 2.2 = 1247.4 → cap → **500** | cap superior |
| 8 | Compensación aplica (post-fix S0-2) | base=20, type='ocio', short event, compensationDiscount=0.7 | 20 × 1.0 × 1.0 × 1.0 × 1.0 × 0.7 = 14 → **14** | factor compensación |
| 9 | numChildren=0 con hasChildren=true (post-fix S2-4) | base=10, hasChildren=true, numChildren=0, V2 children registrados=3 | 10 × 1.0 × ... × 1.0 = 10 (NO 22) | "0 hijos esa noche" no usa fallback couple |
| 10 | Force solo por creator (post-fix S0-5) | request POST /negotiations/:id/force con userId != event.createdBy | HTTP 403 "Solo el proposer puede forzar" | autorización force |
| 11 | maxFreeRounds enforce (post-fix S0-3) | counter ronda 3 con plan=free, maxFreeRounds=2 | HTTP 403 "Has alcanzado el límite de rondas" | cap rondas free |
| 12 | Idempotencia de aceptación bajo concurrencia | dos requests POST /respond accept simultáneos sobre mismo negotiation | uno → 200 OK + 1 PointsTransaction; otro → 409 Conflict | guard `updateMany where status in ['draft','pending']` |
| 13 | Disputa revierte transacción (post-fix S0-4) | taskLog verified con tx +8 → PUT dispute | Tras dispute: GET /points/balance excluye los +8 | dispute reversal |
| 14 | Frontend preview = backend persisted (post-fix S0-1) | request POST /points/preview {type:'boda', base:8, ...} | breakdown.finalPoints == calculateEventPoints(...) | paridad client/server |
| 15 | Auto-accept cron solo afecta logs con completedBy != null | seed: log placeholder con completedBy=null + log real | cron procesa solo el real, no el placeholder | server.ts:295-348 |
| 16 | XP cuenta eventos (post-fix S1-3) | pareja con 5 eventos aceptados (sumando -150) y 0 tareas | XP > 0 (debería medir volumen total, no solo positivos) | calculateAndSaveXP |
| 17 | Preview rechaza dateEnd <= dateStart (post-fix S1-4) | POST /points/preview con dateStart=dateEnd | HTTP 400 validation | zod refine en preview |
| 18 | Borde duración 3h exactos = ×1.1 | base=10, dateStart→+3h | 10 × 1.0 × ... × 1.1 = 11 → **11** | "[3,8) -> 1.1" criterio inclusive lower |
| 19 | Slug con underscores matchea keyword con espacio (post-fix S2-5) | type='viaje_largo' | impact = 1.4 (alto) | normalizar `_`→` ` antes de includes |
| 20 | Saldo con caché vs realtime: balance se recomputa de transacciones | crear 100 transactions y leer /balance dos veces simultáneas | mismo número, no caché stale | confirma SUM en runtime |

---

## Conclusión

El motor de puntos está **funcionalmente correcto en el backend** (la fórmula PUNTOS.md está implementada con tests unitarios sólidos en `pointsCalculator.test.ts`, 4 escenarios de PUNTOS.md verificados), pero hay **fugas en los puntos de entrada y salida**:

- El **frontend NO refleja la fórmula del backend** (S0-1) → preview engañoso.
- La **compensación se persiste pero no se aplica al crear/editar** (S0-2) → divergencia entre `pointsCalculated` y la realidad.
- Las **rondas free están desactivadas** (S0-3) → la promesa de monetización por rondas extra no existe en V1.
- **Disputas no revierten dinero** (S0-4) → balance contaminado.
- **Force inseguro** (S0-5) → cualquiera puede forzar y la transacción no es atómica.

Recomendación: priorizar S0-1 → S0-2 → S0-5 → S0-3 → S0-4 en una sesión de hardening de medio día (≈4h trabajo + 2h tests). Los S1 son de seguimiento natural (S1-1 unique constraint + S1-3 XP bias + S1-6 unificar calculator).
