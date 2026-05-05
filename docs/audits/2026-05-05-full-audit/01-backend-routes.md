# Backend Routes Audit — 2026-05-05

**Alcance:** 36 archivos en `src/backend/src/routes/`
**Stack:** Express + Prisma (instancia compartida `lib/prisma.js`) + Zod + JWT
**Referencia previa:** `docs/audits/2026-05-02-audit-pre-v1.7.md`

## Resumen

- Archivos auditados: **36**
- **S0:** 4 · **S1:** 18 · **S2:** 23 · **S3:** 9
- Buenas noticias: **ningún archivo crea su propio `new PrismaClient()`** — todos importan la instancia compartida desde `lib/prisma.js`. Sin leaks de conexión.
- 4 hallazgos del audit 2026-05-02 PERSISTEN (S1-1 compensationDiscount está corregido en V1; S1-7 max() en negotiation message está corregido; S1-4 soft-delete y S1-6 JWT 7d siguen presentes).

---

## Findings S0 (críticos)

### S0-R-1 · `register-with-invitation` no fuerza email único antes de crear el usuario
- **Archivo:** `routes/invitations.ts:295-321`
- **Problema:** La ruta verifica `findUnique({where:{email}})` y luego hace `prisma.user.create(...)` sin transacción. Bajo concurrencia dos invitaciones distintas con mismo email pueden saltarse el guard. Adicionalmente la ruta es deprecated (sunset 2026-06-01) pero todavía monta. La verificación de duplicado es check-then-act sin lock.
- **Riesgo:** P3 schema constraint atrapará la mayoría, pero un attacker puede bombardear endpoints en paralelo: `register-with-invitation` + `accept-invite` + `register-with-code`. La ruta tampoco rejeta correctamente el caso de `existingUser.deletedAt!=null` (S0-4 audit pre-v1.7 — email reuso bloqueado).
- **Fix:** envolver lookup + create en `prisma.$transaction()` igual que `register-with-code` ya hace en `authRoutes.ts:510-557`. O, dado que está deprecated, devolver 410 Gone una vez frontend migre.
- **Esfuerzo:** 30min.

### S0-R-2 · `pointsRoutes.ts /reset-confirm` aprobación frágil — borra historial completo
- **Archivo:** `routes/pointsRoutes.ts:469-514`
- **Problema:** Aunque está flag-gated (`POINTS_RESET_ENABLED='true'`), el flujo cumple "noti pendiente" pero no valida que esa noti corresponde al request del partner correcto, ni hay relación de notification → user que la disparó. Cualquier user con coupleId puede crear su propia noti `reset_requested` con `prisma.notification.create` desde otro endpoint y esperar que la víctima la confirme — peor aún, el reset borra TODA la historia del couple (`deleteMany`).
- **Riesgo:** **Data loss irreversible** del balance histórico de la pareja. La ruta no está oficialmente expuesta, pero la lógica de aprobación es endeble. Falta tabla `ResetRequest` con auditoría.
- **Fix:** crear modelo `PointsResetRequest(id, coupleId, requestedBy, status, createdAt, approvedBy, approvedAt)` + validar `approvedBy != requestedBy` + soft-delete (mark transactions as `archived`) en lugar de `deleteMany`. Atado al spec v1.5+.
- **Esfuerzo:** 1 día.

### S0-R-3 · `categories.ts` — propose-change carece de validación zod del payload entrante
- **Archivo:** `routes/categories.ts:414-440`
- **Problema:** `req.body` se desestructura como `{ comment, ...fields }` y `fields` se serializa directo a JSON dentro de `payload`. No hay schema. Un user puede enviar `{ comment: 'x', name: '<script>...', basePoints: 99999, isCustom: true }` y al aceptar la propuesta (`ruleProposals.ts:142-149`) se hace `prisma.category.update({ where:{id:categoryId}, data: fields })` con campos arbitrarios — incluyendo `coupleId`, `isCustom`, etc. Esto permite **mover una categoría a otro couple** o reactivar categorías desactivadas saltándose validación.
- **Riesgo:** IDOR + integrity: el atacante propone, el partner desprevenido acepta y la categoría termina con campos manipulados.
- **Fix:** zod schema estricto en `categories.ts:414` que limite los campos editables (`name, emoji, basePoints, description`). En `ruleProposals.ts:142` validar también el set permitido en respond. Re-verificar que `categoryId` en payload pertenece al `req.coupleId` actual.
- **Esfuerzo:** 1h.

