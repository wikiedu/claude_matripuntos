# Auditoría Frontend Components — 2026-05-05

Alcance: `src/frontend/src/components/` (15 archivos top-level + `v2/` con 19 subcarpetas, ~110 componentes y 21 tests).

Resumen ejecutivo:
- El bug reportado por el usuario ("refresh extraño que interrumpe acciones") tiene **causa raíz identificada**: el primitive `BottomSheet` (usado por FabActionSheet, CounterOfferSheet, PremiumInterestModal y consumido por toda la app) **NO llama a `acquireSheetLock` / `releaseSheetLock`**. El lock global existe, pero solo lo respetan 4 sheets específicos. Cualquier interacción dentro de un BottomSheet o un modal centrado sigue siendo interrumpida por los pollings de 60s/30s en `AuthedLayout.tsx:38,53` cuando React invalida queries en background.
- El sistema "v2" coexiste con un sistema legacy (TaskPendingCard, EventNegotiationCard, RuleProposalCard, StatCard, Card.tsx, Button.tsx, Alert.tsx, AnalyticsChart, TaskScheduleForm, WeeklyTaskView) cuyos componentes se siguen usando en producción y rompen el dark mode con paletas claras (`bg-white`, `bg-blue-100`, `text-gray-600`, etc.). Esto explica directamente la queja "diseño cargado de bugs": si el usuario abre Calendar y aparece un EventNegotiationCard blanco entre cards moradas, o entra a verificación de tarea (TaskPendingCard) y todo es azul claro, **el resultado es visualmente roto**.
- Hay 3 sitios donde se usa `confirm()` o `window.alert` (prohibido por convención v2). Existe `ConfirmDialog` primitive pero apenas se usa (3 archivos).
- ProposalsPanel, ProposeChangeDialog, ActivityCatalogPicker, TaskProofUploader son v2 pero también con paleta light-mode (white/blue/gray). Inconsistencia adicional.

---

## S0 · Bloqueantes (causan regresión confirmada)

### S0-1 · `BottomSheet` no respeta sheetLock
- **Archivo:** `src/frontend/src/components/v2/primitives/BottomSheet.tsx:11-20`
- **Problema:** El useEffect bloquea `body.overflow` y registra `Escape` pero NO llama a `acquireSheetLock()`/`releaseSheetLock()`. Todo sheet que use este primitive (FabActionSheet, CounterOfferSheet, PremiumInterestModal, AddTaskSheet con `<BottomSheet>`) deja entrar los pollings de `AuthedLayout` (60s `loadUserData`) y los `refetchInterval: 30s` de notificaciones.
- **Riesgo:** Causa raíz del "refresh interrumpe acciones" que el usuario reporta. Cuando un poll dispara `setUser(...)` mientras el usuario está rellenando un formulario o tappeando una opción, React re-renderiza el árbol y los inputs pierden foco / el sheet "salta".
- **Fix:** Añadir `acquireSheetLock()`/`releaseSheetLock()` en el `useEffect` ya existente, dentro del bloque `if (!open) return`. Una sola línea más arriba del addEventListener.
- **Esfuerzo:** 5 min.

### S0-2 · `ConfirmDialog` no respeta sheetLock ni body scroll
- **Archivo:** `src/frontend/src/components/v2/primitives/ConfirmDialog.tsx:28-33`
- **Problema:** Solo registra `Escape`. NO bloquea `body.overflow` (la página de detrás scrollea libremente). NO llama al sheetLock. Lo usa al menos `RecurringTaskManager` para confirmar pausar tareas (acción crítica, irreversible para el día).
- **Riesgo:** Mientras confirmas pausar una tarea, un polling puede invalidar el listado y el botón "Pausar" desaparece a medio click. Además el body sigue scrolleando.
- **Fix:** Añadir `acquireSheetLock()`/`releaseSheetLock()` y `document.body.style.overflow = 'hidden'` con cleanup. Mismo patrón que BottomSheet (corregido).
- **Esfuerzo:** 10 min.

### S0-3 · `MoodSelectorSheet` no respeta sheetLock ni body scroll
- **Archivo:** `src/frontend/src/components/v2/sheets/MoodSelectorSheet.tsx:18-69`
- **Problema:** Implementación a mano (no usa BottomSheet). No hay `acquireSheetLock`, no hay `useEffect` para Escape, no hay body scroll lock. Lo abre el AppHeader al tocar el avatar — uno de los flujos más usados.
- **Riesgo:** Tras tocar avatar y elegir mood, si llega un poll mid-tap el sheet se cierra antes de que la mutation termine. También: sin Escape, no es accesible por teclado (regresión WCAG ya supuestamente arreglada en v1.6.2 según comentario S1-14 en HeaderMenu).
- **Fix:** Reemplazar `<div className="fixed inset-0 z-50 flex items-end">` por `<BottomSheet open={open} onClose={onClose} title="¿Cómo estás hoy?">` (una vez S0-1 esté corregido) o añadir manualmente sheetLock + body lock + Escape.
- **Esfuerzo:** 15 min.

### S0-4 · `HeaderMenu` no respeta sheetLock ni body scroll
- **Archivo:** `src/frontend/src/components/v2/layout/HeaderMenu.tsx:13-67`
- **Problema:** Solo Escape (añadido en v1.6.2 S1-14). No hay sheetLock ni body scroll lock. Backdrop visible (`fixed inset-0 bg-black/55`).
- **Riesgo:** El menú principal (Logros / Diario / Pareja / Reglas / Ajustes) puede saltar mid-tap por el poll. Z-index hardcodeado `z-[58]` y `z-[59]` quedan por debajo de FAB (`z-50`) y menores que BottomNav (`z-50`)—correcto—pero por debajo de BottomSheet (`z-[81]`); si abre el menu y luego un BottomSheet, el sheet queda encima del menú abierto, causando UI confusa.
- **Fix:** Añadir sheetLock + body scroll lock al useEffect existente.
- **Esfuerzo:** 5 min.

