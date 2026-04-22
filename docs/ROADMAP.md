# Matripuntos — Roadmap de Versiones

> Estado actualizado: 2026-04-22  
> Spec completo: `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md`

---

## Estado actual

| Versión | Nombre | Estado | Branch | Tag |
|---|---|---|---|---|
| MVP 1 | Los Cimientos | ✅ En producción | `main` | `mvp1` |
| v1.1 | La Chispa | ✅ En producción | `main` | `v1.1` |
| v1.2 | El Juego | ✅ En producción | `main` | `v1.2` |
| v1.3 | La Casa | ✅ En producción | `main` | `v1.3` |
| v1.4 | La Evolución (diseño v2) | ✅ En producción | `feature/v1.4-la-evolucion` → `main` | `v1.4` |
| v1.4.1 | Hardening post-v1.4 (Actividades + join-code + audit sweep + onboarding/tasks fixes) | ✅ En producción (2026-04-22) | `main` | `v1.4.1` |
| v1.5 | Red de Seguridad (tests + CI + 16 quick-wins) | 🧪 Pendiente de QA real + tag | `main` (code shipped 2026-04-22) | — |
| v2.0 | Hogar 360 | Planificado | `feature/v2.0-hogar-360` | — |
| v2.1 | Conectados | Planificado | `feature/v2.1-conectados` | — |
| v3.0 | Premium | Futuro | `feature/v3.0-premium` | — |

---

## MVP 1 · Los Cimientos ✅

**Auth + invitaciones + onboarding · Eventos con negociación · Tareas + logs + verificación · Puntos: balance, historial · Configuración editable · Notificaciones in-app · Perfiles + familia · Categorías personalizadas · Logros base · Calendario · Analytics (overview/trends/equity)**

Bugs corregidos antes de lanzar:
- Calendario no mostraba TaskLogs
- Fechas en UTC en lugar de timezone local
- Notificaciones al crear (corregido: solo al responder)

---

## v1.1 · La Chispa

**Foco:** Rediseño UX/UI completo + primeros elementos de personalidad diaria.  
Primera versión presentable a usuarios externos.

**Features:**
- Rediseño visual completo (paleta warm+dark: `#0f0a1e` fondo, `#f59e0b` amber, `#a855f7` purple)
- Bottom navigation bar con botón ➕ central elevado (5 posiciones)
- Mood del día (6–10 estados, visible para la pareja)
- Frase motivacional diaria (biblioteca propia, no API)
- Dark mode toggle (base oscura; toggle a warm light)
- Avatares de perfil (biblioteca de ilustraciones)
- Onboarding mejorado con modo demo

---

## v1.2 · El Juego

**Foco:** Gamificación potente como corazón visible + configurabilidad de reglas.

**Features:**
- Sistema de niveles de pareja (Nido → Brote → Hogar → Raíces → Diamante → Leyenda → Eterno)
- Mapa de logros estilo Duolingo (camino serpentante, nodos, nunca termina)
- Categorías de logros: Constancia, Equilibrio, Consenso, Rendimiento, Pareja, Secretos
- Rareza: Común/Poco común/Raro/Épico/Legendario
- Rachas con multiplicador de puntos (×1.1 a ×2.0, congelador de racha semanal)
- Editor de categorías de actividades con aprobación bilateral
- Panel "Reglas del Juego" con propuesta y aprobación
- FactorMascotas en puntos de tareas (×1.0 / ×1.1 / ×1.2)

---

## v1.3 · La Casa ✅

**Foco:** Hub de gestión doméstica real.

**Features enviadas:**
- Tareas 2.0: tipos puntual/recurrente, planificador semanal/mensual, instancias automáticas (cron semanal)
- Lista de la compra compartida con categorías (ShoppingList/ShoppingItem)
- Módulo To-dos personal (sin puntos, sin gamificación)
- Digest semanal in-app (lunes 08:00: balance, logros, rachas)
- WeeklyTaskView: toggle lista/semana en Tareas
- FAB con action sheet: quick-add shopping + todo

**Mejoras técnicas incluidas:**
- Security hardening: rate-limit /api/auth, CORS allowlist, JWT_SECRET min 32 chars, crypto.randomBytes para secretKey, body limit 1mb, validación zod con bounds y longitudes
- Auto-accept TaskLogs pendientes >24h (cron horario)
- Auth middleware consolidado en una sola implementación

---

## v1.4 · La Evolución (diseño v2)

**Foco:** Rediseño UX completo end-to-end según Claude Design v2 + pantalla Analytics dedicada + Premium teaser.

**Spec aprobado:** `docs/superpowers/specs/2026-04-20-v1.4-la-evolucion-design.md`

