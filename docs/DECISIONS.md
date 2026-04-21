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
