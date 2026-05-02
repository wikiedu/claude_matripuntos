# Matripuntos — Historial de Decisiones

Registro de decisiones de producto y técnicas tomadas durante el desarrollo. Cada entrada incluye contexto, alternativas consideradas y la decisión final.

---

## 2026-04-11 · Sesión fundacional de roadmap

### Producto público desde el inicio
**Decisión:** Matripuntos es un producto público (no personal/privado).  
**Alternativas:** Solo para uso propio, o lanzar más adelante.  
**Razón:** Ambición de tracción real desde el principio.

### Modelo freemium B
**Decisión:** Todo gratis al lanzar. Límites se activan cuando hay base de usuarios activos con datos de uso reales.  
**Alternativas:** A) Freemium desde el día 1. B) Pago desde el principio.  
**Razón:** Maximizar adopción inicial. Los límites sin usuarios reales son prematuros y podrían bloquear tracción.

### Estilo visual warm + dark
**Decisión:** Base cálida (amber `#f59e0b`, crema) sobre fondos oscuros púrpura (`#0f0a1e`). Referencia: Headspace + Discord.  
**Alternativas:** Completamente oscuro (Discord puro), completamente claro, o minimalista neutro.  
**Razón:** El usuario eligió "C con toque de D" — warm con matices dark para transmitir calidez sin perder modernidad.

### Versiones con nombre
**Decisión:** Formato `vX.Y · Nombre` donde el nombre da identidad comunicable (MVP 1 Los Cimientos, v1.1 La Chispa...).  
**Alternativas:** Solo números de versión.  
**Razón:** Facilita comunicación interna y externa. Cada versión tiene una narrativa clara.

### Ritmo de releases
**Decisión:** Iterativo incremental — cada versión minor es deployable. Sin prisa, pero frecuente.  
**Alternativas:** Big bang releases, o versiones muy pequeñas sin nombre.  
**Razón:** "Cuanto antes mejor, pero no hay prisa." Equilibrio entre velocidad y calidad.

### Worktrees globales
**Decisión:** Git worktrees en `~/.config/superpowers/worktrees/Matripuntos/<branch>` (fuera del repo).  
**Razón:** El usuario prefirió ubicación global para reutilizar entre sesiones.

### Navegación bottom nav con ➕ central
**Decisión:** Bottom navigation bar con 5 posiciones: Inicio · Tareas · [➕ central elevado] · Calendario · Logros. Módulos secundarios en "Más".  
**Alternativas:** Sidebar, top nav, tabs.  
**Razón:** Patrón mobile-first familiar. El botón ➕ central es la acción más frecuente (crear actividad/tarea).

### Nivel de pareja compartido
**Decisión:** El nivel de progresión es de la pareja como equipo, no individual.  
**Razón:** Refuerza la colaboración. Los logros pueden ser individuales o de pareja, pero el nivel es conjunto.

### Reglas del juego configurables con aprobación bilateral
**Decisión:** Un miembro propone cambio en multiplicadores/puntos → el otro acepta o rechaza (sin negociación, solo sí/no).  
**Razón:** Configurabilidad necesaria para adaptar la app a cada pareja, pero con consenso obligatorio.

### Notificaciones solo al responder
**Decisión:** No notificar al partner cuando se crea una actividad. Solo cuando hay una acción que requiere su respuesta (acepta/rechaza/contraoferta).  
**Razón:** Bug identificado en MVP 1 — las notificaciones al crear eran ruido sin valor. El partner necesita saber que hay algo pendiente, no que alguien creó algo.

### Mascotas como factor de puntos (no módulo)
**Decisión:** Las mascotas afectan al cálculo de puntos en tareas (FactorMascotas) pero no tienen módulo propio de gestión avanzada.  
**Razón:** El modelo Pet ya existe en el schema. Añadir el factor es suficiente para v1.2; un módulo completo sería scope creep.

### Journaling sin social features
**Decisión:** El journaling es privado por defecto. Sin comentarios, reacciones ni feed compartido. Puede marcarse como compartido post-escritura.  
**Razón:** Espacio de reflexión íntima, no red social. Compartir es opt-in, no la norma.