**Scope cerrado:**
- Navegación nueva: Inicio · Tareas · Calendario · Analítica (Logros → menú ⋯ del header)
- Dashboard condensado: BalanceLevelHero fusionado, StreakStrip compacto, frase diaria, tareas arriba del fold
- FAB menú con 📅 Actividad / 🛒 Compra / 📝 To-do
- Nueva pantalla Analytics: 3 tabs (Básico 4 gráficos · Avanzado 5 gráficos blur+overlay · Movimientos)
- Header con saludo temporal, mood partner, bell + menú ⋯ (Logros, Perfil, Pareja, Reglas, Ajustes, Ayuda, Logout)
- Redesign full de las 16 pantallas (incluyendo Login/Signup/Onboarding 6 pasos/Calendar/Settings/Achievements/Shopping/Todos/History→Movements/RequestActivity/RequestInbox/NotFound)
- Dark-only: se elimina el toggle theme
- Tokens del bundle v2 vía `tailwind.config.js` extend + `globals.css`
- Backend: 4 endpoints analytics nuevos (time-invested, heatmap, completion-rate, insight heurístico) + tabla `PremiumInterest` + `POST /api/premium/interest`
- Google/Apple OAuth botones visibles pero disabled (backend OAuth real → v2.1)
- Stripe → v3.0 (en v1.4 el CTA Premium solo captura email de interés)

---

## v1.5 · Red de Seguridad

**Foco:** Cerrar la deuda histórica de tests del frontend y pasar a una política *test-first* para todo lo que venga después. Cobertura retroactiva de los flujos que más duelen si se rompen (auth, balance, negociación, disputa de tareas), no cobertura exhaustiva línea por línea.

**Contexto:** el backend ya tiene Jest configurado con tests en `auth`, `recurringTaskService`, `gamificationService`, `analyticsService` y `achievementEngine`. El frontend, hasta v1.4, se valida a mano vía `npm run dev`. El módulo Actividades (2026-04-21) introduce Vitest + RTL como parte de su Fase 0; v1.5 consolida ese setup y extiende la cobertura al resto del código.

**Scope cerrado:**

### 1. Infraestructura común (heredada de Actividades)
- Vitest + @testing-library/react + jsdom ya instalados como efecto colateral del módulo Actividades.
- `vitest.config.ts`, `src/test/setup.ts`, `src/test/renderWithProviders.tsx` ya existen.
- v1.5 añade: CI en GitHub Actions que corre `npm run test` (front) + `npm run test` (back) + `npm run type-check` en cada push a `main` y en cada PR.

### 2. Cobertura retroactiva del frontend — flujos críticos
Un test de integración (RTL) por flujo, no más. Preferimos ancho antes que profundidad.