### S0-R-4 · Logging en consola del DELETE code en dev pero respondido al client
- **Archivo:** `routes/account.ts:37-39`
- **Problema:** En `NODE_ENV !== 'production'` se devuelve el código de borrado de cuenta en la propia response (`codeViaConsole: true, code`). Esto es deliberado para dev pero, si por error `NODE_ENV` no se setea a `production` en deploy, **expone la verificación de borrado** al frontend → bypass del flujo email.
- **Riesgo:** En prod si `NODE_ENV` queda undefined o `'development'`, un attacker logueado puede borrar la cuenta en una sola call (sin acceso al email). Histórico Render: la env var podría no estar fijada explícitamente.
- **Fix:** invertir la lógica: solo devolver `code` en respuesta si `NODE_ENV === 'development'` (estricto), no `!== 'production'`. Idealmente añadir feature flag `DELETE_CODE_IN_RESPONSE` opt-in. Verificar en Render dashboard que `NODE_ENV=production` está set.
- **Esfuerzo:** 15min.

---

## Findings S1 (alto impacto)

### S1-R-1 · `pointsRoutes.ts /balance` N+1 query sobre couple.users
- **Archivo:** `routes/pointsRoutes.ts:252-261`
- **Problema:** loop `for (const user of couple.users)` ejecuta `findMany` para cada user. Solo son 2 users por couple, pero patron N+1 explícito.
- **Fix:** una sola `groupBy({by:['userId'], _sum:{amount:true}, where:{coupleId}})`.
- **Esfuerzo:** 30min.

### S1-R-2 · `taskRoutes.ts /recurring` N+1 dentro de Promise.all loop
- **Archivo:** `routes/taskRoutes.ts:709-744`
- **Problema:** por cada tarea recurrente lanza 2 queries (`taskLog.count` + `taskLog.findFirst`). Si una pareja tiene 30 tareas recurrentes → 60 queries.
- **Fix:** una `groupBy` para counts y una `findMany` con `distinct` para nextOccurrences. O JOIN agregado.
- **Esfuerzo:** 1h.

### S1-R-3 · IDOR potencial en `pointsV2.ts /recalculate/:eventId`
- **Archivo:** `routes/pointsV2.ts:116-169`
- **Problema:** verifica `user.coupleId === event.coupleId` (correcto) PERO no verifica que el user sea el creador o que el event esté en draft. **Un partner puede recalcular el `pointsCalculated` de un event ya `accepted`/`forced` del otro user**, sobrescribiendo `pointsCalculated` post-acuerdo. La transacción `pointsAgreed` del balance no se afecta, pero la UI puede mostrar el evento con puntos incoherentes.
- **Fix:** restringir recalculate a status `draft` o solo para creator. Idealmente eliminar el endpoint si frontend ya no lo usa (sospechoso de dead-code).
- **Esfuerzo:** 30min + audit consumers.

### S1-R-4 · `eventRoutes.ts` POST/PUT — `Decimal` import al final del archivo
- **Archivo:** `routes/eventRoutes.ts:346`
- **Problema:** `import { Decimal } from '@prisma/client/runtime/library'` está al final del archivo, después de `export default`. ESM tolera el hoisting pero es código frágil. Posible TDZ runtime error según versión de Node + ts-node.
- **Fix:** mover import al top.
- **Esfuerzo:** 5min.

### S1-R-5 · `eventRoutes.ts` PUT — title/description vacío no se puede limpiar
- **Archivo:** `routes/eventRoutes.ts:285-294`
- **Problema:** `...(data.title && { title: data.title })` — si user envía `title: ''` no se update porque falsy. No se puede borrar título existente.
- **Fix:** condicionales por `data.title !== undefined` consistente con `numChildren`.
- **Esfuerzo:** 10min.

