# Auditoría 07 — State management & refresh inesperados (frontend)

Fecha: 2026-05-05  
Versión auditada: v2.3.5 (KISS Actividades + refresh hardening)  
Síntoma reportado por el usuario: "el refresh es extraño" — incluso después de que v2.3.5 desactivara `refetchOnWindowFocus` global, añadiera el sheetLock al polling de notifications, y al `loadUserData` del AuthedLayout.

Alcance: Zustand store, axios/fetch wrapper, React Query config, todos los hooks `src/frontend/src/hooks/*`, AuthedLayout/AppHeader/BottomNav, sheets/modals, polling y listeners de eventos.

---

## Resumen ejecutivo

- El "refresh hardening" de v2.3.5 sólo blinda **dos** sitios (loadUserData en AuthedLayout y la query de unread-count). Hay al menos **5 caminos paralelos** que siguen ignorando el sheetLock y disparan re-fetch / re-render mientras el usuario tiene un flujo abierto.
- El sheetLock es **opt-in por sheet**: hay 4–5 sheets/modals/wizards usados a diario que NO llaman `acquireSheetLock` (MoodSelectorSheet, CounterOfferSheet, LeaveCoupleWizard, DeleteAccountWizard, PremiumInterestModal, FabActionSheet, HeaderMenu, los modals locales de Tasks).
- `Tasks.tsx` tiene **su propio polling** (30s + focus + visibilitychange) que NO consulta sheetLock y reescribe `tasks/allLogs` con `setIsLoading(true)`. Esto desmonta los modals locales (LogTaskModal, DisputeModal) si la respuesta del partner llega justo en ese tick. Es la causa más fuerte y observable del "refresh extraño" en la pantalla principal.
- El botón Refresh global (AppHeader) llama `queryClient.invalidateQueries()` SIN filtro de key → invalida todas las queries de la app de golpe (cascada). Si el partner reacciona, también llega cascada.
- El logout NO limpia el `setInterval` de AuthedLayout salvo unmount; además `useAppStore` tiene **dependencia circular** con `App.tsx` (`import { queryClient } from '../App'`) que provoca side effects al cargar el store.

---

## Hallazgos

### S0 — el polling propio de `Tasks.tsx` es el sospechoso #1

**Severidad:** S0  
**Archivo:** `src/frontend/src/pages/Tasks.tsx:418-439` (focus + visibilitychange + setInterval 30s) y `:379-414` (loadData con `setIsLoading(true)`)

```ts
// src/frontend/src/pages/Tasks.tsx:421
useEffect(() => {
  function onFocus() { loadData() }
  function onVisible() { if (document.visibilityState === 'visible') loadData() }
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisible)
  return () => { ... }
}, [loadData])

// src/frontend/src/pages/Tasks.tsx:434
useEffect(() => {
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') loadData()
  }, 30_000)
  return () => clearInterval(id)
}, [loadData])
```

**Problema:**
1. NO consulta `isSheetOpen()`. v2.3.5 sólo blindó AuthedLayout, no las páginas.
2. `loadData` arranca con `setIsLoading(true)` (línea 380) → durante 100–500ms el componente entero re-renderiza con spinner. Si el usuario está dentro de `LogTaskModal` o `DisputeModal` (estos son hijos del propio `Tasks` controlados por estado local), el modal **no se desmonta**, pero la página de fondo SÍ parpadea visiblemente. Si el usuario está en la sheet `AddTaskSheet` (que sí adquiere lock), el lock no aplica porque Tasks no lo lee.
3. Tasks ya tiene también la query global `['tasks']`, `['taskLogs', 'all']` y `['taskLogs', 'pending']` (Dashboard las usa). Tasks.tsx duplica ese trabajo con `useState` + `loadData`. Cuando un mutation invalida esas keys, Tasks NO se entera por la cascada (no las consume), sólo cuando vuelve el polling de 30s.