### S0-5 · LevelUpModal, DashboardTour, LeaveCoupleWizard, DeleteAccountWizard, AddTaskFromCatalogSheet (custom modal sin BottomSheet) — no respetan sheetLock
- **Archivos:**
  - `src/frontend/src/components/v2/dashboard/LevelUpModal.tsx:70-133`
  - `src/frontend/src/components/v2/tour/DashboardTour.tsx:78-131`
  - `src/frontend/src/components/v2/wizards/LeaveCoupleWizard.tsx:40-90`
  - `src/frontend/src/components/v2/wizards/DeleteAccountWizard.tsx:67-152`
  - `src/frontend/src/components/v2/tasks/AddTaskFromCatalogSheet.tsx:234-569` (no usa BottomSheet, custom container)
  - `src/frontend/src/components/v2/activities/AddActivitySheet.tsx` (sí lock pero ojo: `AddActivityTemplateSheet` interno también, ver S0-6)
  - `src/frontend/src/components/v2/catalog/ActivityCatalogManager.tsx:201-221` (modal de delete-confirm hardcodeado, sin lock)
  - `src/frontend/src/components/v2/consensus/ProposeChangeDialog.tsx:44-110`
- **Problema:** Modales/sheets custom sin centralizar. Cada uno hace su propio backdrop + container + onClose. Ninguno llama `acquireSheetLock`. LevelUpModal incluso se auto-dismiss a 5s — si el poll llega antes, se desmonta solo.
- **Riesgo:** Mismo fenómeno de "refresh interrumpe acción" pero ahora en flujos críticos (wizard de eliminar cuenta es el peor: si el poll re-renderiza mientras escribes "ELIMINAR" se pierde el foco del input).
- **Fix:** Crear un primitive `<Modal>` (reusa BottomSheet en mobile, centered en desktop) con sheetLock + body lock + Escape + outside-click + focus trap. Reemplazar las 8 implementaciones custom. Mientras tanto: añadir `useEffect` con `acquireSheetLock`/`releaseSheetLock` en cada componente.
- **Esfuerzo:** Quick fix (parche en 8 archivos): 30 min · primitive Modal: 3-4h.

### S0-6 · `AddActivityTemplateSheet` se renderiza dentro de `AddActivitySheet` y forman dos backdrops apilados
- **Archivo:** `src/frontend/src/components/v2/activities/AddActivitySheet.tsx:188-194` y `src/frontend/src/components/v2/catalog/AddActivityTemplateSheet.tsx:109`
- **Problema:** Cuando el usuario abre AddActivitySheet (z-50) y desde ahí "Crear desde cero", se monta AddActivityTemplateSheet también con `z-50`. Mismo z-index, mismo backdrop `bg-black/60`. El segundo sheet queda **detrás** del primero en algunos navegadores (depende del orden de stacking) o el backdrop se duplica oscureciendo todo.
- **Riesgo:** UX rota: el formulario "Nueva plantilla" puede no recibir clicks porque el backdrop de AddActivitySheet está encima.
- **Fix:** Subir `z-50` a `z-[55]` o `z-[60]` cuando es nested, o cerrar AddActivitySheet al abrir AddActivityTemplateSheet (probablemente la respuesta correcta — no tiene sentido tenerlos apilados).
- **Esfuerzo:** 15 min.

### S0-7 · `window.alert(...)` en ActivitiesBanner cuando falla la negociación
- **Archivo:** `src/frontend/src/components/v2/dashboard/ActivitiesBanner.tsx:33`
- **Problema:** `onError: ... window.alert(msg)`. Convención v2 dice "no usar window.alert/confirm". Además, el alert nativo bloquea todo el thread y rompe el flujo de aceptar/rechazar actividades en el dashboard (uno de los flujos más visibles).
- **Riesgo:** El usuario ve un cuadro nativo del navegador en mitad de una pantalla cuidadosamente diseñada. Conf "diseño cargado de bugs".
- **Fix:** Mantener el error en estado local y mostrar un Toast/Alert v2 (crear un `<Toast>` primitive si no existe — sí lo hay solo el legacy `Alert.tsx` que es light-mode). Mientras tanto, `<ConfirmDialog>` con un solo botón "OK" es mejor que `window.alert`.
- **Esfuerzo:** 30 min.

### S0-8 · `alert(...)` en ActivityCatalogManager
- **Archivo:** `src/frontend/src/components/v2/catalog/ActivityCatalogManager.tsx:60`
- **Problema:** `} catch (e: any) { alert(e?.message ?? 'Error al eliminar') }`. Igual que S0-7.
- **Fix:** Estado de error inline (ya hay `setConfirmDelete`/state propio, basta con un `setError`).
- **Esfuerzo:** 15 min.

### S0-9 · `confirm()` en EventNegotiationCard (5 sitios)
- **Archivo:** `src/frontend/src/components/EventNegotiationCard.tsx:74,89,105`
- **Problema:** `if (!confirm('¿Enviar propuesta a tu pareja?')) return` y dos más para accept/reject. Componente legacy aún usado en `pages/Calendar.tsx:444` (revisado).
- **Riesgo:** Mismo cuadro nativo. Bloquea el thread. Imposible de testear E2E con Playwright sin handler especial.
- **Fix:** Migrar a `ConfirmDialog`. O mejor: matar EventNegotiationCard y reemplazar por `ActivityActionCard` v2 que ya gestiona accept/reject/counter sin confirms.
- **Esfuerzo:** 1h (incluyendo el reemplazo en Calendar.tsx).

