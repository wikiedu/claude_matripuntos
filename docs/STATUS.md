# STATUS — Matripuntos

**Última actualización:** 2026-05-04
**Versión actual desplegada en producción:** `v2.2.9` · Level-up modal + balance counter + flame flicker (canvas 13)
**Branch principal:** `main`
**URL prod:** https://matripuntos.com (frontend FTP) · backend Render · Supabase Postgres

> Para histórico completo de versiones ver `docs/ROADMAP.md`. Para decisiones razonadas ver `docs/DECISIONS.md`.

---

## 🟢 EN PRODUCCIÓN (deployable + público)

> Lo que está hoy mismo accesible al usuario en matripuntos.com.

### Core (MVP1 → v1.7)
- Auth (signup, login, demo, invitaciones, partner linking, password reset).
- Onboarding 4 pasos + join flow.
- Eventos con sistema de negociación V1 + V2 (counter, force, compensaciones).
- Tareas (CRUD, logs, verificación, disputas, recurrentes, auto-accept 24h).
- Sistema de puntos: balance, historial, leaderboard, transacciones, factor tipo/franja/duración/hijos, redondeo 0.5, cap 500.
- Configuración editable (tasksConfig, multipliersConfig, activityTypes).
- Notificaciones in-app + web push (VAPID).
- Categorías/subcategorías personalizadas.
- Logros y achievements (unlock + UnlockedSheet).
- Calendario (overview/month/week/day) + service providers.
- Analytics overview/trends/equity.
- Frase del día (mood + autoría rotativa).
- Avatares animales personalizables.
- Mood log + mood week + propuestas/sugerencias post-mood.
- Privacy + telemetría (PostHog).
- Account lifecycle (delete + leave couple wizards).
- E2E tests con Playwright.
- Refresh tokens preparados (lib + service, no activos).
- Niveles de pareja (10) · achievements 30 · streaks · retos semanales · replays · push.

### Calendario 360 (v2.0.1)
- `CalendarEntry` extendido (event/task/service/birthday/holiday).
- Recurrence engine simplificado (RRULE FREQ + INTERVAL/UNTIL/COUNT/BYDAY).
- Holidays + birthdays seed.
- Google Calendar OAuth esqueleto (sync diferido a v2.1).
- `CalendarV2Section` montado al final de `/calendar`.

### Journaling (v2.0.2)
- Página `/journal` completa.
- Entries CRUD + reactions.
- Prompts diarios (cyrb53 hash, idempotente por día).
- Retrospectivas semanales/mensuales.
- IDOR fixed (v2.0.3.1 hotfix S1-1).

### Analytics Pro (v2.0.3 + v2.0.3.1)
- `analyticsAggregator` PURE service con invariantes matemáticos (41 tests).
- Insights heurísticos + heatmap 24×7.
- `AnalyticsProSection` insertado en /analytics.
- Hotfixes: focus rings, BottomNav safe-area, "olvidé contraseña" mailto:, "Hogar"→"Tareas".

### Catálogo + Consenso (v2.0.4)
- `ActivityTemplate` (catálogo global + custom por pareja).
- `ConfigurationProposal` + `ConfigurationChangeLog` (accept/reject/cancel + log de cambios aplicados).
- `ActivityCatalogPicker` (UI de selección con búsqueda, agrupado).
- `ProposalsPanel` + sección "Propuestas pendientes" en Settings.
- `/api/activity-templates` + `/api/config-proposals` (flags `CATALOG_ENABLED` y `CONFIG_PROPOSALS_ENABLED`, default ON).

### v2.2.9 Microinteracciones extras — **acaba de deployear 2026-05-04**
- **LevelUpModal**: cuando el couple sube de nivel, modal con confeti + emoji nivel + CTA "Genial". Detección via localStorage. Auto-dismiss 5s.
- **AnimatedNumber**: el balance del hero anima de su valor previo al nuevo (700ms cubic ease-out) cada vez que cambia. Mount inicial directo.
- **Flame flicker**: el 🔥 del streak parpadea sutilmente cada 2.4s (scale + opacity).
- Cierra 4 de 7 microinteracciones del canvas 13 (PointsBurst v2.2.0 + progress bar mount v2.2.2 + estos 3). Quedan: success haptic, ripple, undo swipe — bajo impacto, backlog.

