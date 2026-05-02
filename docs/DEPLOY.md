# Matripuntos — Deploy y operaciones de producción

> Última actualización: 2026-05-02 (v1.5.1)

## 1. Topología de producción

| Componente | Servicio | URL |
|---|---|---|
| Backend | Render (web service Node.js) | `https://matripuntos-api.onrender.com` |
| Base de datos | Supabase (PostgreSQL) | (interna, vía `DATABASE_URL`) |
| Frontend | FTP a `ftp.keepitup.io` | dominio del usuario |
| Errores | Sentry (backend `@sentry/node` + frontend `@sentry/react`) | proyecto Matripuntos |
| Telemetría (desde v1.6.1) | PostHog Cloud EU | proyecto Matripuntos |

## 2. Variables de entorno requeridas

### Backend (Render env vars)

| Var | Obligatoria | Notas |
|---|---|---|
| `DATABASE_URL` | ✅ | URL Supabase formato `postgresql://postgres.<id>:<pass>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres` (puerto 5432, soporta DDL) |
| `JWT_SECRET` | ✅ | Mínimo 32 chars |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | (opcional) | Render lo inyecta automáticamente |
| `SENTRY_DSN` | (opcional) | Si vacío, Sentry no-op |
| `DEMO_MODE_ENABLED` | (opcional) | `true` para habilitar /auth/demo-login |
| `POSTHOG_KEY` | (desde v1.6.1) | Project API key de PostHog |
| `POSTHOG_HOST` | (desde v1.6.1) | `https://eu.posthog.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | (desde v1.6.1, opcional) | Para email de código de borrado de cuenta. Sin estas, account deletion devuelve 503 en producción |

### Frontend (Vite build env vars)

Configuradas en `.env.production` antes del build:

| Var | Obligatoria | Notas |
|---|---|---|
| `VITE_API_BASE` | ✅ | `https://matripuntos-api.onrender.com/api` |
| `VITE_SENTRY_DSN` | (opcional) | |
| `VITE_POSTHOG_KEY` | (desde v1.6.1) | |
| `VITE_POSTHOG_HOST` | (desde v1.6.1) | `https://eu.posthog.com` |

## 3. Configuración de Render (web service backend)

| Setting | Valor |
|---|---|
| Build Command | `npm install && npm run build --workspace=src/backend` |
| Start Command | `npm start --workspace=src/backend` |
| Auto-deploy | ✅ desde `main` |
| Health check path | `/api/health` |

El `start` de `src/backend/package.json` ya incluye `prisma migrate deploy && node dist/server.js`. Por eso al desplegar, las migraciones nuevas se aplican automáticamente **siempre que `_prisma_migrations` esté sano** (ver §5 si no lo está).

> **No usar** Build Command como `node dist/server.js` directo — eso bypaseba `npm start` y omitía el migrate deploy. Histórico: causó la corrupción descrita en §5.

## 4. Procedimiento de release

Por cada versión `vX.Y` (post-v1.5):

1. Trabajar en worktree `~/.config/superpowers/worktrees/Matripuntos/feature/vX.Y-<nombre>`.
2. Ejecutar tests + CI verde.
3. QA dos cuentas reales (checklist en `docs/qa/vX.Y-qa-checklist.md`).
4. Merge fast-forward a `main`:
   ```bash
   git checkout main && git merge --ff-only feature/vX.Y-<nombre> && git push origin main
   ```
5. Tag:
   ```bash
   git tag -a vX.Y -m "vX.Y · <Nombre>" && git push origin vX.Y
   ```
6. Render auto-deploy del backend (verificar en dashboard que el build pasa y `/api/health` responde con commit + lastMigration nuevos).
7. Frontend: `cd src/frontend && npm run build` + subir `dist/` por FTP a `ftp.keepitup.io` (credenciales en `.deploy-credentials`, NO commitear).

## 5. Reconcile de `_prisma_migrations` en Supabase (v1.5.1+)

### Cuándo usar

Si el `start` de Render falla con `P3009` (`migrate found failed migrations in the target database`), o si `prisma migrate status` reporta drift, la tabla `_prisma_migrations` está desincronizada con el schema real.