**Hipótesis (¿esto explica el "refresh extraño"?):** SÍ, casi seguro. El usuario abre Tasks, pulsa una tarea, está pensando, y a los 30s exactos la pantalla parpadea spinner-content sin que él haya hecho nada. Más visible aún: cambia de tab al móvil, vuelve, ve el flash. v2.3.5 no lo arregló porque sólo tocó AuthedLayout y un único `useQuery`.

**Fix propuesto:**
- Mantener un solo `useQuery({ queryKey: ['tasks'], staleTime: 60_000 })` y `['taskLogs', 'all']` igual que Dashboard, eliminar `loadData/useState/useEffect` por completo.
- O al menos: envolver todos los `loadData()` con `if (isSheetOpen()) return`, y NO setear `setIsLoading(true)` en refrescos en background (sólo en mount). Patrón típico: `keepPreviousData` y un flag `isFetching` separado del `isLoading` del primer mount.

**Esfuerzo:** M (0.5–1d). Migrar Tasks.tsx a React Query es la opción correcta y elimina ~50 líneas.

---

### S0 — el sheetLock es opt-in: muchísimos sheets/modals NO lo usan

**Severidad:** S0  
**Archivos:**
- `src/frontend/src/components/v2/sheets/MoodSelectorSheet.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/activities/CounterOfferSheet.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/wizards/LeaveCoupleWizard.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/wizards/DeleteAccountWizard.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/premium/PremiumInterestModal.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/layout/FabActionSheet.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/layout/HeaderMenu.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/dashboard/LevelUpModal.tsx` (no acquireSheetLock)
- `src/frontend/src/components/v2/primitives/ConfirmDialog.tsx` (no acquireSheetLock)
- `src/frontend/src/pages/Tasks.tsx:115-281` (LogTaskModal y DisputeModal inline, no acquireSheetLock)

**Problema:** El primitive `BottomSheet` (`src/frontend/src/components/v2/primitives/BottomSheet.tsx:11`) NO llama acquireSheetLock dentro de su useEffect — depende de que cada usuario del primitive lo haga manualmente. Sólo lo hacen 4 componentes (AddTaskSheet, AddTaskFromCatalogSheet, AddActivityTemplateSheet, AddActivitySheet).

**Hipótesis (¿esto explica el "refresh extraño"?):** SÍ, completamente. Caso real:
1. Usuario abre el FAB → FabActionSheet (BottomSheet, sin lock)
2. Usuario está leyendo opciones
3. Pasan 30s, AuthedLayout hace `loadUserData()` → consulta `isSheetOpen()` → `false` (¡no hay lock!) → re-fetch /auth/me + /auth/couple → Zustand setState → re-render de TODA la app, incluyendo el FabActionSheet padre AuthedLayout → BottomSheet sigue, pero la animación o estado del usuario "se siente raro".

Otro caso clásico: el usuario está en CounterOfferSheet escribiendo un mensaje y rellenando el número. El polling de 30s del unread-count vuelve a invalidar (sí lo respeta v2.3.5), pero el polling de loadUserData en AuthedLayout también respeta el lock. **PERO**: si el usuario está en MoodSelectorSheet (no acquire lock) y mientras está abierta el partner cambia algo → notification poll → unread-count sube → AppHeader se re-renderiza → MoodSelectorSheet se mantiene pero el header detrás cambia. Aceptable.

El caso peor es CounterOfferSheet: NO acquire lock + es donde el usuario está editando un input controlado durante varios segundos. Si el partner toca cualquier cosa o si pasa el tick de 30s, los `useQuery({queryKey: ['events', 'all']})` que dependencian `useActivities()` (consumido por Dashboard, Activities, ActivitiesBanner) se recalcularán cuando llegue una mutation o invalidate desde otro sitio (ej. el partner aceptando). El `pending`, `lastNegOf`, `currentNeg` se recalculan, `currentPoints` cambia, y `useEffect([open, currentPoints])` en CounterOfferSheet **resetea el input** (línea 17–23):

