# Estado del proyecto — 2026-05-02

> Snapshot del estado de Matripuntos tras la sesión maratón de implementación.
> Actualizable. Para histórico completo de versiones ver `docs/ROADMAP.md`.

---

## 1. Producción ahora mismo

- **Backend Render:** `https://matripuntos-api.onrender.com` · commit `0b8c1aa` · tag `v2.0.2`.
- **Frontend FTP:** `ftp.keepitup.io` · build incluye flags de v1.7+v2.0.1+v2.0.2 activos.
- **Última migración Prisma aplicada:** `20260901000000_v2_0_2_journaling`.
- **Health endpoint:** `GET /api/health` debe responder `db: ok`.

Tags pushed (orden cronológico):
```
mvp1 → v1.1 → v1.2 → v1.3 → v1.4 → v1.4.1 → v1.5 → v1.6 → v1.6.1 →
v1.6.2 → v1.6.3 → v1.6.4 → v1.6.5 → v1.6.6 → v1.6.7 → v1.7 → v2.0.1 → v2.0.2
```

---

## 2. ✅ Activo y funcionando en producción

Todo lo siguiente NO requiere configuración adicional para funcionar:

### Core (MVP → v1.5)
- Auth (signup, login, JWT 7d, demo mode)
- Couple management (creación, joinCode, invitee onboarding)
- Activities (events) con sistema de puntos negociable
- Tasks recurrentes + logs + verificación + auto-accept 24h
- Negotiations free 2 rondas + force pago propio saldo
- Calendar v1 (vista básica)
- Analytics básicos
- Settings completo

### v1.6 — La Personalidad
- Avatares personalizables (emoji + color)
- Mood diario (catálogo cerrado, vigencia 24h)
- Frase del día determinística (cyrb53 + cascada por mood)
- AppHeader con mood indicator

### v1.6.1 — Confianza (privacy + lifecycle)
- Cookie consent banner (3 acciones, persistente, revocable)
- Páginas legales `/privacy`, `/terms`, `/cookies` (markdown)
- Account deletion wizard (3 pasos)
- Leave couple wizard (2 pasos) + history past-couples
- Profile completion banner (7 días desde firstLogin)
- Onboarding invitee con avatar + work mode
- Footer global con links legales
- Rate-limit granular (5 buckets: auth/profile/write/read/critical)
- Data retention job (MoodLog 90d, Notification 60d, Invitation 14d, User 31d)
- Soft delete + ghost user anonymization
- Couple dissolution → couples individuales

### v1.6.2-v1.6.7 — Hotfixes post-auditoría
- GDPR Art. 20: `GET /api/account/export` → bundle JSON descargable
- GDPR Art. 8: checkbox edad ≥18 obligatorio en signup
- compensationDiscount aplicado en pointsCalculator
- Mood sync cross-cuenta (auth/me y auth/couple incluyen `moodUpdatedAt`)
- MoodPairCard compacto (icono pequeño en una línea)
- Auto-refresh tareas on focus/visibility/30s polling
- Filtro "Hoy" excluye tasks isDefault del seed
- 11 fixes WCAG AA (focus-trap, labels, aria-pressed, aria-describedby, 44px tap targets, Escape modals)
- authMiddleware filtra `deletedAt: null`
- Ghost user race-safe + partial indices

### v1.7 — El Juego (segundo round)
- **CoupleLevel** con 10 niveles (Vecinos→Vida) + perks unlockables
- **CoupleStreak** daily + weekly con margen 30min, longestX preservados
- **CoupleChallenge** semanal auto-generado (5 tipos × dificultad por nivel)
- **achievementEngineV2** con catálogo 30 logros (6 categorías × 5)
- **replayService** "Hace 1 año" / "Mejor día" / "Récord equilibrio" / "First event"
- **Routes** `/api/gamification-v2/{level,streak,challenge,replay}`
- **Frontend Dashboard top:** LevelBar + StreakBadge + ChallengeCard + ReplayCard
- 8 eventos telemetría gamification.* + notification.*

### v2.0.1 — Calendario 360
- **CalendarEntry extendido** (endDate, allDay, externalSource, externalId, recurrence, metadata)
- **GoogleCalendarSync** modelo (refreshToken cifrado AES-256-GCM)
- **ServiceProvider** modelo + recurrence
- **recurrenceService** RRULE simplificado (DAILY/WEEKLY/MONTHLY/YEARLY + BYDAY + UNTIL)
- **holidaysService** ES 2026 (10 holidays)
- **birthdaysService** auto-derive de Child + couple anniversary
- **Routes** `/api/calendar/v2/{entries,service-providers}` CRUD
- **CalendarMonthViewV2** componente

