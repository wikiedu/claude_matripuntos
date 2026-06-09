# TODO_REFACTOR — bloqueos y deuda diferida del refactor

Registro vivo de cosas que NO se pudieron cerrar en su fase y por qué, para no
perder el contexto. Cada entrada: qué, por qué bloquea, decisión, riesgo.

---

## Fase 0 (2026-06-07) — retirada de rutas V2 deprecadas: APLAZADA a Fase 1

### `src/backend/src/routes/negotiation.ts` (montado en `/api/events`)

Rutas V2 con `Sunset: 01 Jun 2026` (vencido) que **no se pueden retirar todavía**:
`POST /:eventId/propose`, `POST /:eventId/respond`, `GET /:eventId/negotiation`,
`GET /:eventId/negotiation/history`, `GET /user/pending`.

**Por qué bloquea:**
- `EventNegotiationCard.tsx` está **vivo**: se renderiza en `Calendar.tsx:450` y
  consume estas rutas vía `apiClient.negotiation.*` (`apiClient.ts:680-700`).
- Es el **flujo crítico #3 de ESTADO_PRE_REFACTOR** (negociación de actividades,
  "NO se puede romper").
- **No hay reemplazo drop-in.** `eventRoutes.ts` (el otro router en `/api/events`)
  solo tiene CRUD (`POST /`, `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`), **no**
  `accept/reject/counter`. La única alternativa real es la API **V1
  `/api/negotiations`**, que es *negotiationId-based* — modelo de datos distinto
  al *event-status-based* que usa EventNegotiationCard. Migrar no es trivial.
- `tests/idorContract.test.ts` lista `/api/events/:id/accept|reject|counter` como
  endpoints "protegidos", pero **esos endpoints NO existen** en el código: ese
  test es un documento estático/aspiracional, no refleja la realidad.

**Decisión:** migración aplazada a **Fase 1**, cuando se rediseñe el flujo de
negociación y exista harness E2E para verificarlo sin romper el core.

**Riesgo de seguridad:** **MITIGADO en Fase 0** — el IDOR cross-couple se cerró
en el commit `f8229d7` (Tarea 1). Mantener las rutas vivas ya no es un riesgo de
seguridad, solo deuda técnica.

**Acción Fase 1:** reescribir `EventNegotiationCard.tsx` (o su equivalente v2)
contra la API canónica, migrar `apiClient.negotiation.*`, añadir E2E del flujo
proponer→contraoferta→aceptar/forzar, y solo entonces borrar `negotiation.ts` +
su registro en `server.ts` (`app.use('/api/events', negotiationV2Routes)`).

### `src/backend/src/routes/invitations.ts` (montado en `/api/auth`)

También tiene `Sunset: 01 Jun 2026` (vencido). **No se retira:** el flujo de
invitación por email (`/invite-partner`, `/invitation/:token`,
`/accept-invitation`, `/register-with-invitation`, `/link-partner`) sigue usado
por `Onboarding.tsx` y `StepJoinAccount.tsx` (ver comentario en el propio archivo).
No se auditó IDOR aquí en Fase 0; revisar en Fase 1 junto con la migración del
onboarding al flujo de join-code de `authRoutes.ts`.

---

## Fase 1 PWA — reactivar web push (desactivado en Fase 0)

`src/frontend/src/hooks/useWebPush.ts` quedó **desactivado** (flag
`WEB_PUSH_ENABLED = false`) porque registraba `/push-sw.js`, que **no existe** en
`public/` → 404 (push roto en prod). El hook ahora es no-op y reporta
`'unsupported'`; no tiene consumidores en el frontend hoy.

**Acción Fase 1 (PWA):** crear `public/manifest.webmanifest` + service worker real
(p.ej. con `vite-plugin-pwa`/Workbox) que incluya el handler de push, añadir
`theme-color` y metas `apple-mobile-web-app-*` en `index.html`, y poner
`WEB_PUSH_ENABLED = true`. El backend ya tiene la infra (VAPID, `notificationsPush`,
`webPushService`).

## Fase 1 · Tarea 1 — Harness E2E: HECHO (2026-06-09)

Cerrado el bloqueo "harness DB-bound inexistente". `server.ts` ya exporta `app`
(listen/crons bajo guard `NODE_ENV!=='test'`), y `npm run test:e2e` levanta un
Postgres real (embedded-postgres, sin Docker; override `DATABASE_URL_TEST` para
CI/Homebrew) y cubre los flujos críticos #2 y #3. Ver `src/backend/tests/e2e/README.md`.
Estado: 3 suites / 6 tests verdes.

### Deuda descubierta al montar el harness

- **Migraciones de la era SQLite incompatibles con Postgres fresco:** la
  migración `init` (y otras) usan tipos SQLite (`datetime`), así que
  `prisma migrate deploy` **falla** en la 1ª migración contra un Postgres limpio.
  El harness E2E lo sortea con fallback a `prisma db push` (schema desde
  `schema.prisma`), pero esto significa que **no se puede recrear la DB desde el
  historial de migraciones en Postgres** — prod depende de baseline/reconcile
  (`docs/MIGRATIONS-BASELINE.md`, `scripts/reconcile-prisma-migrations.mjs`).
  Acción futura: squash/baseline de migraciones a Postgres-nativo para que
  `migrate deploy` reproduzca el schema sin `db push`.
- **24 tests unit DB-bound siguen rojos:** no migrados a este harness (fuera del
  alcance de la Tarea 1). Camino: o reusan el Postgres de test del harness E2E,
  o se les da su propia config. Pendiente.
- **`npm run type-check` sin `prisma generate` previo:** un checkout fresco falla
  el type-check hasta generar el cliente. Considerar un `pretest`/`pretype-check`
  que genere el cliente.