### S1-R-6 · `negotiationRoutes.ts /force` no guarda evidencia ni ronda
- **Archivo:** `routes/negotiationRoutes.ts:403-493`
- **Problema:** la ruta `force` actualiza event.status='forced' y crea PointsTransaction, pero NO actualiza la negociación que fuerza ni crea ronda con `responseType:'forced'`. La historia queda con la última ronda en `awaiting`, lo que confunde la UI Inbox.
- **Fix:** dentro del `$transaction` añadir `prisma.negotiation.update({where:{id:negotiationId}, data:{responseType:'forced', respondedBy:req.userId, respondedAt:new Date()}})`.
- **Esfuerzo:** 20min.

### S1-R-7 · `negotiationRoutes.ts /force` calcula balance fuera de transacción
- **Archivo:** `routes/negotiationRoutes.ts:429-449`
- **Problema:** lee balance con `aggregate`, valida `balance >= requiredPoints`, después escribe via `updateMany`+`create` sin transacción. **Race condition: dos forces concurrentes pueden gastar saldo dos veces** porque la lectura no es repeatable-read.
- **Fix:** envolver en `prisma.$transaction(async tx => {...})` y leer balance dentro de la transacción.
- **Esfuerzo:** 30min.

### S1-R-8 · `taskRoutes.ts /:taskId/log` race condition al "flipear" placeholder
- **Archivo:** `routes/taskRoutes.ts:314-350`
- **Problema:** dos completes concurrentes pueden ambos leer el mismo placeholder en `findFirst` y luego ambos llamar `update`. El segundo gana pero el primero queda perdido. Sin transacción ni guard `where: {completedBy:null}`.
- **Fix:** sustituir `update` por `updateMany({ where:{ id: placeholder.id, completedBy: null}, data: {...}})` y si `count===0` reintentar como create. O envolver en `$transaction`.
- **Esfuerzo:** 30min.

### S1-R-9 · `taskRoutes.ts /dispute` usa `verifiedBy` para el disputador
- **Archivo:** `routes/taskRoutes.ts:580-589`
- **Problema:** dispute escribe `verifiedBy: req.userId, verifiedAt: new Date()`. Semánticamente confuso: `verifiedBy` = quien aprobó. Aquí debería ser `disputedBy`. La query de filtros / analytics tratará disputed-by como verificador.
- **Fix:** añadir columna `disputedBy` al schema o cambiar lógica de auto-accept cron para discriminar.
- **Esfuerzo:** 1h (incluye migration).

### S1-R-10 · Soft-delete sin filtro `deletedAt: null` (PERSISTE de audit 2026-05-02 S1-4)
- **Archivos múltiples:**
  - `authRoutes.ts:395` (`prisma.user.findUnique({where:{email}})` — devuelve user eliminado)
  - `authRoutes.ts:521` (`tx.user.findUnique({where:{email}})` — bloquea re-registro post-30d hard purge si el ghost retiene email)
  - `categories.ts:19,60,115`, `family.ts` todos los handlers, `profile.ts:39`, `profile.ts:110-115`, `profile.ts:155`, `profile.ts:212`, `pointsRoutes.ts:429`, `notifications` queries → todas leen User sin filtrar `deletedAt`.
  - `couple.ts:33` (post-leave fetch user) y muchos más.
- **Riesgo:** users tombstone aparecen como activos, leak de PII de usuarios que ejercieron derecho al olvido, y bloqueo del email para re-registro del ghost. **PERSISTE** del audit pre-v1.7.
- **Fix:** helper `prismaUser.findActive()` que adjunta `deletedAt:null`. Auditar todas las routes y aplicar. ~25 lugares.
- **Esfuerzo:** 1 día.

### S1-R-11 · `journal.ts /entries` GET no filtra entries con autor `deletedAt`
- **Archivo:** `routes/journal.ts:43-55`
- **Problema:** devuelve entries cuyo autor fue eliminado (`deletedAt!=null`) — nombre/foto del partner desaparecido siguen visibles via include implícito al frontend. Aunque `recipientId` en POST sí filtra deletedAt (correcto desde v2.0.3.1 fix S1-1), el GET no.
- **Fix:** añadir filtro de autor activo: `author: { is: { deletedAt: null } }`.
- **Esfuerzo:** 15min.

