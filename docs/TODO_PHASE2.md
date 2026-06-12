# TODO_PHASE2 — estado vivo de la Fase 2 (post v2.9.0)

> Registro vivo ordenado. El modelo siempre coge el **primer ítem sin marcar** y lo ejecuta.
> Al terminar un ítem: márcalo [x] y escribe la fecha. Al bloquearte: anota debajo del ítem.
> Ver brief completo: `docs/PHASE2_MASTERBRIEF.md`.

---

## COLA DE TRABAJO (en orden — el modelo siempre coge el primero sin [x])

### MÓDULO A — Seguridad (prioridad 1)
- [ ] **A.1a** `account.ts:35` — Math.random() → `crypto.randomInt(100000, 1000000)`
- [ ] **A.1b** `invitationService.ts:56,159` — Math.random() → `crypto.randomBytes(16).toString('hex')` en secretKey
- [ ] **A.1c** `emailService.ts:49` — Math.random() → `crypto.getRandomValues` en jitter (low priority)
- [ ] **A.2** IDOR audit `invitations.ts` V2 — leer completo, guards por coupleId, test cross-couple
- [ ] **A.3** `npm audit fix` axios en frontend + backend
- [ ] **A.4** `prisma/seed.ts` — verificar/reemplazar credenciales hardcoded
- [ ] **A.5** [DECISIÓN — solo doc] localStorage JWT → httpOnly cookies: escribir plan en bloqueos al final de este archivo

### MÓDULO B — Performance (prioridad 2)
- [ ] **B.1** Code splitting + React.lazy en `App.tsx` + manualChunks en `vite.config.ts` (bundle 898KB → ~200KB)
- [ ] **B.2** DB indexes en `schema.prisma`: Event, TaskLog, Notification, CalendarEntry, MoodLog, JournalEntry
- [ ] **B.3** N+1 analytics/calendar — Promise.all en `analyticsService.ts` y `calendarService.ts`
- [ ] **B.4** Fuentes Inter: restringir a latin+latin-ext en `main.tsx`/`index.css`

### MÓDULO C — Deuda técnica (prioridad 3)
- [ ] **C.1** Confirmar 0 consumidores de `negotiationEngine.ts` → borrar archivo + test file
- [ ] **C.2** Mapear consumidores achievements V1 vs V2 → plan flag `LEGACY_ACHIEVEMENTS_ENABLED=false`
- [ ] **C.3** ErrorBoundary global en `App.tsx` o `AuthedLayout.tsx`
- [ ] **C.4** Remaining explicit `any` en backend + frontend críticos
- [ ] **C.5** Plan migración `invitations.ts` V2 → doc en bloqueos

### MÓDULO D — Brainstorming (prioridad 4) ⚠️ SIN CÓDIGO — solo produce docs/PHASE2_FEATURE_PROPOSALS.md
- [ ] **D.all** Análisis completo D.1-D.8 + propuestas libres + ranking top 5 → `docs/PHASE2_FEATURE_PROPOSALS.md`
  - D.1 Flujo de negociación (UX, wizard, historial)
  - D.2 Gamificación engagement (retos, streaks, celebraciones)
  - D.3 Push notifications strategy (UI suscripción, eventos, iOS)
  - D.4 Analytics Pro (utilidad real, resumen email, comparativa)
  - D.5 Supabase Realtime vs polling (coste/beneficio, selectivo)
  - D.6 Sistema de puntos (inflación, bonificaciones, equilibrio)
  - D.7 Onboarding (tasa completado, simplificación, DashboardTour)
  - D.8 Features nuevas (modo vacaciones, acuerdos recurrentes, widget, export PDF, modo solo)

### MÓDULO E — UX/UI polish (prioridad 5)
- [ ] **E.1** Empty states audit: Shopping, Todos, Notifications, Achievements tabs
- [ ] **E.2** PWA install prompt: `beforeinstallprompt` + banner manual iOS
- [ ] **E.3** Accessibility: aria-labels en BottomNav, FabActionSheet, modales
- [ ] **E.4** Loading skeletons: audit adoption de `Skeleton` primitive en Activities, Calendar, Analytics, Achievements
- [ ] **E.5** `Settings.tsx` — organizar + añadir sección "Notificaciones Push" con toggle `useWebPush().subscribe()`
- [ ] **E.6** Calendar day view UX + link EventCard → ActivityDetail
- [ ] **E.7** Journal: prompt del día visible sin scroll + retrospectivas CTA
- [ ] **E.8** Dark mode: buscar `bg-white`/`text-black` sin variante `dark:`

### MÓDULO F — Testing (prioridad 6)
- [ ] **F.1a** E2E visual Tasks.tsx: marcar tarea, navegar semanas, catalog flow
- [ ] **F.1b** E2E visual Calendar EventNegotiationCard: proponer, aceptar, link a detalle
- [ ] **F.2** Contract tests `invitations.ts` V2: cross-couple, token expirado, reutilizado
- [ ] **F.3** Unit tests: `activityTemplateService.ts`, `calendarService.ts`
- [ ] **F.4** Ejecutar suite completa + documentar tests DB-bound en rojo esperables

### MÓDULO G — Architecture (prioridad 7)
- [ ] **G.1** Capacitor readiness: APIs web-only, router, deep links
- [ ] **G.2** Rate limiting audit: forgot-password, login, register, upload
- [ ] **G.3** [DECISIÓN] Supabase Realtime selectivo — solo si D.5 favorable
- [ ] **G.4** [DECISIÓN] httpOnly cookies JWT — solo si A.5 aprobado

---

## BLOQUEOS

*(vacío — añadir aquí si el modelo se bloquea en algún ítem)*

**Formato:**
```
### BLOQUEO en [ítem]
- Qué: ...
- Por qué bloquea: ...
- Decisión: ...
- Riesgo: ...
```

---

## HECHO

*(vacío — mover ítems aquí cuando estén completados con fecha)*
