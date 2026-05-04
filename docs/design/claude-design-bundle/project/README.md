# Matripuntos Design System

> **Matripuntos** — *"Convierte las tareas del hogar en un juego para dos"*
> A gamified couples' app that tracks household chores, turns fairness into a score, and rewards teamwork with streaks, achievements, and weekly champions.

Matripuntos is a Spanish-language mobile-first web app (migrating toward hybrid / native iOS + Android) for couples who live together. The core loop: complete a household task → earn **Matripuntos (MP)**, a point currency weighted by effort and time → see your **balance** vs. your partner → keep a daily **streak** → level up and unlock **achievements**.

The product blends a warm, couple-focused emotional tone with a crisp data dashboard. It is not austere productivity software — it's closer to a Duolingo / Habitica for couples, but grounded in real fairness numbers rather than whimsy.

---

## Products represented

| Product | Status | Surfaces covered in this design system |
|---|---|---|
| **Matripuntos Couples App** | MVP (web, responsive) | Dashboard, Tasks (list + week), Calendar, Achievements, Streaks, Partner/Negotiation, Profile, Auth |
| Future: hybrid / native iOS + Android | Planned | Use the same UI kit — design tokens are mobile-first |

The app is currently a responsive web app served from `/src/frontend` (vanilla JS + Vite). The design system here captures the v2 visual identity so it can be carried forward into the hybrid build.

---

## Sources consulted

- **Local codebase** (read-only, mounted at `Matripuntos/`)
  - `src/frontend/` — vanilla-JS screens (`dashboard.html`, `tasks.html`, `calendar.html`, `achievements.html`, `negotiation.html`, `profile.html`, `onboarding.html`, `login.html`)
  - `src/frontend/css/` — `variables.css`, `main.css`, per-screen stylesheets
  - `src/frontend/js/` — screen controllers and `api.js`
  - `docs/` — `API.md`, `PUNTOS.md` (points weighting), `FLUJOS.md` (UX flows), `ROADMAP.md`
  - `archive/MATRIPUNTOS_V2_SPEC.md`, `archive/PANTALLAS_MVP.md`, `archive/MONETIZACION.md`
  - `CLAUDE.md`, `CHANGELOG.md`
- **GitHub repo**: `wikiedu/claude_matripuntos` (default branch `main`) — mirrors local codebase.

No Figma file was provided; the design system is reverse-engineered from the CSS + live screens.

---

## Index of this design system

```
Matripuntos Design System/
├── README.md                    ← you are here
├── SKILL.md                     ← Agent-Skills-compatible entrypoint
├── colors_and_type.css          ← tokens: colors, type scale, radii, shadows, spacing
├── assets/                      ← logos, favicon, illustrations, icon library notes
│   └── icons/                   ← iconography reference
├── preview/                     ← cards that populate the Design System tab
│   ├── colors-*.html            ← palette cards
│   ├── type-*.html              ← typography specimens
│   ├── spacing-*.html           ← radii, spacing, shadow
│   └── components-*.html        ← buttons, badges, cards, inputs
├── ui_kits/
│   └── app/
│       ├── README.md            ← how to use this kit
│       ├── index.html           ← click-through prototype
│       └── *.jsx                ← React recreations of core components
└── slides/                      ← (not included — no deck template provided)
```

---

## Content fundamentals

Matripuntos speaks **Spanish (Spain)** to **couples**. It addresses the user in the informal **tú / vosotros** register and uses warm, human, slightly gamified copy. The brand voice is encouraging, fair, and a little cheeky — never corporate, never passive-aggressive.

### Voice and register

- **Language:** Spanish, Peninsular Spain conventions (`¡Hola!`, `vosotros`, `semana`, `equidad`).
- **Address:** informal `tú` when speaking to one user, `vosotros` when addressing the couple ("¿Estáis listos para empezar?").
- **Perspective:** Usually second-person ("Tú haces…", "Tu pareja ha completado…"). The app narrates *you* and *your partner* — never "the user" / "the couple."
- **Casing:** Sentence case everywhere. UPPERCASE only for tiny section labels (`HOY`, `ESTA SEMANA`) and small chips.
- **Punctuation:** Full Spanish punctuation including opening `¿` and `¡`. Em-dashes and ellipses used casually.
- **Length:** Short. Dashboard cards use 2–6 word labels. Empty states get one or two friendly sentences, never a paragraph.

