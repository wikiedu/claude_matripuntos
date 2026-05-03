# STATUS — Matripuntos

**Última actualización:** 2026-05-03
**Versión actual desplegada en producción:** `v2.0.5` · Quick wins (anniversary + image proof)
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

### Quick wins (v2.0.5) — **acaba de deployear**
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

- **`ActivityCatalogPicker` en creación de eventos.** El componente está listo y usable; falta sustituir el formulario de "tipo libre" por el picker en `EventCreate`/`Calendar` para que la mayoría de eventos pase por el catálogo. (Se puede hacer en v2.0.4.1 o como parte del rediseño UX que venga después.)
- **`refreshTokenService` con rotación + reuse detection.** Implementado en backend, pero el flujo de auth todavía emite JWT puro. Activar al introducir mobile RN en v3.0.
- **Anuario PDF preview** (mencionado en spec v3.0 como gancho freemium). Servicio Puppeteer no implementado todavía.

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
| v2.0.6 Refinos catálogo | 🤔 Por decidir tras D30 | Picker en EventCreate, contraoferta |
| v2.1 Conectados | 📝 Spec aprobado | Push real + Google sync + email |
| v2.2 Multiidiomas | 🧠 Brainstorm pendiente | i18n ES/EN/CA/PT |
| v3.0 Premium | 📝 Spec aprobado | Stripe + AI + RN |
