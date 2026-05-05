# Two-Account Static QA — 2026-05-05

**Metodología:** sin browser. Trazado estático de cada flujo en código (backend routes/services + frontend hooks/components) simulando User1=Eduardo y User2=pareja, con énfasis en (1) qué notificación se emite, (2) cómo llega a la UI del partner (push / in-app polling / refetch), (3) race conditions, (4) desincronizaciones (cambios que un user hace y el otro no se entera).

**Polling/refetch detectados:**
- `AuthedLayout.tsx:38` — `setInterval(tick, 60_000)` (loadUserData cada 60s; ahora respeta `sheetLock`).
- `AuthedLayout.tsx:53` — `refetchInterval: () => (isSheetOpen() ? false : 30_000)` para notifications.
- `Tasks.tsx:424,435` — focus listener + setInterval propio sin sheetLock (S0 detectado en audit pages/state).
- Push (web-push) — **roto en prod**, dependencia no instalada (audit infra S0-I-1). Por tanto los flujos abajo asumen "polling es la única vía".

| Severidad | Hallazgos |
|---|---|
| S0 | 3 |
| S1 | 9 |
| S2 | 6 |

---

## Flujo 1 · Onboarding inicial dos personas

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Signup | `POST /api/auth/register` | Crea User+Couple con secretKey, JWT 7d | — |
| 2 | User1 | Onboarding step1-4 | `PUT /api/onboarding/*` | Persiste profile, family, rules | — |
| 3 | User1 | Invitar | `POST /api/auth/invite { email }` | Crea Invitation con token, **manda email vía Resend** | — |
| 4 | User2 | Click email link | navega a `/onboarding/join?token=` | — | — |
| 5 | User2 | Signup with token | `POST /api/auth/register-with-invitation` | Vincula User2 a Couple1 | User1 NO se entera hasta polling 60s |
| 6 | User2 | PartnerCatchUp 4 pasos | `GET /api/auth/partner-summary` | Lee estado actual del Couple | — |

**Hallazgos:**

### S0-Q-1 · `register-with-invitation` sin transacción → posible doble-uso de token
- Audit routes (S0-R-1) ya lo reportó. Si dos requests usan el mismo token simultáneamente, ambas pueden crear User. Resultado: 3 usuarios en el Couple (que solo permite 2) o un User huérfano.
- **Cross-reference:** `01-backend-routes.md S0-R-1`.

### S1-Q-1 · User1 NO recibe notificación cuando User2 acepta invitación
- **Trace:** `register-with-invitation` no llama a `createNotification` para User1. Resultado: Eduardo no se entera de que su pareja se ha unido hasta que abra la app y haga polling (60s).
- **Riesgo:** UX malo. Eduardo invita y queda esperando sin feedback.
- **Fix:** crear `Notification(type='partner_joined', userId=user1)` al final de la transacción de join.
- **Esfuerzo:** 30min.

### S1-Q-2 · Email de invitación con plantilla genérica
- `emailService.ts` envía un texto plano sin branding. (audit services S2 reportó que no hay retry/backoff). Si Resend cae, la invitación se pierde silenciosamente.

---

## Flujo 2 · Crear evento + negociación V2

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Crear evento | `POST /api/events` | Crea Event(status='pending', pointsCalculated=N) | — |
| 2 | — | (notif?) | — | **¿Se notifica a User2?** Depende de eventRoutes — verificar | ⚠️ |
| 3 | User2 | Abre app | — | `loadUserData()` polling 60s o refetchOnMount al navegar | hasta 60s |
| 4 | User2 | Ver evento pending en Activities | `GET /api/events?status=pending` | Lista | inmediato si llega antes |
| 5 | User2 | Counter offer | `POST /api/events/:id/counter` | Crea Negotiation(round=2) | — |
| 6 | — | (notif a User1) | `notifyEventResponded` (negotiationEngine.ts:315) ✓ | ✓ Notification creada | hasta 30s (refetchInterval notifications) |
| 7 | User1 | Acepta | `POST /api/events/:id/accept` | **NO transaccional** (audit services S0). Update event + crea PointsTransaction | — |
| 8 | — | (notif a User2) | ¿se llama notifyEventResponded? — verificar | — |
| 9 | User2 | Refresh Activities | refetch via React Query | Ve evento accepted | hasta 30-60s o navegación |