### Signature phrases

| Phrase | Role |
|---|---|
| "Convierte las tareas del hogar en un juego para dos" | Tagline |
| "Equidad real, sin peleas innecesarias" | Value prop |
| "Hablamos en persona" | Empty-state for in-person tasks |
| "¿Listos para empezar?" | Onboarding CTA |
| "Tu pareja está esperando" | Pending invite state |
| "¡Racha de X días!" | Streak celebration |
| "Esta semana vas X MP por delante" | Balance summary |
| "Completa una tarea" | Primary empty-state CTA |

### Numbers and currency

- Points are always called **"MP"** (Matripuntos) or shown as a raw number with a small `MP` suffix (`+15 MP`).
- Positive deltas use `+` prefix (`+15 MP`), balances can be shown as `+15` / `-15` to signal who leads.
- Streaks: "X días" (never "X day streak").
- Dates in Spanish short form: `Lun 15 abr`.

### Emoji usage — **YES, intentionally**

Matripuntos uses emoji as **functional iconography**, not decoration. They appear in:

- **Task categories** — 🍳 Cocina · 🧹 Limpieza · 🛒 Compras · 👶 Niños · 🐕 Mascotas · 🔧 Reparaciones · 💰 Finanzas · 📋 Otros
- **Badges and achievements** — 🏆 🔥 ⭐ 💎 🎯 📊 ⚖️ 👑 🌟
- **Empty states / onboarding hero** — ❤️ 💑 🏠
- **Level indicators** — often prefixed to level names (e.g. "Nivel 3 ⭐")

Emoji are rendered at native font (no color substitution) because the OS picker reinforces the playful tone. They always pair with a text label, never stand alone in navigation.

### What the copy never does

- No "As a user…" / third-person product-speak.
- No corporate clichés ("sinergia", "experiencia premium", "unlock your potential").
- No guilt or nagging ("¡Has fallado!"). Errors are warm ("Algo no ha ido bien, probamos otra vez").
- No English loan-words unless necessary (`login` is `Iniciar sesión`; `dashboard` is `Inicio`).

---

## Visual foundations

Matripuntos's look is **dark, warm, gamified, and couple-centric**. Two main palettes work in harmony: **amber** carries warmth and reward; **purple** carries achievement and progression; **indigo** anchors the balance hero. The background is a deep, almost-black indigo gradient that reads as "cozy night in" rather than "dev-tool dark mode."

### Color

**Palette**
- **Background gradient** — `linear-gradient(160deg, #0d0a1a, #0f0a1e, #12103a)` — deep indigo-black, warm on the eye.
- **Card surface** — `rgba(26, 16, 53, 0.85)` with 1px border `rgba(168, 85, 247, 0.15)` — a translucent purple-tinted panel.
- **Primary amber** — `#f59e0b` → `#d97706` gradient — CTAs, primary actions, streak flames.
- **Secondary purple** — `#a855f7` → `#7c3aed` gradient — level, progress bars, achievement badges, "semana" counters.
- **Indigo hero** — `#4f46e5` → `#7c3aed` gradient — the Balance card at the top of the dashboard (the emotional centerpiece).
- **Pink accent** — `#ec4899` — partner axis, social/connection accents.
- **Semantic** — Green `#22c55e` (success / positive delta), Yellow `#facc15` (warning), Red `#ef4444` (danger / delete), Blue `#60a5fa` (info).

**Text on dark surfaces**
- Primary `#e2e8f0` (not pure white — softer, warmer).
- Secondary `#9ca3af` for meta/labels.
- Tertiary `#6b7280` for timestamps and hints.

A **light theme** also exists — warm cream (`#fffbf0` → `#fdf4e3`) with amber and purple preserved. It's available via `html.light` but the app defaults to dark.

### Typography

