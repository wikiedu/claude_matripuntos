# UX/UI & Responsive Design Audit — 2026-05-05

**Alcance:** `tailwind.config.js`, `index.css`, `App.css`, `components/v2/primitives/`, `components/v2/layout/`, todas las páginas y componentes con foco en design tokens, accesibilidad WCAG AA, responsive breakpoints, microinteracciones.

| Severidad | Hallazgos |
|---|---|
| S0 | 1 |
| S1 | 6 |
| S2 | 11 |
| S3 | 7 |

---

## S0 — Críticos

### S0-U-1 · 3 sistemas paralelos de design tokens conviviendo
- **Archivos:** `tailwind.config.js`, `index.css`.
- **Problema:**
  1. **Sistema "Claude Design v2"** (introducido v1.4): `bg.page`, `surface.card`, `brand.amber`, `text.primary`, etc.
  2. **Sistema "Legacy v1"**: `primary` (`#6366F1`), `secondary` (`#EC4899`), `warning`, `neutral`. Comentado como "kept for v1 components; removed progressively in v1.4".
  3. **Sistema "CSS variables matri-\*"** (v1.1): `var(--matri-amber)`, `var(--matri-bg)`. Aún usado en **37 sitios** (`grep -r "var(--matri" src/frontend/src` = 37).
- **Riesgo:** mismo color visualmente puede tener tres tokens distintos. Cambiar el color amber requiere editar 3 sitios. Componentes "look diferente" según qué sistema usen. El usuario reporta "diseño cargado de bugs" — esto es la causa visible: micro-incoherencias en cada pantalla.
- **Fix:** sprint dedicado de "design tokens unification". Plan:
  1. Mapeo: cada `var(--matri-*)` → token Tailwind equivalente.
  2. Codemod: sed por archivo.
  3. Borrar bloque "Legacy" + bloque "matri-\*" del `tailwind.config.js`.
  4. Borrar `:root { --matri-* }` del `index.css`.
- **Esfuerzo:** 1d (incluye QA visual de cada pantalla).

---

## S1 — Alto impacto

### S1-U-1 · Hex hardcoded fuera del sistema de tokens
- **Archivos confirmados con `text-[#xxx]` o `bg-[#xxx]`:**
  - `components/v2/layout/FabActionSheet.tsx:22` → `text-[#a5b4fc]`
  - `components/v2/primitives/Pill.tsx:10` → `text-[#a5b4fc]`
  - `components/v2/dashboard/DailyPhrase.tsx:32` → `text-[#c4b5fd]`
  - `components/v2/analytics/charts/HeatmapChart.tsx:98` → `text-[#c4b5fd]`
  - `components/v2/analytics/PremiumOverlay.tsx:30,35` → `text-[#c4b5fd]` y `text-[#fbbf24]`
  - (~11 ocurrencias detectadas con grep)
- **Problema:** `#a5b4fc` (indigo-300) y `#c4b5fd` (violet-300) ya existen como tokens Tailwind nativos. Hardcodear bloquea modo oscuro futuro y rompe consistencia.
- **Fix:** reemplazar por `text-indigo-300`, `text-violet-300`, `text-amber-400` (o mejor, tokens semánticos: `text-on-card-secondary`, `text-accent`).
- **Esfuerzo:** 30min.

### S1-U-2 · `safe-area-inset-bottom` solo en BottomNav, no en sheets/modales
- **Archivo:** `components/v2/layout/BottomNav.tsx:41` ✓ usa `env(safe-area-inset-bottom)`.
- **Problema:** verificar que TODAS las bottom-sheets (`BottomSheet.tsx`, `MoodSelectorSheet`, `AddTaskSheet`, `AddActivitySheet`, etc.) también lo tienen. Sin él, el contenido en iOS con home-bar queda tapado.
- **Fix:** añadir `pb-[env(safe-area-inset-bottom)]` en el primitive `BottomSheet`.
- **Esfuerzo:** 15min.