### S0-10 · DailyPhrase rompe Rules of Hooks
- **Archivo:** `src/frontend/src/components/v2/dashboard/DailyPhrase.tsx:13-18`
- **Problema:**
  ```
  const couple = useAppStore(s => s.couple)
  if (!couple?.id) return null
  const tz = ...
  const state = useDailyPhraseState({ ... })  // hook llamado condicionalmente
  ```
  React lo permitirá sin error en producción solo porque el store es estable, pero **es un bug latente**: si Zustand actualiza el shape del store, el componente puede pasar de "early return" a "ejecutar hook" entre renders y romper el orden de hooks.
- **Riesgo:** Crash potencial en runtime al cambiar de pareja, hacer logout, o cualquier acción que ponga `couple` a undefined entre renders.
- **Fix:** Mover el `if (!couple?.id) return null` después de TODOS los hooks. O hacer el `useDailyPhraseState` aceptar `coupleId: null` y devolver un default.
- **Esfuerzo:** 15 min.

---

## S1 · Bugs de UX y consistencia importantes

### S1-1 · Mezcla brutal de design systems v1 (light) y v2 (dark)
- **Archivos:**
  - `src/frontend/src/components/EventNegotiationCard.tsx:139-156,179-256` — `bg-white`, `bg-blue-100 text-blue-800`, `bg-gray-100 text-gray-800`, `bg-green-50`...
  - `src/frontend/src/components/TaskPendingCard.tsx:44-56,123-126` — `bg-orange-100 text-orange-700`, `bg-blue-50 text-blue-700`...
  - `src/frontend/src/components/Alert.tsx:11-36` — `bg-red-50 border-red-200 text-red-800` (paleta clara entera).
  - `src/frontend/src/components/Card.tsx:9-72` — inline styles con `var(--matri-card-bg)` (legacy CSS vars, no Tailwind tokens).
  - `src/frontend/src/components/Button.tsx:20-69` — inline styles con linear-gradient hardcodeado.
  - `src/frontend/src/components/StatCard.tsx:30-47` — inline styles + `var(--matri-card-bg)`.
  - `src/frontend/src/components/AnalyticsChart.tsx:31-105` — Recharts con `stroke="#e5e7eb"`, `stroke="#6b7280"`, `backgroundColor: '#fff'` — tema light pegado.
  - `src/frontend/src/components/AnalyticsDashboard.tsx` (importa StatCard).
  - `src/frontend/src/components/TaskScheduleForm.tsx:33-148` — inline styles en TODA la card: `background: '#fffbeb'`, `color: '#92400e'`. Toggle entero amarillo claro.
  - `src/frontend/src/components/WeeklyTaskView.tsx:36-99` — inline styles + CSS vars legacy.
  - `src/frontend/src/components/v2/catalog/ActivityCatalogPicker.tsx:55-113` — `bg-white rounded-2xl`, `text-gray-500`, `text-blue-700`, `border-gray-200` — supuestamente v2 pero light-mode.
  - `src/frontend/src/components/v2/consensus/ProposalsPanel.tsx:51-107` — `bg-white`, `text-gray-500`, `text-blue-700`, `text-red-600` — light-mode dentro de v2.
  - `src/frontend/src/components/v2/consensus/ProposeChangeDialog.tsx:48-110` — `bg-white rounded-2xl`, `text-gray-600`, `border-gray-300`, `bg-blue-600`.
  - `src/frontend/src/components/v2/proof/TaskProofUploader.tsx:68-99` — `bg-gray-50`, `text-gray-600`, `text-red-600`, `text-blue-700`.
- **Riesgo:** El usuario ve cards blancas con texto azul intercaladas entre cards moradas oscuras. Esto es la queja literal "diseño cargado de bugs". Ej: Calendar abre EventNegotiationCard blanco. Verificar tarea (TaskPendingCard) muestra emoji con bg pastel azul. AnalyticsChart pinta gráficos sobre fondo blanco con grid gris.
- **Fix:** Migrar 14 archivos a tokens v2 (`bg-surface-card`, `text-text-primary`, `border-brd-subtle`, `bg-brand-amber/10`...). Tres rutas:
  1. Sustituir cada componente por su contraparte v2 (ej: `EventNegotiationCard` → `ActivityActionCard`, `TaskPendingCard` → `VerifyBanner`, `StatCard` → primitive `Card` v2).
  2. Reescribir el archivo con tokens v2.
  3. Eliminar el archivo si está dead-code.
- **Esfuerzo:** Auditoría caso a caso 1h, migración real 1-2 días.

### S1-2 · Dos primitivos `Button.tsx` y `Card.tsx` activos en el repo
- **Archivos:** `components/Button.tsx` (legacy, inline styles, 4 variantes) y `components/v2/primitives/Button.tsx` (Tailwind, 5 variantes). Idem `Card.tsx`.
- **Problema:** No es solo deuda — son APIs incompatibles. `legacy/Button` acepta `isLoading`, `legacy/Card` acepta `onClick`. Los componentes que importan uno no son intercambiables.
- **Fix:** Marcar legacy como `@deprecated` y migrar consumidores. Solo `TaskPendingCard` y `AnalyticsDashboard` importan los legacy según grep — manejable.
- **Esfuerzo:** 1h.