```ts
useEffect(() => {
  if (open) {
    setPoints(String(currentPoints))    // ← resetea lo que el usuario tecleó
    setMessage('')
    setError(null)
  }
}, [open, currentPoints])
```

Esto es un bug serio: si `currentPoints` cambia (porque el partner contraofertó o porque `useActivities` refetchea y recalcula), **el sheet sobrescribe lo que el usuario está tecleando**. Sin acquireSheetLock no hay defensa.

**Fix propuesto:**
1. **Inmediato:** mover el acquire/release al primitive `BottomSheet`. Una línea de código, blinda 8+ usos automáticamente:
   ```ts
   // BottomSheet.tsx
   useEffect(() => {
     if (!open) return
     acquireSheetLock()
     return () => releaseSheetLock()
   }, [open])
   ```
2. Crear primitive `Modal`/`Wizard` equivalente y aplicar lo mismo al ConfirmDialog, LeaveCoupleWizard, DeleteAccountWizard, PremiumInterestModal, MoodSelectorSheet, LogTaskModal, DisputeModal.
3. Bug en CounterOfferSheet: cambiar la dependencia del useEffect a `[open]` (no `[open, currentPoints]`) porque `currentPoints` sólo es useful en mount inicial — el usuario va a sobrescribirlo.

**Esfuerzo:** S (1–2h en total).

---

### S1 — el botón Refresh manual invalida TODAS las queries

**Severidad:** S1  
**Archivo:** `src/frontend/src/components/v2/layout/AppHeader.tsx:46-55`

```ts
const handleRefresh = async () => {
  setRefreshing(true)
  try {
    await queryClient.invalidateQueries()  // ← sin queryKey, invalida TODO
    await new Promise((r) => setTimeout(r, 400))
  } finally { setRefreshing(false) }
}
```

**Problema:** `invalidateQueries()` sin filtro lanza un refetch de **todas** las queries activas a la vez (puede ser >20: events, notifications, gamification, achievements, balance, recentActivity, tasks, taskLogs, journal, calendar, analytics, anniversary, catalog, config-proposals…). Esto:
- Pega un pico al backend (cold start si hay >1 instancia Render) → varios "Failed to fetch".
- El `setIsLoading` de cada query dispara re-render en serie → la UI parpadea durante 1–2s.
- Si el usuario tenía un sheet abierto, todas las dependencias del sheet (currentPoints en CounterOfferSheet, etc.) cambian.

**Hipótesis:** sí, contribuye. Si el usuario pulsa el botón refresh sin querer (o con doble tap), siente "refresh raro" varios segundos.

**Fix:** invalidar sólo las keys que el usuario espera ver fresco: `['balance']`, `['events','all']`, `['taskLogs','all']`, `['recentActivity']`, `['notifications','unread-count']`. O usar `predicate` para excluir las costosas (analytics, journal).

**Esfuerzo:** XS (15min).

---

### S1 — `queryClient` se importa desde `App.tsx` dentro del store: dependencia circular y side effects

**Severidad:** S1  
**Archivos:**
- `src/frontend/src/store/useAppStore.ts:4` `import { queryClient } from '../App'`
- `src/frontend/src/App.tsx:35` `export const queryClient = new QueryClient(...)`

**Problema:** `useAppStore` se carga en el primer render → tira `App.tsx` que monta provider, rutas, y CSS. Esto crea:
- Un ciclo: `App → useAppStore → App`. Vite/TS lo tolera, pero el orden de inicialización no está garantizado. El `queryClient` puede estar `undefined` si la cadena de imports cambia.
- Side effect en `useAppStore.logout()`: `queryClient.clear()`. Si `queryClient` no está aún inicializado en algún test o HMR, el logout truena silenciosamente.

**Hipótesis:** baja contribución directa al "refresh extraño" en runtime, pero **explica posibles regresiones en HMR/desarrollo** ("hago un cambio, recargo, login no funciona").

**Fix:** mover `queryClient` a `src/frontend/src/lib/queryClient.ts`. Importar desde ambos lados sin ciclo.

