# Claude Design Handoff — estado de implementación

**Bundle bajado:** 2026-05-04 (canvases 1-14) + 2026-05-04 (canvas 15)
**Ubicación raw del bundle:** `docs/design/claude-design-bundle/`
**Versión actual implementada:** v2.3.0
**Estado: 15 / 15 canvases con implementación productiva** (13 cerrados completos, 2 con extensiones de bajo impacto diferidas).

**Canvas 15 (Tareas/Actividades rediseño)** — implementado en v2.3.0:
- MPTabs (top tabs +MP/−MP)
- HeaderStrip único (3 niveles → 1)
- VerifyBanner condicional (sustituye inner tab vacía)
- Botones unificados (2→1)
- Simetría Tareas/Actividades

> Claude Design entregó **14 canvases** (HTML mockup + spec). Este documento mapea cada canvas con su estado real de implementación en código.

---

## ✅ YA IMPLEMENTADO

| Canvas | Tema | Versión | Notas |
|---|---|---|---|
| 01 · Dashboard | Hero unificado balance+nivel, jerarquía | **v2.2.0** | Reordenado Dashboard, glow radial, eyebrow conversacional, level row con perk |
| 02 · Level system | 10 niveles unificados | v2.1.0 | Encuentro→Mito en backend + frontend |
| 03 · Mood UX | Card unificada (sin doble banner) | **v2.2.0** | Estados A/B explícitos, MoodNudge+MoodPairCard reemplazados |
| 04 · Activities (legacy) | — | — | Reemplazado por canvas 07 |
| 05 · Calendar FAB | Botones + actividad / + tarea | v2.0.7 | Versión simple sin speed-dial todavía |
| 06 · Settings rules | Editor con consensus + multipliers reales | **v2.2.1** | RealRulesSection con tareas + factor hijos/franja/duración + audit log. Consensus aplica al backend. |
| 07 · Tasks/Activities | Add vs Create + consensus puntos | v2.1.1 | Implementación completa |
| 13 · Microinteracciones | 4 de 7 (PointsBurst, progress mount, level-up confetti, balance counter, flame flicker) | **v2.2.0 / v2.2.2 / v2.2.9** | Restantes: success haptic, ripple, undo swipe (bajo impacto). |

---

## 🟡 IMPLEMENTACIÓN PARCIAL

| Canvas | Tema | Estado | Próximo paso |
|---|---|---|---|
| 05 · Calendar FAB | El handoff propone un speed-dial flotante con multi-acción (evento vs actividad vs tarea). Hoy hay 2 botones ghost+primary en el header. | **Pendiente decidir** si vamos a speed-dial flotante o mantenemos botones header. |
| 06 · Settings rules | ~~Hoy lista 4 reglas hardcoded~~ **v2.2.1**: implementado `RealRulesSection` con multipliers reales (hijos/franja/duración) + tareas + audit log. Consensus aplica al backend. | (cerrado) |

---

## 🔴 PENDIENTE DE IMPLEMENTAR (canvases 08–14)

| Canvas | Tema | Impacto | Esfuerzo | Recomendación |
|---|---|---|---|---|
| ~~08 · Onboarding partner~~ ✅ **v2.2.3**: `PartnerCatchUp.tsx` + `/api/auth/partner-summary`. Cuando Edu llega segundo a una pareja activa, ve 4 pasos de catch-up (Welcome → resumen partner → primera tarea → Done). Hereda config completa. | (cerrado) |
| ~~09 · Saldo en rojo crónico~~ ✅ **v2.2.6**: `redBalanceService` + `RedBalanceCard` con 3 umbrales (3/7/14 días) y privacidad asimétrica. | (cerrado) |
| ~~10 · Push notifications~~ ✅ **v2.2.4** + **v2.2.5**: preferences (3 tiers + quiet hours + 6 categorías) + scheduler diario que agrega y manda 1 push consolidada. | (cerrado) |
| ~~11 · Empty states & analytics~~ ✅ **v2.2.7 + v2.2.10**: 4/4 estados cubiertos (dashboard día 1 + analytics teaser <7 días + achievements 0 unlocked). | (cerrado) |
| ~~12 · Conflictos tiempo real~~ ✅ **v2.2.11** mínimo: presence indicator (dot verde + polling 60s). Extensiones (toasts last-write-wins, choque calendar) → cuando crezca el uso concurrente. | (mínimo cerrado) |
| 13 · Microinteracciones | ✅ **4 de 7** (points-rise + progress mount + level-up confetti + balance counter + flame flicker). Restantes: success haptic, ripple, undo swipe (bajo impacto). | 🟢 BAJO (sensación) | — | (parcial cerrado) |
| ~~14 · Modo vacaciones~~ ✅ **v2.2.8** MVP: `Couple.pausedUntil` + endpoints + banner + streaks/digest respetan pausa. Activación manual; detección automática diferida. | (cerrado MVP) |