### v2.2.8 Vacation mode MVP — **2026-05-04**
- `Couple.pausedUntil` + `pausedReason` (migración 20261115000000).
- `/api/couple/pause { days, reason? }` + `/resume` + `/pause-status`.
- `updateDailyStreak` y `notificationDigestService` respetan pausa.
- `PauseBanner` en Dashboard: gradient indigo, fecha-hasta y botón "Reanudar ahora". Solo visible si `pausedUntil > now`.
- MVP minimalista: el activación es manual desde Settings. Detección automática (calendar event "Vacaciones" o saldo rojo >14d) queda diferida.

### v2.2.7 Empty state hero día 1 — **2026-05-04**
- Cuando el couple no tiene actividad (xp=0 y balances=0), Dashboard sustituye `BalanceLevelHero` por `EmptyStateHero` con CTA "Apuntar tarea" + consejo "no ajustéis reglas el primer día".

### v2.2.6 Saldo en rojo crónico — **2026-05-04**
- Diferenciador conceptual: cuando un user lleva días con saldo negativo neto vs su pareja, la app sale del modo "contador" y entra en "asistente de pareja" (canvas 09).
- Backend: `redBalanceService.computeRedBalance` detecta días consecutivos en rojo (últimos 14). 3 umbrales: soft (3 días) / warn (7) / crit (14+).
- `/api/points/red-balance` devuelve `daysInRed`, `severity`, `myDailyDelta[14]`, `partnerName`.
- Frontend: `RedBalanceCard` con copy escalada (sin drama → buen momento para hablarlo → considera pausar conteo).
- **Privacidad asimétrica**: solo lo ve quien está en rojo. El partner no recibe ninguna alerta. Decisión clave para no convertir el saldo en fuente de tensión.

### v2.2.5 Digest scheduler — **2026-05-04**
- Cron cada minuto que detecta users cuyo `digestHour` matchea hora local en su tz, agrega saldo del día + saldo del partner + notifs unread y manda 1 push consolidada con tag `daily-digest`.
- Si no hay actividad ni unread, omite (no spamea).
- Cierra canvas 10 al 100%.

### v2.2.4 Notification preferences — **2026-05-04**
- Modelo de 3 tiers (critical / digest / off) por categoría según handoff Claude Design canvas 10.
- Quiet hours configurables (default 22:00-09:00). Digest hour configurable (default 20:30).
- 6 categorías: peticiones / negociación / calendario / propuestas reglas (defaults critical), achievements (digest), rachas (off).
- Backend: `notificationPreferencesService` con `shouldSendPush(prefs, category, now)` que respeta quiet hours (critical bypassa) y tiers.
- `User.notificationPreferences` (campo JSON ya existente) usado para persistir.
- Settings → Notificaciones rediseñada con Card resumen diario + Card silencio + 6 categorías con select de tier.
- Pendiente v2.2.5: scheduler real del digest (acumular las "digest" y mandar una sola push diaria).

### v2.2.3 Onboarding partner catch-up — **2026-05-04**
- Cuando un user se une a una pareja **ya activa**, en lugar del wizard normal de 5 pasos ve un catch-up de 4 pasos.
- Backend: `/api/auth/partner-summary` devuelve nivel pareja, saldo partner, tareas semana, racha, top reglas configuradas y multipliers activos. Si la pareja es nueva sin actividad, devuelve null → cae al flow normal.
- Frontend: `PartnerCatchUp.tsx` con 4 pasos: Welcome (avatar partner + tú) → Catch-up (qué lleva el partner) → Primera tarea (grid 6 comunes, saltable) → Done (confeti + tip primera semana).
- Hereda config — no re-configura nada. Reduce 6 pasos a 4. "No llegas tarde a una fiesta".

### v2.2.1 Reglas reales — **2026-05-04**
- Cierra el banner "estado provisional" que llevaba desde v2.0.7. Las propuestas en Settings → Reglas **sí aplican** al cálculo real de puntos.
- Backend: `configurationProposalService.accept()` detecta `tasks.<cat>` y `multipliers.<grupo>.<key>` y muta `Configuration.tasksConfig`/`multipliersConfig` en la misma transacción que el changelog.
- Frontend: `RealRulesSection` reemplaza al editor legacy con DEFAULT_RULES hardcoded. Lee `Configuration` real y muestra Tareas (puntos base por categoría) + Factor hijos / franja / duración. Cada item con botón ✏️.
- Audit log de últimos 5 cambios aplicados visible al final de la sección.

