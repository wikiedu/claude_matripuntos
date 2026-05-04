# Matripuntos App — UI kit

A pixel-close recreation of the Matripuntos mobile web app. This kit is **cosmetic** — there is no real backend, no auth, no persistence. Use the components to compose new screens, flows, or marketing artifacts that look like the live product.

## What's in here

```
ui_kits/app/
├── index.html       ← click-through prototype (open this!)
├── Primitives.jsx   ← Card · Button · Pill · Avatar · ProgressBar · Input · Label
├── Navigation.jsx   ← AppHeader, BottomNav (5-tab + amber FAB)
├── Dashboard.jsx    ← BalanceHero · StreakWidgets · LevelCard · PendingTasksList · RecentMovements
├── Tasks.jsx        ← CategoryFilter · TaskItem · TaskCatalogRow · AddTaskSheet (bottom-sheet modal)
└── Gamification.jsx ← AchievementBadge · AchievementsGrid · WeekStrip · EventCard · CalendarList
```

Plus the design tokens at `../../colors_and_type.css`.

## Screens covered

| Screen        | What it shows |
|---------------|---|
| **Dashboard** | Balance hero, daily/weekly streaks, level progress, today's pending tasks, recent movements |
| **Tasks**     | Category filter chips, today's pending with checkbox complete, scrollable catalog, add-task bottom sheet |
| **Calendar**  | Week-strip bar chart (you vs partner), upcoming events list with negotiation status |
| **Achievements** | Level hero + 2-col grid of earned/locked badges with progress bars |

Tap the 5-tab bottom nav to switch screens. Tap a pending task's circle to complete it — you'll see a `+MP` toast and the balance ticks up. Tap the amber FAB (+) to open the add-task sheet.

## How to use

- **Import components** directly — every file exposes its components on `window`, so any other Babel script can grab them.
- **Tokens** come from `colors_and_type.css`. Classes on `<html>` (`dark` / `light`) switch theme.
- **Modify fake data** at the top of `index.html` — USER / PARTNER / INITIAL_PENDING / CATALOG / MOVEMENTS / WEEK_DAYS / UPCOMING / BADGES. All local state.

## What this kit does NOT reproduce

- **Real API** — no `apiClient`, no React Query, no mutations.
- **Auth / onboarding** — login, signup, partner-invite, couple-setup flows are not recreated.
- **Negotiation / counter-proposals** — `EventNegotiationCard`, `CounterProposalForm`, `RuleProposalCard` are not yet in the kit. (Flag to expand.)
- **Shopping list / To-dos** — the bottom-sheet in the real app opens pickers for these; the kit shows the add-task path only.
- **Analytics dashboard** — recharts line chart, category split, coupleScoreGauge are not in the kit.
- **Light theme** — the kit renders in dark mode; tokens for light exist in `colors_and_type.css`.

These are all explicit omissions to keep the kit small. Add them incrementally as real designs demand.

## Source of truth

Every visual token, color, and gradient is lifted directly from `src/frontend/src/components/*.tsx` and `src/frontend/src/pages/*.tsx` in the live codebase. Specifically:

- Header + bottom nav → `BottomNav.tsx`, `Dashboard.tsx`
- Streak widgets → `StreakWidget.tsx`
- Balance hero → `Dashboard.tsx` (inline styles, indigo→purple gradient)
- Pills / badges → repeated rgba recipes across components
- Avatar → `Avatar.tsx`
- Pending task card → `TaskPendingCard.tsx`, `Tasks.tsx`

If you want to add a new component, read the corresponding file first. Do not reinvent values — the real app is the spec.
