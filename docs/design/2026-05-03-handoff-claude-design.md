# 🎨 Handoff a Claude Design — Matripuntos

**Fecha:** 2026-05-03
**Versión actual en producción:** v2.0.6
**Para:** proyecto existente "Matripuntos" en Claude Design (donde se hizo el primer approach)
**Por:** Eduardo + Claude Code

> **Contexto rápido:** Matripuntos es una webapp para parejas que gamifica la equidad doméstica. Gestionan tareas (suman puntos = matripuntos) y actividades/eventos (restan puntos), con negociación entre los dos. Hoy está en producción, dark theme, mobile-first. Han crecido las features semana a semana y el dashboard se ha llenado de cards. Necesitamos rediseño de jerarquía visual + revisar 4 zonas concretas que están rotas o mejorables.

---

## 0. Cómo está hoy (pantallazo del dashboard)

```
┌──────────────────────────────────┐
│ Buenas noches 🌙                 │
│ Blanca                    🔔 ⋯ 🐼 │
│ Edu está 💪 Con energía hoy       │
├──────────────────────────────────┤
│ Vecinos · Lv 1   100 XP para Lv 2│  ← banner 1: nivel A
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔               │
├──────────────────────────────────┤
│ Vuestro mejor día reciente   ✕   │  ← replay sin fecha :(
│ 3 actividades · 37 pts ese día.  │
├──────────────────────────────────┤
│ ¿Cómo estás hoy? Comparte ...→ ✕ │  ← mood prompt
├──────────────────────────────────┤
│ 😐 Tu estado →  ·  💪 Con energía │  ← mood actual
├──────────────────────────────────┤
│ "Mirad el saldo de cariño..."    │  ← frase del día
├──────────────────────────────────┤
│ ♥ Añade vuestra fecha aniversario│  ← anniversary chip
├──────────────────────────────────┤
│ BALANCE DE LA SEMANA             │
│ +13.5 MP                Blanca   │
│ 🎉 Vas 13.5 MP por delante +17.5 │  ← level B + balance
│                          Edu+4.0 │
│ 👑 Nivel 2 · Brote   736/2000    │  ← banner 2: nivel B (CONFLICTO con A)
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                   │
├──────────────────────────────────┤
│ 🔥 1 días · ×1.0 · 📦 0/1         │  ← streak + multiplicador + retos
└──────────────────────────────────┘
   ↓ scroll para llegar a "Hoy"
```

**Problema gordo evidente:** "Vecinos Lv 1" arriba y "Brote Lv 2" abajo son dos sistemas de niveles distintos pintándose a la vez. Veremos solución técnica en v2.1 (gamification refactor); pero el diseño debe consolidarse en **un solo nivel jerárquico**.

---

## 1. Lo que necesitamos del rediseño

### 1.1 Jerarquía clara del dashboard (dolor #1)
Hoy hay 8 cards apiladas con peso visual similar — todas claman atención. Decidir:

- **¿Qué es lo principal de la pantalla?** Hipótesis del founder: *el balance de matripuntos de la pareja*.
- **¿Qué es secundario?** Mood, frase, replays.
- **¿Qué es terciario / colapsable?** Anniversary, retos, streaks.

Tu trabajo:
1. Proponer una jerarquía de 3 niveles (hero / soporte / accesorio).
2. Mockups con esta jerarquía aplicada.
3. Reglas de cuándo aparece cada card (siempre, condicional, on-demand).

### 1.2 Banner de nivel único
Ahora hay dos. Decidiremos cuál se queda en `docs/superpowers/specs/2026-05-03-gamification-refactor-design.md` (Opción C: 10 niveles temáticos: Encuentro → Confianza → ... → Mito).

Tu trabajo:
- Mockup del **único** banner de nivel pareja, con barra de progreso, emoji del nivel, y siguiente recompensa visible (1 perk concreto, no lista de 5).

### 1.3 "Vuestro mejor día reciente" debe llevar fecha
Hoy dice "3 actividades · 37 pts ese día" sin contexto temporal. Tienes que:
- Añadir fecha visible (formato `Lunes 28 abr`).
- ¿Convertirlo en collapsable o esconderlo si > 7 días desde ese día?

### 1.4 Mood card (dolor #2)
Hoy se ve un *prompt* "¿Cómo estás hoy?" Y al lado **ya aparece tu estado actual** ("💪 Con energía"). Confuso: ¿debo poner mood o ya está puesto?

Bug técnico (lo arreglamos): el mood NO se resetea al cambiar de día — se queda pegado a la sesión anterior. Tu trabajo:
- Estado A: sin mood hoy → CTA grande para poner mood.
- Estado B: mood puesto hoy → tarjeta consolidada "Tu mood hoy: X" + opción "cambiar".
- Decidir si el mood del partner se ve siempre o sólo cuando ambos lo han puesto.

### 1.5 Anniversary chip
Ya está discreto (lo arreglé en v2.0.6). Solo decidir si va arriba (visible siempre) o se va al final del dashboard.

---

## 2. Otras pantallas que también pesan

### 2.1 Tasks vs Activities (UX inconsistente)
Hoy:
- **Tareas** tiene "Nueva tarea" + "Actualizar" + filtros + secciones (Hoy, Esta semana, Mis pendientes de verificar). Está pulido.
- **Actividades** sólo abre un wizard para crear evento — sin lista, sin catálogo navegable, sin add/edit/delete.

