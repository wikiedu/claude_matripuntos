---
name: matripuntos-design
description: Use this skill to generate well-branded interfaces and assets for Matripuntos, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files:

- `README.md` — full brand brief (product context, content fundamentals, visual foundations, iconography)
- `colors_and_type.css` — drop-in token stylesheet (CSS variables + semantic classes, dark + light themes)
- `ui_kits/app/` — click-through React/JSX prototype of the mobile app with reusable components (Card, Button, Pill, Avatar, BottomNav, BalanceHero, StreakWidgets, TaskItem, AchievementBadge, WeekStrip, etc.)
- `preview/` — small token-specimen HTML cards (colors, type, spacing, components) you can lift for documentation
- `assets/` — logos, icons, brand imagery

**When creating visual artifacts** (slides, mocks, throwaway prototypes, landing pages): link `colors_and_type.css`, copy the JSX components you need out of `ui_kits/app/`, and follow the dark-first aesthetic (deep indigo bg + amber CTAs + purple gamification). Reach for emoji freely for task categories and gamification accents.

**When working on production code** (the real Matripuntos frontend): read the tokens and component specs here to stay consistent with the existing app. The live source lives at `src/frontend/src/components/` and `src/frontend/src/pages/` in the product repo — this skill's components are a mirror, not a replacement. Do not copy this kit's JSX into production verbatim.

**If the user invokes this skill without other guidance**, ask them what they want to build or design, ask a few clarifying questions (surface: mobile screen vs. marketing vs. slide? dark or light? which Matripuntos features are in scope?), then act as an expert designer who outputs HTML artifacts *or* production-shaped code depending on the need.

Key non-obvious rules to enforce:

- Spanish only (tú / vosotros). No English fallback copy.
- Dark theme by default — the indigo gradient bg is part of the brand, not a mode.
- Points are always `MP` with a `+` prefix on positive deltas: `+15 MP`.
- Emoji are functional iconography, not decoration — always pair with a text label except in task-category chips.
- Never invent a new color. If the palette feels restrictive, extend in oklch from existing purple/amber/indigo anchors.
- Balance hero, streak, and level progress use their exact inline gradients — do not tweak the hex codes.
- Respect the 500-px-wide mobile column; only the header fills the viewport above that.
