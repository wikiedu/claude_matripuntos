---
date: 2026-04-03
topic: bug-fixes-and-system-upgrade
---

# Bug Fixes + System Upgrade — Matripuntos

## Problem Frame

The MVP is functionally complete but has 8 known bugs degrading UX, plus the activity category system needs rationalization to be more intuitive and semantically correct.

## Requirements

**Bug Fixes**

- R1. After accepting an activity or task in RequestInbox, the Dashboard (home) must reload balance, events, and pendingTaskCount without requiring a page refresh. Use a `refreshCounter` state or callback pattern.
- R2. AnalyticsDashboard (advanced analytics at `/analytics/advanced`) must have a back button (ArrowLeft → navigate('/dashboard')).
- R3. The weekly trends chart X-axis must show human-readable date labels (e.g. "27 Mar") instead of ISO week numbers. The backend `getWeeklyTrends` must return `label: string` (formatted week-start date) instead of `week: number`. AnalyticsChart renders this label on the XAxis.
- R4. The Dashboard 30-day chart must always display "Hoy" as the rightmost label. Current `interval={4}` on XAxis hides the last tick. Use a `ticks` array computed to always include the last index, or use a custom tick formatter.
- R5. AnalyticsDashboard period filter must offer 4 options: "Esta semana" (Mon–today), "Este mes" (1st–today), "Semana anterior" (full prev week), "Mes anterior" (full prev month). Update `getDateRange` accordingly.
- R6. In CalendarDashboard, event cards in the selected-day panel must be clickable. Clicking a pending/draft event navigates to Dashboard inbox view. Clicking an accepted event navigates to Dashboard inbox history tab.
- R7. `POST /api/points/reset-request` must create a Notification for the partner (type='reset_requested', title='Reset de puntos solicitado'). `POST /api/points/reset-confirm` must delete all PointsTransactions for the couple (real reset). Frontend Settings must: on load, fetch notifications and check for unread 'reset_requested' from partner; if found, show "Tu pareja quiere resetear los puntos — Confirmar" UI (not rely on local resetState='confirming'). After confirm, mark notification as read.
- R8. Notification badge count on Dashboard "Bandeja de entrada" button must refresh after returning from RequestInbox. Fixed by R1 (loadData re-runs on refreshCounter change).

**Category & Points System Upgrade**

- R9. Simplify default activityTypes in `configurationRoutes.ts` to a rationalized set (see Key Decisions). Remove overly specific types like "Cena + copas", "Viaje fin de semana". Duration already handled by FactorDuración multiplier.
- R10. Update `FALLBACK_CATEGORIES` in `src/frontend/src/pages/RequestActivity.tsx` to match the new simplified category taxonomy. Labels must be clear and non-redundant with date/time fields.
- R11. Add a `salud` category with low type multiplier (×0.65) since medical/health activities are necessary obligations, not discretionary leisure.
- R12. Update `configurationRoutes.ts` reset defaults to include the new simplified types and their multipliers.

## Key Decisions

- **New activity types (R9-R12)**:

  | Key | Label | Base Pts | Multiplier | Reasoning |
  |-----|-------|----------|------------|-----------|
  | `salida` | Salida (amigos/social) | 8 | 1.0 | Ocio social habitual |
  | `viaje` | Viaje | 10 | 1.2 | Cualquier viaje; duración gestiona largo/corto |
  | `escapada` | Escapada en pareja | 6 | 0.85 | Viaje juntos; menos coste al partner |
  | `deporte` | Deporte / hobby | 4 | 0.80 | Elegido, saludable; bajo coste |
  | `trabajo` | Trabajo / formación | 5 | 1.10 | Necesario pero no ocio |
  | `salud` | Salud / médico | 3 | 0.65 | Obligatorio; mínimo coste |
  | `tramite` | Trámite / gestión | 3 | 0.85 | Necesario administrativo |
  | `evento` | Evento especial | 12 | 1.15 | Boda, despedida, concierto |
  | `otro` | Otro | 5 | 1.0 | Genérico |

- **Reset flow (R7)**: Use existing Notification model (no schema migration). Partner sees pending reset in Settings tab "Tu Pareja" by checking for unread 'reset_requested' notifications.
- **Chart today label (R4)**: Pass `ticks` prop to Recharts XAxis with an explicit set including positions 0, 5, 10, 15, 20, 25, 29 (always include 29 = today).
- **Calendar navigation (R6)**: Navigate to '/dashboard' using React Router `navigate` with state `{ openInbox: true, eventId }`. Dashboard reads location.state on mount to auto-open inbox.

## Success Criteria

- Accepting an activity/task in inbox immediately updates balance and badge count on dashboard without page reload
- Advanced analytics has functional back button
- Weekly trends chart shows "27 Mar", "3 Abr" etc. not "7", "14"
- 30-day chart always labels today as "Hoy"
- Analytics filter has 4 period buttons; data range updates correctly
- Clicking calendar event navigates to inbox
- Reset: User A requests → User B sees confirmation UI in Settings → confirms → transactions deleted → balance = 0 both users
- New category list: 9 types, sensible multipliers, no redundancy with date/duration inputs

## Scope Boundaries

- No Stripe or push notifications
- No new Prisma schema models (use existing Notification for reset state)
- No rewrite of negotiation engine
- No changes to V1 routes

## Next Steps

→ Proceed directly to work (bugs are well-defined, scope clear)