### Deploy infrastructure
**Decisión:** Frontend via FTP a keepitup.io, backend auto-deploy en Render vía GitHub push a `main`, BD en Supabase (PostgreSQL).  
**Razón:** Infraestructura existente del hosting. FTP es el método de upload del proveedor.

---

## 2026-04-12 · MVP 1 en producción

### Bug 1 — Calendario incluye TaskLogs
**Decisión técnica:** `calendarService.ts` hace `Promise.all` con `getTaskLogsInRange()` que consulta el modelo `TaskLog`. Los errores de la query se aíslan con `.catch(() => [])` para que un fallo en tareas no rompa el calendario completo.

### Bug 2 — Timezone con Intl API
**Decisión técnica:** Nuevo `src/frontend/src/utils/dateUtils.ts` con helpers cacheados (`userLocale`, `userTimeZone` a nivel módulo). Usa `Intl.DateTimeFormat` con guards SSR (`typeof navigator !== 'undefined'`). Se actualiza en 7 componentes.

### Bug 3 — Notificación al responder
**Decisión técnica:** Eliminado `notifyEventProposed` del `POST /events`. Añadido `notifyEventResponded` en `negotiationRoutes.ts` tras el bloque accept/reject/counter, en try/catch no-fatal.

### Tag mvp1
**Decisión:** `git tag mvp1` aplicado en `main` tras merge de todos los fixes. Patrón a seguir: tags en `main` en el commit de merge de cada versión.

---

## 2026-04-21 · v1.4 · Signup pareja en un paso + catálogo seed

### Signup fácil de pareja (StepJoinAccount)
**Problema:** Al pasar el link de invitación (`/onboarding/join/:token`) a un usuario sin cuenta, caía en el wizard completo (Step 3/4) y fallaba porque no tenía sesión. Los amigos de prueba no podían registrarse.
**Decisión:** Nueva pantalla `StepJoinAccount.tsx` que se muestra cuando hay token en URL **y** no hay sesión. Pide sólo nombre + contraseña (el email viene del token), llama a `registerWithInvitation`, marca `hasCompletedOnboarding=true` y redirige al dashboard.
**Alternativas descartadas:** Forzar al invitado a pasar por `/signup` primero (requiere dos pasos y pierde el contexto del token).
**Razón:** El invitado hereda la configuración de la pareja de quien le invitó — no tiene sentido pedirle hijos/mascotas/categorías otra vez.

### PUT /profile/me como upsert + flag onboarding
**Problema:** La ruta `PUT /api/profile/me` devolvía 404 si el usuario no tenía `UserProfile` aún, e ignoraba `hasCompletedOnboarding` completamente (sólo tocaba `UserProfile`, no `User`).
**Decisión técnica:** Cambiado a `prisma.userProfile.upsert` + si llega `hasCompletedOnboarding` en el body, actualiza también `User.hasCompletedOnboarding`. Permite que el seed y `StepJoinAccount` marquen al usuario como onboarded sin tocar 2 endpoints.
**Razón:** El flag vive en `User`, no en `UserProfile` — la ruta lo ignoraba silenciosamente. El seed y el join flow necesitan setear ambos a la vez.

### Catálogo de tareas como fuente de verdad
**Decisión:** El `TASK_CATALOG` en `src/frontend/src/pages/Tasks.tsx` es la fuente de verdad para los puntos base de cada tarea recurrente. Rango acordado: **2 – 18 MP** (deberes 1-2 MP como mínimo, compra semanal 18 MP como máximo).
**Alternativas descartadas:** Mantener la tabla antigua en `docs/PUNTOS.md` (1.0 – 2.0) que venía del MVP 1 pre-rebalance.
**Razón:** Después del rebalance de puntos en v1.4 (Lote 4), los valores del MVP estaban desfasados. "Compra súper no puede valer lo mismo que deberes" — los puntos deben reflejar el esfuerzo real.