### v2.2.0 Dashboard refactor
- **Hero unificado** balance + nivel pareja con eyebrow conversacional, glow radial, perk próximo, barra amber. Una sola card grande, no dos banners.
- **MoodCard unificada** sustituye `MoodNudge` + `MoodPairCard`. Estados A (sin mood: CTA gradient amber/purple) y B (filled: yo + partner con divisor).
- **PointsBurst** — microinteracción "+X MP" flotante al completar tarea (1400ms cubic-bezier ease-out, anclado al botón).
- Reordenado del Dashboard según jerarquía del canvas 01: Hero → Frase → Mood → Anniversary → Streak → Tareas hoy.
- Estado completo en `docs/design/CLAUDE-DESIGN-IMPLEMENTATION-STATUS.md` (mapeo de los 14 canvases con su estado real).

### v2.1.1 Refactor flujo Tareas/Actividades
- **Tareas — dos botones diferenciados**:
  - Primario "Añadir tarea" → sheet del catálogo (TASK_CATALOG estático + tareas custom de la pareja). Selección → mini-form con puntos editables, día programado, recurrencia + frecuencia, asignación.
  - Secundario "Crear nueva" (ghost) → form en blanco para tareas que no están en el catálogo.
  - Sin consenso para tareas (decisión founder).
- **Actividades — wizard limpio + consenso de puntos en plantillas**:
  - Botón "🔎 Catálogo" del wizard `RequestActivity` retirado. Vuelve al flujo histórico.
  - Tab Catálogo de `/home/activities` mantiene gestión de plantillas.
  - Categorías cerradas (8 fijas).
  - Consenso híbrido (opción C): nuevo template / cambio de puntos lanza `ConfigurationProposal` con field `activity_template:<id>:points`. Hasta que el partner acepta, badge "pts pendientes" + valor tachado.
  - Migración `20261110000000`: backfill defensivo (globales + custom previas como ya aprobadas).
  - Banner explicativo en AddActivityTemplateSheet.

### v2.1.0 Gamificación unificada
- **Eliminados los dos sistemas de niveles paralelos** ('Vecinos · Lv 1' arriba y 'Brote · Nivel 2' abajo). Ahora uno solo.
- 10 niveles temáticos: **Encuentro 🌱 · Confianza 🌿 · Compañía 🤝 · Complicidad 💫 · Refugio 🏡 · Raíces 🌳 · Tribu 🔥 · Legado 💎 · Eterno ♾️ · Mito ⭐**.
- XP thresholds: 0/100/300/700/1500/3000/6000/12000/24000/100000.
- Migración SQL `20261105000000_v2_1_0_levels_rename` mapea slugs viejos a nuevos (defensiva: cualquier valor inesperado vuelve a 'encuentro').
- `LevelBar` retirado del dashboard. `BalanceLevelHero` queda como única fuente.
- Borrados: `levelService.ts`, `levelTable.ts` (sistema A nunca llegó a producción real). `/api/gamification-v2/level` reescrito para devolver el sistema unificado.

### v2.0.8 Actividades full-CRUD — **acaba de deployear 2026-05-03 noche**
- Tab nueva "Catálogo" en `/home/activities` (junto a Activas e Historial).
- `ActivityCatalogManager`: lista templates globales + propios, agrupados por categoría con filtro chip.
- Templates propios: editar (Pencil) + eliminar (Trash) con confirm.
- Templates globales: badge "global", read-only.
- `AddActivityTemplateSheet`: form completo (categoría, subcategoría, emoji, puntos, duración, impacto, descripción).
- Botón "Nueva actividad" siempre visible en activas/historial.

### v2.0.7 Bugfixes críticos
- Mood ahora se resetea al cambiar de día (`useMoodVigent` exige mismo día local en vez de sliding 24h).
- Replay "Vuestro mejor día reciente" muestra fecha (`Lunes 28 abr · 3 actividades · 37 pts`).
- Calendar: añadidos botones "Tarea" + "Actividad".
- Settings → Reglas de puntos: banner WARN explícito de que las propuestas no aplican aún al backend (eso llega en v2.1.x).
- Auto-seed del catálogo de actividades en arranque del backend.

