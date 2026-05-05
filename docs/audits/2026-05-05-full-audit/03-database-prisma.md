# Auditoría 03 · Base de datos & Prisma — 2026-05-05

**Auditor:** Auditor senior de DB relacionales (PG/SQLite)
**Alcance:** `src/backend/prisma/schema.prisma` (1151 líneas, 38 modelos) + 27 migraciones en `prisma/migrations/`.
**Métodos:** Lectura completa del schema + cada `migration.sql`, cruce con servicios (`accountDeletionService`, `analyticsService`, `authService`, `configurationProposalService`, `dataRetentionJob`), inspección de `dev.db` (SQLite stale local) y `migration_lock.toml` (declarado `postgresql`).

> **Hallazgo transversal · Doble naturaleza del histórico de migraciones**
> Las 6 primeras migraciones (`20260331…_init` → `20260404…_restore_event_relation_on_points_transaction`) están escritas en **dialecto SQLite puro** (`PRAGMA defer_foreign_keys`, `RedefineTables`, `DATETIME`, `BOOLEAN DEFAULT true`, `DECIMAL` sin precisión). El `migration_lock.toml` declara `provider = "postgresql"` y el datasource del schema también. Estas 6 migraciones **no son ejecutables en Postgres** (`DATETIME` no existe, `PRAGMA` lanza error). Esto es el origen documentado del problema histórico de `_prisma_migrations` en Supabase: en producción la BD se construyó con `db push` o SQL manual y el ledger está desincronizado.
> Todas las migraciones de v1.1 en adelante (a partir de `20260412…`) sí están en dialecto PG (`TIMESTAMP(3)`, `ALTER TABLE ADD COLUMN` puros, sin PRAGMA). El problema queda confinado a las 6 migraciones de bootstrap.

---

## Resumen ejecutivo

| Sev | Cuenta | Nota |
|---|---|---|
| S0 | 5 | Riesgos críticos de corrupción de saldo, login bloqueado, FK roto en cascada al borrar User. |
| S1 | 11 | Indices faltantes en queries hot-path, soft-delete no filtrado en login, schema-vs-DB inconsistencias. |
| S2 | 9 | Naming, modelos huérfanos, defaults discutibles, enum-as-string sin CHECK. |
| S3 | 6 | Limpieza, comentarios de schema, dead fields. |

---

## S0 — Bloqueantes / corrupción de datos

### S0-1 · Login no filtra `deletedAt` → usuarios "fantasma" pueden iniciar sesión
- **Archivo:** `src/backend/src/services/authService.ts:308-311`
- **Problema:** `loginUser()` hace `prisma.user.findUnique({ where: { email } })` sin condición `deletedAt: null`. El user-fantasma (`name='Usuario eliminado'`, `passwordHash=''`) tiene email único determinista (`ghost-{coupleId}@deleted.local`) y un user soft-deleted conserva su email reescrito (`deleted-{userId}@deleted.local`). Aunque `passwordHash=''` evita login con password real, **cualquier consulta que use email para flujos de invitación o reset password operará sobre el ghost** (ver `routes/invitations.ts:296`, `:405` y `routes/authRoutes.ts:395`, `:521`). En particular `findUnique({ where: { email } })` dentro de `signupUser` puede encontrar un email reescrito y bloquear un nuevo registro porque el unique está en email puro.
- **Riesgo:** flujos de re-invitación + signup tras delete pueden fallar con `Email already registered`. Reset password emails pueden ir al ghost.
- **Fix:** añadir filtro `deletedAt: null` en login + signupUser, o crear un índice único parcial `WHERE deletedAt IS NULL` y dropear el `@unique` global de email. La migración `20260502190000_v1_6_7_ghost_unique` sólo añadió un índice **parcial de búsqueda**, no resuelve el unique constraint colisivo. Recomendación: migrar `User.email` a partial-unique en una nueva migración.
- **Esfuerzo:** M (4h: schema change + backfill + tests + revisar 8 sitios que llaman `findUnique({email})`).

