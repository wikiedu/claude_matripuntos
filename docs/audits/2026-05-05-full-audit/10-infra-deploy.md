# Infraestructura & Deploy Audit — 2026-05-05

**Alcance:** package.json (root + workspaces), `deploy-frontend.sh`, `scripts/`, `.github/workflows/ci.yml`, `vite.config.ts`, `src/backend/src/server.ts` (cron + middleware), `.gitignore`, configuración Render (vía `start` script), Supabase migrations.

## Resumen

- **S0:** 2
- **S1:** 7
- **S2:** 8
- **S3:** 4

---

## S0 — Críticos

### S0-I-1 · `web-push` importado pero NO declarado en package.json
- **Archivos:** `src/backend/src/services/webPushService.ts`, `src/backend/src/services/notificationDigestService.ts`, `src/backend/src/routes/notificationsPush.ts`.
- **Verificación:** `grep "web-push" src/backend/package.json` → vacío. `ls src/backend/node_modules/web-push` → vacío.
- **Riesgo:** TODAS las push notifications de v1.7+ fallan silenciosamente en producción (mismo patrón que el bug PostHog del audit 2026-05-02 que ya se corrigió). Catastrófico: se vendió "push notifications" como feature core, no funciona.
- **Fix:** `npm install web-push @types/web-push -w @matripuntos/backend`. Añadir test de integración en CI que verifique que `webPushService.send()` no lanza `MODULE_NOT_FOUND`.
- **Esfuerzo:** 30min.

### S0-I-2 · `_prisma_migrations` reproducibilidad rota — primeras 6 migraciones en SQLite, lock en postgresql
- **Archivos:** `src/backend/prisma/migrations/<6 primeras>/migration.sql` con `PRAGMA` y `DATETIME`. `migration_lock.toml` apunta a `postgresql`.
- **Riesgo:** un Render rebuild fresh corre `prisma migrate deploy` (de hecho está en `npm start`) y al toparse con sintaxis SQLite **falla**. Esto explica los hotfixes históricos v1.5.1, v1.6.4. La BD productiva NO es reproducible desde `migrations/`. Dependemos de un estado manual.
- **Fix:** dos opciones:
  - **(A) Baseline production**: marcar las 6 primeras como `applied` en `_prisma_migrations` y dejar de mantenerlas. Documentar que sólo las migrations posteriores son la fuente de verdad.
  - **(B) Reescritura**: traducir las 6 a Postgres y verificar idempotencia.
  - Recomendado A + script `scripts/reconcile-prisma-migrations.mjs` (que ya existe) ejecutado en cada despliegue antes de `migrate deploy`.
- **Esfuerzo:** 4h (A) o 8h (B).

---

## S1 — Alto impacto

### S1-I-1 · 5 cron jobs en el mismo proceso Node
- **Archivo:** `src/backend/src/server.ts` (búsqueda `cron.schedule`).
- **Crons activos:**
  1. `0 4 * * *` — retention diario
  2. `0 8 * * 1` — recurring tasks weekly + digests semanales
  3. `* * * * *` — digest cada minuto (v2.2.5)
  4. `0 0 * * 1` — (otra weekly job)
  5. (más en routes posiblemente)
- **Riesgo:** todos viven en el **mismo proceso Express**. Si Render reinicia el proceso (deploy, OOM, idle scale-down en plan free) los crons paran en silencio. Si hay 2+ instancias, ejecutarán todos los crons N veces (duplicación de digests, retention).
- **Fix:** mover a Render Cron Jobs (o un worker separado). Como mínimo poner un `pg-locker` / `redlock` que garantice un único leader por job. Logging estructurado de cada ejecución.
- **Esfuerzo:** 1d para Render Cron migration; 2h para añadir lock por leader-election.