**Esfuerzo:** XS (15min).

---

### S1 — `loadUserData` dispara `setIsLoading(true)` en background

**Severidad:** S1  
**Archivo:** `src/frontend/src/store/useAppStore.ts:121-147`

```ts
loadUserData: async () => {
  set({ isLoading: true, error: null })   // ← el ProtectedRoute salta a "Cargando..."
  ...
}
```

**Problema:** AuthedLayout llama `loadUserData()` en el polling de 60s. Cuando lo hace, `isLoading` se pone a `true`. ¿Qué consume `isLoading`? `ProtectedRoute` en `App.tsx:59-65` (`if (isLoading) return <"Cargando..."`). Esto es OK durante el bootstrap inicial pero **catastrófico en background**: si `loadUserData` se dispara mientras la app está corriendo, ProtectedRoute **reemplaza la pantalla por un spinner "Cargando…"** durante 100–500ms.

Hay protección en AuthedLayout (visibility check + sheetLock) pero NO bloquea el caso en que `loadUserData()` se llame desde otro sitio: por ejemplo el `useEffect` de `App.tsx:120-128` cuando cambia `isAuthenticated`.

**Hipótesis (¿esto explica el "refresh extraño"?):** SÍ, parcialmente y de forma muy visible. Cada 60s exactos, si el navegador estaba visible y no hay sheet con lock, el usuario ve el flash "Cargando…" reemplazando el dashboard. Esto es probablemente lo que el usuario describe como "refresh".

**Fix:** Distinguir bootstrap vs background refresh:

```ts
loadUserData: async (background = false) => {
  if (!background) set({ isLoading: true, error: null })
  ...
}
```

Y en AuthedLayout cambiar la llamada a `loadUserData(true)`.

Mejor aún: separar el `isLoading` del store (sólo bootstrap) del refresh en background. Crear un selector `useIsBootstrapping` que sólo es `true` la primera vez.

**Esfuerzo:** S (1–2h).

---

### S1 — invalidaciones genéricas con `['notifications']` invalidan también el polling

**Severidad:** S1  
**Archivos:**
- `src/frontend/src/components/v2/dashboard/VerifyTasksBanner.tsx:45`  
  `queryClient.invalidateQueries({ queryKey: ['notifications'] })`
- `src/frontend/src/pages/Dashboard.tsx:201`
- `src/frontend/src/pages/ActivityDetail.tsx:132`
- `src/frontend/src/pages/Tasks.tsx:568`
- `src/frontend/src/components/EventNegotiationCard.tsx:14-15`
- `src/frontend/src/hooks/useInvalidateActivity.ts:12`

**Problema:** la key `['notifications']` es prefijo de `['notifications', 'unread-count']` y `['notifications', 'list']`. React Query invalida ambas. Cuando el usuario verifica una tarea desde el banner del dashboard, esto:
1. Invalida `['notifications', 'unread-count']` → AppHeader re-fetch unread-count → bell badge cambia (OK).
2. Invalida `['notifications', 'list']` aunque el usuario no esté en /notifications. Si vuelve a esa página, todo bien. Pero si está en Notifications.tsx con `staleTime: 30_000`, esta invalidación dispara re-fetch inmediato (1 request más).

No es crítico pero es ruido. Y combinado con el botón Refresh, multiplica los requests.

**Hipótesis:** baja. Contribuye al "feel" de la app pero no al refresh visible.

**Fix:** invalidar siempre con la key específica `['notifications', 'unread-count']` o `['notifications', 'list']`.

**Esfuerzo:** S.

---

### S1 — bug en CounterOfferSheet: input se resetea cuando el server cambia `currentPoints`

**Severidad:** S1  
**Archivo:** `src/frontend/src/components/v2/activities/CounterOfferSheet.tsx:17-23`

```ts
useEffect(() => {
  if (open) {
    setPoints(String(currentPoints))   // ← sobrescribe input del usuario
    setMessage('')
    setError(null)
  }
}, [open, currentPoints])
```