### S0-2 · `dataRetentionJob` purga el ghost user → cascade borra histórico
- **Archivo:** `src/backend/src/jobs/dataRetentionJob.ts:42` + `src/backend/prisma/schema.prisma:181-250`
- **Problema:** El job borra **todos** los users con `deletedAt < now-31d`. El ghost user del couple también tiene `deletedAt` set (línea `accountDeletionService.ts:44`). A los 31 días el ghost se hard-purga. Las FKs a este ghost desde `PointsTransaction.userId`, `Event.createdBy`, `Negotiation.proposedBy/respondedBy`, `TaskLog.completedBy/verifiedBy` están en `onDelete: SetNull`, así que **no rompen integridad pero pierden la atribución** del histórico que el flujo de v1.6.1 explícitamente quería preservar (decisión brainstorm 4 documentada en `accountDeletionService.ts:1-9`).
- **Riesgo:** desaparece el "Usuario eliminado" en historial transcurridos 30 días → frontend muestra `null`/`Desconocido` rompiendo `routes/history.ts:35`. Si además el couple sigue teniendo un user activo, el ghost que servía de "anonimizador" se evapora y futuras llamadas a `accountDeletionService` recrearán uno nuevo (ok), pero el histórico ya quedó huérfano.
- **Fix:** excluir ghosts del job: `where: { deletedAt: { lt: cutoff }, NOT: { name: 'Usuario eliminado' } }`. O mejor: marcar ghosts con un campo explícito `User.isGhost` (Boolean) y filtrar por él. Considerar también purga del ghost sólo cuando `couple.dissolvedAt` esté set y haya pasado X tiempo.
- **Esfuerzo:** S (1h: añadir filtro + test).

### S0-3 · `User.coupleId` opcional + `onDelete: Cascade` → borrar Couple borra el ghost
- **Archivo:** `schema.prisma:181-199`
- **Problema:** `User.couple` está en `onDelete: Cascade`. Si por cualquier vía (ej. cron de purga, prueba de QA, query manual) se borra una `Couple`, **todos** los users vinculados — incluido el ghost — se borran en cascada. Los `PointsTransaction`, `Event`, `Negotiation` que apuntaban al ghost quedan en `null` (SetNull) y el histórico se pierde silenciosamente.
- **Riesgo:** corrupción del histórico al disolver una couple si alguien ejecuta `couple.delete()` en lugar de set `dissolvedAt`. No hay protección a nivel DB.
- **Fix:** opción A (preferida): cambiar `User.couple` a `onDelete: Restrict` y disolver couples vía soft-delete (`dissolvedAt`) sin DELETE. Opción B: añadir un trigger DB que prohíba `DELETE FROM Couple` si tiene users con TaskLogs/Events.
- **Esfuerzo:** M (2-3h: cambio de FK + revisar tests + auditar callsites de `couple.delete()`).

### S0-4 · `PointsTransaction.userId` SetNull rompe el invariante "una transacción siempre pertenece a alguien"
- **Archivo:** `schema.prisma:407-432`
- **Problema:** `PointsTransaction.user` está en `onDelete: SetNull`. Si un user es hard-purgado (S0-2 o S0-3), todas sus transacciones pasan a `userId = null`. El cálculo de saldo `GET /api/points/balance` agrupa por `userId`; las transacciones huérfanas no se imputarán a ningún usuario y **el net del couple deja de cuadrar**. Demoservice ejemplifica el problema con sumas concretas (`demoService.ts:85-87`).
- **Riesgo:** corrupción aritmética del ledger. Saldo total ≠ suma de saldos por user.
- **Fix:** opción A (preferida): mantener `SetNull` pero **pre-migrar** las transacciones al ghost antes de hard-delete (esto es lo que `accountDeletionService.ts:57` ya hace para el caso A; falta proteger el caso del cron de retención). Opción B: pasar a `onDelete: Restrict` y forzar reasignación al ghost en la lógica de purga. Ver S0-2.
- **Esfuerzo:** M (combinable con S0-2).

