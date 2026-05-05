# Auditoría Frontend Pages — Matripuntos v2.3.5

**Fecha:** 2026-05-05
**Auditor:** Claude (auditor senior FE)
**Alcance:** `src/frontend/src/pages/**/*.tsx` (19 páginas + 9 onboarding + 4 legal)
**Stack auditado:** React 18 + Vite + TS + Tailwind + Zustand + React Query + axios

## Convención de severidades

- **S0 — Crítico**: bug funcional que impide usar la feature, riesgo de pérdida de datos o de seguridad/privacidad. Hay que arreglar antes de ningún release.
- **S1 — Alto**: bug que degrada la UX visiblemente, race condition, regresión, accesibilidad rota, o trampa para el usuario.
- **S2 — Medio**: roughness UX, falta de feedback, edge case poco común, deuda técnica visible.
- **S3 — Cosmético / nice-to-have**: pequeña mejora, consistencia, naming.

Esfuerzo estimado: **XS** (5–15 min) · **S** (30–60 min) · **M** (medio día) · **L** (1+ día).

---

## Resumen ejecutivo

| Severidad | Nº hallazgos |
|---|---|
| S0 | 3 |
| S1 | 17 |
| S2 | 23 |
| S3 | 11 |
| **Total** | **54** |

Top 5 a accionar primero (por impacto/esfuerzo):

1. **S0 · Tasks.tsx** — combinación letal `useEffect+focus+visibility+setInterval(30s)` que dispara `loadData()` 3-4 veces seguidas al cambiar de pestaña, recargando el state local incluso con un sheet abierto. Es el "refresh extraño" que el usuario reportó (v2.3.5 lo intentó arreglar pero el código sigue ahí). Ver **#1**.
2. **S0 · Activities.tsx:40** — `window.alert(msg)` en producción al fallar respuesta a negociación. CLAUDE.md prohíbe popups nativos. Ver **#3**.
3. **S0 · Journal.tsx:69** — `confirm('¿Borrar esta entrada?')` nativo en página activa. Igual que el anterior. Ver **#4**.
4. **S1 · Onboarding.tsx:84-91** — `useEffect` con `// eslint-disable react-hooks/exhaustive-deps` y dependencias incompletas. Si el array `steps` cambia (ej: el partner se conecta justo en el momento), el efecto puede saltar a un step inexistente. Ver **#13**.
5. **S1 · Calendar.tsx:110-126** — `loadEvents` no usa React Query, mantiene su propio `loading/error` local y se desincroniza con `taskLogs` (que sí usa React Query). El `useEffect` depende de `year/month/loadEvents` lo que provoca refetch en cada cambio de mes sin caché. Ver **#16**.

---

## 1. Hallazgos detallados — `Tasks.tsx`

### 1.1 [S0] Triple polling + focus/visibility listener: refresh extraño confirmado

**Archivo:** `src/frontend/src/pages/Tasks.tsx`
**Líneas:** 416–439

```tsx
useEffect(() => { loadData() }, [loadData])               // mount

useEffect(() => {                                          // focus + visibility
  function onFocus() { loadData() }
  function onVisible() { if (document.visibilityState === 'visible') loadData() }
  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisible)
  return () => { ... }
}, [loadData])

useEffect(() => {                                          // setInterval 30s
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') loadData()
  }, 30_000)
  return () => clearInterval(id)
}, [loadData])
```

**Riesgo (UX/funcional):** Cuando el usuario hace alt-tab y vuelve, ambos eventos `focus` y `visibilitychange` disparan al mismo tiempo → 2× `loadData()` en paralelo + posible solape con el interval de 30s. Cada `loadData` hace `setIsLoading(true)` lo que provoca que la lista entera "parpadee" volviendo al spinner. Esto es exactamente el "refresh extraño" reportado por el usuario. v2.3.5 deshabilitó `refetchOnWindowFocus` global en React Query (App.tsx:42) pero **Tasks.tsx no usa React Query — gestiona el state con useState local**, así que la mitigación global no aplica aquí.

Adicionalmente: si el usuario tiene un `AddTaskFromCatalogSheet` o `ConfirmDialog` abierto y vuelve a la tab, `loadData` reescribe `tasks` y `allLogs`, pero el sheet sigue mostrando datos viejos (props snapshot). El sheet lock (`acquireSheetLock`/`releaseSheetLock` que se ve usado en `RequestActivity.tsx:198`) **no se está respetando aquí**.

**Fix sugerido:**
1. Migrar Tasks.tsx a React Query con `useQuery(['tasks'])` y `useQuery(['taskLogs','all'])` igual que Dashboard ya hace. Eliminar los 3 `useEffect`.
2. Si se quiere mantener polling, usar `refetchInterval: 30_000` solo cuando el sheet lock no está activo.
3. Eliminar el listener de `focus` (es redundante con `visibilitychange` y dispara doble) o usar solo uno.
4. Si seguís con state local, debounce de `loadData` para coalescer las 3 llamadas en una.

**Esfuerzo:** M

---

### 1.2 [S1] `setIsLoading(true)` en cada refresh provoca flash blanco

**Archivo:** `Tasks.tsx`
**Línea:** 380

`loadData` hace `setIsLoading(true)` siempre, incluso en refresh por focus/interval. Línea 723 muestra spinner en pantalla completa ("Cargando tareas..."). Resultado: cada 30s la lista desaparece 0.5–2s.

**Fix:** introducir `isRefreshing` local distinto de `isLoading`. Mostrar spinner solo en el primer load (`isInitialLoading`) y un indicador discreto (RefreshCw spinning en la barra) durante los refresh.
**Esfuerzo:** S

---

### 1.3 [S1] `weekNotTodayTasks` aplica filtro `isDefault` incorrecto

**Archivo:** `Tasks.tsx`
**Líneas:** 520–531

```tsx
const weekNotTodayTasks = filteredTasks.filter((t) => {
  if (!t.scheduledFor) return false
  // v1.6.3 fix QA Bug 4: misma lógica que en todayTasks — descartar
  // sugerencias inactivas del catálogo.
  if (t.isDefault && !t.scheduledFor && !t.isRecurring) return false   // ← imposible
  ...
})
```