Tu trabajo:
- Mockup de "Actividades" con la misma estructura que Tareas:
  - Header con "+ Nueva actividad" y refresh.
  - Filtro por categoría.
  - Sección "Hoy" / "Esta semana" / "Próximas".
  - Catálogo de actividades visible (cuando hagamos seed en prod, hay ~50 templates listos).

### 2.2 Calendario sin botones de creación
Hoy `/calendar` muestra el mes pero **no hay shortcut para crear nada nuevo** desde ahí. Debería tener:
- Botón "+ Nueva tarea".
- Botón "+ Nueva actividad".
Decidir si flotantes (FAB), en el header, o en cada día con `+`.

### 2.3 Reglas de puntos (Settings)
Hoy en Settings → "Reglas de puntos" lista lo acordado, pero:
- **Falta lo que el usuario configura en signup**: multiplicadores por hijos, franjas horarias, duración, factor tipo. Esto está en `Configuration.multipliersConfig` pero no se muestra.
- Cada regla ahora tiene botón "Proponer cambio" (v2.0.6) → al aceptar el partner se aplica. Pero **no es 100% obvio que aplica al backend**.

Tu trabajo:
- Diseño de la sección "Reglas de puntos" completa con TODOS los multiplicadores visibles (los del signup también).
- Cada regla con su valor actual + botón discreto "Proponer cambio".
- Banner explicativo de "los cambios sólo se aplican cuando los dos aceptan".
- Considerar si hay reglas que NO deberían poderse tocar en MVP (ej: número de rondas de negociación → quizás esa la quitamos).

---

## 3. Decisiones que necesito de ti (Claude Design)

| # | Decisión | Por qué |
|---|---|---|
| 1 | Jerarquía dashboard: ¿cuál es la card hero? | Hoy es ambiguo |
| 2 | ¿Mood se ve siempre o sólo cuando ambos compartieron? | UX y privacidad |
| 3 | ¿Replays "best day" colapsables o sticky con fecha? | No molestan más allá de su día |
| 4 | ¿FAB único en cada página (calendar/tasks/activities)? | Coherencia |
| 5 | ¿Settings se reorganiza por flujos o por temas? | Hoy es por temas, está creciendo |
| 6 | ¿Onboarding muestra los multiplicadores que luego aparecen en Reglas? | Coherencia signup ↔ settings |

---

## 4. Restricciones

- **Mobile-first**, web responsive (no app nativa todavía).
- **Dark theme** ya consolidado (no tocar los tokens base aún).
- **Tailwind + design tokens** (`text-text-primary`, `bg-surface-card`, `border-brd-subtle`, etc.). Si necesitas tokens nuevos, propónlos pero hazme una lista mínima.
- **No emojis decorativos nuevos** salvo los que ya están en uso (🪺🌿🏡🌳💎⭐♾️ del nivel sistema viejo, que cambiarán). El emoji es contenido (mood, level, achievement), no decoración de fondo.
- **Accesibilidad**: focus rings ya añadidos en v2.0.3.1, mantenerlos visibles en cualquier card que añadas.

---

## 5. Material que tienes a mano

- Repo: https://github.com/wikiedu/claude_matripuntos
- **STATUS visual** completo: `docs/STATUS-VISUAL.md` (qué hay en prod, qué falta).
- **Spec gamificación**: `docs/superpowers/specs/2026-05-03-gamification-refactor-design.md` (decisión técnica del refactor).
- **Roadmap**: `docs/ROADMAP.md`.
- **Componentes existentes** que puedes reutilizar/proponer rediseño:
  - `src/frontend/src/components/v2/dashboard/BalanceLevelHero.tsx`
  - `src/frontend/src/components/v2/dashboard/DailyPhrase.tsx`
  - `src/frontend/src/components/v2/dashboard/ReplayCard.tsx`
  - `src/frontend/src/components/v2/anniversary/AnniversaryCard.tsx` (ya rediseñada en v2.0.6, este estilo discreto es la referencia)
  - `src/frontend/src/components/v2/profile/MyMoodWeek.tsx`

---

## 6. Entregables que espero

1. **Mockups en alta fidelidad** del nuevo dashboard (estados: sin mood / con mood / sin aniversario / con replay / sin replay).
2. **Mockups de Activities** asimilados al patrón de Tasks.
3. **Mockup de Settings → Reglas de puntos** completo.
4. **Componente "level hero" único** con la curva de los 10 niveles propuestos (Opción C del spec).
5. **Componente FAB de calendario** decidido.
6. **Lista de decisiones** que hayas tomado vs cuáles dejas en mi tejado.

---

## 7. Cómo iterar

- Subes mockups a Figma o me los pasas como imágenes.
- Yo te digo qué adopto, qué adapto, qué descarto.
- Iteración corta: 1 ronda de feedback, 1 reentrega, ya lo implemento.

---

## 8. Notas sobre el contexto del producto

- **Audiencia**: parejas en España (mercado primario), 25-45 años, mix conviven/casados/larga distancia.
- **Tono**: cálido, no infantil, no terapéutico-clínico. Humor sutil. Respeto por la pareja como adulta.
- **Pricing**: free ahora; v3.0 introducirá premium 4.99€/mes con AI assistant + themes.
- **Diferenciador clave**: la negociación. La pareja decide los puntos juntos, no es un cronómetro objetivo. Las decisiones que se ven (rules of points, propuestas) son CORE del valor del producto.

---

**Lo que YA hicimos en v2.0.6** que puede inspirar tu trabajo:
- Anniversary card cambió de un banner rosa gigante (out of place) a un chip discreto con `bg-surface-card border-brd-subtle hover:border-brand-purple/40`. Esa es la línea: **menos espectáculo, más utilidad**.