### S0-5 · Init migration en SQLite-only → la BD de Supabase NO está reproducible desde `migrations/`
- **Archivos:** `prisma/migrations/20260331152147_init/migration.sql:8` (`DATETIME`), `20260403232032_init/migration.sql:8-9` (`PRAGMA`), `20260401180620_add_v2_tables/migration.sql`, `20260404181236_add_invitations/migration.sql:12-13`, `20260404193243_remove_unique_related_event_id/migration.sql`, `20260404201613_restore_event_relation_on_points_transaction/migration.sql` + `migration_lock.toml`
- **Problema:** las 6 primeras migraciones contienen `PRAGMA defer_foreign_keys=ON`, `PRAGMA foreign_keys=OFF`, `DATETIME` y `DECIMAL` sin precisión. Estos son inválidos en Postgres. El `migration_lock.toml` declara `postgresql`. Cualquier intento de `prisma migrate deploy` desde una BD limpia de Postgres fallará en la primera migración. Esto es el caso documentado en `docs/audits/.../project_prisma_supabase_gotcha.md`.
- **Riesgo:** la BD productiva no es reproducible. Si Supabase corrompe `_prisma_migrations` o se necesita restaurar a un nuevo proyecto, el equipo no puede `migrate deploy` — debe rehacer schema con `db push` o SQL manual. Afecta DR (disaster recovery) y onboarding de nuevos entornos (staging).
- **Fix:** crear una migración consolidada `00000000000000_baseline_postgres/migration.sql` con el `CREATE TABLE` completo en dialecto PG (generable con `prisma migrate diff --from-empty --to-schema-datamodel`) y marcar las 6 primeras como aplicadas-pero-sin-ejecutar (`prisma migrate resolve --applied`). Documentar el procedimiento de restaurado en `docs/STATUS.md`.
- **Esfuerzo:** L (1 día: generar baseline + procedimiento + probar en Supabase staging).

---

## S1 — Riesgos altos / consistencia

### S1-1 · `Notification` falta índice compuesto `(userId, isRead)`
- **Archivo:** `schema.prisma:483-507`
- **Problema:** queries comunes son `WHERE userId = X AND isRead = false ORDER BY createdAt DESC`. Existen tres índices separados: `userId`, `isRead`, `createdAt`. PG elegirá uno y filtrará en memoria. Con miles de notis por user, lentitud notable.
- **Riesgo:** scan parcial en NotificationBell. Latencia creciente.
- **Fix:** `@@index([userId, isRead, createdAt(sort: Desc)])`. Drop opcional el `@@index([isRead])` aislado (poco selectivo globalmente).
- **Esfuerzo:** XS (10 min, 1 migración aditiva).

### S1-2 · `PointsTransaction` falta índice compuesto `(coupleId, createdAt)`
- **Archivo:** `schema.prisma:407-432`
- **Problema:** `GET /api/points/history?limit=50&offset=0` hace `WHERE coupleId = X ORDER BY createdAt DESC`. Hay índice individual en `coupleId` y otro en `createdAt`. PG no usa ambos eficientemente.
- **Fix:** `@@index([coupleId, createdAt(sort: Desc)])`.
- **Esfuerzo:** XS.

### S1-3 · `TaskLog` falta índice `(coupleId, date)` y `(coupleId, completedBy, date)`
- **Archivo:** `schema.prisma:335-378`
- **Problema:** `analyticsService.ts:771-812` filtra repetidamente por `coupleId + completedBy + date`. Existe `coupleId` y `date` separados. PG hará bitmap scan o merge.
- **Fix:** `@@index([coupleId, date])` y `@@index([coupleId, completedBy, date])`.
- **Esfuerzo:** XS.

### S1-4 · `Event` falta índice `(coupleId, status, dateStart)`
- **Archivo:** `schema.prisma:253-297`
- **Problema:** `GET /api/events?status=pending&limit=20` filtra por `coupleId + status` y ordena por `dateStart`. Tres índices individuales no cubren la tripla.
- **Fix:** `@@index([coupleId, status, dateStart])`.
- **Esfuerzo:** XS.

### S1-5 · `User.coupleId` no tiene FK con `onDelete: Restrict` ni filtro de soft-delete por defecto en queries
- **Archivo:** `schema.prisma:183` + ~50 queries en backend
- **Problema:** `coupleId` ahora es `String?` (nullable) — fue cambiado en `20260403232032_init`. Pero `authMiddleware.ts:81-89` rechaza users sin `coupleId`, lo cual implica que la nullabilidad solo es válida transitoriamente durante signup. No hay constraint que lo aplique. Además, ~30 queries de routes usan `where: { id: userId }` o `where: { email }` sin filtrar `deletedAt: null`. Es manual y olvidable.
- **Fix:** crear un Prisma extension/middleware que añada `deletedAt: null` por defecto a queries de User (escape hatch explícito para casos como `accountDeletionService`), o usar un view `ActiveUser`.
- **Esfuerzo:** M (3-4h).