**Problema:** explicado en el hallazgo S0 del sheetLock — pero independientemente del lock, este useEffect tiene una dependencia incorrecta. Si `currentPoints` cambia mientras `open=true`, se sobreescribe el input.

`currentPoints` viene de `pending.find()` en `ActivitiesBanner.tsx:62-64`, que se recalcula cuando `useActivities()` refetchea. Si el partner manda una contraoferta justo en ese momento, el `currentPoints` salta al nuevo valor y el sheet borra lo que el usuario estaba tecleando.

**Hipótesis (¿esto explica el "refresh extraño"?):** SÍ, en la pantalla de Actividades es el caso más vivo. "Estaba escribiendo y se me reseteó".

**Fix:**
```ts
useEffect(() => {
  if (open) {
    setPoints(String(currentPoints))
    setMessage('')
    setError(null)
  }
}, [open])  // ← sólo abrir/cerrar
// eslint-disable-next-line react-hooks/exhaustive-deps
```

**Esfuerzo:** XS (5min).

---

### S2 — el polling de 60s en AuthedLayout y el de 30s en Tasks coexisten

**Severidad:** S2  
**Archivos:**
- `src/frontend/src/layout/AuthedLayout.tsx:28-40` (60s, loadUserData)
- `src/frontend/src/pages/Tasks.tsx:434-439` (30s, loadData de tasks)
- `src/frontend/src/layout/AuthedLayout.tsx:48-55` (refetchInterval 30s, unread-count)

**Problema:** En la pantalla Tasks corre simultáneamente:
- Tick 30s → unread-count + tasks completos (refetch + setIsLoading)
- Tick 60s → loadUserData (auth/me + auth/couple)

Cada minuto: 4 requests. Cada 30s: 2 requests + un `setIsLoading(true)` parcial. Sumado a un partner activo y al botón refresh, da una sensación de "la app no para".

**Fix:** unificar todo en React Query. Polling como `refetchInterval` de cada query. Borrar setInterval manuales.

**Esfuerzo:** M.

---

### S2 — `apiClient.request` redirige con `window.location.href = '/login'`

**Severidad:** S2  
**Archivo:** `src/frontend/src/services/apiClient.ts:62-74`

```ts
if (response.status === 401) {
  this.clearToken()
  this.onUnauthorized?.()
  const onAuthPage = /^\/(login|signup|onboarding)/.test(window.location.pathname)
  if (!onAuthPage) {
    window.location.href = '/login'   // ← reload completo
  }
}
```

**Problema:** un único 401 reinicia la SPA entera (`window.location.href`). Pierdes:
- Estado de formularios (incluyendo CounterOfferSheet, MoodSelectorSheet, AddTaskSheet…).
- Cache de React Query.
- Scroll position.
- Cualquier mutación en curso.

Si el JWT expira a los 7 días y el usuario está activo cuando expira, la app le hace "refresh" duro con pérdida de trabajo.

Adicionalmente, si la red devuelve un 401 transitorio (server hipo, sesión revocada en otro tab), el usuario pierde TODO el contexto sin recuperación graceful.

**Hipótesis:** baja para "refresh cada 30s", pero ALTA para "refresh extraño que me sacó del flujo". Cuando pasa, es brutal.

**Fix:** usar `navigate('/login')` con react-router (state preservado) y avisar al usuario con un toast en lugar del reload.

**Esfuerzo:** S (30min) — necesita extraer un router-aware redirect del apiClient.

---

### S2 — `setOnUnauthorized` se registra en `useEffect` con cleanup que pone `null`

**Severidad:** S2  
**Archivo:** `src/frontend/src/App.tsx:111-118`

```ts
useEffect(() => {
  apiClient.setOnUnauthorized(() => {
    useAppStore.getState().reset()
    queryClient.clear()
  })
  return () => apiClient.setOnUnauthorized(null)
}, [])
```