- **Family:** Inter, weights 400 / 500 / 600 / 700 / 800 / 900 — used for everything (display, body, numeric).
- **Scale (mobile-first):** 10 / 11 / 12 / 13 / 14 / 15 / 16 / 20 / 28 px for text, with 28 / 32 / 40 px for numeric displays (balance, streak number).
- **Character:** Inter's neutral humanist letterforms feel friendly but not childish. Tight negative tracking (`-0.02em`) on large numerics gives the balance and streak numbers their "scoreboard" feel.
- **No secondary font.** There is no serif, no rounded display face. The visual variety comes from weight (400 → 900) and color, not type mixing.

### Spacing & layout

- **Base unit: 4px.** Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48.
- Mobile-first **max-width 500px** main column; everything above that is centered with generous side margin.
- Cards stack with **16–20px gaps**; inner padding is **16–24px**.
- Sticky **top header** (`rgba(15, 10, 30, 0.95)` + backdrop-blur, 1px purple-tinted bottom border).
- **Bottom tab bar** fixed, 5 tabs, 60px tall, same translucent treatment. Active tab uses the amber color + a 2-px top accent.
- **FAB** (amber gradient circle, 56×56) floats bottom-right with `0 4px 12px rgba(245, 158, 11, 0.4)`.

### Corners, borders, cards

- **Radii:** 8 (badges/pills) · 10 (cards, inputs) · 12 (buttons, widgets) · 16 (balance hero, modals) · 20 (bottom-sheet modals) · 9999 (chips, avatars, progress bars).
- **Borders:** 1px, usually `rgba(168, 85, 247, 0.15)` on dark / `rgba(168, 85, 247, 0.3)` when highlighted.
- **Card anatomy:** translucent purple-black surface, soft border, 16–24px padding, slight inner title + meta row, optional colored accent (amber/purple) for state.

### Shadows & elevation

- Subtle. Used sparingly.
- `sh-sm 0 1px 2px rgba(0,0,0,0.15)` — tab divider / small lift.
- `sh-md 0 4px 12px rgba(0,0,0,0.2)` — default card lift.
- `sh-lg 0 4px 24px rgba(79, 70, 229, 0.3)` — **indigo glow under the Balance hero** (the only "marketed" shadow).
- `sh-amber 0 4px 12px rgba(245, 158, 11, 0.4)` — FAB.
- Text glows: `0 0 6px rgba(245,158,11,0.6)` on streak numbers, `0 0 6px rgba(168,85,247,0.6)` on level numbers.

### Backgrounds & texture

- No photographic backgrounds, no illustrations baked into the UI.
- Background is **always** the indigo gradient on dark, or the cream gradient on light.
- No patterns, no grain, no noise — the product is crisp and flat.
- Imagery (tasks, avatars) is represented by **emoji** rather than raster icons or stock photos.

### Motion & interaction

- **Easing:** `cubic-bezier(0.22, 0.61, 0.36, 1)` — standard ease-out.
- **Durations:** 0.15s (hover) · 0.2s (state) · 0.5s (modal / screen).
- **Signature motion:**
  - *Points burst* — completing a task animates `+15 MP` floating up and fading, yellow-to-orange color.
  - *Level-up / achievement* — confetti + scale-in modal, with a soft purple glow pulse.
  - *Streak flame* — 🔥 with a subtle 2-step flicker on daily open.
  - *Progress bars* fill from 0 on mount with a 600ms ease-out.
- **Hover states:** slight opacity drop on secondary buttons, intensified color on primary buttons, no transforms.
- **Press states:** scale(0.97) on large CTAs only; color buttons don't scale, they briefly darken.
- **No bouncy springs, no parallax, no heavy page transitions.**

### Transparency & blur

- Translucent surfaces are a **deliberate motif**: cards, header, tab bar, and modals all use 85–95% opacity + `backdrop-filter: blur(10px)` so the indigo glow of the background reads through.
- Full opaque panels only appear inside sheets (add-task form, settings).
- Light theme replaces translucency with solid white cards — the blur vanishes.

### Imagery vibe

- When hero imagery is used (currently only in onboarding), it's emoji-first: a massive ❤️ or 💑 centered on a soft radial of purple. No stock photography, no illustrations of people.

### Data visualization

- **Progress bars** — 8px tall, rounded, purple gradient fill on dark background `rgba(168,85,247,0.1)`.
- **Week strip** — 7 vertical bars with amber gradient per day.
- **Mini radar / split** — 2 colored half-circles (amber = you, pink = partner) sharing a center total.