### S1-3 · Components legacy no se han eliminado tras refactor v2 / v2.3.0
- **Archivos:** `components/EventNegotiationCard.tsx`, `components/RuleProposalCard.tsx` (Settings.tsx:12 dice "ya no se usa" pero el archivo sigue en repo), `components/StatCard.tsx`, `components/Alert.tsx`, `components/Card.tsx`, `components/Button.tsx`, `components/TaskPendingCard.tsx`, `components/AnalyticsDashboard.tsx`, `components/AnalyticsChart.tsx`, `components/TaskScheduleForm.tsx` (sí usado por AddTaskSheet, ver S2), `components/WeeklyTaskView.tsx`, `components/v2/analytics/charts/CategoryPieChart.tsx` (no se importa en ningún sitio según grep — dead code).
- **Riesgo:** Confusión al editar (¿cuál es la fuente de verdad?). Bundle más grande.
- **Fix:** Eliminar los que ya no se usan (RuleProposalCard, CategoryPieChart). Reemplazar los que sí se usan en pages (EventNegotiationCard, TaskPendingCard, AnalyticsDashboard) con sus equivalentes v2.
- **Esfuerzo:** 2h.

### S1-4 · Inconsistencia amber vs verde para "tareas (suman MP)"
- **Archivos:**
  - `MPTabs.tsx:18-24` — Tareas usa `bg-success/10 border-success/55` (verde).
  - `HeaderStrip.tsx:30-35` — `mode === 'tasks'` usa `focus-visible:ring-success` (verde) Y `bg-grad-cta` (amber gradient) en el botón Plus.
  - `BalanceLevelHero.tsx:107-141` — barra de progreso amber.
  - `TaskItemLarge.tsx:65,67` — botón "Marcar" usa `bg-grad-cta` (amber).
  - `ActivitiesBanner.tsx:67` — pendientes usa `bg-brand-amber/10 border-brand-amber/30` AMBER pero son ACTIVIDADES (que según convención son morado).
- **Problema:** El propio CLAUDE.md dice "amber para tareas (suman puntos), purple para actividades (consumen)" pero en el código se mezcla: a veces amber para tareas (correcto), a veces verde success para tareas (MPTabs), a veces amber para actividades (ActivitiesBanner). Resultado: el usuario aprende mal el modelo económico.
- **Fix:** Decidir: ¿amber o success para tareas? Diría success/verde para "lo bueno (suman)" y purple para "lo que cuesta (actividades)", dejando amber solo para CTA generales y "racha". Coherenciar y documentar en `docs/DESIGN_TOKENS.md`.
- **Esfuerzo:** Decisión 30 min · audit + cambio: 2h.

### S1-5 · Dos componentes diferentes para mood card (MoodCard y MoodPairCard)
- **Archivos:** `components/v2/dashboard/MoodCard.tsx` (v2.2.0, "unificada según handoff Claude Design canvas 03"), `components/v2/dashboard/MoodPairCard.tsx` (v1.6.3, indicador compacto).
- **Problema:** El comentario de MoodCard dice "Reemplaza el doble banner (MoodNudge + MoodPairCard)" pero MoodPairCard sigue exportada y testeada. El Dashboard puede acabar mostrando los dos. Más: MoodNudge también sigue ahí.
- **Riesgo:** Triple UX para mood (Nudge banner + PairCard + MoodCard).
- **Fix:** Si MoodCard es la canónica, eliminar MoodPairCard y MoodNudge (y sus tests). Verificar Dashboard.tsx no monta más de uno.
- **Esfuerzo:** 30 min.

### S1-6 · Polling en `AuthedLayout` invalida queries durante interacciones intermedias
- **Archivo:** `src/frontend/src/layout/AuthedLayout.tsx:28-55`
- **Problema:** Aunque respeta sheetLock (correcto), el query de notificaciones (`refetchInterval: () => isSheetOpen() ? false : 30_000`) y `loadUserData` cada 60s siguen disparando re-renders del usuario / store. Si el usuario está scrolleando una lista o tappeando rápido fuera de un sheet, igual sufre re-renders mid-tap. El sheetLock solo protege cuando hay sheet abierto.
- **Riesgo:** Aunque mitigado, sigue causando "salta el contenido". Especialmente con `setUser({...})` en `useMutation onSuccess` que invalida todo.
- **Fix:** Considerar también `if (document.activeElement instanceof HTMLInputElement) return` para no invalidar mientras el usuario escribe. O bajar polling de loadUserData a 5min y depender de mutations + websocket/poll-on-focus.
- **Esfuerzo:** 30 min.

### S1-7 · `LevelBar` y `BalanceLevelHero` usan claves de localStorage diferentes para "último nivel visto"
- **Archivos:** `LevelBar.tsx:21` (`mp_last_level`) vs `LevelUpModal.tsx:21` (`mp_last_level_seen`).
- **Problema:** Si el usuario ve LevelUpModal (marca `mp_last_level_seen=5`) y refresca, LevelBar lee `mp_last_level=0` y vuelve a hacer "glow" porque cree que NUNCA vio ese nivel. Doble celebración.
- **Fix:** Unificar a una sola key (`mp_last_level_seen`). Migrar lectura para aceptar la antigua y reescribir.
- **Esfuerzo:** 15 min.