### S1-6 · `Compensation.linkedTaskId` SetNull pero sin index → query lenta al borrar Task
- **Archivo:** `schema.prisma:435-462`
- **Problema:** al borrar una Task, PG hace `UPDATE Compensation SET linkedTaskId=NULL WHERE linkedTaskId=X`. No hay índice en `linkedTaskId`, será full-scan.
- **Fix:** `@@index([linkedTaskId])`.
- **Esfuerzo:** XS.

### S1-7 · `ActivityTemplate.coupleId` nullable + onDelete Cascade es contradictorio para seeds globales
- **Archivo:** `schema.prisma:940-969`
- **Problema:** los templates con `coupleId=null` son seed globales compartidos. Si en producción se hace `DELETE FROM Couple WHERE id=X`, los seeds globales NO se borran (coupleId IS NULL). Bien. Pero el `@@index([coupleId, isActive])` no es eficiente para queries `WHERE coupleId IS NULL` porque en PG por defecto NULLs van al final del btree. Las queries del catálogo `GET /api/activity-templates?grouped=true` traen tanto seeds como custom; deberían usar dos índices o un partial index.
- **Fix:** `@@index([category, isActive]) WHERE coupleId IS NULL` (partial) + mantener el actual para custom.
- **Esfuerzo:** S (30 min).

### S1-8 · `ConfigurationProposal.proposedById` y `ConfigurationChangeLog.appliedById` cascade en User
- **Archivo:** `schema.prisma:974-1009`
- **Problema:** ambos en `onDelete: Cascade`. Cuando un user es purgado (incluido el ghost a 31d), las propuestas y el changelog **se borran**. Esto contradice el principio v2.0.4 de "log de cambios visible 10 últimos en Settings → Reglas".
- **Riesgo:** pérdida del audit trail de cambios de configuración consensuados.
- **Fix:** cambiar a `onDelete: SetNull` (con `proposedById String?` y `appliedById String?`). El histórico queda como "cambio aplicado por usuario eliminado".
- **Esfuerzo:** S (30 min schema change + migración).

### S1-9 · `Invitation.toUserId` y `fromUserId` Cascade → invitaciones desaparecen al borrar inviter/invitee
- **Archivo:** `schema.prisma:628-652`
- **Problema:** `fromUser` Cascade y `toUser` Cascade. Si Alice invita a Bob, Alice elimina cuenta → la invitación de Bob desaparece y Bob nunca se entera. Si Bob acepta y luego Alice se va, el registro histórico también muere.
- **Riesgo:** UX confuso (invitaciones que desaparecen). Para ghost-flow es problemático: con `accountDeletionService` reasignamos al ghost a `Event.createdBy` etc., pero no a Invitation.
- **Fix:** `onDelete: SetNull` en `fromUser` (con `fromUserId String?`); mantener Cascade en `toUser` solo si la invitación nunca tuvo significado tras delete.
- **Esfuerzo:** S.

### S1-10 · `RefreshToken` schema preparado pero no activo + falta partial index para queries de "tokens activos"
- **Archivo:** `schema.prisma:900-914` + `migrations/20261001000000_v1_8_prep_refresh_tokens/migration.sql`
- **Problema:** la query frecuente será `WHERE userId = X AND revokedAt IS NULL AND expiresAt > now`. Sólo hay índice `userId` y `expiresAt` separados. Cuando se active, lentitud.
- **Fix:** añadir `@@index([userId, revokedAt, expiresAt])` o partial `WHERE revokedAt IS NULL`.
- **Esfuerzo:** XS, **antes** de activar v1.8.

### S1-11 · Schema-vs-DB inconsistencia: `dev.db` (SQLite) está obsoleto y diverge del schema actual
- **Archivo:** `src/backend/prisma/dev.db` (no en git)
- **Problema:** `sqlite3 dev.db .schema` muestra tablas sin columnas v1.1/v1.2/v1.6/v1.7/v2.0.x: falta `joinCode`, `xp`, `level`, `dissolvedAt`, `pausedUntil`, `currentNegotiationRound`, `negotiationHistory` (parcialmente añadido por ALTER), `proofImageUrl`, etc. La columna `Couple.notificationsEnabled` está pero `relationshipStartDate` no. Los modelos v1.7+ (`CoupleLevel`, `CoupleStreak`, `JournalEntry`, `AnalyticsInsight`, `ActivityTemplate`, `ConfigurationProposal`, `RefreshToken`) **no existen** en dev.db.
- **Riesgo:** desarrolladores que usen dev.db local no podrán probar features modernas. Tests que asuman estos modelos petarán. Las migraciones recientes nunca se aplicaron a SQLite porque están en dialecto PG (`TIMESTAMP(3)`, `ALTER TABLE ADD COLUMN x, y` con coma).
- **Fix:** decisión: o bien (a) borrar `dev.db` y documentar que el dev local **debe** correr contra Postgres (Supabase staging o local docker), o (b) mantener dev.db pero generar migraciones duales (no escala). Recomendación: opción A. Añadir `npm run db:reset` que regenera el schema desde Prisma `db push` para tests rápidos.
- **Esfuerzo:** S (1h: documentar + script).

