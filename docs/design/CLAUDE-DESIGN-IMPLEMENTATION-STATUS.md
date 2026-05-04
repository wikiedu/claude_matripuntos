# Claude Design Handoff — estado de implementación

**Bundle bajado:** 2026-05-04
**Ubicación raw del bundle:** `docs/design/claude-design-bundle/`
**Versión actual implementada:** v2.2.0

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
| 13 · Microinteracciones | +X MP flotante + progress bar mount | **v2.2.0 / v2.2.2** | PointsBurst hook + progress bar 0→pct (600ms ease-out) |

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
| 08 · Onboarding partner | Cuando Edu llega segundo: hereda nivel/reglas/mood de Blanca, no parte de cero. 4 pasos catch-up. | 🔴 ALTO (activación viralidad) | 1-2 sesiones | Siguiente sprint cuando haya métricas D7 reales que justifiquen el rediseño. |
| 09 · Saldo en rojo crónico | Tratamiento escalado día 3/7/14/21 cuando uno está consistentemente en rojo. App sugiere conversación, no solo números rojos. Privacidad asimétrica (solo el afectado lo ve). | 🔴 ALTO (diferenciador) | 1 sesión | v2.3.x — define personalidad del producto. |
| 10 · Push notifications | Inventario de qué notificaciones manda la app + 3 tiers (silent / digest / immediate) + lockscreen mocks. | 🔴 ALTO (engagement) | 2 sesiones backend + 1 frontend | v2.1.x junto con email Resend (parte de v2.1 Conectados). |
| 11 · Empty states & analytics | Estados día-1/semana-1 con teasers visuales, insights sin juicio. Hoy un user nuevo ve gráficos vacíos. | 🟡 MEDIO | 1 sesión | Cuando se aborde v2.3.x analytics review. |
| 12 · Conflictos tiempo real | Doble registro / choque calendar / live presence / toasts last-write-wins. | 🟡 MEDIO (bug caro de detectar) | 2 sesiones | Cuando crezca el uso concurrente real. |
| 13 · Microinteracciones | ✅ Implementado parcial (points-rise). El handoff incluye 6 animaciones más: balance counter, level-up confetti, streak flame flicker, progress fill, success haptic, ripple. | 🟢 BAJO (sensación) | 1 sesión | Implementación incremental — añadir 1-2 por sprint. |
| 14 · Modo vacaciones | Botón Settings "Estamos de viaje 5 días" → pausa reset diario, multiplicador finde, nudges mood. | 🟢 BAJO (calidad de vida) | 1 sesión | Backlog premium — encaja con v3.0 Premium. |

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