### S1-8 · `BottomSheet` desktop comportamiento: sigue siendo bottom-sheet en pantallas grandes
- **Archivo:** `src/frontend/src/components/v2/primitives/BottomSheet.tsx:29`
- **Problema:** `<div className="fixed left-0 right-0 bottom-0 ... max-w-[500px] mx-auto">`. En mobile correcto. En desktop centrado pero pegado al borde inferior, raro. Otros sheets (AddActivitySheet, AddTaskFromCatalogSheet) usan `flex items-end sm:items-center` para centrar en sm+.
- **Riesgo:** UX inconsistente. Si la app crece para web, queda mal.
- **Fix:** Aplicar el patrón `items-end sm:items-center sm:rounded-2xl` también al primitive BottomSheet.
- **Esfuerzo:** 15 min.

### S1-9 · `BottomSheet` no soporta swipe-down en móvil
- **Archivo:** `BottomSheet.tsx:24-34` (todo).
- **Problema:** Solo cierra con click en backdrop o Escape. En móvil no hay handle visual + swipe down (patrón estándar iOS).
- **Riesgo:** Patrón táctil esperado no presente. La gente tira para abajo y no pasa nada.
- **Fix:** Añadir `onTouchStart`/`onTouchMove`/`onTouchEnd` con threshold 80px → `onClose()`. Drag handle visual (`<div className="mx-auto h-1 w-12 rounded-full bg-white/20" />`).
- **Esfuerzo:** 1h.

### S1-10 · `RecurringTaskManager` ConfirmDialog onClose ignora cuando busy (correcto) pero el backdrop click no se inhibe
- **Archivo:** `src/frontend/src/components/v2/tasks/RecurringTaskManager.tsx:231` y `ConfirmDialog.tsx:41` (no tiene onClose en backdrop, pero permite click en X).
- **Problema:** `onClose={() => !busy && setPausing(null)}` controla el botón X y Escape, pero el backdrop del ConfirmDialog **no es clickable para cerrar**. Pasable, pero inconsistente con BottomSheet (sí cierra al click backdrop).
- **Fix:** Decidir patrón: en confirms destructivos, NO cerrar al click backdrop (más seguro). Documentar.
- **Esfuerzo:** Decisión 15 min.

### S1-11 · `AppHeader` tiene botón Refresh manual que invalida TODAS las queries
- **Archivo:** `src/frontend/src/components/v2/layout/AppHeader.tsx:46-55`
- **Problema:** `await queryClient.invalidateQueries()` sin args invalida TODO el cache. Si el usuario lo toca por accidente, se vuelve a refetchear absolutamente todo. Además fuerza 400ms de spinner artificial. No respeta sheetLock — si tienes un sheet abierto y tocas refresh en el header, todo invalida durante una acción.
- **Riesgo:** UX agresiva. La refresh button está ahí para casos donde el polling ya hace el trabajo.
- **Fix:** Eliminar el botón (el polling cubre el caso de uso) o limitar las invalidaciones a `['balance', 'taskLogs', 'notifications']` específicas. Y respetar sheetLock.
- **Esfuerzo:** 30 min.

### S1-12 · `ActivityCatalogPicker` rompe completamente el dark mode
- **Archivo:** `src/frontend/src/components/v2/catalog/ActivityCatalogPicker.tsx:55,77,89,98,110-111`
- **Problema:** Toda la card es `bg-white shadow-lg`, search input `border` (default white), botones `border-blue-400`, texto `text-gray-500/700`. ¿Se usa? Grep: solo en sí mismo (export default). Podría ser dead-code; verificar antes de borrar.
- **Fix:** Si se usa: reescribir con tokens v2. Si no: borrar.
- **Esfuerzo:** Verificar uso 10 min · reescribir 30 min.

### S1-13 · `ProposalsPanel` y `ProposeChangeDialog` también light-mode
- **Archivos:** Ya reportado en S1-1 pero merece énfasis: están en `v2/consensus/` y se llaman desde RealRulesSection (v2 dark).
- **Problema:** Cuando el usuario propone cambio de regla en Settings → ve un modal blanco/azul mientras Settings es morado oscuro. UX rota.
- **Fix:** Reescribir con tokens v2.
- **Esfuerzo:** 1h.

### S1-14 · `TaskProofUploader` light-mode
- **Archivo:** `src/frontend/src/components/v2/proof/TaskProofUploader.tsx:68-99`
- **Problema:** `bg-gray-50`, `text-blue-700`, `text-red-600`, `text-gray-600`. Se usa en TaskPendingCard que también es light-mode. Doble inconsistencia.
- **Fix:** Migrar a tokens v2.
- **Esfuerzo:** 30 min.

### S1-15 · No hay respeto a `prefers-reduced-motion` en NINGUNA animación
- **Archivos:** `PointsBurst.tsx`, `AnimatedNumber.tsx`, `BalanceLevelHero.tsx:69-72`, `LevelUpModal.tsx:120-128`, `StreakStrip.tsx:28-35`, `LevelBar.tsx:30` (`animate-pulse`).
- **Problema:** Grep `prefers-reduced-motion` en el repo entero: cero resultados. Hay 5+ animaciones permanentes (flame flicker, balance tween, level-up confetti, points-burst float). Usuarios con sensibilidad vestibular o `prefers-reduced-motion: reduce` en el OS las ven igual.
- **Riesgo:** Accesibilidad. WCAG 2.3.3.
- **Fix:** Hook util `useReducedMotion()` (matchMedia). Cada animación: si reduced-motion, deshabilitar transform, mantener cambio de estado instantáneo. Estilizar `@media (prefers-reduced-motion: reduce)` en los `<style>` inline.
- **Esfuerzo:** 2h.