---

## S2 — Higiene / consistencia

### S2-1 · Dos sistemas paralelos de logros sin migrar
- **Modelos:** `Achievement` (V2, schema.prisma:698) + `UserAchievement` (V2) **vs** `AchievementDefinition` (v1.2, schema.prisma:1012) + `CoupleAchievement` (v1.2)
- **Problema:** ambos están en uso. `authService.ts:184-189` crea seed `Achievement`s por couple (V2). `achievementCheckService.ts` y `digestService.ts:89` usan ambos. Hay redundancia y riesgo de divergencia.
- **Riesgo:** duplicación de logros, complejidad mantenimiento.
- **Fix:** decidir un solo modelo (V1.2 `AchievementDefinition` global parece la elección correcta — no se duplica por couple) y migrar el seed de `Achievement` a llamadas a `AchievementDefinition`. Marcar `Achievement` y `UserAchievement` como deprecated y planificar drop en v2.3.
- **Esfuerzo:** L (1 día).

### S2-2 · `Couple.level` es String libre — los slugs cambiaron en v2.1.0 sin CHECK
- **Archivo:** `schema.prisma:46` + `migrations/20261105000000_v2_1_0_levels_rename/migration.sql`
- **Problema:** la migración renombra slugs `nido→encuentro`, `brote→confianza`, etc. Hay un fallback final `WHERE level NOT IN (...)` defensivo (bien). Pero `level` sigue siendo `String` libre, sin CHECK constraint y sin enum Prisma. Cualquier futuro typo en backend insertará un valor inválido sin error.
- **Riesgo:** datos inválidos silenciosos.
- **Fix:** convertir a `enum CoupleLevelSlug { encuentro confianza compania complicidad refugio raices tribu legado eterno mito }`.
- **Esfuerzo:** S (1h, requiere migración con CAST).

### S2-3 · `Event.status`, `Task.frequency`, `TaskLog.status`, `Negotiation.responseType`, `Subscription.plan`, etc. son strings libres
- **Archivos:** `schema.prisma:272`, `:313`, `:350`, `:390`, `:514`, `:140` (`CoupleChallenge.status`), `:635` (`Invitation.status`), `:984` (`ConfigurationProposal.status`), `:766` (`CalendarEntry.type`), `:702` (`Achievement.type`), etc.
- **Problema:** ~25 campos enum-like sin enum. Riesgo de typos y sin garantía DB. Hay comentarios en schema que describen los valores válidos pero no se aplican.
- **Fix:** introducir enums Prisma de forma incremental (priorizar los más críticos: `Event.status`, `TaskLog.status`, `Subscription.plan`, `Negotiation.responseType`).
- **Esfuerzo:** M (4-6h fragmentable).

### S2-4 · `Couple.maxFreeRounds` default desincronizado con prod
- **Archivo:** `schema.prisma:274` (`@default(99)`) vs `migrations/20260331152147_init/migration.sql:48` (`DEFAULT 2`)
- **Problema:** schema dice 99 (efectivamente ilimitado para MVP free), la migración inicial en SQLite dice 2. CLAUDE.md sección 8 dice "Free: máx 2 rondas. Premium: ilimitadas." → la lógica está en código, no en DB. Pero el default de columna no coincide y filas existentes tienen valores distintos.
- **Riesgo:** confusión, eventos viejos con maxFreeRounds=2 conviven con nuevos a 99.
- **Fix:** decidir cuál es la verdad. Si es 99 (decisión schema actual), backfill `UPDATE Event SET maxFreeRounds=99 WHERE maxFreeRounds=2`. Documentar.
- **Esfuerzo:** S.

