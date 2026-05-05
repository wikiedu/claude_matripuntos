# Auditoría profunda TOTAL — Matripuntos v2.3.5

**Fecha:** 2026-05-05
**Branch:** `main` @ `b7f7ade` (post tag `v2.3.5`)
**Alcance:** backend + frontend + DB + security + GDPR + tests + infra + lógica negocio + UX/UI + cross-account QA estático.
**Metodología:** 12 dominios independientes auditados en paralelo (8 sub-agentes + 4 reportes redactados directamente tras tope de uso de los agentes), con cross-reference contra el audit previo `2026-05-02-audit-pre-v1.7.md`.

**Reportes detallados por dominio:**
- `01-backend-routes.md` — rutas REST
- `02-backend-services.md` — lógica de negocio y servicios
- `03-database-prisma.md` — schema y migraciones
- `04-security-gdpr.md` — OWASP + compliance
- `05-frontend-pages.md` — pages
- `06-frontend-components.md` — components / sheets / modales
- `07-state-refresh.md` — Zustand, React Query, sheetLock, refresh extraño
- `08-points-negotiation-math.md` — fórmula puntos + negociación
- `09-ux-ui-responsive.md` — design tokens + accesibilidad + responsive
- `10-infra-deploy.md` — Render, FTP, CI, migrations
- `11-tests-coverage.md` — cobertura tests
- `12-two-account-static-qa.md` — flujos cross-cuenta

---

## 1. Resumen ejecutivo

### 1.1 Contadores agregados

| Severidad | Total | Bloqueante producto | Bloqueante v2.4 |
|---|---|---|---|
| **S0 — Crítico** (data loss, security, feature core rota, cumplimiento) | **~25** | sí | sí |
| **S1 — Alto** (bug funcional, UX deficiente, vuln runtime) | **~85** | parcial | sí (críticos) |
| **S2 — Medio** (edge cases, hygiene) | **~95** | no | recomendado |
| **S3 — Cosmético / refactor / copy** | **~50** | no | opcional |
| **TOTAL hallazgos** | **~255** | — | — |

### 1.2 Veredicto

**v2.3.5 está en producción y "funciona", pero con bugs invisibles para el usuario que sí dañan el producto:**

1. **Las push notifications están rotas en producción** (la dependencia `web-push` no está instalada — confirmado vs `package.json` y `node_modules/`). El producto vendió "tiempo real" desde v1.7 pero solo polling 30-60s.
2. **El "refresh extraño" reportado tiene tres causas concretas identificadas** — todas mitigables en ~2-3h.
3. **La integridad del saldo está rota en al menos 3 endpoints** (negotiationEngine accept fuera de `$transaction`, force fuera de transacción, dispute no revierte PointsTransaction).
4. **Las migraciones no son reproducibles** — primeras 6 en sintaxis SQLite, lock en postgresql. Origen confirmado de la corrupción histórica de `_prisma_migrations` en Supabase.
5. **Diseño cargado de bugs** = 3 sistemas de design tokens conviviendo + 11 hex hardcoded + sheets que no respetan `sheetLock` opt-in.

**El proyecto NO debería avanzar a v2.4 sin un sprint de hardening dedicado.** La buena noticia: **el grueso es resoluble en ~5-7 días de trabajo enfocado**. Estás cerca de un hito.

---

## 2. Top 12 críticos (S0) — listado consolidado