### S1-16 · `ProfileCompletionBanner` y `MoodNudge` doble persistencia (sessionStorage vs localStorage) sin razón clara
- **Archivos:** `MoodNudge.tsx:16` (sessionStorage por dateKey), `ProfileCompletionBanner.tsx:15` (localStorage permanente).
- **Problema:** El primero olvida al cerrar pestaña. El segundo persistente. Sin lógica documentada, parece arbitrario. Además `ProfileCompletionBanner` asume `firstLoginAt < 7 días` pero no hay manera de "deshacer dismissed" (key permanente). Si el usuario lo dismisses y luego completa perfil al 60%, ya no le aparece el banner para llegar al 80%.
- **Fix:** Decidir política. Mejor: dismissed también con TTL (7 días) para banners no críticos.
- **Esfuerzo:** 30 min.

### S1-17 · Z-index hardcodeados sin tabla de niveles
- **Archivos:** `BottomSheet.tsx:27,29` (`z-[80]`, `z-[81]`), `HeaderMenu.tsx:42,43` (`z-[58]`, `z-[59]`), `LevelUpModal.tsx:72` (`z-[70]`), `PointsBurst.tsx:45` (`z-[60]`), `DashboardTour.tsx:83` (`z-[60]`), `AppHeader.tsx:61` (`z-40`), `BottomNav.tsx:40` (`z-50`), `MoodSelectorSheet.tsx:22` (`z-50`), `AddTaskFromCatalogSheet.tsx:235` (`z-50`), `ConfirmDialog.tsx:41` (`z-50`), `AddActivitySheet.tsx:83` (`z-50`).
- **Problema:** Sin convención. Ej: BottomNav z-50, ConfirmDialog z-50 — si abren ConfirmDialog desde tarea visible, el BottomNav puede aparecer por encima del cancel button. LevelUpModal z-70 está debajo de BottomSheet z-80 — si suben de nivel mientras tienen sheet abierto, el modal queda escondido.
- **Fix:** Definir tabla en `tailwind.config.js`:
  ```
  zIndex: {
    nav: '40', sticky: '45', fab: '48', sheet-bg: '80', sheet: '81',
    modal-bg: '90', modal: '91', toast: '99'
  }
  ```
  Y migrar.
- **Esfuerzo:** 1-2h.

### S1-18 · `LevelHero` referencia ranking "v1.5" en componente v2
- **Archivo:** `src/frontend/src/components/v2/achievements/RankingTab.tsx:58` y `:78`
- **Problema:** El componente dice "datos próximamente · v1.5" cuando el repo está en v2.3.5. Texto stale.
- **Fix:** Ya sea cumplir el ranking de pareja o cambiar el copy a "Próximamente en Premium" / removerlo.
- **Esfuerzo:** 15 min decisión.

### S1-19 · `usePointsBurst` no respeta sheet apilado y se renderiza encima de modals
- **Archivo:** `PointsBurst.tsx:45` `z-[60]`.
- **Problema:** Si dispara burst mientras hay un BottomSheet (z-80) abierto, el "+15 MP" queda detrás. Queremos que aparezca encima del sheet (premia la acción del sheet).
- **Fix:** Subir a `z-[95]` (sobre todo).
- **Esfuerzo:** 5 min.

### S1-20 · Cobertura de tests del 19% (21/110) — críticos sin test
- **Archivos sin test:**
  - `BottomSheet.tsx` (S0-1, primitive de TODA la app — sin test)
  - `ConfirmDialog.tsx` (sin test)
  - `MoodSelectorSheet.tsx` (sí tiene test, mood-sheet)
  - `AddTaskFromCatalogSheet.tsx` (sin test, sheet más grande, tiene 569 líneas)
  - `AddActivitySheet.tsx` (sin test)
  - `AddTaskSheet.tsx` (sin test)
  - `AddActivityTemplateSheet.tsx` (sin test)
  - `EventNegotiationCard.tsx` (legacy sin test)
  - `RecurringTaskManager.tsx` (sin test, lógica de pausar tareas)
  - `LevelUpModal.tsx`, `PointsBurst.tsx`, `BalanceLevelHero.tsx` (animaciones, sin test)
  - `TaskScheduleForm.tsx` (sin test)
  - `RealRulesSection.tsx` (sin test)
- **Riesgo:** Refactor del sheetLock requiere test mocks contra `acquireSheetLock` y todos estos sheets se beneficiarían.
- **Fix:** Empezar por test smoke de cada sheet (open=true monta, click backdrop cierra, Escape cierra, sheetLock se llama). Luego AddTaskFromCatalogSheet con happy path.
- **Esfuerzo:** 1 día para los 8 críticos.

---

## S2 · Limpieza recomendada

### S2-1 · `TaskScheduleForm` con inline styles enteros
- **Archivo:** `components/TaskScheduleForm.tsx:33-148`. Toggle propio en JS en vez de un Switch primitive. Colores `#fffbeb`, `#f59e0b`, `#92400e` — paleta clara hardcodeada en el toggle.
- **Fix:** Reescribir con Tailwind v2 + crear `<Switch>` primitive si no existe.
- **Esfuerzo:** 1h.

### S2-2 · `WeeklyTaskView` inline styles + grid horizontal scroll difícil
- **Archivo:** `components/WeeklyTaskView.tsx:36-99` — todo inline. `gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', minWidth: 700` fuerza scroll horizontal en mobile.
- **Fix:** Reescribir con Tailwind y replantear UX (vertical en mobile, horizontal solo en sm+).
- **Esfuerzo:** 1h.

