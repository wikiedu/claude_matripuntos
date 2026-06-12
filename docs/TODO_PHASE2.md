# TODO_PHASE2 — estado vivo de la Fase 2 (post v2.9.0)

> Registro vivo. Al cerrar cada módulo: mover tarea de Pendiente → Hecho.
> Ver brief completo en `docs/PHASE2_MASTERBRIEF.md`.

---

## ✅ Hecho

*(vacío — fase 2 no iniciada)*

---

## 🔄 En progreso

*(nada en curso)*

---

## 📋 Pendiente (orden sugerido)

### Módulo A — Seguridad S0/S1 (PRIORIDAD 1)
- [ ] **A.1a** Math.random() → `crypto.randomInt` en `account.ts:35` (código borrado de cuenta)
- [ ] **A.1b** Math.random() → `crypto.randomBytes(16).toString('hex')` en `invitationService.ts:56,159` (couple secretKey)
- [ ] **A.1c** Math.random() → `crypto.getRandomValues` en `emailService.ts:49` (jitter, low priority)
- [ ] **A.2** IDOR audit en `invitations.ts` V2 (Sunset vencido) — handlers de accept/reject/pending
- [ ] **A.3** `npm audit fix` axios (S1-1) en frontend y backend
- [ ] **A.4** Credenciales hardcoded en `prisma/seed.ts` (S2-2) — verificar/reemplazar
- [ ] **A.5** [DECISIÓN] localStorage JWT → httpOnly cookies (S1-2) — plan arquitectónico, NO código todavía

### Módulo B — Performance (PRIORIDAD 2)
- [ ] **B.1** Code splitting + React.lazy (bundle 898KB → ~200KB target) — `App.tsx` + `vite.config.ts`
- [ ] **B.2** DB indexes en Event, TaskLog, Notification, CalendarEntry, MoodLog, JournalEntry
- [ ] **B.3** N+1 restantes en analyticsService/analyticsAggregator + calendarService (Promise.all)
- [ ] **B.4** Fuentes Inter: restringir a subset latin+latin-ext (quitar cyrillic/greek)

### Módulo C — Deuda técnica (PRIORIDAD 3)
- [ ] **C.1** Confirmar 0 consumidores de `negotiationEngine.ts` + borrar archivo + test file
- [ ] **C.2** Mapear consumidores achievements V1 vs V2 → plan de flag LEGACY_ACHIEVEMENTS_ENABLED=false
- [ ] **C.3** ErrorBoundary global en frontend (`App.tsx` o `AuthedLayout.tsx`)
- [ ] **C.4** Remaining explicit `any` types en backend y frontend críticos
- [ ] **C.5** Plan migración + IDOR audit `invitations.ts` V2 → doc de decisión

### Módulo D — Brainstorming features (PRIORIDAD 4)
- [ ] **D.1** Análisis flujo de negociación → propuestas UX
- [ ] **D.2** Análisis gamificación → propuestas engagement
- [ ] **D.3** Push notifications strategy → plan de implementación UI
- [ ] **D.4** Analytics Pro → propuestas mejora
- [ ] **D.5** Supabase Realtime vs polling → análisis coste/beneficio
- [ ] **D.6** Sistema de puntos → propuestas de refinamiento
- [ ] **D.7** Onboarding → análisis tasa completado + propuestas simplificación
- [ ] **D.8** Features nuevas → evaluación factibilidad
- [ ] Output: `docs/PHASE2_FEATURE_PROPOSALS.md`

### Módulo E — UX/UI polish (PRIORIDAD 5)
- [ ] **E.1** Empty states audit (Shopping, Todos, Journal, Notifications, Achievements)
- [ ] **E.2** PWA install prompt (`beforeinstallprompt` + guía iOS)
- [ ] **E.3** Accessibility audit rápido (aria-labels, roles dialogs)
- [ ] **E.4** Loading states consistencia (SkeletonList adoption audit)
- [ ] **E.5** Settings.tsx organización + sección "Notificaciones Push" con toggle
- [ ] **E.6** Calendar day view UX + link EventNegotiationCard → ActivityDetail
- [ ] **E.7** Journal UX improvements (prompt visibilidad, retrospectivas CTA)
- [ ] **E.8** Dark mode consistency (colors sin variante dark:)

### Módulo F — Testing (PRIORIDAD 6)
- [ ] **F.1a** E2E visual Tasks.tsx (Playwright: marcar tarea, navegar semanas, catalog)
- [ ] **F.1b** E2E visual Calendar EventNegotiationCard (proponer, aceptar, link a detalle)
- [ ] **F.2** Contract tests invitations.ts V2 (cross-couple, token expirado, token reutilizado)
- [ ] **F.3** Unit tests para activityTemplateService + calendarService + insightsGenerator
- [ ] **F.4** Ejecutar suite completa y documentar tests DB-bound en rojo (24 esperables)

### Módulo G — Architecture (PRIORIDAD 7)
- [ ] **G.1** Capacitor readiness analysis (APIs web-only, router, deep links)
- [ ] **G.2** Supabase Realtime selective (solo Notification + Event) — si decisión D.5 favorable
- [ ] **G.3** httpOnly cookies JWT — implementación completa — si decisión A.5 favorable
- [ ] **G.4** Rate limiting audit completo (forgot-password, login, register)

---

## Bloqueos conocidos al inicio de Fase 2

| Item | Bloqueo | Decisión |
|---|---|---|
| A.5 (localStorage JWT) | Cambio arquitectónico enorme, necesita sprint dedicado | Documentar plan, no implementar hasta sprint específico |
| G.2 (Supabase Realtime) | Depende de análisis coste D.5 + env vars Supabase | Bloqueado por D.5 |
| T1 del refactor (JWT_ACCESS_EXPIRY=15m) | Acción de ops en Render (no código) | Pendiente acción manual de Edu |
| T5 del refactor (imágenes a object storage) | ¿Se usa la feature? | Verificar feature flag TASK_PROOF_ENABLED en prod antes de invertir |