### Refinos + bugfixes (v2.0.6)
- **Fix crítico**: rutas v2.0.4/v2.0.5 devolvían `Route not found` en cold-start de Render. Convertidas de dynamic import a static import → garantizado el orden del middleware stack.
- **Fix bug "tareas fantasma"**: una tarea sin `scheduledFor` aparecía en "Hoy" todos los días, en ambas cuentas, para siempre. Ahora "Hoy" requiere `scheduledFor <= hoy`.
- **Wiring del catálogo de actividades** (v2.0.4 que faltaba): botón "🔎 Catálogo" en `RequestActivity` step 1; al seleccionar un template prefilla título/descripción/duración.
- **Botón "Proponer cambio"** por cada regla en Settings → Reglas de puntos. Crea `ConfigurationProposal` consensuada para el partner.
- **AnniversaryCard rediseñada**: estilo dark coherente con el dashboard, chip discreto en vez de banner rosa.
- **CI E2E arreglado**: `prisma db push` en vez de `migrate deploy` contra la BD efímera (la init migration usa `DATETIME` de SQLite, incompatible con Postgres CI).

### Quick wins (v2.0.5)
- **Anniversary timer**: `Couple.relationshipStartDate` + `anniversaryService` PURE (años/meses/días + hito siguiente). `AnniversaryCard` en dashboard. `/api/anniversary` GET|PUT|DELETE.
- **Image proof opcional**: `TaskLog.proofImageUrl` + `proofUploadedAt`. `TaskProofUploader` en `Tasks.tsx` (mis pendientes, edit) y en `TaskPendingCard` (verificador, read-only). `/api/task-logs/:logId/proof` GET|POST|DELETE.
- Diseño sin almacenar binarios: data-URL <500KB o https:// hosteada por el usuario.

---

## ⚠️ PENDIENTE DE OPERACIÓN MANUAL EN PROD (one-time)

> El código está mergeado a `main` y desplegado, pero requiere acción humana en infraestructura.

1. **Confirmar que Render aplicó las migraciones v2.0.4 + v2.0.5**
   - Migraciones: `20261020000000_v2_0_4_catalog_consensus`, `20261101000000_v2_0_5_quick_wins`.
   - Si Render saltó migrate (bug histórico desde 2026-04-10): ejecutar `npx prisma migrate deploy` con `DATABASE_URL` de Supabase.
   - Verificación: `\d "ActivityTemplate"`, `\d "ConfigurationProposal"`, columna `relationshipStartDate` en `Couple`, columnas `proofImageUrl` + `proofUploadedAt` en `TaskLog`.

2. **Seed del catálogo global de actividades** (sólo una vez, idempotente)
   ```bash
   cd src/backend
   DATABASE_URL=<supabase> npx ts-node prisma/seedActivityTemplates.ts
   ```
   Inserta ~50 templates globales (`coupleId=null`).

3. **QA en dos cuentas reales** del flujo end-to-end:
   - Crear evento eligiendo template del catálogo (v2.0.4).
   - Proponer cambio de multiplicador desde A → aceptar desde B → ver entry en changelog.
   - Fijar fecha de aniversario, ver el timer en dashboard.
   - Completar tarea, subir foto de prueba (data-URL <500KB), partner verifica viendo la foto.

---

## 🟡 IMPLEMENTADO PERO NO INTEGRADO TODAVÍA

> Componentes/servicios listos en código pero falta enchufarlos al flujo principal.

- ~~**`ActivityCatalogPicker` en creación de eventos.**~~ ✅ Enchufado en v2.0.6 (botón "🔎 Catálogo" en RequestActivity).
- ~~**Botón "Proponer cambio" en cada regla de Settings.**~~ ✅ Enchufado en v2.0.6.
- **CRUD completo en página de Actividades** (feedback usuario 2026-05-03): la sección "Actividades" del nav es mucho menos completa que "Tareas". Falta poder añadir, editar, eliminar actividades del catálogo desde una página dedicada (no sólo el modal del picker). → Backlog v2.0.7.
- **`refreshTokenService` con rotación + reuse detection.** Implementado en backend, pero el flujo de auth todavía emite JWT puro. Activar al introducir mobile RN en v3.0.
- **Anuario PDF preview** (mencionado en spec v3.0 como gancho freemium). Servicio Puppeteer no implementado todavía.
- **Seed del catálogo global en Supabase**: ejecutar `npx ts-node prisma/seedActivityTemplates.ts` una vez. Sin esto, el picker mostrará "No hay actividades".