**Problema:** dependencias vacías, registro idempotente. El cleanup que pone `null` es OK en práctica porque sólo se ejecuta al desmontar `<AppRoutes />` (nunca, en producción). Pero entre HMR/StrictMode dev: doble efecto → registra → limpia → registra. Durante el periodo de `null`, un 401 NO purgaría el store. Edge case dev-only.

**Fix:** eliminar el `return () => apiClient.setOnUnauthorized(null)` — no aporta nada.

**Esfuerzo:** XS.

---

### S2 — `useDailyPhraseState` lee `new Date()` dentro de un `useMemo([coupleId, tz])`

**Severidad:** S2  
**Archivo:** `src/frontend/src/hooks/useDailyPhraseState.ts:28-43`

```ts
return useMemo<PhraseState>(() => {
  const dow = dayOfWeek(tz)
  return {
    coupleId,
    dayKey: todayKey(tz),     // ← se evalúa en cada call inicial; useMemo lo cachea
    ...
    weekendDay: dow === 'Sat' || dow === 'Sun',
    isMonday: dow === 'Mon',
  }
}, [coupleId, tz])
```

**Problema:** menor. Si la app permanece abierta cruzando medianoche, `dayKey` queda obsoleto hasta que algo invalide el memo. No causa refresh, sólo causa que la frase del día no rote.

**Fix:** dependiendo del uso, añadir un timer que actualice una key derivada del día actual o invalidar cuando cambia el día.

**Esfuerzo:** S si se quiere arreglar.

---

### S2 — `useStreak`, `useChallenge`, `useReplays`, `useLevel` se llaman con `enabled: FLAG_ENABLED` (constante)

**Severidad:** S2  
**Archivos:** `src/frontend/src/hooks/useGamificationV2.ts:60-96`

**Problema:** estos hooks no comprueban si hay user/couple. Cuando el usuario está en /login (nunca llegan ahí porque AuthedLayout no monta Login), ok. Pero durante el bootstrap (token guardado, isLoading=true, user todavía null), se montan los hooks de Dashboard ANTES de tener user → 4 requests al backend que devolverán 401 → `apiClient` redirige a /login. ¡Boom!

Mitigado en parte porque Dashboard hace `if (!user || !couple) return null` antes de renderizar el árbol que usa estos hooks. Pero `useStreak/Challenge/Replays` se llaman ANTES del null-guard (líneas 226–228), y por orden de hooks de React eso es correcto, pero también significa que ejecutan queries con `enabled: true` aunque el user no esté listo.

Verificar si actualmente se está disparando un 401 en bootstrap. Si sí, esto es S1.

**Fix:** añadir `enabled: FLAG_ENABLED && !!user?.id && !!couple?.id` en todos.

**Esfuerzo:** XS por hook, S total (8 hooks).

---

### S2 — `Dashboard.handleComplete` invalida 6 keys: cascada visible

**Severidad:** S2  
**Archivo:** `src/frontend/src/pages/Dashboard.tsx:184-206`

**Problema:** después de `apiClient.tasks.logCompletion`, invalida 6 queries. React Query refetchea todas en paralelo. El usuario ve:
- TodayTasksSection: spinner brevemente.
- VerifyTasksBanner: spinner brevemente.
- RecentMovementsTabs: spinner brevemente.
- RedBalanceCard / BalanceLevelHero: nada (no consumen las keys invalidadas, raro).

Cuando el partner verifica desde su lado, las invalidaciones llegan al refetch del polling (no en tiempo real), pero el efecto cascada existe.

**Fix:** usar `queryClient.setQueryData` para optimistic update en `handleComplete` o reducir invalidaciones a las estrictamente necesarias (1–2 keys).

**Esfuerzo:** S.

---

### S3 — telemetria/PostHog: lazy load defensivo, sin riesgo

**Severidad:** S3  
**Archivo:** `src/frontend/src/services/telemetry.ts`