### Seed alineado con el catálogo
**Decisión:** `scripts/seed-prod-couple.mjs` reescribe `SEED_TASKS` usando los nombres y puntos del `TASK_CATALOG` frontend. Antes inventaba puntos bajos (1.0 – 1.5 MP) que no correspondían a nada y rompían la coherencia cuando el usuario comparaba con lo que vería al crear una tarea desde cero.
**Razón:** Un seed que contradice al catálogo genera datos irreales y confunde al probar balance/analytics. "Sacar a pasear al perro" pasa de 8 → **5 MP** (catálogo ajustado tras feedback) y del seed de 1 → 5 MP (alineado).

### Signup sin tareas por defecto
**Confirmación:** `src/backend/src/services/authService.ts:161` no inserta tareas por defecto al crear la pareja — el comentario lo deja explícito: _"Tasks start empty — users add their own from the catalog or create new ones"_. No se tocó, ya estaba correcto. La confusión venía del seed, no del código de producción.

### scripts/patch-onboarded.mjs
**Decisión:** Script one-shot para parchear cuentas existentes (Ana/Bruno del seed pre-fix) marcándolas como onboarded via la nueva ruta. Útil cuando el seed corre contra un backend que todavía no tenía la ruta actualizada, o para recuperar cuentas de pruebas anteriores sin tener que re-seedearlas.

---

## 2026-04-22 · Módulo Actividades · `/home/tasks` + `/home/activities`

Sub-proyecto independiente (fuera del roadmap principal) que reestructura los flujos de tareas recurrentes y actividades negociables en dos pantallas hermanas bajo `/home/*`, y convierte el Dashboard en el punto de acción unificado. Branch `feature/actividades-module` → merge fast-forward a `main` (2026-04-22).

Spec: `docs/superpowers/specs/2026-04-21-actividades-module-design.md`  
Plan: `docs/superpowers/plans/2026-04-21-actividades-module.md`

### Separación Tareas / Actividades bajo `/home`
**Decisión:** La ruta `/tasks` se divide en dos secciones hermanas accesibles desde un sub-selector: `/home/tasks` (tareas recurrentes del catálogo) y `/home/activities` (actividades puntuales negociables). La bottom nav pasa a un item único "Hogar" (`/home`) que recuerda la última sub-sección visitada vía `localStorage`.
**Alternativas descartadas:** Dos items separados en la bottom nav (rompe la jerarquía de 5 posiciones con FAB central); mantener `/tasks` mezclando ambos conceptos (era la fuente de la confusión en v1.4).
**Razón:** Tareas recurrentes y actividades negociables tienen verbos distintos (completar vs. negociar/aceptar/rechazar) y cadencias distintas (diarias vs. puntuales). Mezclarlas en una sola vista obligaba al usuario a filtrar mentalmente. La bottom nav mantiene 5 slots; el sub-selector queda dentro del contenedor `/home`.

### Legacy redirects preservados
**Decisión:** `/tasks`, `/inbox`, `/request-inbox` siguen existiendo como `<Navigate to="/home/..." replace />` para no romper links externos, notificaciones push históricas ni deep-links en el bundle antiguo cacheado en el navegador del usuario.
**Razón:** El FTP sirve los assets nuevos pero los service workers / pestañas abiertas pueden seguir resolviendo rutas viejas durante horas. Los redirects son baratos y evitan 404s en producción.

### Fuente única de eventos con derivación en cliente
**Decisión técnica:** Un solo query `['events', 'all']` (hook `useActivities`) trae todos los eventos una vez; los conteos `pendingCount` / `waitingCount` / las listas activas e históricas se derivan en cliente con `useMemo`. La invalidación es centralizada: helper `useInvalidateActivity(eventId?)` dispara 7 claves en fan-out (`events/all`, `events/:id`, `balance`, `recentActivity`, `gamification/status`, `achievements/map`, `notifications`).
**Alternativas descartadas:** Un query por pestaña (pending / waiting / history) — duplicaba peticiones y creaba estados de carga desincronizados entre Dashboard y Activities. Server-side filtering — el volumen cabe en cliente y permite que el banner del Dashboard y la lista de Activities compartan el mismo cache.
**Razón:** El banner accionable del Dashboard y las tabs de Activities leen el mismo dominio; forzarlos a compartir un solo cache elimina race conditions donde aceptar un evento desde el Dashboard dejaba la lista de Activities desactualizada.