| # | Origen | Resumen | Esfuerzo | Bloqueante |
|---|---|---|---|---|
| **1** | infra `S0-I-1` | `web-push` NO instalado → push notifs rotas en prod | 30min | producto |
| **2** | infra `S0-I-2` | Migraciones primeras 6 en sintaxis SQLite, lock postgresql → Render rebuild fail | 4h | deploy |
| **3** | services `S0` | `negotiationEngine.respondToProposal('accept')` no transaccional → invariante saldo roto | 2h | data integrity |
| **4** | points `S0-2` | `compensationDiscount` no se aplica al CREAR/EDITAR eventos (solo en accept) → preview engaña | 1h | producto |
| **5** | points `S0-3` | `maxFreeRounds` (=2) NO se enforce en rutas V1 → rondas ilimitadas para todos los planes | 1h | producto |
| **6** | points `S0-4` | Disputar TaskLog verificada NO revierte PointsTransaction → saldo inflado | 2h | data integrity |
| **7** | points `S0-5` | `force` no valida que sea el creador y crea PointsTransaction fuera de transacción | 2h | producto + integridad |
| **8** | routes `S0-R-2` | `/points/reset-confirm` permite data-loss del histórico del couple con flujo frágil | 3h | data loss |
| **9** | routes `S0-R-3` | `categories.ts /:id/propose-change` sin schema zod → manipulación cross-couple | 1h | seguridad |
| **10** | routes `S0-R-4` + components `S0-7..9` | `window.alert/confirm` en prod + delete code en console.log + body devuelve secret | 2h total | UX + seguridad |
| **11** | DB `S0` (5 hallazgos) | Login/signup no filtran `deletedAt`, dataRetentionJob purga ghost a 31d, migraciones SQLite | 6h | acceso + integridad |
| **12** | security `S0-1..2` | IDOR en `journalRetrospective.update` + GDPR Art. 8 sin checkbox edad en register-couple | 1h | privacy + legal |

**Subtotal esfuerzo S0: ~25h (≈3 días) si se atacan en serie.**

---

## 3. Causa raíz del "refresh extraño" (problema #1 reportado por el usuario)

**Tres causas concretas identificadas por los audits 05, 06, 07:**

### Causa A — `useAppStore.loadUserData()` mezcla bootstrap con polling
- **Archivo:** `src/frontend/src/store/useAppStore.ts`.
- **Síntoma:** cada 60s el polling de AuthedLayout llama `loadUserData()`. Eso pone `isLoading: true`. `App.tsx:59-65 ProtectedRoute` consume ese flag y reemplaza la pantalla por "Cargando…". **Flash 60s aunque todo va bien.**
- **Fix:** separar `isLoading` (solo bootstrap) de `isRefreshing` (background polling).
- **Esfuerzo:** 1h.

### Causa B — `Tasks.tsx` no usa React Query y tiene su propio polling
- **Archivo:** `src/frontend/src/pages/Tasks.tsx:418-439`.
- **Síntoma:** triple polling no coordinado: `focus` listener + `visibilitychange` + `setInterval(30s)` que llaman `loadData()` y hacen `setIsLoading(true)`. v2.3.5 deshabilitó `refetchOnWindowFocus` global, pero **Tasks no usa React Query**, así que la mitigación no aplicó.
- **Fix:** migrar Tasks a React Query con `refetchInterval: () => isSheetOpen() ? false : 30_000` y eliminar los listeners propios.
- **Esfuerzo:** 4-8h.

### Causa C — `sheetLock` es opt-in y +8 sheets no lo usan
- **Archivos:** `BottomSheet.tsx`, `ConfirmDialog.tsx`, `MoodSelectorSheet.tsx`, `HeaderMenu`, `LevelUpModal`, `DashboardTour`, `LeaveCoupleWizard`, `DeleteAccountWizard`, `AddTaskFromCatalogSheet` (custom).
- **Síntoma:** v2.3.2 introdujo `lib/sheetLock.ts` para que polling no interrumpa al usuario, pero solo 3-4 sheets lo llaman. La mayoría siguen siendo interrumpibles.
- **Fix:** mover `acquireSheetLock`/`releaseSheetLock` al primitive `BottomSheet.tsx` (1 useEffect, blinda 7+ sheets). Añadir manualmente al resto.
- **Esfuerzo:** 1h.

**Total resolución refresh extraño: ~6-10h** (Causa A+C en 2h; Causa B opcionalmente en 6-8h).

---

## 4. Bugs de lógica de negocio invisibles que conviene saber

### Puntos & negociación (`08`)

