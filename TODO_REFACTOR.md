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

## Otros (descubierto en Fase 0, no bloqueante)

- **Harness de tests DB-bound inexistente / roto:** `schema.prisma` es
  `provider = "postgresql"` pero `.env.test` trae una URL SQLite `file:` y
  `setup.ts` cae a SQLite — incompatibles. No hay Postgres local ni app
  exportable desde `server.ts` (hace `app.listen` directo). Los tests actuales
  son herméticos. Para E2E reales (necesarios en Fase 1) hay que: exportar `app`
  de `server.ts`, y levantar un Postgres de test (o testcontainers/CI service).
- **`npm run type-check` no corre `prisma generate` antes:** un checkout fresco
  falla el type-check hasta ejecutar `prisma generate`. Considerar un `pretest`/
  `pretype-check` que genere el cliente.
