# Plan de baseline de migrations — Postgres prod

**Audit referencia:** `docs/audits/2026-05-05-full-audit/10-infra-deploy.md` S0-I-2 + `03-database-prisma.md` S0.

---

## El problema

Las **6 primeras migraciones** del directorio `src/backend/prisma/migrations/` están escritas en sintaxis SQLite (`PRAGMA`, `DATETIME` en lugar de `TIMESTAMP`), pero `migration_lock.toml` declara `provider = "postgresql"`.

Síntomas observados:
- **Render rebuild fresh** corre `prisma migrate deploy` y falla al toparse con la sintaxis SQLite contra Postgres.
- **`_prisma_migrations`** en Supabase ha quedado corrupto / out-of-sync varias veces (audit historic 2026-04-10) → mantenido manualmente con el script `scripts/reconcile-prisma-migrations.mjs`.
- **El estado real del schema productivo** se ha mantenido vivo a base de hotfixes (v1.5.1, v1.6.4) con imports relativos shared.

---

## El estado actual de producción

La BD de Supabase **YA TIENE** todas las tablas y columnas que el schema describe. La divergencia es sólo en `_prisma_migrations` — la tabla de tracking que Prisma usa para saber qué se aplicó.

---

## Estrategia recomendada (Plan A — baseline)

**Marcar todas las migraciones existentes como `applied` en producción**, sin volver a ejecutar el SQL. Las nuevas migraciones (v2.4+) son Postgres-nativas y se aplican normalmente.

### Pasos

#### 0. (Recomendado) Backup de Supabase ANTES de tocar nada

```bash
# Si Supabase Pro: el dashboard tiene backups diarios automáticos.
# Verifica que el último backup es <24h antes de continuar.

# Si Supabase free: pg_dump manual.
pg_dump "$DATABASE_URL_PROD" > supabase-backup-$(date +%Y%m%d-%H%M).sql
```

#### 1. Dry run del reconcile

El script ya existe (`scripts/reconcile-prisma-migrations.mjs`). Modo dry-run:

```bash
cd src/backend
DATABASE_URL='postgresql://prod-readonly-or-real-url' DRY_RUN=1 \
  node ../../scripts/reconcile-prisma-migrations.mjs
```

Esperado: lista de migraciones que serían marcadas como applied, **sin cambios reales**.

#### 2. Verificación manual

Conéctate a Supabase y comprueba el estado actual:

```sql
SELECT migration_name, applied_steps_count, finished_at, logs
FROM _prisma_migrations
ORDER BY started_at;
```

Compara los nombres con `ls src/backend/prisma/migrations/` para identificar gaps.

#### 3. Aplicar el reconcile real

```bash
cd src/backend
DATABASE_URL='postgresql://prod-real-url' \
  node ../../scripts/reconcile-prisma-migrations.mjs
```

El script invoca `prisma migrate resolve --applied <name>` por cada migración. Idempotente — si ya está marcada, simplemente loguea skip.

#### 4. Verificar `prisma migrate status`

```bash
DATABASE_URL='postgresql://prod-real-url' \
  npx prisma migrate status
```

Esperado:
```
Database schema is up to date!
```

#### 5. Probar deploy fresh (opcional pero recomendado)

Si tienes una BD de staging vacía, prueba que un `prisma migrate deploy` desde cero **falla** como esperamos (porque las primeras 6 migraciones son SQLite). Esto confirma que la baseline ES necesaria.

---

## Estrategia alternativa (Plan B — reescribir migraciones)

Más completo pero más invasivo: traducir las 6 primeras migraciones a sintaxis Postgres. Requiere:

1. Inspeccionar cada `migration.sql` y reemplazar:
   - `PRAGMA foreign_keys=OFF` → eliminar (Postgres no lo necesita).
   - `DATETIME` → `TIMESTAMP(3)`.
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY` o `TEXT` con CUID.
   - Etc.
2. Crear un test de migration deploy en staging fresco.
3. Decidir si re-baseline-ar o forzar re-run en prod (riesgo extremo de pérdida de datos).

**No recomendado salvo escenarios excepcionales.** Plan A es seguro porque NO toca el schema vivo.

---

## Cuándo ejecutar Plan A

**Hasta la fecha NO ha sido necesario ejecutarlo en v2.4-v2.5.x.** Razones:

1. Las **4 migrations nuevas** introducidas son todas Postgres-nativas y NO sufren el problema de las primeras 6:
   - `20261201000000_v2_4_password_reset` (v2.4.2) — tabla PasswordResetToken
   - `20261202000000_v2_5_6_compound_indexes` (v2.5.6) — 4 indexes hot-path con `IF NOT EXISTS` (idempotentes)
   - `20261202010000_v2_5_7_task_default_assignee_fk` (v2.5.7) — FK Task.defaultAssigneeId con limpieza defensiva de huérfanos
   - `20261202020000_v2_5_8_calendar_entry_fks` (v2.5.8) — FK CalendarEntry.relatedEventId/relatedTaskId con limpieza defensiva

2. Render auto-deploy ejecuta `prisma migrate deploy` en cada push a main. El comportamiento observado es:
   - Si `_prisma_migrations` está al día: aplica la nueva migration y todo funciona.
   - Si NO está al día: deploy de Render falla. **Plan B fallback:** ejecutar `scripts/reconcile-prisma-migrations.mjs` manualmente en local apuntando a producción, y luego re-deployear.

3. Las migrations de v2.5.x usan `CREATE INDEX IF NOT EXISTS` y `UPDATE ... WHERE NOT EXISTS` defensivos para que sean **idempotentes** y **safe** ante reruns.

4. Si alguno de los puntos 2 falla, este documento es la guía.

---

## Owner / cuándo

- **Cuando:** primer sprint que requiera CRUD del nuevo modelo `PasswordResetToken` en producción (es decir, el primer `forgot-password` real).
- **Quién:** Eduardo + asistente IA en una sesión dedicada de 1h. NO hacerlo a la ligera.
- **Riesgo si se omite:** futuros migrations Postgres-nativas que se añadan después de v2.4 podrían encadenar fallos en cascada en Render.

---

## Plan B — Render Cron como anti-cold-start (opcional)

Independiente del baseline. Audit `10 S1-I-2`:

- Plan free de Render duerme tras 15min sin tráfico.
- **Solución pasiva:** configurar uptime-robot.com (free) o cron-job.org para pingear `https://api.matripuntos.com/api/health` cada 5 min.
- **Solución activa:** subir a Render Starter ($7/mes) — keepalive permanente.

Recomendación: empezar con uptime-robot. Si la latencia molesta o si Render Cron Jobs se necesitan para los crons internos (digest, recurring tasks), pasar a Starter.