- **S0-1** Discrepancia frontend vs backend en preview: el preview omite `FactorTipo` y la semántica de `compensationDiscount` está invertida en cliente vs servidor.
- **S1-3** XP solo se calcula con transacciones positivas → **eventos aceptados/forzados nunca generan XP**. La gamificación de niveles está parcialmente rota.
- **S1-5** Eventos de varios días aplican `FactorDuración × 1.35` linealmente. Una "vacación de 14 días" cuenta como `× 1.35`, no escalado por días.
- **S1-6** Tareas recurrentes ignoran `FactorFranja` y `FactorDuración`. Limpiar el baño a las 7am vale igual que a las 14h.

### Servicios (`02`)

- **S1** `recurrenceService.advance` MONTHLY rompe en 31-ene → 3-mar (sin clamp fin-de-mes). RFC 5545 §3.3.10.
- **S1** `gamificationService.updateDailyStreak` usa UTC, no la TZ de la pareja → rachas se rompen a 00:00 UTC.
- **S1** `digestService.sendWeeklyDigests` con `getDay()` produce solapamientos/agujeros en domingo/lunes.
- **S1** 3 sistemas paralelos de achievement (`achievementEngine` + `achievementCheckService` + `achievementEngineV2`) sin migración decidida.

### Database (`03`)

- **S0** Login/signup no filtran `deletedAt: null` → ghost emails colisionan con usuarios reales.
- **S0** `Couple` cascade puede aniquilar al ghost user → audit trail roto.
- **S0** `PointsTransaction.userId` SetNull rompe el ledger contable.
- **S1** Falta de índices compuestos en queries hot-path: `Notification.userId+isRead`, `PointsTransaction.coupleId+createdAt`, `TaskLog.coupleId+date+completedBy`, `Event.coupleId+status+dateStart`.

### Two-account (`12`)

- **S0** Sin push real, todos los flujos asíncronos sufren 30-60s de latencia.
- **S1** User1 NO recibe notificación cuando User2 acepta invitación.
- **S1** Tras `accept`, User2 no ve actualización de balance hasta 30-60s (no se invalida la query tras notif).
- **S1** Counter race: dos partners contraofertan simultáneamente sin lock optimista.

---

## 5. Plan de hardening propuesto (sprint v2.4)

### Sprint 1 — "Estabilidad + integridad" (3-4 días)