### S2-3 · `AnalyticsDashboard.tsx` (legacy, 13800 bytes) — auditar uso real
- **Archivo:** `components/AnalyticsDashboard.tsx`. Importado por `AnalyticsPage.tsx:4` (que es la página `/analytics`?). Si AnalyticsTabs/BasicAnalytics/AdvancedAnalytics son lo nuevo, AnalyticsDashboard es legacy.
- **Problema:** Hay duplicación entre Analytics legacy y AnalyticsTabs+children v2.
- **Fix:** Verificar qué ruta usa cada una. Eliminar la legacy si sí.
- **Esfuerzo:** 1h investigación.

### S2-4 · `CategoryPieChart.tsx` — dead code
- **Archivo:** `components/v2/analytics/charts/CategoryPieChart.tsx`. Grep dice solo se autoreferencia.
- **Fix:** Eliminar.
- **Esfuerzo:** 5 min.

### S2-5 · Magic colors hex frecuentes
- **Casos:** `text-[#a5b4fc]` en Pill/FabActionSheet, `text-[#c4b5fd]` en DailyPhrase/PremiumOverlay/HeatmapChart, `text-[#fbbf24]` en PremiumOverlay, `bg-[#1a1035]` en CookieConsentBanner/MoodSelectorSheet/LeaveCoupleWizard/DeleteAccountWizard, `bg-[rgba(15,10,30,0.95)]` en AppHeader.
- **Riesgo:** Si cambia el color de marca, hay que cazar 10+ archivos.
- **Fix:** Mover a `tailwind.config.js` colors:
  ```
  'text-indigo-soft': '#a5b4fc'
  'text-purple-soft': '#c4b5fd'
  'bg-page-deep': '#1a1035'
  'bg-page-blur': 'rgba(15,10,30,0.95)'
  ```
- **Esfuerzo:** 1h.

### S2-6 · MovementsTab y RecentMovementsTabs duplican lógica de iconFor/formatPoints/colorOf
- **Archivos:** `RecentMovementsTabs.tsx:23-49`, `MovementsTab.tsx:76-95`. Funciones casi idénticas con sutiles divergencias (kindFor en MovementsTab usa `tx.type`, en RecentMovementsTabs usa `m.kind`).
- **Fix:** Extraer a `utils/movementsFormat.ts`.
- **Esfuerzo:** 30 min.

### S2-7 · `Avatar` y `AvatarPicker` no comparten preview component
- **Archivos:** `Avatar.tsx` (preview small/md/lg con mood badge) y `AvatarPicker.tsx:22-28` (preview propio sin mood badge).
- **Fix:** AvatarPicker reusa `<Avatar>` para el preview.
- **Esfuerzo:** 15 min.

### S2-8 · `CategoryFilterStrip` constants `CATEGORY_EMOJI` / `CATEGORY_LABEL` exportadas y reusadas en 4+ archivos
- **Archivos:** `tasks/CategoryFilterStrip.tsx:4-13` exporta y se importa en `TaskItemLarge`, `TaskItemMedium`, `RecurringTaskManager`, `VerifyTasksBanner`, `AddTaskSheet`. Bien (DRY) pero acoplamiento raro: importar de un componente UI un mapa de datos.
- **Fix:** Mover a `data/taskCategories.ts`.
- **Esfuerzo:** 20 min.

### S2-9 · Skeleton loading inconsistente
- **Casos:** `RecurringTaskManager.tsx:90-95` usa `<Loader>` lucide spin · `MyMoodWeek.tsx:19-21` usa `bg-white/5 animate-pulse` · `LevelBar.tsx:30` usa `animate-pulse ring-2 ring-amber-500` · `AnalyticsProSection.tsx:18` solo texto "Cargando insights…" · `TodayTasksSection.tsx` no tiene skeleton, solo no monta. Patrón: Loader spinner / texto / animate-pulse / nada.
- **Fix:** Crear `<Skeleton>` primitive (un componente `<div className="bg-surface-card animate-pulse rounded-md h-X" />`) y `<LoadingFallback>` para la sección. Usar en todos los `isLoading`.
- **Esfuerzo:** 1h.

### S2-10 · Memoization inconsistente
- **Casos:** Solo 33 useMemo/useCallback/React.memo en 110 archivos. Buenos ejemplos: `RecentMovementsTabs.tsx:58-61` (filtrado memo), `AddActivitySheet.tsx:47-62` (grouped memo), `AddTaskFromCatalogSheet.tsx:81-119` (3 memos cuesta el render). Faltan: `TodayTasksSection`, `MovementsTab`, listas largas en general.
- **Fix:** Profile con React DevTools y memoizar listas pesadas.
- **Esfuerzo:** Caso por caso.

---

## S3 · Cosméticos / mejoras menores

- **S3-1** `MoodPairCard.tsx:33` `focus:ring-brand-purple/40` debería ser `focus-visible:ring-2` para ser consistente con el resto.
- **S3-2** `BottomNav.tsx:30` `focus:outline-none focus:ring-2` (sin `-visible`) — accesibilidad para keyboard users solo.
- **S3-3** `EventCardV2.tsx:73` capitaliza title con `capitalize` Tailwind — pero los títulos ya vienen capitalizados del backend. Doble cap.
- **S3-4** `Avatar.tsx:21` `linear-gradient(135deg, ${color}, ${color}dd)` — el `dd` hex suffix funciona pero solo si `color` viene como `#xxxxxx` 6-dig (no shorthand `#xxx`).
- **S3-5** `CalendarMonthViewV2.tsx:14-22` usa colores tailwind directos (`bg-purple-500`, `bg-amber-500`) y NO los tokens `bg-brand-purple`. Aún funcionan pero rompen single-source-of-truth.
- **S3-6** `LevelBar.tsx:30` y `ChallengeCard.tsx:24,35,38` usan `purple-900/20`, `purple-500/15`, `amber-500/30` — paleta Tailwind direct sin tokens. Coherenciar con `brand-purple`/`brand-amber`.
- **S3-7** Footer global (`components/Footer.tsx`) y CookieConsentBanner usan `bg-[#1a1035]` mismo color, podrían compartir token (ver S2-5).
- **S3-8** `WeekStripChart.tsx:80-83` `Math.max(1, ...)` para evitar div-by-zero — correcto pero falta cuando `events` está vacío y se renderiza el chart con barras 0px (ya hay min de 2px).
- **S3-9** `MonthGrid.tsx:135-167` `onMouseDown/onTouchStart` long-press timer no se cancela en `onMouseLeave` correctamente si el ratón vuelve a entrar (ej. movimiento sutil sobre la celda). Refactor con pointer events sería más robusto.
- **S3-10** `HeaderMenu.tsx:38-39` `function go(to: string) { nav(to); onClose() }` — el onClose tras nav es síncrono pero el unmount ocurre en el siguiente paint. Funciona pero feels sucio.
- **S3-11** `usePointsBurst` no limpia los timeouts en unmount — si el usuario navega antes de los 1400ms, leak (mínimo, pero leak).