Sin VITE_POSTHOG_KEY no hace nada. Con key carga posthog-js dinámicamente. No registra listeners globales. No persiste en `localStorage` ningún flag que afecte refresh. **OK.**

---

### S3 — `useConsent` escucha `storage` events

**Severidad:** S3  
**Archivo:** `src/frontend/src/hooks/useConsent.ts:16-20`

Escucha el `storage` event para sincronizar consent entre tabs. La cookie de consent no causa refresh de queries. Cleanup OK. **No es problema**.

---

### S3 — `BottomSheet` setea `document.body.style.overflow = 'hidden'`

**Severidad:** S3  
**Archivo:** `src/frontend/src/components/v2/primitives/BottomSheet.tsx:11-20`

Restaura el overflow al cerrar. Si dos sheets se abren a la vez (caso raro), la primera al cerrarse restaura overflow:'' y la segunda queda sin scroll lock. Pero más bien es un mini-bug visual. **No causa refresh.**

---

### S3 — telemetria: `[posthog-js]` import dinámico — `posthogInstance = false` cuando no está instalado

**Severidad:** S3  
**Archivo:** `src/frontend/src/services/telemetry.ts:30-46`

`posthogInstance` se setea a `false` si el módulo no se instaló. Después se compara `if (posthogInstance !== null)` que devuelve `false` (no `null`), y `getPosthog` devuelve `null`. OK pero hace import dinámico **por cada call** la primera vez. Mínimo, no afecta.

---

### S3 — el `setInterval` de AuthedLayout no escucha cambios de `user.id`

**Severidad:** S3  
**Archivo:** `src/frontend/src/layout/AuthedLayout.tsx:28-40`

```ts
useEffect(() => {
  if (!user) return
  ...
  return () => { cancelled = true; window.clearInterval(id) }
}, [user, loadUserData])
```

Como `user` es un objeto, cualquier cambio en `user` (mood, avatar, lastSeenAt) recrea el interval → mata el viejo, crea uno nuevo. En la práctica está bien, pero si el polling cae justo entre kills se pierde un tick. Menor.

**Fix:** dependencia más estable: `[user?.id, loadUserData]`.

**Esfuerzo:** XS.

---

### S3 — `useTaskProof(logId)` con logId null tira `enabled: false` correctamente

**Severidad:** S3  
**Archivo:** `src/frontend/src/hooks/useTaskProof.ts:27`

OK, `enabled: FLAG_ENABLED && !!logId`. Bien.

---

### Notas adicionales

- `useAchievementsMap` (`hooks/useAchievementsMap.ts`) y `useGamificationStatus` (`hooks/useGamificationStatus.ts`) NO tienen `enabled: !!user`. Se llaman al renderizar y si el user no está autenticado, fallarán con 401 → redirect a /login. Mitigado por que sus consumidores son ProtectedRoute, pero sigue siendo defensivo añadirlo.
- `useShoppingList` y `useTodos` igual: sin enabled. Los consumen en Dashboard que sí tiene user-guard, OK por ahora.
- `useActivities` ídem, sin `enabled`. Lo mismo.
- `BottomSheet` añade `keydown` (Escape) globalmente. Si dos sheets están abiertas, el listener exterior cierra el primero. No es bug clave.

---

## HIPÓTESIS CONSOLIDADA

Mi mejor lectura de "el refresh es extraño" es que el usuario está viendo **al menos tres comportamientos distintos** y los está englobando en una misma queja:

### 1. Flash "Cargando…" cada ~60s en pantallas protegidas (más probable)

Causa: `useAppStore.loadUserData()` setea `isLoading=true` cuando se ejecuta en background (polling de AuthedLayout cada 60s). `ProtectedRoute` consume `isLoading` y reemplaza la pantalla entera con un spinner. v2.3.5 añadió la guarda de visibility + sheetLock al polling, pero el `isLoading` sigue siendo el mismo flag para bootstrap y para refresh-en-background. Si el usuario tiene el tab visible y NO hay sheet con lock, ve el flash.