### S1-R-12 · `notificationRoutes.ts /:id/read` race + double-fetch
- **Archivo:** `routes/notificationRoutes.ts:116-146`
- **Problema:** después de `updateMany` con count check hace `findUnique` para devolver el objeto. Two queries innecesarias y una posibilidad de race: la notificación podría haberse borrado entre el update y el fetch.
- **Fix:** usar `prisma.notification.update({where: {id, userId}, data: {isRead:true}})` con `try/catch` para `RecordNotFound` (P2025). Single query.
- **Esfuerzo:** 15min.

### S1-R-13 · `family.ts /pets` PUT — `quantity: 0` no actualizable
- **Archivo:** `routes/family.ts:282-285`
- **Problema:** `...(data.quantity && { quantity: data.quantity })` — `0` es falsy, no se aplica. Si usuario quiere bajar de 1 mascota a 0 no puede.
- **Fix:** `data.quantity !== undefined` en lugar de truthy check.
- **Esfuerzo:** 5min.

### S1-R-14 · `family.ts` y `categories.ts` — verificación couple es comparación insegura
- **Archivos:** `family.ts:112,163,274,321` ; `categories.ts:183,242,289,334`
- **Problema:** patrón repetido `if (!resource || resource.coupleId !== user.coupleId) return 403`. **Pero `user.coupleId` puede ser `null`** si el user dejó la pareja antes de eliminar. Si `resource.coupleId === null` (no debería existir pero…) ambos son null → comparación pasa → un user sin pareja podría operar sobre recursos huérfanos.
- **Fix:** usar `req.coupleId` (del JWT, validado por authMiddleware) y exigir que sea no-null. Mejor todavía, eliminar findUnique manual y usar `findFirst({where:{id, coupleId: req.coupleId}})` directamente.
- **Esfuerzo:** 1h.

### S1-R-15 · `taskProof.ts` POST permite proof a logs con `completedBy:null`
- **Archivo:** `routes/taskProof.ts:48-50`
- **Problema:** `if (log.completedBy && log.completedBy !== userId)` — si `completedBy` es null (placeholder auto-generado de recurrencia), CUALQUIER user del couple puede subir proof. No es un IDOR cross-couple, pero puede subir proof de tareas que aún no se completaron.
- **Fix:** rechazar `if (!log.completedBy || log.completedBy !== userId)`.
- **Esfuerzo:** 5min.

### S1-R-16 · `eventRoutes.ts` POST — falta `.refine()` para `numChildren <= couple.numChildren`
- **Archivo:** `routes/eventRoutes.ts:17` (schema)
- **Problema:** zod permite `numChildren=10` aunque la pareja tenga 0 hijos. Multiplica points spuriously (factor hijos × 2.2).
- **Fix:** validar contra `couple.numChildren` cargando el record antes del schema.parse.
- **Esfuerzo:** 30min.

### S1-R-17 · JWT expiry 7d sin refresh-token (PERSISTE audit 2026-05-02 S1-6)
- **Archivos:** `authRoutes.ts:82,369,564`; `invitations.ts:343,521`
- **Problema:** Todos los `jwt.sign` usan `expiresIn:'7d'`. Sin rotación.
- **Fix:** reducir a 1h + endpoint `/refresh`. El roadmap v1.7 lo tiene pendiente.
- **Esfuerzo:** 1 día.

### S1-R-18 · `analytics.ts` y `analyticsV2.ts` queries enormes sin paginación ni LIMIT
- **Archivos:** `analyticsV2.ts:69-81,116-119,133-137,152-155,222-227`; `analytics.ts` indirecto vía service
- **Problema:** `prisma.event.findMany`/`pointsTransaction.findMany`/`taskLog.findMany` sin `take` (ej. en `/insights/regenerate` carga TODAS las pointsTransactions del couple `prisma.pointsTransaction.findMany({where:{coupleId}})`). Para couples con años de uso → memoria + latencia.
- **Fix:** `take: 5000` defensivo + paginación cursor para large couples. Sentry timing si query > 500ms.
- **Esfuerzo:** 2h.

---

## Findings S2 (importantes, no bloqueantes)