### v2.0.2 — Journaling
- **JournalEntry** modelo (5 tipos: reflection/photo/voice/milestone/letter)
- **JournalReaction** emoji por entry (UNIQUE por user+emoji)
- **JournalPrompt** modelo + catálogo 30 prompts curados ES (5 categorías)
- **JournalRetrospective** stats agregadas week/month/year
- **journalPromptsService** selector determinístico cyrb53(coupleId+dayKey)
- **journalRetrospectiveService** pure compute stats
- **Routes** `/api/journal/{entries,prompts/today,retrospectives}` CRUD
- Hooks frontend listos (`useJournalEntries`, `useTodayPrompt`, `useRetrospectives`)

### Tests
- **Backend hermetic CI: 273 tests verdes** (31 suites)
- **Frontend vitest: 161+ verdes**
- **E2E Playwright: 32+ specs** (chromium + webkit)
- Cron jobs: dataRetention + auto-accept TaskLog (24h)

---

## 3. 🟡 Desplegado pero INACTIVO (esperando configuración)

Estas features están en producción pero degradan a no-op porque les falta env var. Son **opcionales** — la app funciona sin ellas.

### 3.1 Telemetría PostHog (`POSTHOG_KEY`)

- **Dónde está:** `src/backend/src/services/telemetry.ts` + `src/frontend/src/services/telemetry.ts`.
- **Estado actual:** dependencias `posthog-node` y `posthog-js` instaladas, código carga lazy con catch.
- **Sin la env var:** wrappers loguean warning una vez, eventos se descartan.
- **Para activar:** crear cuenta en [posthog.com](https://posthog.com) (Cloud EU), copiar Project API Key, Render env → `POSTHOG_KEY=phc_xxxxx`. Frontend recibe el key vía `VITE_POSTHOG_KEY` en build.
- **Tiempo:** 5 min.

### 3.2 Email transactional Resend (`RESEND_API_KEY`)

- **Dónde está:** `src/backend/src/services/emailService.ts`.
- **Endpoint afectado:** `POST /api/account/delete-request` (envía código de confirmación).
- **Sin la env var:** en dev imprime el código en consola; en prod devuelve 503.
- **Para activar:** [resend.com](https://resend.com) cuenta gratuita → API Key → Render env `RESEND_API_KEY=re_xxxxx` + opcional `RESEND_FROM`.
- **Tiempo:** 5 min.
- **Sin esto:** users en producción que intenten eliminar cuenta verán 503. No es bloqueante para el resto.

### 3.3 Web Push notifications (`VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`)

- **Dónde está:** `src/backend/src/services/webPushService.ts` + `src/frontend/src/hooks/useWebPush.ts`.
- **Endpoint afectado:** `/api/notifications/push/{vapid-key,subscribe,test}`.
- **Sin las env vars:** `/vapid-key` devuelve 503, hook frontend marca state `unsupported`.
- **Para activar:**
  ```bash
  npx web-push generate-vapid-keys
  ```
  Pega ambos en Render env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`). Opcional `VAPID_SUBJECT` (default `mailto:soporte@matripuntos.app`).
- **Tiempo:** 5 min.
- **Sin esto:** notifications de achievement unlock, challenge ready, etc. no se envían.

### 3.4 Google Calendar OAuth (`GOOGLE_OAUTH_*` + `GOOGLE_TOKEN_ENCRYPTION_KEY`)

- **Dónde está:** `src/backend/src/routes/googleCalendarOauth.ts` + `src/backend/src/services/cryptoService.ts`.
- **Estado actual:** **ESQUELETO** — endpoints `GET /auth` devuelven URL de OAuth correcta, `POST /callback` devuelve 501 "Pendiente integración googleapis".
- **Lo que falta para activarlo completo:**
  1. Setup OAuth en [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
     - Habilitar Google Calendar API.
     - Crear OAuth Client ID (Web application).
     - Authorized redirect: `https://matripuntos-api.onrender.com/api/calendar/google/callback`.
     - OAuth consent screen con scope `calendar.readonly`.
  2. Render env vars:
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REDIRECT_URI` (mismo que el authorized arriba)
     - `GOOGLE_TOKEN_ENCRYPTION_KEY` — generar con `openssl rand -hex 32` (64 chars hex)
  3. **Hotfix v2.0.1.x pendiente:** integrar `googleapis` SDK en backend para que `/callback` y `/sync` realmente intercambien tokens y traigan eventos.
- **Tiempo total estimado:** 30 min setup Google Console + ~2-3h dev del SDK.
- **Sin esto:** users pueden ver el botón "Conectar Google Calendar" pero al pulsar verán 503.

### 3.5 Sentry error monitoring (`SENTRY_DSN`)

- **Dónde está:** ya configurado en `src/backend/src/server.ts` y `src/frontend/src/main.tsx` (legacy v1.5).
- **Sin la env var:** Sentry init no-op.
- **Para activar:** [sentry.io](https://sentry.io) cuenta + crear proyecto Node + proyecto React + pegar DSNs en Render env (`SENTRY_DSN_BACKEND`, `VITE_SENTRY_DSN_FRONTEND`).
- **Tiempo:** 10 min.

---

## 4. 🟠 Pendiente — UI/UX hotfix (v2.0.x.x)

Estas son **completar** features ya iniciadas. El backend funciona; falta UI.

### 4.1 v2.0.1.x — Calendar 360 UI completa

- ❌ Vista día (timeline vertical hora a hora)
- ❌ Vista semana (7 columnas)
- ❌ Vista año (heatmap mensual)
- ❌ `CalendarFilters` + `EntryDetailSheet` + `AddEntrySheet`
- ❌ `ServiceProvidersManager` UI (CRUD de Carmen — limpieza, etc.)
- ❌ `GoogleCalendarConnect` UI (botón + estado conectado)
- ❌ Cron `calendarSync` diario (cuando OAuth real esté listo)
- ❌ Cron `birthdays` mensual (regenera entries de cumpleaños)
- ❌ 8 eventos telemetría calendar.*
- ❌ 5 E2E specs Playwright

**Esfuerzo:** 1-2 días dev.

### 4.2 v2.0.2.x — Journaling UI completa

- ❌ Ruta `/journal` registrada en App.tsx
- ❌ `JournalComposer` (textarea + tags + shared toggle + voice button)
- ❌ `JournalEntryCard` (preview + reactions + tap to expand)
- ❌ `JournalRetrospectiveModal` (stats card + highlights)
- ❌ Page `/journal/anuario` (vista visual mensual)
- ❌ Cron retrospectivas (lunes/1mes/1ene auto-genera)
- ❌ Storage attachments (Supabase Storage signed URLs para photo/voice)
- ❌ 6 eventos telemetría journal.*
- ❌ 4 E2E specs Playwright

**Esfuerzo:** 1-2 días dev.

---

## 5. 🔴 Pendiente — Sprint 2 audit (diferido)

De la auditoría profunda v1.7-pre, los items que se decidieron diferir por invasividad:

- **JWT refresh tokens (S1-6):** JWT actual TTL 7 días sin rotation. Riesgo medio. Requiere modelo nuevo `RefreshToken`, lógica de rotation, invalidación, frontend interceptor que renueva. ~1-2d dev.
- **Filtro deletedAt global en queries User no críticas (S1-4 ampliado):** authMiddleware ya rechaza ghosts; falta auditar family/partner search/etc. ~4h dev.
- **DPAs firmados** (Render, Supabase, PostHog, Sentry) — requiere acción legal del user, no del código.
- **RAT review legal** — necesita asesor humano.
- **Breach notification procedure** — documentar `docs/legal/breach-procedure.md`.

---

## 6. 🔵 Pendiente — Roadmap futuro

Versiones planificadas en `docs/ROADMAP.md` aún sin spec:

- **v2.0.3 Analytics Pro** — gráficos avanzados, exports.
- **v2.1 Conectados** — push real (cuando VAPID activado), Google Cal write, ICS export, referidos.
- **v3.0 Premium** — Stripe, freemium B (challenges premium ilimitados, custom badges, multi-storage, AI prompts).

---

## 7. ⚠️ Acciones urgentes del user (humanas)

- 🔐 **Rotar password Supabase** — `Matripuntos123@` se expuso en chat anterior. Supabase → Project Settings → Database → Reset password → actualizar `DATABASE_URL` en Render.
- ✅ **QA dos cuentas en producción** — verificar v1.7 (mood, level, streak) y v2.0.2 (journal) con dos navegadores.
- 📧 **Decidir activaciones opcionales** (§3 arriba): cuáles sí y cuáles no.

---

## 8. 📊 Métricas a fecha 2026-05-02

| Concepto | Valor |
|---|---|
| Versiones en producción | 17 (mvp1 → v2.0.2) |
| Tests CI hermetic backend | 273 verdes (31 suites) |
| Tests frontend vitest | 161+ verdes |
| E2E Playwright specs | 32+ |
| Migrations aplicadas | 26 (Prisma) |
| Workspaces npm | 5 (frontend, backend, database, packages/shared, e2e) |
| Líneas de código backend | ~15k TypeScript |
| Modelos Prisma | 30+ |

---

## 9. Cómo desactivar features sin redeploy

Si algo va mal en producción, en Render dashboard → Environment → añadir:

| Env var | Efecto |
|---|---|
| `GAMIFICATION_V2_ENABLED=false` | Desactiva v1.7 (level/streak/challenge/replay/push) |
| `CALENDAR_360_ENABLED=false` | Desactiva v2.0.1 (calendar/v2 + Google) |
| `JOURNAL_ENABLED=false` | Desactiva v2.0.2 (journal) |

Frontend lee VITE_* en build time, así que para desactivar en frontend hay que rebuild + FTP.

---

*Documento mantenible. Actualizar tras cada release.*