La condición `!t.scheduledFor` ya es false en este punto (acabamos de pasar el filtro `if (!t.scheduledFor) return false`). El check `t.isDefault && !t.scheduledFor && !t.isRecurring` nunca se ejecuta. **El filtro de tareas seed sin programar no se aplica en "Esta semana"**, así que pueden aparecer si por algún motivo tienen `scheduledFor` (quizá residuo de una recurrente pausada).

**Fix:** debería ser `if (t.isDefault && !t.isRecurring) return false` o eliminar la línea (si la lógica de `todayTasks` ya cubre).
**Esfuerzo:** XS

---

### 1.4 [S1] Contador "Esta semana" hardcoded a `0/N`

**Archivo:** `Tasks.tsx`
**Línea:** 923

```tsx
<b className="text-brand-amber font-extrabold">0</b>/{weekNotTodayTasks.length}
```

El badge muestra "0/N" siempre. Debería contar las tareas semanales **ya completadas** (con log esta semana). Es una regresión visual: parece que nunca se completa nada de esta semana.

**Fix:** calcular `completedThisWeek` filtrando `allLogs` por la semana en curso y los IDs de `weekNotTodayTasks`.
**Esfuerzo:** XS

---

### 1.5 [S2] Pestaña `verificar` muerta — siempre derivada via `setFilterPersisted`

**Archivo:** `Tasks.tsx`
**Líneas:** 333, 359-368

`tab` admite valor `'verificar'` y existe rama de UI (líneas 1003-1130) pero `setFilterPersisted` solo asigna `'recurrentes'` o `'mis_tareas'`. La rama "verificar" es código muerto desde v2.3.0 (refactor canvas 15 movió la verificación al `VerifyBanner`).

**Fix:** eliminar el caso `tab === 'verificar'` (~120 LOC) o documentar por qué se mantiene.
**Esfuerzo:** S

---

### 1.6 [S2] LogTaskModal sin Escape ni focus trap

**Archivo:** `Tasks.tsx`
**Líneas:** 115-225

Modal no escucha tecla Escape (no hay `onKeyDown`), ni tiene focus trap, ni `role="dialog"` ni `aria-modal`. Lo mismo en `DisputeModal` (228-281). El backdrop (`fixed inset-0 bg-black/60`) tampoco cierra al click. Es inaccesible con teclado y hostil con lectores de pantalla.

**Fix:** envolver en `BottomSheet` o `Dialog` reusable (ya existe `ConfirmDialog`). Añadir `useEscape` hook + autoFocus al primer botón.
**Esfuerzo:** S

---

### 1.7 [S3] `console.error` no presente, pero hay botón "Borrar" sin confirmación textual

**Archivo:** `Tasks.tsx`
**Líneas:** 902-909

El botón "×" sobre cada tarea elimina con `setDeletingTask(task)` y abre `ConfirmDialog`. OK, pero el botón es 24×24px sin label visible — usuario puede pulsar por error (especialmente en mobile). El `aria-label` está pero el target es muy pequeño (mínimo recomendado 44×44 para mobile).

**Fix:** aumentar zona de touch o moverlo a un menú "..." con confirmación visible.
**Esfuerzo:** S

---

## 2. Hallazgos — `Dashboard.tsx`

### 2.1 [S2] `useEffect` del tour usa `user?.hasCompletedOnboarding` como dependencia y puede dispararse antes de `couple` cargar

**Archivo:** `Dashboard.tsx`
**Líneas:** 77-81

```tsx
useEffect(() => {
  if (user?.hasCompletedOnboarding && !hasSeenTour()) {
    setShowTour(true)
  }
}, [user?.hasCompletedOnboarding])
```

Se dispara nada más entrar al dashboard, **antes** de que `couple` haya cargado completamente. El tour funciona pero algunos selectors del tour referencian elementos que aún no están en el DOM (BalanceLevelHero render condicional según `currentXp/balance`). En sesión nueva, el tour puede empezar mientras la pantalla aún muestra `EmptyStateHero`.

**Fix:** demorar setShowTour con setTimeout 500ms, o esperar a `balance != null && gamificationStatus != null`.
**Esfuerzo:** XS

---

### 2.2 [S2] `console.error` residual

**Archivo:** `Dashboard.tsx`
**Línea:** 204

```tsx
} catch (err) {
  console.error('[Dashboard.handleComplete]', err)
}
```

`handleComplete` se traga el error silenciosamente. Si la API falla, el usuario marca la tarea, no pasa nada visible, y solo lo ve un dev en la consola. Debería mostrar un toast.

**Fix:** integrar el sistema de toast (`success/error` banners de Tasks.tsx) o invocar `usePointsBurst` con mensaje de error.
**Esfuerzo:** XS

---

### 2.3 [S2] `triggerMoodSheet` usa selector frágil `[aria-label="Mi perfil"]`

**Archivo:** `Dashboard.tsx`
**Líneas:** 217-221

```tsx
const triggerMoodSheet = () => {
  const btn = document.querySelector<HTMLElement>('[aria-label="Mi perfil"]')
  btn?.click()
}
```

Si `AuthedLayout` cambia el aria-label (es texto, no constante), el botón mood deja de funcionar silenciosamente. Patrón anti-React (DOM imperative coupling).

**Fix:** usar event bus pequeño (Zustand state `moodSheetOpen`) o ref forwarded por AuthedLayout.
**Esfuerzo:** S

---

### 2.4 [S2] `if (!user || !couple) return null` corta sin loading state

**Archivo:** `Dashboard.tsx`
**Línea:** 157

Cuando el ProtectedRoute deja pasar pero los datos aún no están en el store (race entre token-validation y dashboard mount), Dashboard renderiza `null`. La pantalla queda **completamente vacía** unos ms en vez de mostrar skeleton.

**Fix:** mostrar `<DashboardSkeleton />` o spinner. Igual problema lo tienen otras páginas (Calendar comprueba `isAuthenticated` solo).
**Esfuerzo:** S

---