### S2-R-1 · `categories.ts` POST sin zod schema
- **Archivo:** `routes/categories.ts:98-157`
- **Problema:** `req.body` desestructurado a mano con checks manuales (`!name || !emoji ...`). No valida `name.length`, no normaliza emoji length, no rechaza HTML en description.
- **Fix:** zod schema con `.max()` en string, regex emoji, sanitización description.

### S2-R-2 · `categories.ts` POST permite "duplicado" inconsistente con lowercase
- **Archivo:** `routes/categories.ts:124-133`
- **Problema:** check duplicado `name: name.toLowerCase()` pero crea con `name` original. Crea inconsistencia: la siguiente vez "Cocina" rechazará "cocina" pero almacena "Cocina" (mixed case).
- **Fix:** normalizar a lowercase antes de crear o crear con `.trim().toLowerCase()` consistentemente.

### S2-R-3 · `family.ts` falta zod schema (Children + Pets)
- **Archivo:** `routes/family.ts` todos los POST/PUT
- **Problema:** chequeos manuales `if (!data.name || !data.dateOfBirth)`. Sin `max` en name, sin validar `dateOfBirth` futura, sin validar `quantity > 0`.
- **Fix:** zod schemas estrictos.

### S2-R-4 · `family.ts /children` no cap en número de hijos por pareja
- **Archivo:** `routes/family.ts:35-44`
- **Problema:** sin upper bound. Test: añadir 10000 hijos para flood DB.
- **Fix:** validar `coupleHijos.count() < 20` antes de create.

### S2-R-5 · `notificationRoutes.ts` GET filtra por `userId` solo (no `coupleId`)
- **Archivo:** `routes/notificationRoutes.ts:29-32`
- **Problema:** filtro solo por userId. Si por bug otra ruta crea una `Notification` con userId correcto pero coupleId distinto, el user lo ve. Defensa en profundidad: `where: { userId, coupleId }`.
- **Fix:** añadir `coupleId: req.coupleId` al where.

### S2-R-6 · `pointsRoutes.ts /history` filtro `userId` query no valida pertenencia al couple
- **Archivo:** `routes/pointsRoutes.ts:43-45`
- **Problema:** `?userId=foreign` se inyecta en where. Como `coupleId` también está, prisma devuelve 0 rows para usuarios de otros couples — pero la consulta puede ser usada para enumerar IDs (timing oracle: tx existe vs no).
- **Fix:** validar que `userId` pertenece a `couple.users`.

### S2-R-7 · `analytics.ts` zero validation on date params
- **Archivo:** `routes/analytics.ts:32-34,57-58,107-108,etc`
- **Problema:** `new Date(startDate as string)` con string inválido produce `Invalid Date` → query con `gte: NaN` se comporta erratically (Prisma puede crashear o devolver todo).
- **Fix:** zod schema para query con `.refine(s => !isNaN(Date.parse(s)))`.

### S2-R-8 · `analyticsV2.ts /summary` parseRange acepta from > to sin validar
- **Archivo:** `routes/analyticsV2.ts:34-41`
- **Problema:** si user envía `from=2026-12-01&to=2026-01-01` el query devuelve [], pero gasta CPU. Validar.

### S2-R-9 · `calendar.ts` PUT /entry/:entryId — sin zod ni validación
- **Archivo:** `routes/calendar.ts:168-184`
- **Problema:** `const updateData = req.body` se pasa íntegro a `calendarService.updateCalendarEntry`. Sin schema, depende de la implementación del service para aceptar/rechazar campos.
- **Fix:** reusar `createEntrySchema.partial()`.

### S2-R-10 · `calendarV2.ts` PUT /entries/:id — `recurrence` field no se valida formato RRULE
- **Archivo:** `routes/calendarV2.ts:30`
- **Problema:** `recurrence: z.string().max(500)` acepta cualquier string. Si downstream se interpreta como RRULE para generar entries, malformed → loops o crashes.
- **Fix:** parser ICAL + try/catch en zod refine.

### S2-R-11 · `googleCalendarOauth.ts /auth` retorna URL pero no guarda CSRF state
- **Archivo:** `routes/googleCalendarOauth.ts:38-50`
- **Problema:** falta `state` parameter para CSRF protection del OAuth flow. Cuando se complete (v2.0.1.x), un attacker puede inducir al user a ligar la cuenta Google del attacker. Aunque el callback es stub (501), preparar antes de implementar.
- **Fix:** generar `state = crypto.randomBytes(16).toString('hex')`, guardar en `OAuthState` table o cookie, validar en callback.