### S1-U-3 · `console.log('[DELETE-CODE]', data.code)` en producción
- **Archivo:** `components/v2/wizards/DeleteAccountWizard.tsx:39`.
- **Problema:** loguea el código de borrado de cuenta. En prod queda en DevTools. Si alguien comparte pantalla mientras delete, o un atacante con acceso al console (extension maliciosa) extrae el código.
- **Fix:** borrar ese console.log. Idealmente nunca devolver el código en respuesta — enviarlo solo por email (el audit routes ya marcó esto como S0-R-4).
- **Esfuerzo:** 5min.

### S1-U-4 · Modales custom sin `role="dialog"` ni `aria-modal`
- **Archivo:** `components/v2/primitives/ConfirmDialog.tsx` tiene `aria-label="Cerrar"` en el botón close ✓ pero el contenedor no tiene `role="dialog" aria-modal="true" aria-labelledby="..."`.
- **Problema:** lectores de pantalla (NVDA, JAWS, VoiceOver) no anuncian "diálogo abierto". Tab trapping no implementado → tab fuera del modal.
- **Fix:** envolver dialog content con `<div role="dialog" aria-modal="true" aria-labelledby="dlg-title">` y manejar focus trap (ej. `react-focus-lock`).
- **Esfuerzo:** 1h.

### S1-U-5 · Página body con linear-gradient hardcoded en index.css
- **Archivo:** `index.css` body bg = `linear-gradient(180deg, #0f0a1e 0%, #1a0f35 100%)`.
- **Problema:** el color `#0f0a1e` también está en tailwind config como `bg.page`. Duplicación. Si se decide cambiar el background, hay que tocar dos sitios.
- **Fix:** definir el gradient como custom class o variable CSS y usar el token.

### S1-U-6 · Tap targets en algunos botones probablemente <44×44px
- **Hipótesis:** los chips de filtro categoría (recientemente añadidos en v2.3.4) usan `text-xs px-2 py-1` que da ~24px alto. Apple HIG dice 44, Material 48.
- **Acción:** medir manualmente los chips, los iconos solos (Pencil, Trash en ActivityCatalogManager), botones del HeaderStrip.
- **Fix:** garantizar `min-h-[44px] min-w-[44px]` en todos los botones que el usuario clica con el dedo.
- **Esfuerzo:** 2h auditoría manual + correcciones.

---

## S2 — Edge cases & hygiene

### S2-U-1 · No hay modo oscuro alternativo / claro
- La app es dark-only (gradient 0f0a1e → 1a0f35). No hay `prefers-color-scheme` switching.
- **Decisión producto:** ¿es deseado? Si es así, aceptar. Si no, planear.

### S2-U-2 · No hay `prefers-reduced-motion` respetado en animaciones
- v2.2.0 introdujo PointsBurst, AnimatedNumber, LevelUpModal, Flame flicker. Si el usuario tiene `prefers-reduced-motion: reduce`, deberían saltarse o reducirse.
- **Fix:** wrap en `@media (prefers-reduced-motion: reduce) { transform: none; transition: none; }`.
- **Esfuerzo:** 30min.

### S2-U-3 · No hay focus rings consistentes (regresión audit anterior)
- Audit 2026-05-02 v2.0.3.1 hotfix añadió focus rings. Verifica que se mantengan en componentes recientes (v2.3.0+).
- **Fix:** asegurar `focus:ring-2 focus:ring-brand-amber focus:ring-offset-2` (o similar) en todos los `<button>` y `<a>` interactivos.

### S2-U-4 · Tipografía: combinaciones `text-gray-400` sobre `bg-surface-card`
- **Hipótesis:** algunos textos secundarios en cards podrían fallar contraste 4.5:1. Verificar con axe-core o manualmente.
- **Acción:** auditar `text-text-secondary` sobre fondos típicos.

### S2-U-5 · Textos "fr" no traducidos visibles
- App solo en español. Mensajes de Lucide, lib axios, validaciones HTML5 nativas (`required`, `type=email`) muestran textos del browser locale. Mezcla idiomas.
- **Fix:** override de mensajes nativos con `setCustomValidity` o validación 100% en JS con copy en español.

### S2-U-6 · `Inter` cargado de Google Fonts → bloqueante render + privacidad
- `@import url('https://fonts.googleapis.com/css2?family=Inter...')` en index.css. Bloqueante (FOUC) y manda el IP del usuario a Google.
- **Fix:** self-host `fontsource/@inter` o usar `font-display: swap`. Ya lo tiene swap pero el IP sigue.
- **Esfuerzo:** 30min self-host.