### S1-I-2 · Render free instance idle → cold start de 10–30s
- **Riesgo:** plan free de Render duerme tras 15min sin tráfico. Primera request tras dormir → `/api/auth/login` tarda 10–30s. UX horrible. Adicionalmente, mientras duerme **NINGÚN cron se ejecuta**.
- **Confirmar:** ¿plan actual? Si free, urgente subir o configurar pinger externo.
- **Fix:** plan starter de Render ($7/mes) o cron externo (uptime-robot) que pinga `/api/health` cada 5 minutos.
- **Esfuerzo:** decisión + 15min.

### S1-I-3 · `deploy-frontend.sh` borra todo en remoto (`mirror --reverse --delete`)
- **Archivo:** `deploy-frontend.sh`.
- **Riesgo:**
  1. Sin **cache busting de assets**: si los nombres de chunks cambian (Vite los hashea por contenido, ok) pero `index.html` sirve referencias nuevas — los browsers con caché del index.html viejo **piden chunks que ya no existen** → app rota tras deploy.
  2. `--delete` borra archivos antiguos: si el FTP también aloja imágenes subidas por usuarios (proofImageUrl) o documentos legales en `/legal/`, **se pierden en cada deploy**.
- **Verificación necesaria:** ¿`/legal/*` está dentro de `dist/` o se aloja en otra carpeta del FTP?
- **Fix:** 
  - Asegurar que `index.html` se sirva con `Cache-Control: no-cache, must-revalidate` (ya añadido en v2.3.5 pero verifica que se aplique en el server FTP — `.htaccess`).
  - Cambiar `--delete` por `--no-delete` y mantener una carpeta `dist/` separada de uploads.
- **Esfuerzo:** 1h.

### S1-I-4 · No hay backup verificable de Supabase
- Supabase Pro hace daily backup, pero plan free es 0 retention.
- **Confirmar:** ¿plan actual? Si free, **no hay backup**.
- **Fix:** subir a Pro ($25/mes) o script `pg_dump` semanal a S3.
- **Esfuerzo:** 1h script + decisión plan.

### S1-I-5 · Variables de entorno no validadas en startup
- `src/backend/src/server.ts` lee `process.env.JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STRIPE_SECRET_KEY`, etc. ad-hoc, sin parser.
- **Riesgo:** si falta `JWT_SECRET`, `jsonwebtoken` cae con error genérico runtime. Si falta `VAPID_*`, push falla silente.
- **Fix:** zod schema en startup que valida y aborta si falta requerido. Loguea las vars detectadas (sin valores).
- **Esfuerzo:** 2h.

### S1-I-6 · `.env.test` está trackeado en git
- **Verificación:** `git ls-files | grep .env` → `src/backend/.env.test`.
- **Riesgo:** si contiene secrets de test que reusan formatos de prod (passwords trivializados, tokens hardcodeados), atacante con acceso al repo público obtiene patrones que aplica en prod. Dependiendo del contenido puede ser S0.
- **Acción:** revisar contenido. Si tiene secrets reales aunque sean de "test", rotarlos y mover a Render env vars.
- **Esfuerzo:** 30min.

### S1-I-7 · E2E baseURL apunta a `:5174`, dev usa `:5173`
- **Archivo:** `e2e/playwright.config.ts:24`.
- **Riesgo:** si el dev quiere correr E2E contra el server local (vite dev :5173) sin levantar otro server :5174, los specs fallan con ECONNREFUSED y se diagnostica como bug. Probablemente el script `run-e2e.sh` (mencionado en el comment) levanta un build server separado, pero esto es fragilidad.
- **Fix:** documentar en `docs/DEPLOY.md` cómo se corren los E2E o añadir `webServer:` en playwright config para que Playwright los gestione.
- **Esfuerzo:** 1h.

---

## S2 — Edge cases & hygiene

### S2-I-1 · No hay `render.yaml` versionado
- Render se configura desde la UI. Cualquier cambio de buildCommand/startCommand/envVars no queda en git.
- **Fix:** crear `render.yaml` con `services` declarativos. Permite "Infrastructure as Code".
- **Esfuerzo:** 1h.