---

## 🔴 PENDIENTE DE IMPLEMENTAR

### Próximas versiones con spec aprobado o brainstorm
- **v2.0.6 Refinos catálogo** (por decidir tras D30)
  - Picker en EventCreate (sustituir entrada libre).
  - Contraoferta en propuestas de configuración.
  - "Proponer cambio" inline en cada slider de Settings.
- **v2.1 Conectados** (spec aprobado, branch pendiente)
  - Push notifications PWA reales (lib `web-push` ya viene de v1.7, falta loop scheduler real).
  - Sync Google Calendar bidireccional (OAuth scaffolding ya existe, falta sync engine + tokens cifrados).
  - Email transaccional via Resend.
  - Export CSV/PDF de historial.
  - Sistema de referidos con código + recompensa.
  - ICS feed.
- **v2.2 Multiidiomas** (brainstorm pendiente, spec por escribir)
  - i18n con react-i18next, locales `es/en/ca/pt`.
  - Toggle de idioma en Settings con persistencia (`User.locale`).
  - Catálogo de prompts journal localizado.
  - Plantillas email localizadas.
  - `name_i18n` JSON en `ActivityTemplate` para traducciones.
- **v3.0 Premium** (spec aprobado)
  - Stripe Checkout + Customer Portal.
  - Trial 14 días sin tarjeta.
  - AI assistant (Anthropic Claude Haiku ZDR).
  - Themes premium (5 paletas).
  - Anuario PDF anual (Puppeteer).
  - Multi-couple history.
  - React Native app (opcional).

### Out-of-scope MVP de v2.0.4 (diferidos)
- Contraoferta en propuestas (sólo accept/reject hoy).
- Notificaciones push para nuevas propuestas (requiere v2.1 push real).
- "Proponer cambio" inline en cada slider de Settings (panel + endpoint manual hoy).

### Out-of-scope MVP de v2.0.5 (diferidos)
- Almacenamiento real de imágenes (cloud storage). Hoy se usa data-URL <500KB.
- Reglas anti-fraude duras: hoy la imagen es opcional; no bloquea verificación si falta.
- Mosaico/galería de pruebas en analytics ("últimas tareas con foto").

---

## ❓ DECISIONES PENDIENTES

> Cosas que requieren input del producto antes de decidir cómo construirlas.

1. **¿Imágenes reales en cloud storage o data-URL es suficiente?**
   Hoy v2.0.5 acepta data-URLs <500KB. Si la pareja sube muchas fotos, esto crece el row de TaskLog. Decidir cuándo migrar a S3/Cloudflare R2 (probablemente cuando data D30 muestre uso real).
2. **¿UI inline para "proponer cambio" en cada slider de Settings?**
   Hoy hay panel + endpoint, pero no un botón "Proponer este cambio" en cada control. Decidir si conviene en v2.0.6 o esperar a feedback.
3. **¿v2.1 Conectados o v2.2 Multiidiomas primero?**
   Conectados aporta retención (notifs + sync); Multiidiomas amplía mercado. Brainstorm en sesión nueva tras D30.
4. **¿Activar refresh tokens en webapp ya o esperar a RN v3.0?**
   Listo en backend, pero introduce complejidad (rotación + reuse detection). Por ahora JWT plano basta para web.
5. **¿Replantear el nombre/etiqueta de "alto_impacto" en el catálogo de actividades?**
   La categoría incluye bodas, comuniones, despedidas, funerales — agrupar mejor por "social vs ritual" o dejar como está.
6. **¿El picker del catálogo debe sustituir o coexistir con la entrada libre de eventos?**
   Si sustituye → más higiene de datos para analytics. Si coexiste → más libertad pero menos consistencia.

---

## 🧪 MÉTRICAS / OBSERVACIONES PRE-D30

> A revisar 30 días tras v2.0.4/v2.0.5 en prod.