### S2-U-7 · Loading skeletons inconsistentes
- Verificar en `Tasks.tsx`, `Calendar.tsx`, `Analytics.tsx`. Algunos usan spinner full-screen, otros placeholders. Estandarizar.

### S2-U-8 · Empty states sin ilustración
- Lo nuevo (canvas 11) introdujo banner "🌱 Primer día" en /achievements y AnalyticsTeaser. Bien. Pero ¿en /journal vacío, /calendar vacío, /tasks vacío?
- **Fix:** ilustración + copy + CTA en cada empty state.

### S2-U-9 · Avatares animales: no hay lazy loading
- Verificar `AvatarPicker.tsx` y catálogo de avatares. Si todos los emojis/imgs cargan al abrir, lentitud en mobile 3G.
- **Fix:** `loading="lazy"` en imgs.

### S2-U-10 · Fechas localizadas sin `Intl.DateTimeFormat('es-ES')`
- Verificar que `date-fns` se llama con locale `es`. Si no, fechas en inglés ("May 4" vs "4 may").

### S2-U-11 · BottomNav y sticky/fixed en pantallas con teclado abierto
- En mobile, cuando el teclado se abre (input en sheet/wizard), la BottomNav puede quedar tapada o flotar mal. iOS Safari especialmente.
- **Acción:** test manual.

---

## S3 — Cosmético

- **S3-U-1** Iconos Lucide con tamaños mixtos (size 14 vs 16 vs 18 vs 20) en contextos similares. Estandarizar a 2-3 tamaños canónicos.
- **S3-U-2** `gap-2` vs `space-y-2` mezclados. Convención: `gap` para flex/grid, `space-y` para column de hijos sueltos.
- **S3-U-3** Padding bottom de páginas para BottomNav: hay `pb-20`, `pb-24`, `pb-28` según página. Inconsistente.
- **S3-U-4** Avatar shape: rounded-full vs rounded-2xl. ¿Cuál es el "default"?
- **S3-U-5** Card border: `border` (1px) vs `ring-1`. Mezcla.
- **S3-U-6** Animation duration: 200ms vs 300ms vs 400ms. Estandarizar (200=quick, 300=standard, 500=emphasis).
- **S3-U-7** `<button onClick>` sin `type="button"` → si está dentro de `<form>`, dispara submit accidental.

---

## 10 inconsistencias visuales que el usuario probablemente nota a diario aunque no las verbalice

1. **Mismo color amber pero con tonos ligeramente distintos** entre dashboard hero, chips Tareas, y badge "+ MP" (los 3 tokens conviven, audit S0-U-1).
2. **Sheets que no se cierran con Escape** (solo el primitive Sheet que lo implementa lo hace; otros heredados no).
3. **Loading "Cargando…" full-screen cada 60s** (audit state S0).
4. **Páginas con padding bottom desigual** (audit S3-U-3) — algunas ven la BottomNav recortando, otras dejan demasiado espacio.
5. **Modales que aparecen con animación distinta** (algunos slide-up, otros fade-in).
6. **Fonts inconsistente entre títulos** (algunos serif italic en DailyPhrase, otros sans-serif).
7. **Bottom-sheets con scroll que se "pegan" al chrome del navegador iOS** (sin overscroll-behavior).
8. **Iconos Lucide con stroke-width 1.5 vs 2** mezclados.
9. **Confirms nativos del browser** (audit pages S0) — rompen el look-and-feel.
10. **Botones "Aceptar" "Cancelar" con disposición incoherente** (algunos OK izquierda, otros OK derecha — Material vs HIG).

---

## Plan de unificación visual con mayor ROI

1. **Sprint design tokens** (1d) — borra los 3 sistemas paralelos, deja uno.
2. **Primitive `BottomSheet` con safe-area + escape + tap-trap + role=dialog** (3h) — homogeniza 12+ sheets de golpe.
3. **Reemplazar `window.confirm`/`alert`** (2h) — fix el "feel mobile" en 3 sitios críticos.
4. **`prefers-reduced-motion`** (30min) — accesibilidad + no marear a usuarios sensibles.
5. **Self-host Inter** (30min) — privacidad + perf.