### S2-5 · Mezcla `cuid()` y `uuid()` en `id` PKs
- **Archivos:** `PremiumInterest` (`schema.prisma:1124` uuid), `MoodLog` (`:1140` uuid). Resto: cuid.
- **Problema:** sin razón aparente. Conviene mantener consistencia (todos cuid o todos uuid). uuid es más estándar inter-DB pero más largo.
- **Fix:** decidir y unificar (no es bloqueante).
- **Esfuerzo:** S si se quiere unificar.

### S2-6 · `Couple` campos de gamificación legacy sin uso aparente
- **Archivo:** `schema.prisma:44-50` (`xp`, `level`, `dailyStreakDays`, `weeklyStreakWeeks`, `dailyStreakFreezerUsed`, `lastActivityDate`)
- **Problema:** v1.7 introdujo `CoupleLevel` y `CoupleStreak` como modelos separados (tablas `CoupleLevel`, `CoupleStreak`). Los campos en `Couple` quedan como **doble fuente de verdad**. ¿Cuál se actualiza? `streakService.ts` y `gamificationService.ts` deben revisarse.
- **Riesgo:** divergencia. Una fuente queda obsoleta y nadie sabe cuál.
- **Fix:** auditar qué fuente se usa en queries. Eliminar la no usada en una migración.
- **Esfuerzo:** M.

### S2-7 · `JournalEntry.recipientId` en SetNull pero sin index
- **Archivo:** `schema.prisma:849`
- **Problema:** al borrar User, hace `UPDATE JournalEntry SET recipientId=NULL WHERE recipientId=X`. Sin índice. Adicionalmente `routes/journal.ts:72` filtra por `recipientId` (`where: { id: data.recipientId, coupleId, deletedAt: null }`). Falta índice.
- **Fix:** `@@index([recipientId])`.
- **Esfuerzo:** XS.

### S2-8 · `Task.defaultAssigneeId` no tiene FK ni índice
- **Archivo:** `schema.prisma:320` + `migrations/20260422100000_add_task_default_assignee/migration.sql`
- **Problema:** la migración añadió la columna sin FOREIGN KEY constraint ni índice. Si se borra el user asignado, `Task.defaultAssigneeId` queda con un id inválido.
- **Riesgo:** datos huérfanos. Frontend muestra "asignado a X" donde X no existe.
- **Fix:** añadir relación Prisma `assignedUser User? @relation("TaskDefaultAssignee", fields: [defaultAssigneeId], references: [id], onDelete: SetNull)` + índice.
- **Esfuerzo:** S.

### S2-9 · `CalendarEntry.relatedEventId` y `relatedTaskId` sin FK ni índice
- **Archivo:** `schema.prisma:772-773`
- **Problema:** strings sueltos. Si se borra el Event/Task referenciado, la CalendarEntry queda con un id muerto.
- **Fix:** añadir relaciones Prisma a `Event` y `Task` con `onDelete: Cascade`.
- **Esfuerzo:** S.

---

## S3 — Limpieza / nice-to-have

### S3-1 · Comentarios desfasados en schema
- `Event.maxFreeRounds @default(99) // MVP: no premium plan yet` (línea 274) — premium ya está en roadmap pero el comentario sigue.
- `User.notificationPreferences` (línea 196) sin comentario explicando estructura JSON esperada.

### S3-2 · `CalendarEntry.updatedAt @updatedAt @default(now())` redundante
- **Archivo:** `schema.prisma:788`. `@updatedAt` ya gestiona la inicialización; `@default(now())` no aplica en updates pero coincide con la migración aditiva v2.0.1 (`DEFAULT CURRENT_TIMESTAMP`). Cosmético.

### S3-3 · Naming inconsistente: snake_case en algunos comentarios SQL pero CamelCase en columnas
- Schema usa CamelCase consistente. Las migraciones también. Bien. Sólo nota: `_prisma_migrations` (snake) por convención Prisma — no tocar.

### S3-4 · `Couple.numChildren` legacy duplicado vs `Child[]`
- **Archivo:** `schema.prisma:19`
- **Problema:** `Couple.numChildren` fue el campo MVP. Ahora hay tabla `Child[]` y `Event.numChildren` (ausencia concreta). `Couple.numChildren` no se usa para nada operativo (la lógica usa `Event.numChildren`). Es dead field.
- **Fix:** dropear en v2.3.
- **Esfuerzo:** S.

### S3-5 · `JournalPrompt` sin coupleId — es global pero sin índice por categoría
- **Archivo:** `schema.prisma:872-879`
- **Fix:** `@@index([category, weight])` para selección ponderada por categoría.