### S2-R-12 · `invitations.ts /invite-partner` falta validación email
- **Archivo:** `routes/invitations.ts:44-46`
- **Problema:** `if (!inviteeEmail || typeof inviteeEmail !== 'string')` — sin regex/zod email. Permite "asd", "<>".
- **Fix:** zod email schema.

### S2-R-13 · `invitations.ts /reject-link-partner` no logging ni notification
- **Archivo:** `routes/invitations.ts:544-558`
- **Problema:** rechazar link request no notifica al `fromUser` ni cancela la noti pendiente.
- **Fix:** añadir notif al proposer + marcar `isRead`.

### S2-R-14 · `couple.ts /pause` sin rate limit ni transacción
- **Archivo:** `routes/couple.ts:40-54`
- **Problema:** no usa `criticalBucket` ni `writeBucket`. Permite spamming pause/resume desde frontend bug.
- **Fix:** aplicar `writeBucket`.

### S2-R-15 · `couple.ts /pause` user1 puede pausar sin consentimiento de user2
- **Archivo:** `routes/couple.ts:40-54`
- **Problema:** unilateral. La pareja afecta a ambos (digest, streaks). No hay mecanismo de consenso.
- **Fix:** flujo de propuesta con accept del partner (similar a configurationProposals).

### S2-R-16 · `todos.ts` PUT — partner puede cambiar `isShared` flag con bug
- **Archivo:** `routes/todos.ts:94-100`
- **Problema:** check `touched.every(k => k === 'isCompleted')` es correcto, pero si `updates` viene con campos extra ignorados por `updateTodoSchema.parse` (no strict), podrían colarse via prototype pollution.
- **Fix:** `.strict()` en zod schemas.

### S2-R-17 · `shopping.ts` GET sin paginación
- **Archivo:** `routes/shopping.ts:18-43`
- **Problema:** carga todos los items (`orderBy: createdAt asc`) sin LIMIT. Para users con listas históricas grandes podría disparar.
- **Fix:** `take: 500` y paginar history (`take:4` ya lo hace correctamente).

### S2-R-18 · `pointsV2.ts /preview` no filtra `user.deletedAt`
- **Archivo:** `routes/pointsV2.ts:30-32`
- **Problema:** lee `user` sin chequear `deletedAt`. (Cubierto por S1-R-10 pero aplica.)

### S2-R-19 · `journal.ts /retrospectives/:id/seen` IDOR potencial
- **Archivo:** `routes/journal.ts:181-196`
- **Problema:** verifica `couple.users[0]?.id === userId` pero NO valida que `req.params.id` pertenece a `coupleId`. Un attacker que conoce un retrospective.id de otro couple puede marcarlo seenByUser1.
- **Fix:** `findFirst({where:{id, coupleId}})` antes de `update`.

### S2-R-20 · `analyticsV2.ts /insights/:id/seen` IDOR — mismo patrón
- **Archivo:** `routes/analyticsV2.ts:275-289`
- **Problema:** idéntico a S2-R-19 — no valida que el insight pertenece al couple antes del update.
- **Fix:** `findFirst({where:{id, coupleId}})` antes de update.

### S2-R-21 · `gamificationV2.ts /replay/:key/seen` falta validar clave permitida
- **Archivo:** `routes/gamificationV2.ts:126-137`
- **Problema:** `replayKey` viene del path params sin validar formato. Permite un user con un coupleId crear infinitas filas en `coupleReplaySeen` con keys arbitrarias (DoS minor).
- **Fix:** zod regex `/^[a-z0-9_-]{1,40}$/`.

### S2-R-22 · `taskRoutes.ts` Decimal cap en taskLog no aplica modifiers cap (PERSISTE de audit 2026-05-02)
- **Archivo:** `routes/taskRoutes.ts:34-39`
- **Problema:** `pointsBase.max(100)` pero el `pointsFinal` después se multiplica por streak × weekly × pet (~2.88×) → puede exceder 100 sin tope explícito.
- **Fix:** validar `pointsFinal <= 500` después de calcular.