| Origen | Flujo | Qué prueba |
|---|---|---|
| MVP 1 | Login + Signup | Redirect según auth, validaciones de formulario |
| MVP 1 | Onboarding (4 pasos) | Avanzar/retroceder, no se puede saltar pasos |
| MVP 1 | Crear actividad (wizard RequestActivity) | Validaciones, preview de puntos, submit |
| MVP 1 | Balance + historial | `BalanceLevelHero` renderiza nombres y números correctos |
| MVP 1 | Disputa de tarea | Panel de disputa, submit, invalidaciones |
| v1.1 | `DailyPhrase` + mood partner | Render condicional, click de mood abre sheet |
| v1.2 | `AchievementBadge` + mapa de logros | Render de estado unlocked/locked |
| v1.2 | `StreakStrip` | Multiplier + freezer disponibles |
| v1.3 | Shopping list add/check | Toggle, borrado, persistencia |
| v1.3 | To-dos personal | Crear, completar, filtrar mios/compartidos |
| v1.4 | Analytics tabs (Básico/Avanzado/Movimientos) | Cambio de tab, blur overlay en Premium |
| v1.4 | FAB action sheet | Abrir, 3 opciones, navegación correcta |
| Actividades | Banner + /home/* | Ya cubierto por el propio módulo — se hereda |

### 3. Cobertura retroactiva del backend
- `pointsCalculator` — test unitario completo con la tabla de factores del `docs/PUNTOS.md`.
- `negotiationEngine` — aceptar, rechazar, contraofertar, forzar, rondas agotadas.
- `eventRoutes` — happy path + 401 + 404 + rondas agotadas.
- `taskRoutes` + auto-accept 24h cron — crear log, disputar, cron marca verified.
- `notificationService` — sólo se crea al responder (no al crear).

### 4. Política *test-first* a partir de v2.0
- Plantilla de PR con casilla "tests incluidos para el cambio". 
- Cobertura mínima 70% **de los archivos modificados** (no del repo entero). Se mide con `vitest --coverage` + `jest --coverage`.
- Cualquier bug cerrado añade test de regresión antes de cerrar el ticket.

**No-objetivos:**
- No se persiguen porcentajes globales de cobertura ni tests E2E con Playwright (se evaluará en v2.1 si hace falta).
- No se reescriben features existentes para facilitar testing; si una zona resiste test, se documenta y se deja TODO.

**Branch:** `feature/v1.5-red-de-seguridad` · **Tag al merge:** `v1.5`

### Entregado en v1.5 (2026-04-22)

Code shipped a `main` directo (sin feature branch). Se etiqueta `v1.5` tras QA real con dos cuentas.

**Paso 1 — Hotfix recurrentes:** regeneración de instancias futuras al editar tarea recurrente; backend no crea placeholders "fantasma" con puntos 0.

**Paso 2 — Panel Recurrentes:** pausar / reactivar / anular tareas recurrentes desde Settings > Tareas, con ConfirmDialog y filtro mías/pareja.

**Paso 3 — Red de Seguridad:**
- Contract tests Zod V2 auth (join-code register) + taskRoutes (create/log) — 12 casos.
- Shape contract test de `/api/health` con prisma mockeado (hermético, 2 casos).
- CI GitHub Actions: typecheck + build + subset hermético de jest (`pointsCalculator|taskLogPoints|joinCode|insightHeuristic|taskRoutesContract|healthShape`) en cada push/PR.

**16 quick-wins UX/infra:**
1. `#3` — `defaultAssigneeId` persistido por tarea (schema + migration + AddTaskSheet con IDs reales).
2. `#5` — Presencia: `User.lastSeenAt` con throttle 60s en authMiddleware; pill "en línea ahora / hace X" bajo el nombre del usuario en el header.
3. `#6` — Notificaciones por rama: chips Eventos/Tareas/Pareja/Otras con contador, icono por categoría, routing inteligente al hacer click.
4. `#7` — Empty states de Tareas (Verificar / Historial / Hoy) con icono + CTA contextual.
5. `#8` — Refresh global en AppHeader: invalida todas las queries de React Query con spinner ≥400 ms.
6. `#11` — Sentry wiring (backend `@sentry/node` + frontend `@sentry/react`), no-op sin DSN.
7. `#12` — `/api/health` enriquecido: `version`, `commit`, `uptimeSeconds`, `lastMigration`, `db`, `env`.
8. `#13` — Contract tests V2 (ver Paso 3).
9. `#14` — Demo mode: `/auth/demo-available` + `/auth/demo-login` env-gated por `DEMO_MODE_ENABLED=true`; botón "Probar con datos de ejemplo" en /login visible solo si la probe responde disponible.
10. `#15` — Tour interactivo de 5 pasos en el Dashboard en la primera visita tras onboarding (localStorage `matripuntos_tour_v1_seen`).
11. `#16` — `CoupleHealthCard` en Settings > Pareja: balance neto, movimientos últimos 7 días, última actividad por persona, copia de join-code.
12. Empty states mejorados en Recurrentes / Analytics / Inbox (incluidos en Paso 2 y #7).
13. Iconografía y tone consistentes en notificaciones (parte de #6).
14. Quick-wins menores embebidos en los commits anteriores: aislamiento de placeholders de recurrencia, ConfirmDialog reutilizable, filtro mías/pareja en tareas, avatar con mood en header.

**Pendiente para cerrar el tag `v1.5`:**
- QA real end-to-end con dos cuentas (Paso 4) — checklist en `docs/QA-CHECKLIST-v1.5.md`.
- Review final de seguridad (superficie de `/auth/demo-*`, presencia, rate-limiting).
- Aplicar tag `v1.5` en `main` y actualizar esta tabla.

---

## v2.0 · Hogar 360

**Foco:** App completa de la vida en pareja.  
**Política de tests:** test-first activada desde v1.5 (ver sección anterior). Cada feature nueva entra con sus tests Vitest/Jest; CI bloquea el merge si falla.

**Features:**
- **Módulo Calendario Mejorado:**
  - Vista día completo por horas con planificación visual (tareas + eventos + to-dos)
  - Click en día → abre vista día con timeline horario
  - Crear/editar tareas directamente desde calendario (hoy sólo se puede crear actividad)
  - Mostrar TaskLogs recurrentes en el mes, no sólo eventos
  - Drag & drop para reprogramar tareas entre días
- Calendario avanzado (eventos sin puntos: citas, cumpleaños, vacaciones; vistas día/semana/mes)
- Journaling de pareja (privado por defecto, compartible, sin social)
- Aniversarios e hitos especiales con logro desbloqueable
- Analytics pro (tendencias 3/6/12 meses, predicción, heatmap)

---

## v2.1 · Conectados

**Foco:** Integraciones externas y crecimiento.

**Features:**
- Push notifications (PWA o nativa)
- Sync Google Calendar (bidireccional)
- Export de datos (CSV, PDF mensual)
- Sistema de referidos con recompensa

---

## v3.0 · Premium

**Foco:** Monetización con base de usuarios real.

**Modelo freemium B:** Todo gratis hasta tener datos de uso. Luego:
- Free: límites en actividades/mes, tareas recurrentes, analytics a 3 meses, 2 rondas negociación
- Premium: sin límites + rondas ilimitadas + badge + acceso prioritario
- Pagos: Stripe · App móvil: React Native