### S3-6 · `ServiceProvider` falta soft-delete o cascade clarification
- **Archivo:** `schema.prisma:817-831`. `active` Boolean es soft-delete de facto. Documentar.

---

## Inconsistencias schema-vs-código

| Lugar | Problema |
|---|---|
| `schema.prisma:184` | `User.email @unique` global pero `accountDeletionService.ts` necesita 2 emails distintos por user borrado (ghost compartido + soft-deleted reescrito). El UNIQUE actual es coincidente con casos felices, pero **no garantiza ghost único por couple** ante condiciones de race con falta de transacción aislada. La nota en `schema.prisma:1`-`schema.prisma:7` no menciona índice parcial. |
| `schema.prisma:1124` | `PremiumInterest.id @default(uuid())` — único modelo con uuid puro entre los V1. Inconsistente con resto. |
| `schema.prisma:1140` | `MoodLog.id @default(uuid())` — idem. |
| `dev.db` vs `schema.prisma` | dev.db está al nivel de v1.0, schema actual es v2.2.8. Divergencia gigantesca. Ver S1-11. |
| `migrations/20260413000000_v1_2_gamification` añade `Couple.level @default('nido')` | El schema actual dice `@default('encuentro')` (línea 46). La migración v2.1.0 hizo el rename **de filas** pero **no del default de columna**. Filas nuevas (couples creadas pre-rename) ya tienen 'nido' como default; couples post-rename usan el default actualizado. Hay una migración aditiva que cambia el default de columna pero no la veo aquí — verificar `ALTER TABLE Couple ALTER COLUMN level SET DEFAULT 'encuentro'`. Si no está, **hay drift** entre schema declarado y DB real. |
| `migrations/20261020000000_v2_0_4_catalog_consensus:14` | `pointsBaseSuggested DECIMAL(65,30)` — precisión absurda. Schema dice `Decimal @default(10.0)` (sin precisión, Prisma elige). Funcional pero inconsistente con el resto de Decimals que también son sin precisión. |

---

## Recomendaciones priorizadas

**Sprint inmediato (S0):**
1. S0-1: filtrar `deletedAt: null` en login + signup (4h).
2. S0-2: excluir ghosts del cron de retención (1h).
3. S0-5: generar baseline de migración PG y documentar restore (1d).

**Sprint v2.3 (S1):**
4. Añadir índices compuestos faltantes (S1-1 a S1-4, S1-6, S1-7, S1-10, S2-7) — todos ≤30 min, una sola migración aditiva.
5. S1-8 + S1-9: cambiar Cascade→SetNull en `ConfigurationProposal/ChangeLog/Invitation` (1h).
6. S1-11: borrar `dev.db` y documentar uso de Postgres local (30 min).

**Sprint v2.4 (S2):**
7. Decidir entre Achievement/AchievementDefinition (S2-1).
8. Convertir slugs y enum-like strings a enums Prisma (S2-2 + S2-3 priorizando críticos).
9. Auditar y eliminar campos de gamificación legacy en `Couple` (S2-6).

---

## Notas finales

- **No hay enums Prisma definidos** en el schema. 25+ campos string podrían beneficiarse.
- El sistema de soft-delete de User está bien diseñado conceptualmente (ghost user) pero la **implementación filtra incorrectamente en login/signup** (S0-1) y el cron lo purga sin distinción (S0-2). Combinados pueden provocar pérdida de histórico tras 30 días de inactividad de un user borrado.
- Los `Decimal` están bien aplicados a todos los campos de puntos. **No** hay `Float` en campos monetarios. Es la elección correcta para precisión 0.5 que documenta `docs/PUNTOS.md`.
- Los JSON-as-string (Configuration, negotiationHistory, taskPreferencesLoves, payload, etc.) son tolerables en SQLite pero en Postgres deberían migrarse a `Json` nativo (`jsonb`) para queries indexables. Esto es un sprint dedicado fuera de alcance de esta auditoría.
- **Migraciones idempotentes:** algunas (v1.7+) son seguras de re-ejecutar; otras (v2.1.0 levels rename) son idempotentes por diseño (UPDATE … WHERE level = 'nido' es no-op tras la primera). Las de bootstrap SQLite no son idempotentes en PG (fallarían).
- **Migraciones reversibles:** ninguna trae DOWN. Es la convención Prisma. No es problema.