### Banner accionable en el Dashboard
**Decisión:** `ActivitiesBanner` reemplaza el antiguo resumen pasivo "Tienes N pendientes" por hasta 2 `ActivityActionCard` con botones Aceptar / Rechazar / Contraoferta directamente embebidos. Overflow "…y N más · Ver todas →" lleva a `/home/activities`. Sección secundaria con las solicitudes propias pendientes de respuesta del partner.
**Razón:** El flujo antiguo obligaba a 3 navegaciones (Dashboard → RequestInbox → detalle → responder). El banner resuelve el 80% de las respuestas en un solo tap sin salir del Dashboard.

### `CounterOfferSheet` como componente presentacional
**Decisión:** Bottom sheet reutilizable con inputs de puntos + mensaje opcional. Validación local (`n > 0`), sin lógica de mutación — el parent (ActivitiesBanner o ActivityDetail) inyecta `onSubmit` con el `eventId` y `negotiationId` correctos.
**Razón:** El mismo sheet se usa desde 2 puntos (Dashboard banner y detalle de actividad). Dejarlo presentacional evita duplicar el `respond.mutate` y mantiene la invalidación centralizada en el parent.

### `RecentMovementsTabs` con tabs All / Actividades / Tareas
**Decisión:** Sustituye al antiguo `RecentMovements`. Muestra los últimos 3 movimientos filtrados por tipo. Tap en una fila navega a `/home/activities/:refId` si `kind === 'activity'` o a `/home/tasks?logId=:refId` si `kind === 'task'`. La derivación `kind` vive en `Dashboard.tsx` (`deriveKind(a)`) leyendo `RecentActivity.type`.
**Alternativas descartadas:** Widget separado por cada tipo — ocupaba doble espacio en el Dashboard; filtro servidor — el tipo ya viene del backend, no justifica roundtrip.

### Vitest + React Testing Library como Fase 0
**Decisión:** Se adopta Vitest + `@testing-library/react` + `jsdom` en el frontend como parte del sub-proyecto Actividades, no como proyecto aparte. `vitest.config.ts`, `src/test/setup.ts`, `src/test/renderWithProviders.tsx` e integración con `tsconfig` entran en este branch.
**Razón:** El módulo necesitaba tests desde el día 1 (custom hook `useActivities` + invalidación multi-key son difíciles de validar a mano). Empujar la infra al merge de v1.5 hubiese bloqueado el módulo o dejado código sin cubrir. v1.5 hereda la infra y consolida la cobertura retroactiva.

### Retiro de `RequestInbox` + `RecentMovements`
**Decisión:** `src/frontend/src/pages/RequestInbox.tsx` (158 líneas tras poda) y `src/frontend/src/components/v2/dashboard/RecentMovements.tsx` (44 líneas) se eliminan. El flujo de verificación de TaskLogs pasa a formar parte de `/home/tasks` y el widget Recent queda reemplazado por el que tiene tabs.
**Razón:** Tras la división, `RequestInbox` quedaba como una pantalla intermedia sin propósito (ya sin la pestaña de activity) y el widget sin tabs se quedaba corto para el nuevo dominio mezclado.

### Patrón `vi.hoisted` para mocks mutables entre tests
**Decisión técnica:** Los tests que mockean `apiClient` declaran estado compartido con `const mockState = vi.hoisted(() => ({ events: [] as any[] }))` y lo mutan en `beforeEach`. El `vi.mock` cierra sobre `mockState` y cada test mueve el contenido antes de renderizar.
**Alternativas descartadas:** `vi.doMock` dentro de cada test — no funciona si el módulo ya está cacheado por un `vi.mock` hoisteado previo; reiniciar el módulo con `vi.resetModules` en cada test — lento y rompe la simetría con el resto del stack de providers.
**Razón:** `vi.mock` se hoistea al top del archivo antes de cualquier declaración, así que el único forma de parametrizar el mock por test sin que se caché es hoistear también el estado y mutarlo. Patrón ya documentado en Vitest pero fácil de olvidar.