**Día 1 — Quick wins críticos (8h)**
- ✅ Instalar `web-push` (S0 #1) — 30min
- ✅ Eliminar `window.alert`/`confirm` y `console.log` del delete code (S0 #10) — 1h
- ✅ Fix `compensationDiscount` en create/edit (S0 #4) — 1h
- ✅ Fix `maxFreeRounds` enforce V1 (S0 #5) — 1h
- ✅ Causa A del refresh: separar `isLoading` vs `isRefreshing` en useAppStore — 1h
- ✅ Causa C del refresh: mover `sheetLock` al primitive `BottomSheet` — 1h
- ✅ Tests para los fixes anteriores — 2h

**Día 2 — Integridad data (8h)**
- ✅ `negotiationEngine.accept` envuelto en `$transaction` (S0 #3) — 2h
- ✅ `force` validar creator y envolver en `$transaction` (S0 #7) — 2h
- ✅ `dispute` revierte PointsTransaction (S0 #6) — 2h
- ✅ `points/reset-confirm` flow seguro (S0 #8) — 2h

**Día 3 — Acceso & GDPR (6h)**
- ✅ Filter `deletedAt: null` en login/signup (DB S0) — 2h
- ✅ Fix IDOR `journalRetrospective` (security S0-1) — 30min
- ✅ Checkbox edad en register-couple (security S0-2) — 1h
- ✅ Fix `categories /propose-change` schema zod (S0 #9) — 1h
- ✅ Endpoint `/api/auth/forgot-password` (security S1-4) — 1h30

**Día 4 — Migrations & deploy (6h)**
- ✅ Baseline migrations production (infra S0-I-2) — 4h
- ✅ Render plan starter o pinger externo (infra S1-I-2) — 30min
- ✅ Fix `deploy-frontend.sh` cache headers + sin --delete (infra S1-I-3) — 1h
- ✅ Tag `v2.4.0` y deploy — 30min

### Sprint 2 — "Refactors estructurales" (3-4 días)

- Migrar `Tasks.tsx` a React Query (causa B del refresh) — 1d
- Consolidar 3 sistemas de achievement → 1 — 1d
- Sprint design tokens (eliminar 2 sistemas legacy) — 1d
- IDOR contract test global (cubre TODO endpoint /:id) — 1d

### Sprint 3 — "Lógica fina + tests" (3 días)

- Fix `recurrenceService` MONTHLY clamp + tests — 4h
- Fix `gamificationService` streak en TZ local + tests — 4h
- Fix `digestService` weekEnd + tests — 4h
- Tests faltantes: `digestService`, `notificationDigestService`, `redBalanceService`, `useAppStore`, `apiClient`, `sheetLock` — 1d
- CI: corre tests DB-bound (tests S0-T-1) — 2h

### Sprint 4 — "Pulido visual" (2 días)

- Eliminar `var(--matri-*)` y duplicación tokens (UX S0-U-1) — 1d
- Reemplazar 11 hex hardcoded por tokens — 30min
- Modales con `role="dialog"` + tap trap + escape consistente — 4h
- `prefers-reduced-motion` — 30min
- Self-host Inter — 30min
- Iconos / spacing / animations canónicos — 4h

**TOTAL ESTIMADO: ~12-15 días persona** para llegar a un v2.4 sólido. Si se priorizan solo Sprint 1 (que es donde están todos los S0 críticos), **4 días son suficientes para "tapar las heridas"**.

---

## 6. Lo que NO está roto (para tranquilidad)

- **Routes**: `0` archivos crean su propio `new PrismaClient()` — no hay leaks de conexión. ✓
- **PostHog** ya está instalado correctamente (corregido tras audit 2026-05-02). ✓
- **`compensationDiscount`** se aplica en V1 al accept (corregido). ✓
- **`accountDeletionService`** reescribe email a ghost antes de soft-delete (corregido). ✓
- **`prisma migrate deploy`** sí corre en backend `start` script. ✓
- **`analyticsAggregator`** tiene 41 tests con invariantes matemáticos cubiertos. ✓
- **`helmet`, `cors`, `express-rate-limit`** instalados y configurados. ✓
- **CI workflow** existe con jobs separados backend/frontend/E2E + matrix chromium+webkit. ✓
- **`.deploy-credentials`** correctamente fuera de git. ✓
- **28 specs E2E** Playwright con ~109 casos. ✓
- **Decimal** se usa para puntos (no Float). ✓
- **JWT secret** en env var (no hardcoded). ✓

---

## 7. Próximos pasos recomendados

1. **Leer este reporte y los 12 detallados.** Tiempo: 30-45min.
2. **Decidir scope del próximo sprint** (Sprint 1 mínimo, o ir más allá).
3. **Brainstorm específico** sobre dudas que surjan (ej: "¿Sprint 2 o más Sprint 1?").
4. **Plan técnico concreto** del sprint elegido (otro doc específico bajo `docs/superpowers/specs/`).
5. **Ejecutar** con un agente o sesión dedicada por bloque.
6. **Tag `v2.4.0`** cuando Sprint 1 esté en main.

---

**Notas finales:**
- Este audit fue pensado para ser actionable — cada finding tiene archivo, línea, fix sugerido y esfuerzo.
- Las severidades S0/S1 fueron cross-referenciadas con el audit previo `2026-05-02-audit-pre-v1.7.md` para evitar reportar issues ya cerrados.
- Faltó solo (por imposibilidad técnica del sub-agente): un QA real con browser y dos cuentas. El reporte `12-two-account-static-qa.md` cubre el equivalente vía trace estático.
- Si quieres una pasada interactiva con dos cuentas tú mismo (recomendable cuando el Sprint 1 esté merged), lo hacemos guiado en sesión nueva.

🟢 = corregido tras audit 2026-05-02
🟡 = mitigado parcialmente
🔴 = pendiente