---

## 🛠 Tokens y design system

El handoff entrega `colors_and_type.css` y `shared.css` con tokens. Los nuestros (`tailwind.config.js` + `globals.css`) ya cubren todos:

| Token | Estado |
|---|---|
| `--bg-page` / `--grad-page` / `--grad-hero` / `--grad-cta` | ✅ definidos (`bg-grad-page`, `bg-grad-hero`, `bg-grad-cta`) |
| `--surface-card` / `--surface-elevated` | ✅ |
| `--brand-amber` / `--brand-purple` / `--brand-indigo` | ✅ |
| `--text-primary/secondary/tertiary` | ✅ |
| `--brd-subtle` / `--brd-purple` | ✅ |
| Radii 8/12/14/18 | ✅ Tailwind defaults |
| Shadows | ✅ con `shadow-*` extensions |
| Inter family | ✅ via Google Fonts |

**No hay tokens nuevos que añadir.** Los HTML mockups usan exactamente lo que ya tenemos.

---

## 🎯 Roadmap de implementación restante

**Próximo sprint (v2.2.x):**
1. **Reglas reales** (canvas 06 completo) — multipliers expuestos + consensus persistente.
2. **Notificaciones push** (canvas 10) — inventario backend + tiers de Settings.

**v2.3.x:**
3. **Onboarding partner** (canvas 08) cuando haya señal real de uso.
4. **Empty states** (canvas 11) cuando llegue analytics review.

**v2.4.x / v3.0:**
5. **Microinteracciones extra** (canvas 13 — confetti level-up, streak flicker, progress fill).
6. **Modo vacaciones** (canvas 14) en bundle Premium.
7. **Saldo en rojo crónico** (canvas 09) — requiere data real para calibrar umbrales.
8. **Conflictos tiempo real** (canvas 12) — cuando crezca el uso concurrente.

---

## 📂 Cómo navegar el bundle

```
docs/design/claude-design-bundle/
├── README.md                           ← brief de Claude Design
├── chats/chat1.md                      ← transcripción de la iteración (los porqués)
└── project/
    ├── README.md                       ← brand voice, tokens, brand identity
    ├── colors_and_type.css             ← design tokens raw
    ├── ui_kits/
    │   ├── refactor_v2/                ← LOS 14 CANVASES (HTML mockups)
    │   │   ├── 01-dashboard.html
    │   │   ├── 02-level-system.html
    │   │   ├── 03-mood.html
    │   │   ├── 04-activities.html      (deprecated, usar 07)
    │   │   ├── 05-calendar-fab.html
    │   │   ├── 06-settings-rules.html
    │   │   ├── 07-tasks-activities-handoff.html  ← el más detallado
    │   │   ├── 08-onboarding-partner.html
    │   │   ├── 09-saldo-rojo.html
    │   │   ├── 10-notifications.html
    │   │   ├── 11-empty-analytics.html
    │   │   ├── 12-conflicts-realtime.html
    │   │   ├── 13-microinteractions.html
    │   │   ├── 14-vacation-mode.html
    │   │   └── shared.css
    │   ├── app/                        ← UI kit JSX mockups (Login, Signup, etc.)
    │   └── app_v1/                     ← versión anterior congelada
    └── preview/                        ← cards de design system (color, typo, components)
```

Para cualquier canvas: abrir el HTML directamente en el navegador (no hay build), o leer en VS Code.