---

## 2026-04-26 · v1.6 · La Personalidad — decisiones de brainstorming

### 1. Modelo conceptual de personalidad
**Decisión:** Opción C sin co-creación: frase + mood + avatar, ambicioso, pero sin permitir que la pareja escriba sus propias frases.
**Razón:** Riesgo UX (spam, frases que envejecen, conflictos editoriales). Las frases co-creadas se difieren a v2.1/v3.0.

### 2. Modelo de frases
**Decisión:** Catálogo curado por nosotros, determinista pareja+día, sin IA, sin user input.
**Alternativas:** API externa con IA, frases generadas por user.
**Razón:** Control de tono, calidad consistente, cero coste de tokens, cero moderación.

### 3. Cascada de selección de frase
**Decisión:** Por urgencia emocional con orden fijo: disputa abierta > racha rota > hito > weekend > semana cargada > partner alto aporte > lunes > neutra-positivo.
**Razón:** Ranking fijo es predecible y testeable. Ranking dinámico añade complejidad sin valor.

### 4. Catálogo de moods
**Decisión:** 10 moods (4 positivos, 2 neutros, 2 low-energy, 2 negative-soft). Sin moods hostiles ("enfadado", "cabreado").
**Razón:** Mood = invitación, nunca dardo. Conflicto se canaliza por disputas/negociación.

### 5. Caducidad de mood
**Decisión:** 24h rolling desde `moodUpdatedAt`. Pasadas las 24h se considera vacío.
**Alternativas:** Persistente hasta cambio explícito, caducidad horaria.
**Razón:** El mood "ayer" no representa el estado de hoy; rolling automático evita que el partner vea info obsoleta.

### 6. Notificación al partner al cambiar mood
**Decisión:** No notificar. Discovery pasivo cuando el partner abre la app.
**Razón:** Privacidad emocional. Push activos sobre mood serían intrusivos.

### 7. Histórico de mood
**Decisión:** Solo propio (vista 7 días en perfil). Vista pareja-mood-week → backlog v2.0.2 Journaling.
**Razón:** Ver el histórico ajeno puede sentirse intrusivo; mejor empaquetado en Journaling con consentimiento explícito.

### 8. Sistema de avatares
**Decisión:** Emoji+color ampliado y consolidado (30 emojis × 12 colores). Ilustraciones SVG (B) y accesorios desbloqueables (C) → backlog v1.7+.
**Razón:** Coste/beneficio: SVG requiere diseño dedicado; accesorios solo tienen sentido junto a gamificación profunda de v1.7.

### 9. Anti-spam de MoodLog
**Decisión técnica:** No loguear duplicados <5 min. Si user toca mismo mood varias veces seguidas, solo el primero queda en historial.
**Razón:** Evita inflación del histórico personal por toques repetidos sin cambio real.

### 10. Hash determinista para selección de frase
**Decisión técnica:** `cyrb53(coupleId-dayKey-category)` inline (sin deps). Mismo seed con misma pool → mismo índice → ambos miembros ven la misma frase.
**Alternativas:** Math.random con seed (no es estable entre engines), MD5 (deps), índice por hash JS (colisiones).
**Razón:** cyrb53 es 53-bit, distribución suficiente para ~80-280 frases, ~10 líneas, sin deps.

### 11. Migración de currentMood antiguos
**Decisión:** Mapping en SQL de migración: 😊→feliz, 😎→tranquilo, 😴→cansado, 😰→estresado, 😐→tranquilo. Cualquier valor fuera del catálogo → NULL (resilient).
**Razón:** Legacy users no pierden funcionalidad: o se les preserva el mood razonablemente equivalente o se limpia para que vuelvan a fijarlo.