### S2-I-2 · No hay `.env.example` consolidado para backend
- **Verificación:** `.env.example` existe en raíz pero no claro si lista TODAS las vars que el backend espera.
- **Fix:** auditar `process.env.X` en `src/backend/src/**` y completar `.env.example`.
- **Esfuerzo:** 30min.

### S2-I-3 · `npm overrides` solo lodash
- Root package.json tiene `"overrides": { "lodash": "^4.18.1" }`. ¿Por qué? Comentar.
- **Fix:** añadir comentario o remover si no aplica.

### S2-I-4 · CI workflow único `ci.yml` — no separa lint/test/build
- **Archivo:** `.github/workflows/ci.yml` (a leer).
- **Recomendación:** jobs separados con `needs:` para que un fallo de lint no oculte fallos de test.

### S2-I-5 · Backend `start` corre `prisma migrate deploy`
- Bueno (audit anterior dijo que NO lo hacía — esto sí lo hace). Pero si la migration falla y Render reinicia, el server NUNCA arranca. Sin alerting, te enteras cuando un usuario reporta.
- **Fix:** Sentry + alerting de Render → email al admin si server status = failed.

### S2-I-6 · `package-lock.json` único en raíz (workspaces)
- **Verificación:** `.gitignore` documenta que es intencional. ✓ ok.

### S2-I-7 · Sin healthcheck declarado para Render
- Backend tiene `/api/health` (endpoint clásico). Pero Render por default usa root `/`. Si no se configura `healthCheckPath`, Render no detecta server caído.
- **Fix:** añadir `healthCheckPath: /api/health` en render.yaml.

### S2-I-8 · Demo seed accesible en prod
- `bootstrapCatalog.ts`, `demoService.ts`, `seed-prod-couple.mjs` en `scripts/`. Verificar que ningún endpoint expone `/api/demo` en prod.

---

## S3 — Cosmético / refactor

- **S3-I-1** Reduce sourcemap warning: `vite.config.ts: build.sourcemap=false` ✓ ok pero hace debugging prod imposible. Considera `'hidden'`.
- **S3-I-2** Sentry está en deps pero ¿inicializado en `server.ts` antes de routes? Verificar.
- **S3-I-3** `tailwind-merge` y `clsx` ambos en deps — documentar uso en cada caso.
- **S3-I-4** Engines `node>=18` pero código usa `import.meta` y top-level await — declara `node>=20` para coincidir con Render runtime.

---

## Deploy Readiness Checklist (0–100)

| Categoría | Score | Notas |
|---|---|---|
| Build reproducible | 60 | TypeScript + Vite ok, pero migrations problemáticas (S0-I-2) |
| Deploy automation | 70 | Auto-deploy Render + script FTP, pero deploy frontend manual |
| Secrets management | 75 | `.deploy-credentials` no trackeado ✓; `.env.test` sí trackeado ⚠️ |
| Migrations | 40 | `migrate deploy` en start ✓; pero sintaxis mixta SQLite/Postgres ❌ |
| Cron jobs | 50 | 5 crons en proceso único, sin lock leader, frágil ante restart |
| Monitoring | 55 | Sentry instalado, PostHog en deps; sin alerting de cron failures |
| Backups | ? | Depende del plan Supabase — verificar |
| Push notifications | 0 | web-push falla silente — feature core rota |
| Health checks | 60 | `/api/health` existe pero no declarado a Render |
| Cold start | 30 | Si plan free Render, 10–30s en primera request tras idle |
| **TOTAL** | **~50/100** | Production but fragile. Bugs core invisibles (push). |

## Top 5 fixes con mayor ROI

1. **S0-I-1** declarar `web-push` (30min) → desbloquea feature core.
2. **S0-I-2** baseline migrations (4h) → elimina hotfixes Render permanentemente.
3. **S1-I-2** Render plan starter o pinger externo (1h) → mata cold start.
4. **S1-I-1** lock o Render Cron para los 5 crons (2h) → evita digests duplicados.
5. **S1-I-3** revisar deploy-frontend.sh (1h) → evita rotura tras deploy o pérdida de uploads.