---

## Resumen por subcarpeta v2

- `v2/achievements/`: limpio salvo S1-18 (texto v1.5 stale en RankingTab).
- `v2/activities/`: ActivityActionCard/WaitingCard/HistoryFilters limpios. AddActivitySheet OK con sheetLock pero sufre S0-6 (anidado con AddActivityTemplateSheet). CounterOfferSheet hereda S0-1 vía BottomSheet.
- `v2/analytics/`: BasicAnalytics, AdvancedAnalytics, MovementsTab, AnalyticsTabs, AnalyticsTeaser, PremiumOverlay limpios visualmente. Charts en `analytics/charts/` no auditados profundamente — recharts standard, solo CategoryPieChart parece dead.
- `v2/anniversary/`: AnniversaryCard limpio.
- `v2/calendar/`: limpio. EventCardV2 / CalendarMonthViewV2 / WeekStripChart / MonthGrid OK. CalendarV2Section uso `bg-pink-500/20` etc. (S3-6).
- `v2/catalog/`: ActivityCatalogManager tiene S0-8 (alert). ActivityCatalogPicker tiene S1-12 (light-mode). AddActivityTemplateSheet OK con sheetLock pero hereda S0-6.
- `v2/consensus/`: ProposalsPanel y ProposeChangeDialog tienen S1-13 (light-mode). RealRulesSection limpio.
- `v2/couple/`: CoupleHealthCard limpio.
- `v2/dashboard/`: ActivitiesBanner tiene S0-7 (window.alert). DailyPhrase tiene S0-10 (rules of hooks). LevelUpModal tiene S0-5 (no sheetLock) y S1-7 (key colision). MoodNudge/MoodPairCard/MoodCard tienen S1-5 (triple componente). LevelBar tiene S1-7. PointsBurst tiene S1-19 (z-index). Resto limpio.
- `v2/home/`: HomeSelector limpio.
- `v2/layout/`: AppHeader tiene S1-11 (refresh agresivo). BottomNav limpio. HeaderMenu tiene S0-4. FabActionSheet limpio (usa BottomSheet, hereda S0-1).
- `v2/premium/`: PremiumInterestModal usa BottomSheet (hereda S0-1).
- `v2/primitives/`: BottomSheet S0-1, ConfirmDialog S0-2, S1-8, S1-9. Avatar S2-7. Pill/Card/Button/Input/ProgressBar/AvatarPicker limpios.
- `v2/profile/`: MyMoodWeek limpio.
- `v2/proof/`: TaskProofUploader S1-14 (light-mode).
- `v2/sheets/`: MoodSelectorSheet S0-3.
- `v2/tasks/`: AddTaskSheet OK con sheetLock pero usa BottomSheet (S0-1). AddTaskFromCatalogSheet OK con sheetLock pero NO usa BottomSheet (custom). RecurringTaskManager OK con ConfirmDialog (S0-2 hereda). VerifyBanner / TaskRow / TaskItemLarge/Medium / WeekStrip / MPTabs / HeaderStrip / AllDoneCard / CategoryFilterStrip / TaskCatalogRow limpios.
- `v2/tour/`: DashboardTour S0-5 (no sheetLock).
- `v2/wizards/`: DeleteAccountWizard / LeaveCoupleWizard S0-5 (no sheetLock + light texto en algunas zonas).

---

## Plan de remediación recomendado (orden de prioridad)

1. **Hotfix mínimo** (1 sesión, ~3h): S0-1, S0-2, S0-3, S0-4. Añadir sheetLock a los 4 primitives/sheets globales. Esto soluciona >80% del bug "refresh interrumpe acciones" reportado.
2. **Hotfix complementario** (1 sesión, ~2h): S0-7, S0-8, S0-9, S0-10. Eliminar window.alert/confirm. Arreglar Rules-of-Hooks de DailyPhrase.
3. **Sprint design system unificado** (3-4 días): S1-1, S1-2, S1-3, S1-12, S1-13, S1-14, S2-1, S2-2. Migrar legacy a v2 / borrar dead-code. El usuario notará el cambio visual radical.
4. **Sprint accesibilidad + polish** (2 días): S0-5 (modal primitive), S0-6 (z-index sheets apilados), S1-15 (reduced-motion), S1-17 (z-index table), S1-9 (swipe-down), S1-20 (tests críticos).
5. **Sprint cleanup** (1 día): S1-4, S1-5, S1-6, S1-7, S1-11, S2-3 a S2-10, S3-x.