**Confirmar:** abrir el dashboard con DevTools, hacer `useAppStore.getState().loadUserData()` desde la consola → ¿se ve el flash "Cargando…"? Si sí, hipótesis confirmada.

**Fix prioritario:** separar `isLoading` (bootstrap) de un `isRefreshing` (background). Cambio mínimo en `useAppStore.ts:121-147`. Probablemente arregla el 70% de la queja.

### 2. Spinner parcial en Tasks cada 30s

Causa: `Tasks.tsx` tiene polling propio que no respeta sheetLock y hace `setIsLoading(true)` en cada tick.

**Confirmar:** abrir /home/tasks, esperar 30s sin tocar nada → ¿se ve un spinner sobre la lista? Si sí, hipótesis confirmada.

**Fix prioritario:** migrar Tasks.tsx a React Query con `refetchInterval: 30_000`, que NO setea `isLoading` en background (sólo `isFetching`). Esto resuelve el 20% restante.

### 3. Inputs/sheets que se resetean al cambiar datos del server

Casos: CounterOfferSheet (input pierde el valor tecleado), AddTaskSheet (no es probable, sí tiene lock), MoodSelectorSheet (no acquire lock, pero como no hay input no se nota).

**Confirmar:** abrir CounterOfferSheet, esperar 30s → ¿se resetea el número? O mejor: hacer que el partner mande algo y ver el reset.

**Fix prioritario:**
- Mover `acquireSheetLock`/`releaseSheetLock` al primitive `BottomSheet`. Una línea de código blinda 8 sheets de una.
- Cambiar dependencia del useEffect de CounterOfferSheet de `[open, currentPoints]` a `[open]`.

---

### Plan de acción recomendado (orden de impacto/esfuerzo)

1. **(S0, XS)** En `BottomSheet.tsx`, añadir `acquireSheetLock`/`releaseSheetLock` dentro del useEffect de `open`. Blinda automáticamente FabActionSheet, CounterOfferSheet, PremiumInterestModal, AddActivitySheet, AddTaskSheet, AddTaskFromCatalogSheet, AddActivityTemplateSheet. **15 minutos.**
2. **(S0, S)** Añadir lock manual a MoodSelectorSheet, HeaderMenu, ConfirmDialog, LeaveCoupleWizard, DeleteAccountWizard, LevelUpModal, LogTaskModal, DisputeModal. **45 minutos.**
3. **(S0, S)** En `useAppStore.loadUserData`, separar `isLoading` (bootstrap) de `isRefreshing` (background). Cambiar la llamada de AuthedLayout. **1h.**
4. **(S1, XS)** En CounterOfferSheet, fix dependencia useEffect a `[open]`. **5min.**
5. **(S0/S1, M)** Migrar `Tasks.tsx` a React Query: borrar `loadData`/`useState`/2× `useEffect` de polling/focus. Reusar las queries `['tasks']` y `['taskLogs','all']` que ya existen. **0.5–1d.**
6. **(S1, XS)** En `AppHeader.handleRefresh`, especificar las keys a invalidar en lugar de invalidar todo. **15min.**
7. **(S1, XS)** Mover `queryClient` a `lib/queryClient.ts` para romper el ciclo App↔store. **15min.**
8. **(S2, S)** En `apiClient.request` 401 handler, usar router en lugar de `window.location.href`. **30min.**

Con sólo los pasos 1+2+3+4 (≈2h totales) deberían desaparecer las tres categorías de "refresh extraño". El resto es saneamiento.

---

### Test que confirmaría la hipótesis principal

```bash
# Antes de aplicar cambios, abrir /dashboard, abrir DevTools, pegar en Console:
setInterval(() => console.log('[loadUserData tick]', new Date().toISOString()), 1000)

# Esperar 60s → debería loguearse y aparecer el flash "Cargando..." si la hipótesis 1 es cierta.
```

Si el flash NO aparece, entonces la fuente principal NO es `loadUserData` y hay que mirar Tasks.tsx (hipótesis 2).