### S2-R-23 · `eventRoutes.ts` GET — devuelve `email` del creator (PII innecesaria)
- **Archivo:** `routes/eventRoutes.ts:222`
- **Problema:** `creator.email` se incluye en respuesta single-event. El partner no necesita ese email; ya lo conoce.
- **Fix:** quitar `email` del select / mapping.

---

## Findings S3 (cosmético / refactor)

### S3-R-1 · 68+ usos de `(req as any).user.id` en lugar de `req.userId` tipado
- Persiste de audit 2026-05-02 S2-7. Especialmente notorio en `account.ts`, `categories.ts`, `family.ts`, `pointsV2.ts`, `journal.ts`, `gamificationV2.ts`, `activityTemplates.ts`. **Usar `req.userId` y `req.coupleId` consistentemente** (ya está el typing en authMiddleware).

### S3-R-2 · `gamification.ts` (V1) — solo expone 1 endpoint, candidato a fusión con `gamificationV2.ts`
- 25 líneas para un solo `/status`. Documentar o eliminar.

### S3-R-3 · `negotiation.ts` (V2 routes) — marcadas Sunset 2026-06-01
- Sigue activo pero en deprecation. Plan de eliminación: confirmar que `EventNegotiationCard.tsx` migró y devolver 410.

### S3-R-4 · `invitations.ts` 4 endpoints deprecated cohabitando con join-code
- Mismo plan: confirmar migración y devolver 410.

### S3-R-5 · `activityRoutes.ts` (`/api/recent-activity`) — 32 líneas, sin write endpoints
- Renombrar archivo a `recentActivity.ts` para evitar confusión con `activityTemplates.ts`.

### S3-R-6 · `analytics.ts` y `analyticsV2.ts` coexisten — solapamiento heatmap, completion-rate
- V1 y V2 ofrecen `/heatmap` con shapes distintas. Planificar deprecation V1 para post-D30.

### S3-R-7 · `pointsRoutes.ts /stats` — `mostActiveMonth: 'March 2026'` hardcoded
- Linea 358. Placeholder que llegó a producción.

### S3-R-8 · `configurationRoutes.ts` defaults definidos dos veces (GET + reset)
- Líneas 48-99 y 184-235 son idénticos. Extraer a constante.

### S3-R-9 · `notificationsPush.ts /test` no valida que las subs sean del mismo coupleId
- Línea 79: `findMany({where:{userId}})`. Si user tuvo sub en couple anterior y sigue en BD, recibe push (poco probable post-deletion service, pero defensa-en-profundidad: añadir `coupleId`).

---

## Métricas de cobertura

| Categoría | Findings |
|---|---|
| Validación zod faltante | S0-R-3, S2-R-1, S2-R-3, S2-R-9, S2-R-12 |
| IDOR/Authorization | S0-R-1, S0-R-3, S1-R-3, S1-R-11, S1-R-14, S1-R-15, S2-R-19, S2-R-20 |
| Race / transaction faltante | S0-R-1, S0-R-2, S1-R-7, S1-R-8 |
| N+1 queries | S1-R-1, S1-R-2 |
| Soft-delete consistency | S1-R-10, S1-R-11, S2-R-18 |
| Rate limiting faltante | S2-R-14 (couple/pause), pointsRoutes/balance/history sin bucket explícito |
| Logs sensibles | S0-R-4 (delete code en response dev) |
| Dead code / V1-V2 dup | S3-R-2, S3-R-3, S3-R-4, S3-R-6 |

## Recomendación priorizada

**Sprint hotfix (1-2 días):** S0-R-3, S0-R-4, S1-R-7 (race force), S1-R-8 (race log), S1-R-15, S1-R-11.

**Sprint v2.4:** S0-R-1, S0-R-2 (rediseño reset), S1-R-3, S1-R-6 (force history), S1-R-10 (soft-delete sweep), S1-R-14, S1-R-17 (refresh tokens), S1-R-18 (analytics paging).

**Backlog:** todo S2 + S3 cuando toque la zona.

---

*Auditoría 2026-05-05 — sesión backend routes. 36 archivos × ~9000 líneas inspeccionadas.*