**Hallazgos:**

### S0-Q-2 · `accept` no transaccional → invariante saldo roto
- **Cross-reference:** `02-backend-services.md` S0 negotiationEngine. Si crash entre update Event y create PointsTransaction → evento accepted SIN saldo.
- **UX 2-cuentas:** User2 ve "Accepted" pero su saldo no refleja. Discrepancia visible.

### S0-Q-3 · No hay push real (web-push roto) → race window de 30-60s
- **Cross-reference:** `10-infra-deploy.md` S0-I-1.
- **UX 2-cuentas:** todos los flujos asíncronos sufren. User2 hace algo, User1 lo ve "cuando quiera el polling". En una app de pareja con interacción intensiva, esto se siente lento. El producto vendió "tiempo cuasi-real" — falla.

### S1-Q-3 · `force` no muestra confirmación crítica
- **Trace:** `negotiationRoutes.ts:403 POST /:negotiationId/force` paga del saldo del proposer. **Verificar en frontend** si hay ConfirmDialog ("Vas a forzar la aceptación. Esto te cobra X puntos. ¿Estás seguro?"). Si solo es un click, riesgo de "force accidental" (especialmente en mobile, fat-finger).
- **Fix:** ConfirmDialog obligatorio antes de force, mostrando puntos a pagar y saldo resultante.
- **Esfuerzo:** 30min.

### S1-Q-4 · Counter race: dos partners contraofertan simultáneamente
- **Trace:** ambos usuarios podrían (técnicamente, según roles permitidos) contraofertar a la vez. ¿negotiationEngine valida `lastProposedBy`?
- **Fix:** unique constraint compuesto `(eventId, roundNumber)` en Negotiation, y validación de turn-based en backend.
- **Esfuerzo:** 1h.

### S1-Q-5 · Tras accept, User2 no ve actualización del balance hasta 30-60s
- **Trace:** balance se carga en `useAppStore.loadUserData` cada 60s, no se invalida tras notificación push (porque push está roto).
- **Fix:** cuando llegue notificación de tipo `event_accepted`, invalidar `['points', 'balance']` en frontend.
- **Esfuerzo:** 30min.

---

## Flujo 3 · Tarea con auto-accept 24h

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Completa tarea | `POST /api/tasks/logs` | Crea TaskLog(status='pending') + PointsTransaction tentativa | — |
| 2 | — | notif User2 | `notifyTaskCompleted` — verificar | — | hasta 30s |
| 3 | User2 | Verifica | `PUT /api/tasks/logs/:id` con status='verified' | Update | hasta 30s |
| 4 | — | (alt) Disputa | `POST /api/tasks/logs/:id/dispute` | Update + notif | hasta 30s |
| 5 | — | (alt) 24h sin acción | cron diario o lazy | Auto-accept → status='verified' | depende implementación |

**Hallazgos:**

### S1-Q-6 · Auto-accept 24h: ¿cron o lazy?
- **Trace pendiente:** buscar `auto-accept` en services/routes. Si es cron, vive en server.ts y depende de proceso vivo. Si es lazy (al consultar `/api/tasks/logs`), funciona sin cron pero requires periodic load.
- **Riesgo si cron:** si Render plan free duerme, la lógica se retrasa.
- **Riesgo si lazy:** las queries cliente que muestran tarea como "pending" pueden no disparar auto-accept si nadie llama el endpoint específico.

### S1-Q-7 · TaskLog disputado: ¿se renegocian puntos automáticamente o queda en limbo?
- **Trace:** ¿qué pasa con los puntos tentativos cuando User2 disputa? ¿Se reverte la PointsTransaction?
- **Fix:** documentar y verificar en código. Test que: User1 completa → 5 pts tentativos. User2 disputa → 0 pts. User1 ajusta → 3 pts. User2 acepta → 3 pts finales.