- Adopción del catálogo: ¿qué % de eventos usa template vs entrada libre?
- Adopción del consenso: ¿cuántas propuestas se crean por semana, % aceptadas, tiempo medio de respuesta?
- Adopción del anniversary timer: ¿qué % de parejas activas tiene fecha fijada?
- Adopción de image proof: ¿qué % de tareas verificadas tiene foto? ¿correlaciona con menos disputas?
- Datos para decidir v2.0.6 (refinos) vs saltar a v2.1.

---

## 🗺️ Roadmap resumido

| Versión | Estado | Notas |
|---|---|---|
| MVP1 → v1.7 | ✅ Producción | Core + gamificación 2º round |
| v2.0.1 Calendario 360 | ✅ Producción | Google sync diferido a v2.1 |
| v2.0.2 Journaling | ✅ Producción | Atachments diferidos |
| v2.0.3 Analytics Pro | ✅ Producción | Invariantes matemáticos |
| v2.0.3.1 Hotfix | ✅ Producción | IDOR + UX must-fix |
| v2.0.4 Catálogo + Consenso | ✅ Producción 2026-05-03 | Pendiente seed + QA E2E |
| v2.0.5 Quick wins | ✅ Producción 2026-05-03 | Anniversary + image proof |
| v2.0.6 Refinos + bugfixes | ✅ Producción 2026-05-03 (tarde) | Wiring v2.0.4 + fix routes 404 + fix tareas fantasma + UX anniversary + CI |
| v2.0.7 Bugfixes mood/replay/calendar/rules | ✅ Producción 2026-05-03 (noche) | Mood reset día, fecha en mejor día, botones calendar, banner reglas honesto, auto-seed catálogo |
| v2.0.8 Actividades full-CRUD | ✅ Producción 2026-05-03 (noche) | Tab Catálogo + add/edit/delete templates |
| v2.1.0 Gamificación unificada | ✅ Producción 2026-05-03 (noche) | 10 niveles Encuentro→Mito, eliminado el dual-banner |
| v2.1.1 Tareas/Actividades flow | ✅ Producción 2026-05-03 (noche tardía) | Añadir vs Crear + consenso puntos en plantillas |
| v2.2.0 Dashboard refactor | ✅ Producción 2026-05-04 | Hero unificado + MoodCard + PointsBurst (canvas 01/03/13) |
| v2.2.1 Reglas reales | ✅ Producción 2026-05-04 | Consensus aplica a Configuration (canvas 06) |
| v2.2.2 Progress bar microanimation | ✅ Producción 2026-05-04 | Hero progress 0→pct mount animation (canvas 13) |
| v2.2.3 Onboarding partner | ✅ Producción 2026-05-04 | Catch-up 4 pasos cuando llega segundo (canvas 08) |
| v2.2.4 Notification preferences | ✅ Producción 2026-05-04 | 3 tiers + quiet hours + 6 categorías (canvas 10) |
| v2.2.5 Digest scheduler | ✅ Producción 2026-05-04 | Cron diario que agrega y manda 1 push (cierra canvas 10) |
| v2.2.6 Red balance card | ✅ Producción 2026-05-04 | Saldo en rojo crónico escalado (canvas 09) |
| v2.2.7 Empty state hero | ✅ Producción 2026-05-04 | Día 1 motivador (canvas 11 estado 1/4) |
| v2.2.8 Vacation mode | ✅ Producción 2026-05-04 | Couple.pausedUntil + banner + respeto en streaks/digest (canvas 14) |
| v2.2.9 Microinteracciones extras | ✅ Producción 2026-05-04 | Level-up modal con confeti + balance counter tween + flame flicker (canvas 13) |
| v2.2.x Más microinteracciones | 🔴 Pendiente | level-up confetti + balance counter + streak flame + undo swipe (canvas 13 restantes) |
| v2.2 Multiidiomas | 🧠 Brainstorm pendiente | i18n ES/EN/CA/PT |
| v3.0 Premium | 📝 Spec aprobado | Stripe + AI + RN |
| v2.1 Conectados | 📝 Spec aprobado | Push real + Google sync + email |
| v2.2 Multiidiomas | 🧠 Brainstorm pendiente | i18n ES/EN/CA/PT |
| v3.0 Premium | 📝 Spec aprobado | Stripe + AI + RN |
