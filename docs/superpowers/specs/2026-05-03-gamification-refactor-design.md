# 🎮 Refactor de gamificación — Spec

**Fecha:** 2026-05-03
**Branch sugerido:** `feature/v2.1-gamification-refactor`
**Estado:** Brainstorm + propuesta. Pendiente aprobación de Eduardo.

---

## 1. Diagnóstico — qué está mal hoy

### Hay DOS sistemas de niveles corriendo a la vez

En el dashboard se ven simultáneamente:

| Sistema | Posición | Datos | Origen |
|---|---|---|---|
| **A — "Vecinos" (10 niveles)** | Banner superior `Vecinos · Lv 1 · 100 XP para Lv 2` | `LEVEL_THRESHOLDS = [0,100,300,700,1500,3000,6000,12000,24000,100000]` · 10 nombres: Vecinos→Vida | `src/backend/src/data/levelTable.ts` (creado v1.7 spec) |
| **B — "Brote" (7 niveles)** | Card del balance `Nivel 2 · Brote · 736/2000` | `LEVELS = [nido,brote,hogar,raices,diamante,leyenda,eterno]` · thresholds 0/300/2000/6000/15000/35000/80000 | `src/backend/src/services/gamificationService.ts` (legacy v1.x) |

Mismo XP de la pareja (`Couple.xp`) calculado por **dos servicios distintos** que devuelven niveles distintos. El frontend muestra ambos en el dashboard sin saber cuál es el "oficial".

**Consecuencia:** el usuario ve "Lv 1" arriba y "Nivel 2" abajo en la misma pantalla. Confusión total.

### Otros síntomas relacionados
- `LevelHero` (página Achievements) usa el sistema A.
- `BalanceLevelHero` (dashboard balance) usa el sistema B.
- Replays mencionan "vuestro mejor día reciente" pero **no muestran la fecha** — parece informativo huérfano.
- No hay un único "estado de gamificación" claro: tenemos `xp`, `level` (string), `dailyStreakDays`, `weeklyStreakWeeks`, achievements, replays, retos, todo desperdigado.

---

## 2. Por qué pasó

- v1.2 introdujo el sistema legacy (Nido/Brote/Hogar) con 7 niveles temáticos de "vivienda".
- v1.7 introdujo el spec nuevo (Vecinos/Amigos/Cómplices) con 10 niveles temáticos de "relación social".
- En v1.7 se montaron las APIs nuevas (`/api/gamification-v2`, `levelTable.ts`) pero NO se desactivó el sistema viejo (`gamificationService.ts`).
- Frontend acabó leyendo de los dos endpoints y pintando ambos.

---

## 3. Opciones de futuro

### Opción A — Quedarnos con "Vecinos" (10 niveles)
✅ Spec más reciente, pensado en v1.7.
✅ 10 niveles → más sentido de progresión a largo plazo.
✅ Nombres alineados con la temática "pareja como microcomunidad" (Vecinos→Familia→Vida).
❌ Hay que migrar todos los datos de `Couple.level` (string) — borrar el campo o reinterpretarlo.
❌ Las parejas que ya alcanzaron "Hogar" en sistema B verán "Lv 8 · Hogar" en sistema A (coincidencia de nombre) — confusión.

### Opción B — Quedarnos con "Brote/Nido/Hogar" (7 niveles)
✅ Datos persistidos en `Couple.level` ya tienen estos strings.
✅ Imágenes y emojis ya integrados (🪺🌿🏡🌳💎⭐♾️).
✅ Temática "crecimiento orgánico" pega con la app.
❌ Sólo 7 niveles → progresión más corta, plateau largo en Diamante+.
❌ Nombres se confunden entre sí (Hogar suena a vivienda no a relación).

### Opción C — Sistema híbrido nuevo (recomendación)
✅ 10 niveles (mejor curva XP), nombres temáticos limpios.
✅ Doble eje: **Nivel pareja** (XP) + **Nivel personal** (cada miembro suma XP propio por sus puntos).
✅ Nombres claros y diferenciados de tareas:

| Lv | Nombre | XP min | Concepto |
|---|---|---|---|
| 1 | Encuentro 🌱 | 0 | Os conocéis |
| 2 | Confianza 🌿 | 100 | Empezáis a coordinar |
| 3 | Compañía 🤝 | 300 | Equipo de día a día |
| 4 | Complicidad 💫 | 700 | Os entendéis sin hablar |
| 5 | Refugio 🏡 | 1500 | Habéis creado un hogar |
| 6 | Raíces 🌳 | 3000 | Vínculo profundo |
| 7 | Tribu 🔥 | 6000 | Familia extendida |
| 8 | Legado 💎 | 12000 | Os transformáis mutuamente |
| 9 | Eterno ♾️ | 24000 | Compromiso para siempre |
| 10 | Mito ⭐ | 100000 | Aspiracional, fuera de curva |

✅ Decimal: el progreso entre niveles muestra % visual, no XP raw, para no estresar.
✅ Cada nivel desbloquea **una sola cosa visible** (theme nuevo, frame de avatar, frase legendaria, achievement bonus). No 5 perks por nivel — esto reduce ruido visual.
❌ Migración: tocamos `Couple.level` y `Couple.xp` para reasignar nivel actual al nuevo sistema (mapeo 1:1).

**Mi recomendación:** **Opción C** con el mapeo:
- nido → encuentro · brote → confianza · hogar → refugio · raices → raices · diamante → legado · leyenda → eterno · eterno → mito
- Vecinos sistema A se descarta entero (no llegó a producción real).

---

## 4. Refactor en código (si aprobamos C)

### 4.1 Backend
- **Borrar** `src/backend/src/data/levelTable.ts` (sistema A).
- **Reescribir** `src/backend/src/services/gamificationService.ts` con la nueva tabla.
- **Borrar** `/api/gamification-v2/*` (era el endpoint del sistema A); mantener `/api/gamification/status` único.
- Función `getLevelInfo(xp)` única, devuelve `{ level, levelName, emoji, current, needed, progressPct, perks }`.
- **Migración de datos**: `UPDATE Couple SET level=CASE WHEN xp>=24000 THEN 'eterno' WHEN xp>=12000 THEN 'legado' WHEN xp>=6000 THEN 'raices' ...`.

### 4.2 Frontend
- **Borrar** `LevelHero.tsx` (component del sistema A).
- **`BalanceLevelHero`** se queda como única tarjeta de nivel, renombrada a `LevelHero`.
- Eliminar el banner superior "Vecinos · Lv X" del dashboard.
- Achievements page consulta el mismo endpoint.
- `useGamificationStatus` único.

### 4.3 Reestructuración del dashboard
La pantalla actual mezcla 8 elementos: nivel-banner-arriba, replay best-day, mood card, frase del día, anniversary, balance, level-hero-balance, hoy/tareas. Propuesta:

**Dashboard reordenado:**
1. **Hero único** (top, dominante): saludo + avatar + frase del día (1 elemento).
2. **Mood compartido** (1 elemento si quieres conservar visible siempre, sino se mete en menú).
3. **Balance + Nivel pareja** (1 card, ya existe en `BalanceLevelHero`).
4. **Hoy** (tareas + retos + replays compactos en 1 sección con tabs).
5. **Anniversary timer** (chip discreto, ya v2.0.6).
6. **Resumen semanal** (días streak + multiplicador + retos completados).

Cards opcionales (collapse por defecto, abrir si user click):
- "Vuestro mejor día reciente" → SOLO cuando hay un día destacado de la última semana, cerrable, **muestra fecha** (`Lunes 28 abr · 37 pts`).

---

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Cambio de nombre de niveles confunde a parejas activas | Banner one-time "Hemos renombrado los niveles para que se entiendan mejor" durante 30 días. |
| Migración SQL toca producción | Hacer dry-run en staging + backup antes. |
| Achievements ligados a niveles antiguos | Mapear achievements al nuevo nombre (mismo `level` slug). |
| Tests E2E rotos | Actualizar fixtures + smoke tests. |

---

## 6. Out-of-scope (para sprints siguientes)
- **Sistema de niveles personales** (cada miembro tiene su XP propio además del de pareja).
- **Achievements como progreso de % en vez de unlock binario**.
- **Replays con fecha visible** (en este mismo refactor, fix puntual ya).
- **Decisión sobre eliminar streaks o reforzarlos** (ahora "1 días" y "×1.0" tienen poco peso visual).
- **¿Eliminar retos semanales o mejorarlos?**.

---

## 7. Próximo paso

Eduardo aprueba la opción C (o pide cambio). Yo escribo el plan de implementación TDD task-por-task, lo ejecutamos en una sesión dedicada `feature/v2.1-gamification-refactor`. Estimación: 1 sesión (~3-4h) si los fixtures de tests están bien.