---

## Flujo 4 · Mood propio + partner

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Set mood 😊 | `POST /api/profile/mood` | Update User.mood, MoodLog | — |
| 2 | — | (notif) | ¿se notifica? — bajo impacto, probablemente no | — |
| 3 | User2 | Abre app | `loadUserData` | Lee partner mood | hasta 60s |
| 4 | User2 | Ve MoodPairCard con mood User1 | — | — | — |

**Hallazgos:**

### S1-Q-8 · Mood update no invalida React Query immediately en User1 mismo
- **Trace:** v1.6.5 hotfix mood propio no aparecía. El bug estaba en `auth/me + auth/couple` (no devolvían mood). Verificar que se mantiene corregido.

### S2-Q-1 · Mood expira (mood-expire spec existe) — ¿qué pasa cuando el mood del partner está stale?
- E2E spec `mood-expire.spec.ts` cubre este caso. ✓ probable corregido.

---

## Flujo 5 · Achievements unlock

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | Cualquiera | Realiza acción que unlockea | varios | `achievementCheckService` o `achievementEngine` se llama | — |
| 2 | — | UnlockedSheet aparece | local trigger | — | inmediato (en el actor) |
| 3 | User2 (otro) | Va a /achievements | refetch | Ve nuevo achievement | hasta 30-60s |

**Hallazgos:**

### S1-Q-9 · 3 sistemas paralelos de achievement (audit services S2)
- `achievementEngine` + `achievementCheckService` + `achievementEngineV2`. ¿Cuál se llama desde qué endpoint? Riesgo de inconsistencia entre user1 y user2 (uno ve achievement desbloqueado, otro no).
- **Fix:** consolidar en uno y borrar los demás.
- **Esfuerzo:** 1d (refactor + migration de datos).

---

## Flujo 6 · ConfigurationProposal (catálogo + reglas)

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Propone cambio regla | `POST /api/config-proposals` | Crea ConfigurationProposal(status='pending') | — |
| 2 | — | (notif a User2) | createNotification | hasta 30s | |
| 3 | User2 | Settings → ProposalsPanel | `GET /api/config-proposals` | Ve la propuesta | inmediato al navegar |
| 4 | User2 | Accept | `POST /api/config-proposals/:id/accept` | Aplica cambio + ChangeLog (v2.2.1 mut tasksConfig/multipliersConfig en transaction) | — |
| 5 | — | (notif a User1) | ✓ probable | hasta 30s |
| 6 | User1 | Cancel mientras User2 acepta | `POST /api/config-proposals/:id/cancel` | RACE — los dos endpoints mutan el mismo registro | — |

**Hallazgos:**

### S2-Q-2 · Race User1 cancel vs User2 accept de la misma proposal
- **Trace:** ambos endpoints actualizan `ConfigurationProposal.status`. Si User2 lee status='pending', clica accept, mientras tanto User1 hace cancel → llegan al backend con orden incierto. Last-write-wins. Sin lock optimista.
- **Fix:** `where: { id, status: 'pending' }` en el update — si retorna 0 rows, devolver 409 Conflict.
- **Esfuerzo:** 30min.

---

## Flujo 7 · Vacation mode (v2.2.8)

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | Pausa pareja | `POST /api/couple/pause { days }` | Couple.pausedUntil = now+days | — |
| 2 | User2 | Abre app | `loadUserData` | Ve PauseBanner | hasta 60s |
| 3 | User1 | Reanudar | `POST /api/couple/resume` | pausedUntil = null | hasta 60s para User2 |

**Hallazgos:**

### S2-Q-3 · ¿Cualquiera puede reanudar o solo el que pausó?
- **Trace pendiente:** `couple.ts /resume` — ¿valida `req.userId`?
- **Riesgo UX:** si solo el que pausó puede reanudar, y se va de viaje, el partner queda "bloqueado".
- **Fix:** ambos pueden reanudar. Documentar.

---