Causa típica: alguna migración se aplicó por SQL editor manualmente (o vía `prisma db push`) sin registrar en la tabla, o una migración antigua quedó marcada como fallida bloqueando las siguientes.

### Procedimiento manual

1. **Obtener `DATABASE_URL` de producción** (Render dashboard → Environment).
2. **Localmente, exportarla en una shell aislada** (NO commitearla a `.env`):
   ```bash
   export DATABASE_URL='postgresql://postgres.<id>:<pass>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres'
   ```
3. **Inspeccionar estado**:
   ```bash
   cd src/backend && npm run migrate:status
   ```
   Esperar output como `Database schema is up to date` (sano) o lista de migraciones pendientes/fallidas (necesita reconcile).
4. **Si necesita reconcile**, primero dry-run para revisar qué se va a tocar:
   ```bash
   DRY_RUN=1 DATABASE_URL="$DATABASE_URL" node scripts/reconcile-prisma-migrations.mjs
   ```
5. **Ejecutar reconcile real**:
   ```bash
   DATABASE_URL="$DATABASE_URL" node scripts/reconcile-prisma-migrations.mjs
   ```
   El script marca como `applied` cada migración del directorio `src/backend/prisma/migrations/` que aún no esté registrada, salta las ya aplicadas, y al final corre `prisma migrate status`.
6. **Verificar**:
   ```bash
   cd src/backend && npm run migrate:status
   ```
   Debe mostrar `Database schema is up to date.`
7. **Cerrar la shell** para no dejar `DATABASE_URL` exportada.

### Tras el reconcile

- El próximo deploy de Render aplicará migraciones nuevas limpiamente vía `prisma migrate deploy` en el `start`.
- Verificar `/api/health` tras un deploy: el campo `lastMigration` debe coincidir con la última migración del repo.

### Histórico de incidentes

- **2026-04-10:** corrupción inicial. `20260331152147_init` quedó marcada como fallida en `_prisma_migrations`, bloqueando todo `migrate deploy` posterior con P3009. El schema real ya estaba aplicado vía SQL editor / `db push`.
- **2026-04-22 (v1.4):** primer reconcile manual. Resuelto puntualmente.
- **2026-05-02 (v1.5.1):** automatización del reconcile + documentación + script reusable. Punto de partida limpio para v1.6+.

## 6. Verificación post-deploy

```bash
curl -s https://matripuntos-api.onrender.com/api/health | jq
```

Output esperado:
```json
{
  "ok": true,
  "version": "1.6.0",
  "commit": "abc1234",
  "uptimeSeconds": 123,
  "lastMigration": "20260427000000_v1_6_mood_log_and_mood_keys",
  "db": "connected",
  "env": "production"
}
```

Si `lastMigration` no coincide con la última en `src/backend/prisma/migrations/`, ir a §5.

## 7. Frontend deploy (FTP)

```bash
cd src/frontend
npm run build  # genera dist/
# subir dist/ a ftp.keepitup.io con lftp / FileZilla / similar
# credenciales en .deploy-credentials (no commiteado)
```

Verificar en navegador en modo incógnito tras el upload (los service workers cachean agresivamente).

## 8. Rollback

### Backend
- Render dashboard → Deploys → seleccionar deploy anterior → "Rollback to this version".
- Si la nueva migración rompió, no basta con rollback de código: hace falta también revertir el schema. Tener cuidado.

### Frontend
- Mantener una copia local de `dist/` del último release estable. Re-subir por FTP.

### DB
- Supabase: backups daily 7 días + weekly 30 días desde panel.

## 9. Credenciales

Archivo local `.deploy-credentials` (en `.gitignore`, **NUNCA** commitear). Incluye FTP credentials. Otras credenciales viven en:
- Render dashboard (DATABASE_URL, JWT_SECRET, etc.).
- Supabase dashboard (DATABASE_URL maestro).
- PostHog dashboard (POSTHOG_KEY).
- Sentry dashboard (DSN).