### 2.5 [S2] React Query keys inconsistentes con Tasks.tsx

**Archivo:** `Dashboard.tsx`
**Líneas:** 197-202

Dashboard invalida `['tasks']` y `['taskLogs','all']`, pero Tasks.tsx no usa React Query — gestiona state local. Si el user marca tarea desde Dashboard, la página Tasks no se actualiza hasta que su intervalo de 30s o el focus listener disparen. Inconsistencia clara de fuente de verdad.

**Fix:** unificar tasks/taskLogs bajo React Query en ambas páginas (ver fix #1.1).
**Esfuerzo:** M

---

## 3. Hallazgos — `Activities.tsx`

### 3.1 [S0] `window.alert(msg)` en producción

**Archivo:** `Activities.tsx`
**Línea:** 40

```tsx
const respondMut = useMutation({
  ...
  onError: (err) => {
    const msg = err instanceof Error && err.message ? err.message : 'No se pudo completar la acción.'
    window.alert(msg)        // ← POPUP NATIVO PROHIBIDO
    invalidate()
  },
})
```

CLAUDE.md y guías de UX prohíben `alert()`/`confirm()` en producción. Bloquea el thread, rompe accesibilidad, no se puede testear con Playwright como un toast custom, y rompe la estética dark mode.

**Fix:** mostrar toast con un componente reusable o un banner inline (la página tiene espacio).
**Esfuerzo:** S

---

### 3.2 [S2] Sin loading skeleton — solo "Cargando…" plano centrado

**Archivo:** `Activities.tsx`
**Líneas:** 180, 249

```tsx
if (isLoading) return <p className="text-center text-text-secondary py-6">Cargando…</p>
```

Salto visual del layout cuando llegan datos. El resto de la app (Tasks, Notifications) usa Loader spinner.

**Fix:** componente `<ActivityListSkeleton />` con shimmer.
**Esfuerzo:** S

---

### 3.3 [S2] Tabs `active/history/catalog` no persisten en URL

Sin `useSearchParams` — si el user recarga estando en "Catálogo" cae al tab "Activas". Achievements.tsx sí lo hace bien (líneas 27-38).

**Fix:** copiar el patrón de Achievements (`searchParams.get('tab')`, `setSearchParams(next, { replace: true })`).
**Esfuerzo:** XS

---

### 3.4 [S3] `partnerName` calculado dos veces (línea 30 y dentro de `toVM`)

Refactor menor.

---

## 4. Hallazgos — `Journal.tsx`

### 4.1 [S0] `confirm('¿Borrar esta entrada?')` nativo

**Archivo:** `Journal.tsx`
**Línea:** 69

```tsx
async function deleteEntry(id: string) {
  if (!confirm('¿Borrar esta entrada?')) return
  ...
}
```

Mismo problema que Activities.tsx — popup nativo prohibido. Además al fallar el DELETE el catch está vacío `catch {}` (línea 73) — el usuario cree que se borró y no.

**Fix:** usar `ConfirmDialog` ya existente (`components/v2/primitives/ConfirmDialog`). Mostrar error en banner.
**Esfuerzo:** S

---

### 4.2 [S1] `react()` ignora errores silenciosamente

**Archivo:** `Journal.tsx`
**Líneas:** 58-66

```tsx
async function react(entryId: string, emoji: string) {
  try {
    await apiClient.request(`/journal/entries/${entryId}/react`, ...)
    queryClient.invalidateQueries(...)
  } catch {}
}
```

Si la API falla, el emoji ni se añade ni se da feedback. Usuario tap-tap-tap pensando que no funciona.

**Fix:** mostrar toast de error.
**Esfuerzo:** XS

---

### 4.3 [S1] `entry.tags` se parsea con try/catch silencioso

**Archivo:** `Journal.tsx`
**Línea:** 200

```tsx
const tags = (() => { try { return JSON.parse(entry.tags) as string[] } catch { return [] } })()
```

Si el backend envía tags como string ya y otro día como array (como ya pasa en otros endpoints), un parse falla. Trampa de tipo. El backend debería enviar siempre array, o el cliente normalizar al mapear.

**Fix:** normalizar en `useJournalEntries` hook, no en el render.
**Esfuerzo:** XS

---

### 4.4 [S2] No hay loading state visible

**Archivo:** `Journal.tsx`
**Líneas:** 76-77

```tsx
const entries = entriesQ.data?.entries ?? []
const prompt = promptQ.data?.prompt ?? null
```

Si `entriesQ.isLoading`, simplemente muestra "Aún no hay nada escrito" como empty state — confunde porque parece que se borró todo.

**Fix:** distinguir `isLoading` de `entries.length === 0`.
**Esfuerzo:** XS

---

### 4.5 [S2] Estilos hardcoded `text-white`, `text-amber-400` en lugar de tokens

Toda la página mezcla `text-white/90` y `text-text-primary`. Inconsistencia con el design system (el resto usa `text-text-primary`/`text-text-secondary`).

**Fix:** unificar con tokens `text-text-*` y `text-brand-*`.
**Esfuerzo:** S

---

## 5. Hallazgos — `Login.tsx`

### 5.1 [S2] Sin `autoFocus` en el campo email

UX standard: al cargar /login, focus en email. Aquí hay que tabular o tap. Único `autoFocus` está en Signup.tsx step2 (name).

**Fix:** `<Input ... autoFocus />` en email.
**Esfuerzo:** XS

---

### 5.2 [S2] El probe `demoAvailable` no muestra spinner

Se ve un fogonazo "Continuar con Google/Apple" y de pronto aparece un tercer botón demo. Mejor placeholder o esconder hasta que termine.

**Esfuerzo:** XS

---

### 5.3 [S3] Botón "👁" para mostrar contraseña no tiene focus visible

**Línea:** 69-77

`tabIndex={-1}` lo saca del orden de tab — accesibilidad mediocre. Y el emoji 👁 sin label visible es ambiguo.

**Fix:** usar Eye/EyeOff de lucide y hacer focusable.
**Esfuerzo:** XS

---

### 5.4 [S3] "Olvidaste tu contraseña" → mailto: en producción

**Línea:** 79-85

Solución temporal hace 3+ versiones. El usuario que no tiene mail client configurado en mobile no puede recuperar contraseña. Roadmap lo tiene como "implementaremos flow proper" — sigue pendiente.

**Esfuerzo:** L (flow completo de reset)

---

## 6. Hallazgos — `Signup.tsx`

### 6.1 [S2] `useEffect` sobre `[params]` no `[params.toString()]`

**Archivo:** `Signup.tsx`
**Línea:** 81

```tsx
useEffect(() => { ... }, [params])
```

`params` (URLSearchParams instance) cambia de identidad en cada render aunque el contenido no cambie. Provoca re-fetch del preview innecesario. Con React 18 StrictMode (probable en dev), se duplica el GET.

**Fix:** `[params.get('code')]` o memoizar.
**Esfuerzo:** XS

---

### 6.2 [S2] `step1Valid` chequea `accept && ageOk` pero error mensaje confusa

**Líneas:** 84-104

`step1Valid` requiere ambos checkboxes; sin embargo el error message de "Debes aceptar los términos" se lanza antes que "Debes confirmar 18 años o más" (línea 100-101) — orden razonable pero el botón está disabled (línea 247) entonces el user no llega a ver el error. El feedback "por qué no puedo avanzar" es ausente. Mejor mostrar un mensaje persistente bajo el form si falta algo.

**Fix:** mostrar `<ul>` de checks pendientes cerca del botón.
**Esfuerzo:** S

---

### 6.3 [S3] `preview.message` muestra un punto extra "{message}. Puedes…"

**Línea:** 198

Si `message` ya termina en punto, queda "..". Concatenación bruta.

**Esfuerzo:** XS

---

## 7. Hallazgos — `Calendar.tsx`

### 7.1 [S1] `loadEvents` se reejecuta en cada cambio de mes con loader bloqueante

**Archivo:** `Calendar.tsx`
**Líneas:** 110-126

```tsx
const loadEvents = useCallback(async () => {
  setLoading(true)
  setError(null)
  const res = await apiClient.events.getAll()
  ...
}, [])

useEffect(() => {
  if (!isAuthenticated) return
  loadEvents()
}, [isAuthenticated, loadEvents, year, month])
```

Cada vez que cambias de mes, **toda la pantalla muestra spinner** (líneas 303-307) durante el fetch, escondiendo el calendario. La query no usa React Query (sí lo usa la de logs en línea 130). Inconsistencia + UX mala.

**Fix:** migrar a `useQuery(['events','all'], ..., { staleTime: 60_000 })`. La query ya tiene los eventos; si los filtramos por mes en cliente (lo hace `MonthGrid`), un solo fetch al cargar la página basta.
**Esfuerzo:** S

---

### 7.2 [S2] `taskLogPseudoEvents` mete IDs `log-${l.id}` en el array events pero un click llama `setSelectedEvent` y abre `EventNegotiationCard` con un ID inválido

**Archivo:** `Calendar.tsx`
**Líneas:** 141-156, 437-452

El comentario dice "display-only: tapping them is disabled downstream". Pero **`MonthGrid.onSelect` recibe el día completo** y luego en `eventsOnSelected` (línea 187) sólo se filtran `events` (no pseudo) — OK. Pero en `WeekStripChart` y la sección "Próximos" (línea 411) sí se les aplica `events` puros. Hay que verificar que el `MonthGrid` no permita tapping individual de los pseudo. Si sí lo permite (parece que solo destaca el día), está bien. **Posible bug latente** si `MonthGrid` evoluciona.

**Fix:** marcar pseudo events con `_pseudo: true` y bloquear en `EventCardV2.onTap`.
**Esfuerzo:** S

---

### 7.3 [S2] `getISOWeek` y `getMondayOfWeek` definidas inline en lugar de utils compartidas

Duplicación con otros archivos (Dashboard, Tasks). `dateUtils.ts` ya existe.

**Fix:** mover.
**Esfuerzo:** XS

---

### 7.4 [S3] `currentDate.setHours(0,0,0,0)` y `setDate(1)` mutan la fecha pasada

**Líneas:** 89-93, 170-176

Patrón `new Date(currentDate); d.setDate(...)` está OK; el patrón funciona. Pero la convención del resto del código es usar funciones puras. Cosmético.

---

## 8. Hallazgos — `Onboarding.tsx`

### 8.1 [S1] `useEffect` con dependencias incompletas y `eslint-disable`

**Archivo:** `Onboarding.tsx`
**Líneas:** 84-91

```tsx
useEffect(() => {
  if (urlToken && user) {
    setData((prev) => ({ ...prev, pairMethod: 'code', pairCode: urlToken }))
    const rulesIdx = steps.indexOf('rules')
    if (rulesIdx >= 0) setStep(rulesIdx)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [urlToken, user])
```

**Riesgo:** `steps` se calcula en cada render y depende de `couple?.users.length`. Si el partner se conecta justo en el momento (cargando couple via WebSocket o re-fetch), `steps` cambia de 6 a 5 items y el efecto no se vuelve a ejecutar — el `step` puede apuntar a un índice equivocado. Adicionalmente, el deshabilitar el lint pierde la posibilidad de detectar el bug.

**Fix:** o bien incluir `steps` en deps (memoizar steps con `useMemo`), o reescribir como un `useEffect` que solo se dispare al montar y no asuma nada de `steps`.
**Esfuerzo:** S

---

### 8.2 [S1] El flujo del invitee no es resumable

Si el invitee abandona Matripuntos a mitad del `inviteeStage='avatar'`, al volver entra por `/onboarding/join/:token` pero ya no aparece `showJoinAccountFlow` (porque `user` ya existe), entonces cae en el wizard normal, que detecta `hasPartner=true` y dispara `PartnerCatchUp` (4 pasos diferentes). **Pierde el avatar y workMode.** No hay recuperación porque `inviteeStage` es solo state local.

**Fix:** persistir `inviteeStage` en localStorage o revisar si `userProfile.weeklyWorkHours == null` en mount para retomar el step específico.
**Esfuerzo:** M

---

### 8.3 [S2] `finish()` lanza 4 requests secuenciales sin transaction

**Líneas:** 102-150

```tsx
await apiClient.request('/profile/user', ...)
await apiClient.profile.updateMe({ avatarEmoji, avatarColor })
await apiClient.configuration.update({ multipliersConfig: ... })
if (... email invite) await apiClient.request('/auth/invite-partner', ...)
```

Si el request 2 falla pero el 1 ya creó el UserProfile, `hasCompletedOnboarding` queda en false (depende del backend) o en true (si /profile/user lo flipea). Si falla el 3 (configuration), el usuario queda con onboarding terminado pero sin reglas → falla el cálculo de puntos. No hay rollback ni mensaje claro.

**Fix:** o backend en transaction (un endpoint `/onboarding/complete` que haga todo atómico) o mostrar al usuario qué paso falló y dejarle reintentar.
**Esfuerzo:** M

---

### 8.4 [S2] `// TODO: persist categories when backend supports it`

**Línea:** 137

Las categorías que el usuario escoge en `StepCategories` no se persisten a backend — comentario abandonado. El usuario configura algo que no tiene efecto. UX deceptiva.

**Fix:** o hacer la integración (probablemente al endpoint `/api/categories`) o eliminar el step.
**Esfuerzo:** M

---

### 8.5 [S2] `nav('/dashboard')` cuando `user.hasCompletedOnboarding` puede causar bucle

**Líneas:** 94-96

```tsx
useEffect(() => {
  if (user?.hasCompletedOnboarding) nav('/dashboard')
}, [user?.hasCompletedOnboarding, nav])
```

ProtectedRoute (App.tsx:55) si llega a /onboarding con `couple==null && !hasCompletedOnboarding` envía a /onboarding. Si tras `finish()` el couple aún no está cargado pero `hasCompletedOnboarding=true`, este useEffect manda a /dashboard, ProtectedRoute manda de vuelta, etc. La línea 140-143 hace `loadUserData()` antes de navegar para mitigar — pero si el load falla (`.catch(() => {})`), hay riesgo.

**Esfuerzo:** S

---

## 9. Hallazgos — `RequestActivity.tsx`

### 9.1 [S2] El cálculo de puntos client-side duplica lógica del backend (deuda)

**Archivo:** `RequestActivity.tsx`
**Líneas:** 37-90

Hay un comentario explícito: "ONLY for live UI preview... If backend changes, update here so the preview matches, or (better) drive this via a debounced call to /api/points/preview". La deuda sigue. Cambia el factor noche en backend → preview en pantalla queda incoherente con el coste real.

**Fix:** endpoint `/api/points/preview` debounceado o compartir lógica vía paquete shared (existe `src/shared/`).
**Esfuerzo:** L

---

### 9.2 [S2] No valida que `dateStart` no sea pasado

`startDate` puede ser cualquier fecha (incluido 2020-01-01). Backend supuestamente permite pasados. UX cuestionable: pedir un evento del año pasado no tiene sentido. No hay `min={today}` en el input.

**Fix:** `<input type="date" min={today} ...>` con ayuda visual.
**Esfuerzo:** XS

---

### 9.3 [S2] `handleJump(target)` sin validación específica del paso 3

Líneas 319-332 — al saltar al paso 3 valida 1 y 2 pero no necesita validar 3. OK. Pero si el user salta a 2 con un step 1 incompleto, el error queda en `submitError` global (línea 322). Funcional pero el error message dura solo en el primer ciclo.

**Esfuerzo:** XS

---

### 9.4 [S3] El campo "title" placeholder usa `selectedSub?.name` antes de seleccionar

**Línea:** 534

`Ej: ${selectedCat.emoji} ${selectedSub?.name || selectedCat.name}` — si selectedSub es undefined, queda "Ej: 🍻 Salida" que está bien.

---

## 10. Hallazgos — `Settings.tsx`

### 10.1 [S1] `alert(err?.message)` en exportar datos

**Archivo:** `Settings.tsx`
**Línea:** 786

```tsx
} catch (err: any) {
  alert(err?.message ?? 'No pudimos exportar tus datos')
}
```

Mismo problema S0 — alert nativo. Pero como es un fallback de error poco común, lo bajo a S1.

**Fix:** Banner local en la sección.
**Esfuerzo:** XS

---

### 10.2 [S1] `LeaveCoupleWizard` redirige con `window.location.href = '/dashboard'` (full reload)

**Línea:** 401

```tsx
onLeft={() => {
  setUnlinkOpen(false)
  window.location.href = '/dashboard'
}}
```

Comentario propio reconoce que es un workaround para "forzar re-fetch". Rompe estado de React Query y la SPA. UX lenta (white flash).

**Fix:** invalidar todas las queries (`queryClient.clear()`), llamar `loadUserData()` y `nav('/dashboard')`.
**Esfuerzo:** S

---

### 10.3 [S2] `NotificationsSection.update` no hace optimistic update

**Líneas:** 486-500

Cada toggle hace PUT y luego `queryClient.setQueryData`. El usuario ve el toggle moverse instantáneamente (porque `setQueryData` se llama tras el await), pero **si el await tarda 800ms en Render**, el toggle parece roto.

**Fix:** `useMutation` con `onMutate` para optimistic update + rollback en error.
**Esfuerzo:** S

---

### 10.4 [S2] `update` (NotificationsSection) no maneja errores

Si la red falla, el setQueryData no llega y el toggle no se mueve. Sin feedback de error.

**Fix:** try/catch + Banner.
**Esfuerzo:** XS

---

### 10.5 [S2] `digestHour` toma valor `prefs.digestHour ?? '20:30'` pero el toggle "Activado" usa `!!prefs.digestEnabled`

Si `digestEnabled=false`, el time picker sigue editable. UX inconsistente — debería estar disabled.

**Esfuerzo:** XS

---

### 10.6 [S2] `ChildrenSection.handleSave` usa `await refetch()` sin invalidar otras queries

**Líneas:** 909-915

Cuando añades un hijo afecta cálculo de puntos, pero no invalida `['gamification','status']`, `['balance']`, `['settings-children-count']`. La row Hijos del index sigue mostrando el count viejo.

**Fix:** invalidar las queries relevantes.
**Esfuerzo:** XS

---

### 10.7 [S2] `DoubleConfirmModal` no escucha Escape

Solo cierra clickando backdrop o "Cancelar".

**Esfuerzo:** XS

---

### 10.8 [S3] Sección `LanguageThemeSection` tiene 2 placeholders "Próximamente"

Si la sección no aporta nada, mejor esconderla del index hasta tener algo. Hoy es ruido.

**Esfuerzo:** XS

---

## 11. Hallazgos — `Achievements.tsx`

### 11.1 [S2] Error/empty state cuando `map` falla no se muestra

**Líneas:** 40-44, 114-116

```tsx
const { data: map, isLoading } = useQuery(...)
...
{isLoading && <p>Cargando logros...</p>}
{!isLoading && tab === 'badges' && (...)}
```

Si la query devuelve error, `map` es undefined y `nodes = []`. La UI muestra "Aún no has desbloqueado ningún logro" como si fuera vacío real. Sin banner de error.

**Fix:** chequear `error` y mostrar mensaje + retry.
**Esfuerzo:** XS

---

## 12. Hallazgos — `Notifications.tsx`

### 12.1 [S2] `formatWhen` usa `Date.now()` no reactivo

**Línea:** 47-59

Si la página queda abierta 5 min, las notificaciones siguen mostrando "hace 1 min" — no se rerenderiza. Aceptable pero llamativo.

**Fix:** `useEffect(() => { const id = setInterval(forceUpdate, 60_000); ...})`.
**Esfuerzo:** XS

---

### 12.2 [S2] `markOne.mutate(n.id)` en `handleOpen` no espera. Si la nav es rápida, puede cancelarse

**Línea:** 107

Funcional gracias a React Query (la mutación se completa en background) pero si Notifications pierde el QueryClientProvider en navegación rápida, hay riesgo.

**Esfuerzo:** XS

---

### 12.3 [S2] Botón "Marcar todas" en header no aparece si `unread === 0` — pero hay items con `branch='other'` ocultos

Si el usuario tiene 3 leídas + 2 sin leer en `branch=other`, el filtro "Otras" muestra solo `count > 0` (línea 150 `.filter((t) => t.id === 'all' || t.count > 0)`). Edge case: si todas las notifs son de 'other' y hay 0 unread (todas leídas), el filtro "Otras" aparece pero "Marcar todas" no. Comportamiento esperado, pero el copy "Estás al día" cuando hay items aunque leídas confunde.

**Esfuerzo:** XS

---

## 13. Hallazgos — `ActivityDetail.tsx`

### 13.1 [S1] `useEffect` setea `counterPoints` solo en mount inicial con `eslint-disable`

**Líneas:** 93-100

```tsx
useEffect(() => {
  if (event) {
    setCounterPoints(Number(event.pointsCalculated || event.pointsBase))
  }
}, [event?.id])
```

Si la actividad cambia (`event.pointsCalculated` actualizado por una contraoferta del partner mientras estás en la pantalla), `counterPoints` no se actualiza — el user ve un valor desfasado en su input. Solo se sincroniza cuando cambia `event.id`.

**Fix:** sincronizar también con `event.pointsCalculated` cuando el user no haya tocado el input. Necesita un flag `userTouched`.
**Esfuerzo:** S

---

### 13.2 [S2] `handleBack` chequea `window.history.state.idx` — hack frágil

**Líneas:** 87-90

```tsx
const idx = (window.history.state && (window.history.state as { idx?: number }).idx) ?? 0
if (idx > 0) navigate(-1)
else navigate('/home/activities')
```

Funciona en react-router v6, pero `idx` no es API pública. Una actualización de react-router puede romper esto silenciosamente.

**Fix:** usar `useLocation().key !== 'default'` o similar.
**Esfuerzo:** XS

---

### 13.3 [S2] No invalida `['activities', ...]` queries tras la acción

**Línea:** 127-137

`invalidateAfterAction` invalida `['events','all']` y `['events',id]` pero `useActivities` hook (Activities.tsx) usa otra key. Si vienes de Activities.tsx, ejecutas accept en ActivityDetail, vuelves atrás, la lista no refresca.

**Fix:** revisar `useActivities` y añadir su key aquí.
**Esfuerzo:** XS

---

### 13.4 [S3] `EventStatusPill` repite mapping con `statusLabel/statusTone` de Activities.tsx

Duplicación.

**Esfuerzo:** XS

---

## 14. Hallazgos — `AnalyticsPage.tsx`

### 14.1 [S2] Página casi vacía — solo wrapper

**Archivo:** `AnalyticsPage.tsx` (15 líneas)

Es un componente de 1 propósito (renderizar `AnalyticsDashboard`). Existe Analytics.tsx que es la página real. AnalyticsPage está montada en `/analytics/advanced` (App.tsx:256-262). Confusión naming. El componente `AnalyticsDashboard` parece legacy (v1.4 o anterior).

**Fix:** verificar si `AnalyticsDashboard` se usa todavía o es código muerto. Si se mantiene, renombrar a `AnalyticsAdvancedPage`.
**Esfuerzo:** S

---

## 15. Hallazgos — `Home.tsx`

### 15.1 [S3] Ruta intermedia que solo redirige

**Archivo:** `Home.tsx`

Lee localStorage y navega. OK pero el `<span data-testid="home-redirecting-to" style={{ display: 'none' }}>` flashea como pixel oculto. Solo es para tests.

Es aceptable. No action.

---

## 16. Hallazgos — `NotFound.tsx`

### 16.1 [S3] La sugerencia "Negociar" lleva a `/request-inbox`

**Línea:** 7

```tsx
{ icon: MessageSquare, label: 'Negociar', to: '/request-inbox' }
```

`/request-inbox` redirige a `/home/activities` (App.tsx:164). Funcional pero pasa por dos navegaciones. Mejor link directo.

**Esfuerzo:** XS

---

## 17. Hallazgos — `ShoppingListPage.tsx`

### 17.1 [S2] Muta sin invalidación cruzada con Dashboard QuickPreviews

`pendingShopping` de Dashboard.tsx se calcula con `shoppingData?.active?.items.filter(...)` (línea 162). Si esa query no se invalida tras toggle/add/delete aquí, Dashboard muestra count antiguo.

**Fix:** verificar que `['shopping']` ya invalida la query de Dashboard. Probablemente sí, pero confirmar key consistency.
**Esfuerzo:** XS

---

### 17.2 [S3] `confirmArchive` es state UI inline, no modal

OK pero rompe consistencia con el resto (todos los confirms son modales). Funcional aceptable.

---

## 18. Hallazgos — `TodoListPage.tsx`

### 18.1 [S2] El filtro "Compartidos con pareja" no marca cuál es de cada uno cuando ambos están

Visual: dos secciones "Creados por ti" / "Creados por tu pareja" pero el order intra-grupo es por createdAt, sin badge cuando un mismo to-do está mezclado entre dueDate.

**Esfuerzo:** XS

---

### 18.2 [S3] `Segment` redefinido localmente (línea 395-432) — mismo componente que Tasks.tsx

Duplicación. Mover a `components/v2/primitives/Segment`.

**Esfuerzo:** S

---

## 19. Hallazgos — Onboarding sub-pages

### 19.1 [S1] `LegalPage.tsx` dynamic import puede fallar silencioso en producción

**Archivo:** `pages/legal/LegalPage.tsx`
**Líneas:** 21-26

```tsx
import(/* @vite-ignore */ `../../../../../docs/legal/${slug}.md?raw`)
  .then((m: any) => setContent(m.default ?? 'No se pudo cargar.'))
  .catch(() => setContent('No se pudo cargar el documento. Contacta soporte.'))
```

La ruta `../../../../../docs/legal/` llega fuera de `src/frontend/src` — depende de que el build de Vite incluya esos archivos. Si el deploy no copia `/docs` o el bundler en producción no resuelve ese template literal con `?raw`, **todos los enlaces legales muestran "No se pudo cargar"**. GDPR/legal exige tener los textos accesibles.

**Fix:** mover los markdowns a `src/frontend/src/legal/*.md` con import estático por slug, o servirlos desde el backend `/api/legal/:slug`.
**Esfuerzo:** S

---

### 19.2 [S1] `OnboardingLanding` usa estilos inline con `var(--matri-*)` cuando el resto usa Tailwind tokens

**Archivo:** `pages/onboarding/OnboardingLanding.tsx`

Es la primera pantalla que ven los nuevos usuarios — y es la única que no respeta el design system (`text-text-primary`, `bg-surface-base`, etc.). Las CSS vars `--matri-*` pueden no estar definidas en el actual tailwind.config (solo viven en App.css legado).

**Riesgo:** colores incorrectos en producción.

**Fix:** reescribir con tokens de Tailwind (Login.tsx es buena referencia).
**Esfuerzo:** S

---

### 19.3 [S2] `StepRules` no muestra preview del impacto en puntos

El user mueve "+" para subir nightMult de 1.5 a 1.6 sin saber qué efecto tiene. Sería trivial mostrar un ejemplo: "Una tarea de 10 pts a las 23h pasa a costar X pts".

**Esfuerzo:** S

---

### 19.4 [S2] `StepCategories` permite duplicar custom con misma key (caso edge)

**Línea:** 25-49

`customKey('Cocina')` = `custom:cocina`, pero `cocina` (default) ya tiene la key `cocina`. Si el user pone "Cocina" como custom, no detecta colisión con la default — termina con dos categorías "cocina" visualmente parecidas (una con ✨ y otra con 🍳).

**Fix:** comparar tras normalizar default keys también.
**Esfuerzo:** XS

---

### 19.5 [S2] `StepInviteeWork` no es opcional en realidad

El botón "Saltar" (línea 55) llama `onSkip()` que en Onboarding.tsx (líneas 196-198) hace `nav('/dashboard')` — pero **no persiste workMode**. Resultado: el invitado salta y queda con `weeklyWorkHours=null`, lo que el calculator manejará como 0 o undefined → puntos potencialmente mal calculados.

**Fix:** o forzar el step (no opcional) o asignar default 40h presencial al saltar.
**Esfuerzo:** XS

---

### 19.6 [S2] `StepJoinAccount` `info` puede quedar en null + tokenError null + loadingInfo false

**Líneas:** 119-142

Estado posible: `loadingInfo=false`, `info=null`, `tokenError=null` (si la promise resolvió pero `res?.invitation` era falsy y NO se setea `tokenError`). Línea 142 `if (!info) return null` → pantalla en blanco sin error visible.

Edge: línea 41-43 sí setea `tokenError` si `!res?.invitation`. OK, parece cubierto. Pero la lógica es frágil — depende de que el backend siempre devuelva un objeto u otro.

**Fix:** consolidar lógica de "no se pudo cargar" en un solo state.
**Esfuerzo:** XS

---

### 19.7 [S3] `PartnerCatchUp` step 4 delay para confeti no llega

**Líneas:** 309-337

El step 4 tiene un emoji 🎉 grande pero no hay confeti animado real (se anuncia en el comentario `// Welcome (confeti + tip)`). Falsa promesa.

**Esfuerzo:** XS

---

## 20. Hallazgos transversales

### 20.1 [S1] No hay error boundary global

Si cualquier página lanza un error de render no atrapado, la app entera se rompe a página blanca. No hay `<ErrorBoundary>` en `App.tsx`.

**Fix:** envolver `<Routes>` en un ErrorBoundary que muestre fallback con botón "Reportar" + "Volver al dashboard".
**Esfuerzo:** S

---

### 20.2 [S1] Login/Signup/legal NO tienen guard "ya autenticado → /dashboard"

Si el user está logueado y va a `/login`, ve la pantalla de login. Puede inducir a relogin innecesario o confusión.

**Fix:** añadir `if (isAuthenticated) return <Navigate to="/dashboard" />` en Login y Signup.
**Esfuerzo:** XS

---

### 20.3 [S2] `staleTime` inconsistente entre páginas

- Dashboard: 60_000 (tasks, taskLogs), 5min (recentActivity)
- Calendar: 60_000 (taskLogs)
- Achievements: 30_000 (map)
- Notifications: 30_000

Sin tabla común — algunos hooks tienen `staleTime: 60s`, otros usan default global (5 min). Desincroniza UX (un user marca tarea, otra pestaña tarda 5 min en verlo). Documentar política o estandarizar.

**Esfuerzo:** S

---

### 20.4 [S2] `aria-modal`/`role=dialog` ausente en TODOS los modales custom

LogTaskModal, DisputeModal, DoubleConfirmModal, ChildFormModal — ninguno declara role/aria. Lectores de pantalla los anuncian como contenido normal.

**Fix:** patrón estándar `role="dialog" aria-modal="true" aria-labelledby={titleId}`.
**Esfuerzo:** M (todos)

---

### 20.5 [S2] No hay manejo unificado de "Render cold start"

Tasks.tsx tiene retries manuales (líneas 384-409). Otras páginas no — primer fetch en mañana fría retorna error de red y muestra empty state. Pasa especialmente en Dashboard, Calendar, Activities.

**Fix:** retries con backoff a nivel `apiClient` o React Query `retry: 3`.
**Esfuerzo:** S

---

### 20.6 [S2] `safe-area-inset-bottom` solo se ve en BottomNav (componente externo)

Las páginas usan `pb-6` o `pb-24` arbitrarios. En iPhone con notch + BottomNav puede solaparse contenido. Verificar `AuthedLayout` lo cubre — pero NotFound, Login, Signup, Onboarding no van por AuthedLayout y pueden quedar comidas por la home indicator.

**Fix:** Tailwind plugin `pb-[env(safe-area-inset-bottom)]` o utility `pb-safe`.
**Esfuerzo:** S

---

### 20.7 [S2] `useEffect` en App.tsx HomeShell dispara escritura localStorage en cada render

**Archivo:** `App.tsx`
**Línea:** 91-93

```tsx
useEffect(() => {
  window.localStorage.setItem('home_last_selector', view)
}, [view])
```

OK gracias a la dep array. Pero si `view` se setea por primera vez al mismo valor que ya estaba, escribe igual. Mínimo perf hit.

**Esfuerzo:** XS

---

### 20.8 [S3] Mezcla de `useNavigate` con `<Link>` y con `window.location.href`

Settings.tsx:401 usa `window.location.href`. Tres patrones distintos para navegar. Estandarizar.

**Esfuerzo:** XS

---

### 20.9 [S3] Tests presentes pero antiguos

`Activities.test.tsx`, `ActivityDetail.test.tsx`, `Home.test.tsx`, `StepInviteeAvatar.test.tsx`, `StepInviteeWork.test.tsx` existen. No los he leído, pero la fecha (Apr 22 / May 2) y el refactor v2.3.0+ posterior sugieren tests desactualizados. A revisar en otra auditoría (tests).

---

## Lista corta — los 12 fixes con mayor ROI

Ordenados por prioridad (S0/S1 → S2/S3 + esfuerzo bajo):

| # | Severidad | Archivo | Fix | Esf |
|---|---|---|---|---|
| 1 | S0 | Tasks.tsx | Migrar a React Query y eliminar focus/visibility/setInterval triple polling | M |
| 2 | S0 | Activities.tsx:40 | Reemplazar `window.alert` por toast/banner | S |
| 3 | S0 | Journal.tsx:69 | Reemplazar `confirm()` por `ConfirmDialog` | S |
| 4 | S1 | Onboarding.tsx:84 | Memoizar `steps` y eliminar eslint-disable | S |
| 5 | S1 | Calendar.tsx:110 | Migrar `loadEvents` a React Query | S |
| 6 | S1 | Settings.tsx:401 | Reemplazar `window.location.href` por nav + invalidate | S |
| 7 | S1 | LegalPage.tsx:23 | Servir markdown desde fuente segura (no relative path 5 niveles) | S |
| 8 | S1 | OnboardingLanding.tsx | Reescribir con tokens Tailwind | S |
| 9 | S1 | App.tsx | Añadir ErrorBoundary global | S |
| 10 | S1 | Login.tsx, Signup.tsx | Añadir guard "ya autenticado → /dashboard" | XS |
| 11 | S2 | Tasks.tsx | Quitar pestaña `verificar` muerta (~120 LOC) | S |
| 12 | S2 | Tasks.tsx:923 | Calcular contador "Esta semana" real (no hardcoded 0/N) | XS |

---

## Notas finales

- El refactor v2.3.0+ (canvas 15) en `Tasks.tsx` ha consolidado bastante UI pero ha **dejado código muerto** (la rama `tab === 'verificar'`) y **no ha tocado el polling** que es la causa raíz del "refresh extraño". v2.3.5 sólo desactivó `refetchOnWindowFocus` global de React Query — pero Tasks.tsx ni siquiera usa React Query.
- Onboarding del invitee es el flujo más complejo y frágil. **No es resumable** (#19.5, #8.2) y depende de orden estricto. Vale la pena un test e2e.
- Privacy/legal páginas dependen de un import dynamic que **puede romperse en build de producción**. Verificar manualmente que los .md llegan al bundle.
- El sistema de modales es heterogéneo: `BottomSheet`, `ConfirmDialog`, `DoubleConfirmModal`, modales inline en Tasks/Journal. Estandarizar daría mejora grande de accesibilidad y consistencia.
- La auditoría no cubrió componentes V2 (`components/v2/...`) que albergan bastante lógica (HeaderStrip, MPTabs, etc.) — son consumidos por las páginas pero su comportamiento interno queda fuera de este alcance.

**Total páginas auditadas:** 19 + 9 onboarding + 4 legal = **32 archivos**
**Líneas de código revisadas:** ~5800
**Hallazgos:** 54 (3 S0, 17 S1, 23 S2, 11 S3)