## Flujo 8 · Red balance (v2.2.6)

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | — | (cálculo automático) | redBalanceService.computeRedBalance | Detecta días en rojo | — |
| 2 | User en rojo | Ve RedBalanceCard | `GET /api/points/red-balance` | Devuelve daysInRed, severity | inmediato al navegar |
| 3 | Partner | NO ve nada | endpoint privado | — | — |

**Hallazgos:**

### S0-Q-4 · ¿`/api/points/red-balance` valida que el caller sea el "en rojo"?
- **Trace pendiente:** si User2 (no en rojo) llama el endpoint con su token, ¿devuelve datos? La privacidad asimétrica es decisión clave (audit STATUS.md). Si el endpoint devuelve datos cuando NO está en rojo → fuga de info que User1 no quería compartir.
- **Fix:** verificar que el endpoint devuelva `{ daysInRed: 0 }` para quien no esté en rojo, y NO los daily deltas del partner.
- **Esfuerzo:** 30min verificar + fix si falla.

---

## Flujo 9 · Leave couple / Delete account

| # | Actor | Acción | Endpoint | Side effect | Partner UI delay |
|---|---|---|---|---|---|
| 1 | User1 | LeaveCoupleWizard | `POST /api/couple/leave` | Soft-delete? Ghost? | — |
| 2 | User2 | Abre app | — | Ve "Usuario eliminado" | hasta 60s |
| 3 | User1 | DeleteAccount | `POST /api/account/delete` | accountDeletionService → ghost rewrite + soft delete | — |
| 4 | — | 30d después | dataRetentionJob | Hard purge | — |
| 5 | User2 | Invita a otra persona | `POST /api/auth/invite` | Mientras User1 sigue ghost ¿el couple permite 3 users? | depende |

**Hallazgos:**

### S1-Q-10 · Couple con 1 user activo + ghost permite invitar — ¿se gestiona bien?
- **Trace pendiente:** verificar lógica en `invitationService.ts` y `register-with-invitation`. Si valida `users.length < 2` sin filtrar ghost, no permite invitar.
- **Fix:** validar `users.where(deletedAt: null).length < 2`.

### S1-Q-11 · Soft-delete sin filtro `WHERE deletedAt IS NULL` (cross-reference audit DB S0-1)
- Audit DB y routes ya lo cubrieron. Aplica también a este flujo: User2 puede ver el ghost en la lista de couple si el endpoint no filtra.

---

## Hallazgos transversales 2-cuentas

| # | Sev | Tipo | Resumen |
|---|---|---|---|
| Q-X-1 | S0 | Realtime | Sin push real, todo va por polling 30-60s. La promesa "tiempo cuasi-real" del producto está rota. |
| Q-X-2 | S1 | Race | Múltiples endpoints sin lock optimista (counter/accept paralelo, proposal accept/cancel). |
| Q-X-3 | S1 | Notif | Varios cambios no notifican al partner (partner_joined, force, dispute resolution). |
| Q-X-4 | S1 | Refresh | Tras notificación llegar, cliente no invalida queries específicas → balance/event card no refresca hasta polling. |
| Q-X-5 | S2 | Discoverability | El partner no se entera de cambios del producto (multipliers, categories) salvo que mire ProposalsPanel proactivamente. |
| Q-X-6 | S2 | Privacy asymmetry | Red balance: necesita validación dura del caller. |

---

## Top fixes 2-cuentas con mayor ROI

1. **Instalar web-push** (audit infra S0-I-1) — desbloquea el modelo realtime entero. 30min.
2. **Invalidar queries tras notificación** (Q-X-4) — completa el ciclo notif → UI update. 1h.
3. **Optimistic locking en proposals/negotiations** (Q-X-2) — evita 3 races. 1h.
4. **Notificaciones faltantes** (Q-X-3, S1-Q-1, S1-Q-3) — completa la simetría. 1h.
5. **ConfirmDialog en force** (S1-Q-3) — evita force accidental. 30min.

**Total ~4h para resolver el grueso del modelo two-account.**