---

## Iconography

Matripuntos's icon strategy is **emoji-first, SVG where needed**. There is **no custom icon font** and **no imported icon library** in the codebase.

### Emoji as primary icons

Across task categories, achievements, and navigation labels, emoji carry meaning. They render as native OS emoji (Apple on iOS, Noto on Android/Chrome, Segoe UI on Windows), which embraces platform personality rather than fighting it.

**Task-category set** (canonical):

| Emoji | Category | Slug |
|---|---|---|
| 🍳 | Cocina | `cocina` |
| 🧹 | Limpieza | `limpieza` |
| 🛒 | Compras | `compras` |
| 👶 | Niños | `ninos` |
| 🐕 | Mascotas | `mascotas` |
| 🔧 | Reparaciones | `reparaciones` |
| 💰 | Finanzas | `finanzas` |
| 📋 | Otros | `otros` |

**Achievement / gamification set:**
🏆 🥇 🥈 🥉 🔥 ⭐ 💎 🎯 📊 ⚖️ 👑 🌟 ❤️ 💑 🏠 ✨ 🎉

**Nav labels:** Each tab uses an emoji *with* a Spanish text label below — never emoji-alone.

### SVG usage

The codebase contains no per-screen SVG icon set. A small set of **inline/CSS-drawn glyphs** (chevrons, close X, plus sign, hamburger) is used directly in markup. For this design system we've fallen back to **Lucide** (`lucide.dev`) for chevrons, settings gears, bells and similar utility icons because it matches the clean, stroke-first feel of Inter. This is a **substitution** — the live app currently draws these in CSS.

**Substitution flag:** *If the team adopts a formal icon library, Lucide (stroke-1.5) is the recommended match and is used in the UI kit. Alternatives: Heroicons (outline). Replace when a brand icon set ships.*

### Unicode utility characters

The live codebase uses a handful of unicode shapes: `●` (active-tab dot), `•` (separator), `←` `→` (chevrons in some flows), `✓` (completed check), `×` (close). These are fine as fallbacks but should be replaced with proper SVGs in production.

### Logo and brand mark

Matripuntos does not ship a logotype file in the codebase. The brand appears as **text only**: "Matripuntos" set in Inter 700 or 800, typically amber on dark or indigo on light. A circular app-icon stand-in with the 📊 emoji on an amber gradient is used as a favicon placeholder — we've copied it into `assets/`.

**Missing:** a finalized wordmark and app icon. **Flag:** these should be produced at the next iteration.

---

## Known substitutions & open questions

- **Fonts:** Inter is loaded from Google Fonts CDN. No licensed variable font file is in the codebase; Google Fonts Inter is effectively the source of truth. If self-hosting is required, we'll need the Inter TTF / WOFF2 files.
- **Logo:** no wordmark file. Currently rendered as live text. Needs a real mark.
- **Icon system:** no formal icon library in the codebase — emoji + Lucide substitution. Decision needed.
- **No Figma** was provided; every token here is derived from the CSS source of truth (`src/frontend/css/variables.css` + per-screen stylesheets).

---

## UI kits in this system

- **`ui_kits/app/`** — Matripuntos mobile web app. Click-through prototype (`index.html`) + factored JSX components (`Primitives`, `Navigation`, `Dashboard`, `Tasks`, `Gamification`). Covers: Dashboard (balance hero + streaks + level + pending + movements), Tasks (filter + list + catalog + add sheet), Calendar (week-strip + upcoming), Achievements (level hero + badge grid).

Future kits (future products will live alongside, e.g. `ui_kits/landing/` for a marketing site).

## How to use this design system

1. Read this README end-to-end.
2. Pull `colors_and_type.css` into any new HTML artifact for automatic tokens.
3. For components, open `ui_kits/app/index.html` and see the click-through. Copy the `.jsx` files you need.
4. Use emoji freely for task categories and gamification accents; use Lucide (stroke-1.5) for utility icons until a brand icon set ships.
5. Default to the dark theme. Use the light theme only when print, email, or external embed demands it.
6. For production work, invoke `SKILL.md` from Claude Code or Claude.ai.
