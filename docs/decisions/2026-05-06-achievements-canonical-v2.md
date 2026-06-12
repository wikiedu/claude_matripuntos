# Decisión 2026-05-06 — Sistema canónico de achievements: V2

**Sprint:** 26 (v2.8.0) · **Audit ref:** `02-backend-services.md` S2-11

## Contexto

Coexisten 3 sistemas paralelos de achievements en `src/backend/src/services/`:

| Sistema | Archivo | Modelo Prisma | Granularidad | Naturaleza |
|---|---|---|---|---|
| **V1** | `achievementEngine.ts` (504 líneas) | `Achievement` + `UserAchievement` | Per-user | Imperative class with prisma queries |
| **V2** | `achievementCheckService.ts` (212 líneas) | `AchievementDefinition` + `CoupleAchievement` | Per-couple | Async, checks all conditions, persists CoupleAchievement |
| **V2-pure** | `achievementEngineV2.ts` (109 líneas) | n/a (catálogo embebido) | Per-couple | Pure functions (no DB), catálogo declarativo |

Las rutas (`taskRoutes`, `negotiationRoutes`) llaman a V1 y V2 en paralelo.
Las rutas (`achievements.ts`) exponen V1 a `/api/achievements` y V2 a
`/api/achievements/map`.

## Decisión

**El sistema canónico es V2** (`achievementCheckService` + `achievementEngineV2`
catalog-based). V1 queda **deprecado** desde v2.8.0.

## Razones

1. **V2 es per-couple**, alineado con el modelo de producto: los logros se
   ganan en pareja, no individualmente.
2. **V2 incluye XP/level integration** (`gamificationService.calculateAndSaveXP`
   ya consume `coupleAchievement`).
3. **V2-pure tiene catálogo declarativo** que facilita añadir logros nuevos
   sin tocar lógica de base de datos.
4. V1 produce duplicación cognitiva: el mismo evento (verificación de tarea,
   aceptación de evento) dispara DOS lookups distintos a la BD.
5. Auditoría externa (audit profundo 2026-05-05) recomienda explícitamente
   V2 como canónico.

## Plan de eliminación de V1

| Fase | Acción | Estado |
|---|---|---|
| **1** (v2.8.0) | Marcar `achievementEngine` como `@deprecated` y feature-flag `LEGACY_ACHIEVEMENTS_ENABLED` (default true) en routes | ✅ Aplicado |
| **2** (post-v2.8) | Migrar frontend: dejar de leer `/api/achievements` (per-user) y usar solo `/api/achievements/map` (V2 unificado) | ✅ Verificado 2026-06-12 (Fase 2 C.2): el frontend solo consume `/achievements/map`, `/gamification/status` y `/gamification-v2/*`. Las funciones V1 del API client (`getAllAchievements`, `getUserAchievements`, `checkAchievements`, `getCoupleStats`, `getCoupleScore`, `getLeaderboard`, `getWeeklySummary`) tenían 0 importadores y se retiraron |
| **3** | Apagar V1: flag invertido a opt-in (`=== 'true'`) en código — default OFF sin tocar Render. Rollback: `LEGACY_ACHIEVEMENTS_ENABLED=true` | ✅ Aplicado 2026-06-12 (Fase 2 C.2) |
| **4** | Borrar `achievementEngine.ts`, eliminar endpoints `/api/achievements`, `/api/achievements/user`, `/api/achievements/check` | ⏳ Pendiente |
| **5** (opcional) | Migración de datos: backfill `CoupleAchievement` desde `UserAchievement` si interesa preservar histórico | ⏳ Decidir |

## Riesgos identificados

- **Frontend RankingTab puede consumir V1** — verificar antes de fase 2.
- **Tests E2E pueden assertear sobre `/api/achievements`** — actualizar antes de fase 3.
- **`Achievement` y `UserAchievement` modelos no se borran** en fase 4 hasta confirmar que ningún cron/seed los usa.

## Referencias

- `docs/audits/2026-05-05-full-audit/02-backend-services.md#s2-11`
- `src/backend/src/services/achievementEngine.ts` (deprecated)
- `src/backend/src/services/achievementCheckService.ts` (canónico)
- `src/backend/src/services/achievementEngineV2.ts` (catálogo)
