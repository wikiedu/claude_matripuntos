# Módulo Hogar · Actividades — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a las Actividades un lugar visible (pestaña "Hogar" con selector TAREAS/ACTIVIDADES), un banner accionable en el Dashboard y un módulo propio con Activas + Historial filtrable. Sin tocar el backend. Paralelo al setup de tests frontend con Vitest.

**Architecture:** Nueva pestaña "Hogar" que agrupa `Tasks.tsx` (existente) y `Activities.tsx` (nueva). El detalle de actividad se extrae de `RequestInbox.tsx` a `ActivityDetail.tsx` antes de construir nada nuevo. Una sola query `['events', 'all']` alimenta banner + Activas + Historial, derivada en cliente. Refactor en 5 fases mergeable por separado; todas las rutas viejas redirigen a las nuevas.

**Tech Stack:** React 18 + TypeScript + Vite · React Router v6 · TanStack Query v5 · Tailwind (tokens v2) · Lucide · **Vitest + @testing-library/react + jsdom** (NUEVO). Backend intacto (Express + Prisma).

**Spec:** `docs/superpowers/specs/2026-04-21-actividades-module-design.md`

**Convenciones del plan:**
- Working dir para comandos: `src/frontend/` (salvo que se indique).
- Todos los imports usan rutas relativas al archivo que los contiene.
- Commits con prefijo `feat(actividades):`, `refactor(actividades):`, `test(actividades):`, `chore(frontend):`.
- Cada tarea termina en commit; no hay PRs intermedios.
- Fases 1-5 son mergeables a `main` por separado tras su último commit.

---

## File Structure

**Nuevos archivos (config/tests):**
```
src/frontend/vitest.config.ts                      (Fase 0)
src/frontend/src/test/setup.ts                     (Fase 0)
src/frontend/src/test/renderWithProviders.tsx      (Fase 0 · helper RTL)
```

**Nuevos archivos (código):**
```
src/frontend/src/pages/
  Home.tsx                                         (Fase 2)
  Activities.tsx                                   (Fase 3)
  ActivityDetail.tsx                               (Fase 1)

src/frontend/src/components/v2/home/
  HomeSelector.tsx                                 (Fase 2)

src/frontend/src/components/v2/activities/
  ActivityActionCard.tsx                           (Fase 3)
  ActivityWaitingCard.tsx                          (Fase 3)
  HistoryFilters.tsx                               (Fase 3)
  CounterOfferSheet.tsx                            (Fase 4)

src/frontend/src/components/v2/dashboard/
  ActivitiesBanner.tsx                             (Fase 4)
  RecentMovementsTabs.tsx                          (Fase 4)

src/frontend/src/hooks/
  useActivities.ts                                 (Fase 3 · query + derivaciones)
  useInvalidateActivity.ts                         (Fase 3 · helper invalidación)
```

**Archivos modificados:**
```
src/frontend/package.json                          (Fase 0 · scripts + deps)
src/frontend/tsconfig.json                         (Fase 0 · include vitest types)
src/frontend/src/App.tsx                           (Fase 2 · rutas /home/*)
src/frontend/src/components/v2/layout/BottomNav.tsx (Fase 2 · Tareas→Hogar)
src/frontend/src/pages/Dashboard.tsx               (Fase 4 · banner + tabs movimientos)
src/frontend/src/pages/RequestActivity.tsx        (Fase 2 · redirect post-submit)
src/frontend/src/pages/RequestInbox.tsx           (Fase 1+3+5 · se adelgaza y finalmente se borra)
```

**Archivos eliminados:**
```
src/frontend/src/pages/RequestInbox.tsx           (Fase 5)
src/frontend/src/components/v2/dashboard/RecentMovements.tsx  (Fase 5 · reemplazado por RecentMovementsTabs)
```

---

# FASE 0 — Setup de Vitest + RTL

**Objetivo:** Dejar el frontend listo para escribir tests. Ningún cambio de UX.

**Mergeable:** Sí. `npm run test` pasa con un test smoke trivial.

---

### Task 0.1: Instalar dependencias de testing

**Files:**
- Modify: `src/frontend/package.json`

- [ ] **Step 1: Instalar devDependencies**

Desde `src/frontend/`:

```bash
npm install -D \
  vitest@^1.6.0 \
  @vitest/ui@^1.6.0 \
  @testing-library/react@^14.3.0 \
  @testing-library/jest-dom@^6.4.0 \
  @testing-library/user-event@^14.5.0 \
  jsdom@^24.0.0
```

Expected: `npm` termina sin errores. `package.json` tiene las 6 nuevas entradas en `devDependencies`.

- [ ] **Step 2: Añadir scripts de test**

Editar `src/frontend/package.json` bloque `"scripts"` para que quede exactamente:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint src --ext ts,tsx",
  "type-check": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/package.json src/frontend/package-lock.json
git commit -m "chore(frontend): install vitest + react testing library"
```

---

### Task 0.2: Configurar Vitest

**Files:**
- Create: `src/frontend/vitest.config.ts`
- Create: `src/frontend/src/test/setup.ts`
- Modify: `src/frontend/tsconfig.json`

- [ ] **Step 1: Crear vitest.config.ts**

Contenido exacto:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.d.ts', 'src/test/**', '**/*.config.*'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Crear src/test/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  // localStorage is shared across tests in jsdom; reset between tests
  // to avoid HomeSelector persistence bleed-over.
  window.localStorage.clear()
})
```

- [ ] **Step 3: Incluir tipos de Vitest en tsconfig**

Editar `src/frontend/tsconfig.json`. Si el campo `types` existe en `compilerOptions`, añadir `"vitest/globals"` al array. Si no existe, añadirlo:

```json
"compilerOptions": {
  "types": ["vitest/globals", "@testing-library/jest-dom"]
}
```

Luego añadir `src/test/**/*` al `include` si todavía no está cubierto por el patrón `src`.

- [ ] **Step 4: Smoke test**

Crear `src/frontend/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('jsdom + vitest work', () => {
    const el = document.createElement('div')
    el.textContent = 'hola'
    expect(el.textContent).toBe('hola')
  })
})
```

- [ ] **Step 5: Ejecutar**

```bash
cd src/frontend && npm run test
```

Expected: 1 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/vitest.config.ts src/frontend/src/test/setup.ts src/frontend/src/test/smoke.test.ts src/frontend/tsconfig.json
git commit -m "chore(frontend): configure vitest with jsdom + testing-library setup"
```

---

### Task 0.3: Helper `renderWithProviders`

**Files:**
- Create: `src/frontend/src/test/renderWithProviders.tsx`

El helper envuelve React Query + MemoryRouter para que los tests de páginas/componentes no repitan boilerplate.

- [ ] **Step 1: Crear el helper**

```tsx
import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  route?: string                    // p.ej. "/home/activities/abc"
  path?: string                     // p.ej. "/home/activities/:id" — cuando el componente usa useParams
  queryClient?: QueryClient
}

export function renderWithProviders(ui: ReactElement, opts: Options = {}) {
  const {
    route = '/',
    path,
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    }),
    ...rtlOpts
  } = opts

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        ) : (
          children
        )}
      </MemoryRouter>
    </QueryClientProvider>
  )

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...rtlOpts }) }
}
```

- [ ] **Step 2: Smoke de renderWithProviders**

Añadir al final de `src/frontend/src/test/smoke.test.ts`:

```ts
import { renderWithProviders } from './renderWithProviders'
import { useNavigate } from 'react-router-dom'

function Ping() {
  const nav = useNavigate()
  return <button onClick={() => nav('/x')}>ok</button>
}

describe('renderWithProviders', () => {
  it('provides router + query client', () => {
    const { getByRole } = renderWithProviders(<Ping />, { route: '/' })
    expect(getByRole('button', { name: 'ok' })).toBeInTheDocument()
  })
})
```

Cambiar la extensión del archivo a `.tsx` si no lo es ya: `src/frontend/src/test/smoke.test.tsx`. Actualizar el `include` del vitest.config si hiciera falta (el patrón `{ts,tsx}` ya lo cubre).

- [ ] **Step 3: Ejecutar**

```bash
cd src/frontend && npm run test
```

Expected: 2 passed, 0 failed.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/test/renderWithProviders.tsx src/frontend/src/test/smoke.test.tsx
git rm src/frontend/src/test/smoke.test.ts 2>/dev/null || true
git commit -m "test(frontend): add renderWithProviders helper for RTL"
```

---

# FASE 1 — Extracción de `ActivityDetail`

**Objetivo:** Sacar el bloque `if (selectedEvent)` de `RequestInbox.tsx` a `ActivityDetail.tsx` **sin cambios visibles**. `RequestInbox` sigue funcionando; el detalle se abre por ruta `/home/activities/:id` (nueva) y por estado interno de `RequestInbox` (legacy, igual que antes).

**Mergeable:** Sí. Usuarios siguen viendo la misma UI.

---

### Task 1.1: Estudiar `RequestInbox.tsx`

**Files:**
- Read: `src/frontend/src/pages/RequestInbox.tsx` (todo)

- [ ] **Step 1: Identificar el bloque a extraer**

Localizar el rango que arranca en la rama `if (selectedEvent)` del `return` y termina justo antes de la rama con los tabs. Anotar en un papel:
- Props que consume del componente padre (`selectedEvent`, `onBack`, `onAccept`, `onReject`, `onCounter`, `onForce`, estado local de contraoferta).
- Queries que usa (`['events', id]` o similar).
- Mutaciones que dispara (`apiClient.negotiations.respond`, `apiClient.negotiations.force`).

No se modifica código todavía. Se cierra el paso con un `grep` de verificación:

```bash
grep -n "selectedEvent" src/frontend/src/pages/RequestInbox.tsx | head -40
```

---

### Task 1.2: Crear `ActivityDetail.tsx` con la misma firma funcional

**Files:**
- Create: `src/frontend/src/pages/ActivityDetail.tsx`
- Test: `src/frontend/src/pages/ActivityDetail.test.tsx`

- [ ] **Step 1: Escribir test que falla**

Primero un test mínimo que comprueba que la página renderiza el título y un botón "Volver" cuando la actividad se carga. Mockeamos `apiClient.events.getById`.

```tsx
// src/frontend/src/pages/ActivityDetail.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: {
      getById: vi.fn(async () => ({
        event: {
          id: 'e1',
          type: 'cena',
          title: 'Cena con amigos',
          dateStart: '2026-05-01T21:00:00.000Z',
          dateEnd: '2026-05-01T23:00:00.000Z',
          pointsBase: '12',
          pointsCalculated: '15',
          status: 'pending',
          negotiationRound: 1,
          maxFreeRounds: 2,
          creator: { id: 'u1', name: 'Eduardo' },
          negotiations: [],
        },
      })),
    },
    negotiations: {
      respond: vi.fn(),
      force: vi.fn(),
    },
  },
}))

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me', name: 'Blanca' }, couple: { id: 'c1' } }),
}))

beforeEach(() => vi.clearAllMocks())

describe('ActivityDetail', () => {
  it('renders title from loaded event', async () => {
    const { default: ActivityDetail } = await import('./ActivityDetail')
    renderWithProviders(<ActivityDetail />, {
      route: '/home/activities/e1',
      path: '/home/activities/:id',
    })
    await waitFor(() => expect(screen.getByText('Cena con amigos')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Ejecutar el test y verificar fallo**

```bash
cd src/frontend && npm run test -- ActivityDetail
```

Expected: FAIL — "Cannot find module './ActivityDetail'".

- [ ] **Step 3: Crear `ActivityDetail.tsx`**

Abrir `src/frontend/src/pages/RequestInbox.tsx`, copiar **todo el bloque `if (selectedEvent) { … }` incluida toda su lógica local** (estado de contraoferta, handlers, JSX) a un nuevo archivo `src/frontend/src/pages/ActivityDetail.tsx`. Adaptaciones mínimas:

- El nuevo componente **no recibe `selectedEvent` por props**: lo obtiene con `useParams<{ id: string }>()` + `useQuery(['events', id], () => apiClient.events.getById(id))`.
- `onBack` se sustituye por `useNavigate() → navigate(-1)` (fallback `/home/activities` si no hay history).
- Los handlers `onAccept/onReject/onCounter/onForce` siguen llamando a `apiClient.negotiations.*` exactamente igual que antes.
- Las invalidaciones de React Query que estaban en `RequestInbox` se mueven a los handlers aquí; añadir también `['events', 'all']` y `['events', id]` (aunque `['events', 'all']` todavía no lo usa nadie en Fase 1 — no hace daño invalidar).
- Todo el JSX, Tailwind classes, Pills, BottomSheet, etc. se preservan intactos.

Skeleton de la firma:

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
// + imports de Pill/Button/Card/BottomSheet (los mismos que en RequestInbox)

export default function ActivityDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', id],
    queryFn: () => apiClient.events.getById(id),
    enabled: !!id,
  })

  // … estado local (contraoferta), mutaciones, handlers …
  // JSX idéntico al bloque extraído.
}
```

- [ ] **Step 4: Ejecutar el test y verificar paso**

```bash
cd src/frontend && npm run test -- ActivityDetail
```

Expected: PASS.

- [ ] **Step 5: Verificar que `RequestInbox.tsx` todavía compila**

Por ahora `RequestInbox` sigue teniendo su propio `if (selectedEvent)`. No lo tocamos todavía.

```bash
cd src/frontend && npm run type-check
```

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/pages/ActivityDetail.tsx src/frontend/src/pages/ActivityDetail.test.tsx
git commit -m "feat(actividades): extract ActivityDetail page from RequestInbox"
```

---

### Task 1.3: Eliminar el bloque detalle de `RequestInbox.tsx`

**Files:**
- Modify: `src/frontend/src/pages/RequestInbox.tsx`

- [ ] **Step 1: Reemplazar navegación interna**

En `RequestInbox.tsx`, donde antes se hacía `setSelectedEvent(ev)` al tocar una tarjeta de actividad, ahora se hace `navigate('/home/activities/' + ev.id)` (añadir `useNavigate` si no está).

Eliminar el bloque `if (selectedEvent) return (…)` entero. Eliminar el estado local `selectedEvent`/`setSelectedEvent` y todo lo que sólo existía para ese bloque (handlers de aceptar/rechazar/contraoferta del detalle; el estado de `counterPoints` ligado al detalle).

**Conservar** el bloque que renderiza los tabs Actividades/Tareas/Historial — ese se elimina en Fase 3.

- [ ] **Step 2: Verificar que `npm run type-check` pasa**

```bash
cd src/frontend && npm run type-check
```

Expected: exit 0.

- [ ] **Step 3: Verificar a mano (dev server)**

```bash
cd src/frontend && npm run dev
```

En `http://localhost:5173/request-inbox` tocar una actividad pendiente. Debe redirigir a `/home/activities/<id>`. Como esa ruta todavía no existe (la añadimos en Fase 2), se verá NotFound — eso es aceptable en esta fase; **dejar una nota visible en el mensaje de commit** para que la revisión lo sepa.

Mejor alternativa: en esta Task mantener `navigate('/request-inbox/' + ev.id)` pero añadir una ruta temporal en `App.tsx` `/request-inbox/:id → <ActivityDetail />` para tener navegación funcional hasta la Fase 2.

Opción elegida: **ruta temporal**. Añadir en `App.tsx`:

```tsx
<Route
  path="/request-inbox/:id"
  element={
    <ProtectedRoute>
      <AuthedLayout><ActivityDetail /></AuthedLayout>
    </ProtectedRoute>
  }
/>
```

Y en `RequestInbox.tsx`:

```tsx
navigate(`/request-inbox/${ev.id}`)
```

La ruta definitiva `/home/activities/:id` se añade en Fase 2, y en Fase 3 se retira esta ruta temporal.

Verificar a mano: abrir `/request-inbox`, tocar una actividad pendiente → se abre el detalle con todos los datos y botones. Tocar "Volver" → regresa a `/request-inbox`.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/pages/RequestInbox.tsx src/frontend/src/App.tsx
git commit -m "refactor(actividades): RequestInbox delegates detail view to ActivityDetail route"
```

---

# FASE 2 — Ruta `/home` + selector + BottomNav

**Objetivo:** El usuario ve la pestaña "Hogar" en el BottomNav; dentro hay un selector grande TAREAS/ACTIVIDADES; `/home/activities` todavía muestra la UI vieja (`RequestInbox`) como placeholder. La Fase 3 reemplazará ese placeholder.

**Mergeable:** Sí. El usuario nota el cambio de navegación.

---

### Task 2.1: Componente `HomeSelector`

**Files:**
- Create: `src/frontend/src/components/v2/home/HomeSelector.tsx`
- Test: `src/frontend/src/components/v2/home/HomeSelector.test.tsx`

- [ ] **Step 1: Escribir test**

```tsx
// src/frontend/src/components/v2/home/HomeSelector.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { HomeSelector } from './HomeSelector'

describe('HomeSelector', () => {
  it('renders both chips with counts', () => {
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={2} onChange={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /Tareas/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Actividades/i })).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('marks the active chip', () => {
    renderWithProviders(
      <HomeSelector active="activities" activitiesCount={0} onChange={() => {}} />,
    )
    const act = screen.getByRole('button', { name: /Actividades/i })
    expect(act).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChange when the other chip is clicked', () => {
    const onChange = vi.fn()
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={3} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Actividades/i }))
    expect(onChange).toHaveBeenCalledWith('activities')
  })

  it('does not render badge when activitiesCount is 0', () => {
    renderWithProviders(
      <HomeSelector active="tasks" activitiesCount={0} onChange={() => {}} />,
    )
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar test — FAIL**

```bash
cd src/frontend && npm run test -- HomeSelector
```

Expected: FAIL — "Cannot find module './HomeSelector'".

- [ ] **Step 3: Implementar `HomeSelector.tsx`**

```tsx
import { Home as HomeIcon, Target } from 'lucide-react'

export type HomeView = 'tasks' | 'activities'

interface Props {
  active: HomeView
  activitiesCount: number
  onChange: (v: HomeView) => void
}

export function HomeSelector({ active, activitiesCount, onChange }: Props) {
  return (
    <div className="mx-4 mt-2 mb-3 grid grid-cols-2 gap-2">
      <Chip
        active={active === 'tasks'}
        icon={<HomeIcon size={16} />}
        label="Tareas"
        onClick={() => onChange('tasks')}
      />
      <Chip
        active={active === 'activities'}
        icon={<Target size={16} />}
        label="Actividades"
        badge={activitiesCount}
        onClick={() => onChange('activities')}
      />
    </div>
  )
}

function Chip({
  active, icon, label, badge, onClick,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
        active
          ? 'bg-grad-cta text-white border-0 shadow-lg shadow-brand-amber/30'
          : 'bg-surface-elevated text-text-secondary border border-brd-subtle',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-danger text-white text-[10px] font-bold px-1.5 rounded-full">{badge}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 4: Ejecutar tests — PASS**

```bash
cd src/frontend && npm run test -- HomeSelector
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/v2/home/HomeSelector.tsx src/frontend/src/components/v2/home/HomeSelector.test.tsx
git commit -m "feat(actividades): HomeSelector chip component"
```

---

### Task 2.2: Página `Home.tsx` con redirect a la última vista usada

**Files:**
- Create: `src/frontend/src/pages/Home.tsx`
- Test: `src/frontend/src/pages/Home.test.tsx`

`Home.tsx` es una página muy delgada: lee `localStorage.home_last_selector` y redirige a `/home/tasks` o `/home/activities` con `<Navigate replace />`. En las subrutas, un layout de Home renderiza el `HomeSelector` y el contenido.

- [ ] **Step 1: Test de la redirección por defecto (primera visita)**

```tsx
// src/frontend/src/pages/Home.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'
import Home from './Home'

beforeEach(() => window.localStorage.clear())

describe('Home', () => {
  it('redirects to /home/tasks by default when no persisted choice', () => {
    renderWithProviders(<Home />, { route: '/home', path: '/home' })
    // With MemoryRouter our route swap is invisible from the outside, so assert
    // the last selector written to storage OR by setting up nested routes —
    // for a unit test we rely on Home itself exposing a data-testid when it
    // decides the fallback. See implementation.
    expect(screen.getByTestId('home-redirecting-to')).toHaveTextContent('tasks')
  })

  it('redirects to /home/activities when persisted', () => {
    window.localStorage.setItem('home_last_selector', 'activities')
    renderWithProviders(<Home />, { route: '/home', path: '/home' })
    expect(screen.getByTestId('home-redirecting-to')).toHaveTextContent('activities')
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- pages/Home
```

- [ ] **Step 3: Implementar `Home.tsx`**

```tsx
import { Navigate } from 'react-router-dom'

const STORAGE_KEY = 'home_last_selector'
type View = 'tasks' | 'activities'

function readPersisted(): View {
  if (typeof window === 'undefined') return 'tasks'
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'activities' ? 'activities' : 'tasks'
}

export default function Home() {
  const target = readPersisted()
  return (
    <>
      <span data-testid="home-redirecting-to" style={{ display: 'none' }}>{target}</span>
      <Navigate to={`/home/${target}`} replace />
    </>
  )
}
```

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- pages/Home
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/pages/Home.tsx src/frontend/src/pages/Home.test.tsx
git commit -m "feat(actividades): Home page with last-selector redirect"
```

---

### Task 2.3: Rutas `/home/*` en `App.tsx`

**Files:**
- Modify: `src/frontend/src/App.tsx`

El selector de persistencia vive aquí: cuando el usuario entra a `/home/tasks` o `/home/activities`, escribimos `localStorage.home_last_selector`. Lo más simple es hacerlo desde un componente wrapper `HomeShell` que además renderiza el `HomeSelector` y el contenido interno.

Para esta fase `HomeShell` se queda en `App.tsx` como componente inline (es trivial). En Fase 3 puede moverse a su propio archivo si crece.

- [ ] **Step 1: Añadir el wrapper + rutas**

En `App.tsx`, añadir imports:

```tsx
import Home from './pages/Home'
import Tasks from './pages/Tasks'            // ya existe, verificar import actual
import ActivityDetail from './pages/ActivityDetail'
import { HomeSelector, HomeView } from './components/v2/home/HomeSelector'
import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
```

Crear un componente `HomeShell`:

```tsx
function HomeShell({ view, children, activitiesCount }: {
  view: HomeView
  children: React.ReactNode
  activitiesCount: number
}) {
  const nav = useNavigate()
  useEffect(() => {
    window.localStorage.setItem('home_last_selector', view)
  }, [view])
  return (
    <>
      <HomeSelector
        active={view}
        activitiesCount={activitiesCount}
        onChange={(v) => nav(`/home/${v}`)}
      />
      {children}
    </>
  )
}
```

Para `activitiesCount`, Fase 2 pasa siempre `0` (no tenemos la query todavía). Fase 3 lo reemplaza por el valor real vía `useActivities()`.

Añadir las rutas dentro de `<Routes>`:

```tsx
<Route
  path="/home"
  element={<ProtectedRoute><AuthedLayout><Home /></AuthedLayout></ProtectedRoute>}
/>
<Route
  path="/home/tasks"
  element={
    <ProtectedRoute>
      <AuthedLayout>
        <HomeShell view="tasks" activitiesCount={0}>
          <Tasks />
        </HomeShell>
      </AuthedLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/home/activities"
  element={
    <ProtectedRoute>
      <AuthedLayout>
        <HomeShell view="activities" activitiesCount={0}>
          <RequestInbox />
        </HomeShell>
      </AuthedLayout>
    </ProtectedRoute>
  }
/>
<Route
  path="/home/activities/:id"
  element={
    <ProtectedRoute>
      <AuthedLayout><ActivityDetail /></AuthedLayout>
    </ProtectedRoute>
  }
/>
```

**Nota:** `/home/activities` renderiza `RequestInbox` como placeholder durante esta fase. Se reemplaza en Fase 3.

Redirecciones (añadir como `<Route>` con `<Navigate>`):

```tsx
<Route path="/tasks" element={<Navigate to="/home/tasks" replace />} />
<Route path="/inbox" element={<Navigate to="/home/activities" replace />} />
<Route path="/request-inbox" element={<Navigate to="/home/activities" replace />} />
```

**¡Importante!** La ruta `/tasks` actual renderiza `<Tasks />` directamente. Al cambiarla por un redirect se perderán query params; `Tasks` lee `?logId=…` para abrir el panel de disputa. Usar `<Navigate to="/home/tasks" replace />` preserva el search string **por defecto** en react-router v6: verificado en la doc. Si al probar manualmente `?logId=xxx` no se conserva, cambiar a:

```tsx
<Route
  path="/tasks"
  element={<Navigate to={{ pathname: '/home/tasks', search: window.location.search }} replace />}
/>
```

La ruta temporal `/request-inbox/:id` (Fase 1 Task 1.3) se deja hasta Fase 3. No tiene redirect hacia la nueva — el detalle ya está en `/home/activities/:id` desde esta fase.

- [ ] **Step 2: type-check + test de redirecciones**

```bash
cd src/frontend && npm run type-check
```

Expected: exit 0.

Crear `src/frontend/src/App.routing.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'

// Minimal re-declaration of the redirect trio so we assert the mapping without
// booting the whole app (which requires auth, store, etc.).
function RedirectRoutes() {
  return (
    <Routes>
      <Route path="/tasks" element={<Navigate to="/home/tasks" replace />} />
      <Route path="/inbox" element={<Navigate to="/home/activities" replace />} />
      <Route path="/request-inbox" element={<Navigate to="/home/activities" replace />} />
      <Route path="/home/tasks" element={<div data-testid="page">home-tasks</div>} />
      <Route path="/home/activities" element={<div data-testid="page">home-activities</div>} />
    </Routes>
  )
}

describe('legacy redirects', () => {
  it.each([
    ['/tasks', 'home-tasks'],
    ['/inbox', 'home-activities'],
    ['/request-inbox', 'home-activities'],
  ])('%s redirects to %s', (from, target) => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={[from]}>
        <RedirectRoutes />
      </MemoryRouter>,
    )
    expect(getByTestId('page').textContent).toBe(target)
  })
})
```

```bash
cd src/frontend && npm run test -- App.routing
```

Expected: 3 passed.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/App.tsx src/frontend/src/App.routing.test.tsx
git commit -m "feat(actividades): add /home/* routes and legacy redirects"
```

---

### Task 2.4: BottomNav — "Tareas" → "Hogar"

**Files:**
- Modify: `src/frontend/src/components/v2/layout/BottomNav.tsx`
- Test: `src/frontend/src/components/v2/layout/BottomNav.test.tsx`

- [ ] **Step 1: Test**

```tsx
// src/frontend/src/components/v2/layout/BottomNav.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { render } from '@testing-library/react'
import { BottomNav } from './BottomNav'

function renderAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<BottomNav onFab={() => {}} />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('has Hogar label instead of Tareas', () => {
    renderAt('/home/tasks')
    expect(screen.getByText('Hogar')).toBeInTheDocument()
    expect(screen.queryByText('Tareas')).not.toBeInTheDocument()
  })

  it('highlights Hogar when on /home/tasks', () => {
    renderAt('/home/tasks')
    const label = screen.getByText('Hogar')
    expect(label.className).toMatch(/brand-amber/)
  })

  it('highlights Hogar when on /home/activities', () => {
    renderAt('/home/activities')
    const label = screen.getByText('Hogar')
    expect(label.className).toMatch(/brand-amber/)
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- BottomNav
```

- [ ] **Step 3: Editar `BottomNav.tsx`**

Cambiar `LEFT` a:

```ts
const LEFT = [
  { id: 'dashboard', label: 'Inicio', icon: Home,       to: '/dashboard' },
  { id: 'home',      label: 'Hogar',  icon: CheckSquare, to: '/home' },
]
```

La lógica `active` ya usa `loc.pathname.startsWith(it.to + '/')`, por lo que `/home/tasks` y `/home/activities` marcan activo Hogar. **Pero** hay un bug sutil: `/home` prefija `/homemade` si existiera — en este repo no existe ninguna ruta así, pero para robustez cambiamos la comparación a estricto `startsWith(it.to + '/')` + `loc.pathname === it.to`, lo cual ya hace el código original. OK.

Quitar `'tasks'` de `LEFT` (se sustituye por `'home'`).

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- BottomNav
```

Expected: 3 passed.

- [ ] **Step 5: Validación manual**

```bash
cd src/frontend && npm run dev
```

- Tocar "Hogar" en BottomNav → va a `/home` → redirige a `/home/tasks` (por defecto) o `/home/activities` (si es lo último visitado).
- En `/home/tasks` aparece el selector arriba; se ve igual que antes el contenido de Tareas.
- Tocar el chip "Actividades" → navega a `/home/activities` → se ve `RequestInbox` (placeholder). Selector marca Actividades activa.
- Recargar en `/home/activities` → tras volver al Hogar desde otra pestaña, entra en `/home/activities` directamente.
- Visitar `/tasks` en la URL → redirige a `/home/tasks`. Visitar `/inbox` → redirige a `/home/activities`.

- [ ] **Step 6: Redirect post-submit en `RequestActivity.tsx`**

Grep para encontrar la navegación tras crear una actividad:

```bash
grep -n "navigate\|useNavigate" src/frontend/src/pages/RequestActivity.tsx
```

Donde haga `navigate('/inbox')` o `navigate('/request-inbox')`, cambiar a `navigate('/home/activities')`. Si no hay redirect (la ruta actual va a otro lado), no tocar nada.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/components/v2/layout/BottomNav.tsx src/frontend/src/components/v2/layout/BottomNav.test.tsx src/frontend/src/pages/RequestActivity.tsx
git commit -m "feat(actividades): BottomNav Tareas→Hogar + request post-submit redirect"
```

---

# FASE 3 — Módulo Actividades completo

**Objetivo:** `/home/activities` renderiza la nueva UI (Activas + Historial). Las 3 sub-listas salen de una sola query `['events', 'all']`.

**Mergeable:** Sí. El viejo `RequestInbox` pierde sus tabs Actividades e Historial (el tab de Tareas se queda hasta Fase 5 porque depende de la disputa, que ya vive también en `Tasks.tsx`).

---

### Task 3.1: Hook `useActivities` + helper de invalidación

**Files:**
- Create: `src/frontend/src/hooks/useActivities.ts`
- Create: `src/frontend/src/hooks/useInvalidateActivity.ts`
- Test: `src/frontend/src/hooks/useActivities.test.tsx`

- [ ] **Step 1: Test del hook (derivación cliente)**

```tsx
// src/frontend/src/hooks/useActivities.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

const MOCK_EVENTS = [
  { id: 'a', status: 'pending', createdBy: 'me',      lastProposedBy: 'me',   dateStart: '2026-05-01' },
  { id: 'b', status: 'pending', createdBy: 'partner', lastProposedBy: 'partner', dateStart: '2026-05-02' },
  { id: 'c', status: 'pending', createdBy: 'me',      lastProposedBy: 'partner', dateStart: '2026-05-03' }, // my turn
  { id: 'd', status: 'accepted', createdBy: 'me',     lastProposedBy: 'me',   dateStart: '2026-04-01' },
  { id: 'e', status: 'rejected', createdBy: 'partner', lastProposedBy: 'partner', dateStart: '2026-03-01' },
  { id: 'f', status: 'forced',   createdBy: 'me',     lastProposedBy: 'me',   dateStart: '2026-02-01' },
]

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: { getAll: vi.fn(async () => ({ events: MOCK_EVENTS })) },
  },
}))
vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me' } }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => vi.clearAllMocks())

describe('useActivities', () => {
  it('derives pending (turn = me), waiting (mine + partner has turn), and history', async () => {
    const { useActivities } = await import('./useActivities')
    const { result } = renderHook(() => useActivities(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Pending-for-me: partner proposed OR partner is the one who last moved.
    // Rule: status=pending AND lastProposedBy !== me.
    expect(result.current.pending.map(e => e.id)).toEqual(['b', 'c'])

    // Waiting: I created it AND it's still pending AND lastProposedBy === me.
    expect(result.current.waiting.map(e => e.id)).toEqual(['a'])

    // History: status ∈ {accepted, rejected, forced}, sorted by dateStart desc.
    expect(result.current.history.map(e => e.id)).toEqual(['d', 'e', 'f'])

    // Counts exposed:
    expect(result.current.pendingCount).toBe(2)
    expect(result.current.waitingCount).toBe(1)
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- useActivities
```

- [ ] **Step 3: Implementar `useActivities.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'

export interface ActivityEvent {
  id: string
  type: string
  title?: string
  dateStart: string
  dateEnd: string
  pointsBase: string
  pointsCalculated: string
  pointsAgreed?: string
  status: 'pending' | 'accepted' | 'rejected' | 'forced' | 'draft'
  createdBy: string
  lastProposedBy?: string
  negotiationRound: number
  maxFreeRounds?: number
  creator?: { id: string; name: string }
  compensation?: string
  negotiations?: Array<{ id: string; roundNumber: number; pointsProposed: string; proposedBy?: string }>
}

export function useActivities() {
  const { user } = useAppStore()
  const meId = user?.id

  const query = useQuery<{ events: ActivityEvent[] }>({
    queryKey: ['events', 'all'],
    queryFn: () => apiClient.events.getAll() as Promise<{ events: ActivityEvent[] }>,
    staleTime: 30_000,
  })

  const events = query.data?.events ?? []

  const derived = useMemo(() => {
    const pending: ActivityEvent[] = []
    const waiting: ActivityEvent[] = []
    const history: ActivityEvent[] = []

    for (const e of events) {
      if (e.status === 'pending') {
        // "Pending for me" = pending AND the ball is NOT in my court already.
        // Implementation rule: lastProposedBy !== me → I owe a response.
        if (e.lastProposedBy !== meId) {
          pending.push(e)
        } else if (e.createdBy === meId) {
          waiting.push(e)
        }
      } else if (e.status === 'accepted' || e.status === 'rejected' || e.status === 'forced') {
        history.push(e)
      }
    }

    history.sort((a, b) => (b.dateStart || '').localeCompare(a.dateStart || ''))

    return {
      pending, waiting, history,
      pendingCount: pending.length,
      waitingCount: waiting.length,
    }
  }, [events, meId])

  return {
    ...query,
    ...derived,
    events,
  }
}
```

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- useActivities
```

Expected: 1 passed.

- [ ] **Step 5: Helper de invalidación**

Crear `src/frontend/src/hooks/useInvalidateActivity.ts`:

```ts
import { useQueryClient } from '@tanstack/react-query'

export function useInvalidateActivity() {
  const qc = useQueryClient()
  return (eventId?: string) => {
    qc.invalidateQueries({ queryKey: ['events', 'all'] })
    if (eventId) qc.invalidateQueries({ queryKey: ['events', eventId] })
    qc.invalidateQueries({ queryKey: ['balance'] })
    qc.invalidateQueries({ queryKey: ['recentActivity'] })
    qc.invalidateQueries({ queryKey: ['gamification', 'status'] })
    qc.invalidateQueries({ queryKey: ['achievements', 'map'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
}
```

Test mínimo (comprueba que invalida las 7 claves):

```tsx
// src/frontend/src/hooks/useInvalidateActivity.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useInvalidateActivity } from './useInvalidateActivity'

describe('useInvalidateActivity', () => {
  it('invalidates all expected query keys', () => {
    const qc = new QueryClient()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useInvalidateActivity(), { wrapper })
    result.current('event-123')
    const calledKeys = spy.mock.calls.map(([arg]) => JSON.stringify((arg as { queryKey: unknown[] }).queryKey))
    expect(calledKeys).toContain(JSON.stringify(['events', 'all']))
    expect(calledKeys).toContain(JSON.stringify(['events', 'event-123']))
    expect(calledKeys).toContain(JSON.stringify(['balance']))
    expect(calledKeys).toContain(JSON.stringify(['recentActivity']))
    expect(calledKeys).toContain(JSON.stringify(['gamification', 'status']))
    expect(calledKeys).toContain(JSON.stringify(['achievements', 'map']))
    expect(calledKeys).toContain(JSON.stringify(['notifications']))
  })
})
```

```bash
cd src/frontend && npm run test -- useInvalidateActivity
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/hooks/useActivities.ts src/frontend/src/hooks/useActivities.test.tsx src/frontend/src/hooks/useInvalidateActivity.ts src/frontend/src/hooks/useInvalidateActivity.test.tsx
git commit -m "feat(actividades): useActivities hook + invalidation helper"
```

---

### Task 3.2: `ActivityActionCard` + `ActivityWaitingCard`

**Files:**
- Create: `src/frontend/src/components/v2/activities/ActivityActionCard.tsx`
- Create: `src/frontend/src/components/v2/activities/ActivityWaitingCard.tsx`
- Test: `src/frontend/src/components/v2/activities/ActivityActionCard.test.tsx`
- Test: `src/frontend/src/components/v2/activities/ActivityWaitingCard.test.tsx`

Las dos tarjetas son visuales; `ActivityActionCard` acepta props `onAccept`, `onCounter`, `onReject`, `onOpen` y opcionalmente `busy: boolean` para deshabilitar botones mientras hay una mutación en curso.

- [ ] **Step 1: Test ActivityActionCard**

```tsx
// ActivityActionCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityActionCard } from './ActivityActionCard'

const ev = {
  id: 'e1',
  title: '🍽️ Cena con amigos',
  creatorName: 'Eduardo',
  whenLabel: 'sáb 25 abr',
  pointsCalculated: 18,
  round: 1,
}

describe('ActivityActionCard', () => {
  it('renders title, creator, when, and points', () => {
    render(<ActivityActionCard activity={ev} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByText(/Cena con amigos/)).toBeInTheDocument()
    expect(screen.getByText(/Eduardo/)).toBeInTheDocument()
    expect(screen.getByText('sáb 25 abr')).toBeInTheDocument()
    expect(screen.getByText('−18 MP')).toBeInTheDocument()
  })

  it('fires onAccept/onCounter/onReject without bubbling to onOpen', () => {
    const onAccept = vi.fn(), onCounter = vi.fn(), onReject = vi.fn(), onOpen = vi.fn()
    render(<ActivityActionCard activity={ev} onAccept={onAccept} onCounter={onCounter} onReject={onReject} onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }))
    fireEvent.click(screen.getByRole('button', { name: /Contraoferta/i }))
    fireEvent.click(screen.getByRole('button', { name: /Rechazar/i }))
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCounter).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('fires onOpen when the card body is tapped', () => {
    const onOpen = vi.fn()
    render(<ActivityActionCard activity={ev} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={onOpen} />)
    fireEvent.click(screen.getByTestId('action-card-body'))
    expect(onOpen).toHaveBeenCalledWith('e1')
  })

  it('disables all action buttons when busy', () => {
    render(<ActivityActionCard activity={ev} busy onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: /Aceptar/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Contraoferta/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Rechazar/i })).toBeDisabled()
  })

  it('shows round pill when round > 1', () => {
    render(<ActivityActionCard activity={{ ...ev, round: 2 }} onAccept={() => {}} onCounter={() => {}} onReject={() => {}} onOpen={() => {}} />)
    expect(screen.getByText(/Ronda 2/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- ActivityActionCard
```

- [ ] **Step 3: Implementar `ActivityActionCard.tsx`**

```tsx
import { Check, X, Repeat } from 'lucide-react'
import { Card } from '../primitives/Card'
import { Button } from '../primitives/Button'
import { Pill } from '../primitives/Pill'

export interface ActivityActionCardVM {
  id: string
  title: string
  creatorName: string
  whenLabel: string
  pointsCalculated: number
  round: number
}

interface Props {
  activity: ActivityActionCardVM
  busy?: boolean
  onAccept: (id: string) => void
  onCounter: (id: string) => void
  onReject: (id: string) => void
  onOpen: (id: string) => void
}

export function ActivityActionCard({ activity, busy, onAccept, onCounter, onReject, onOpen }: Props) {
  const a = activity
  return (
    <Card className="p-3">
      <button
        type="button"
        data-testid="action-card-body"
        onClick={() => onOpen(a.id)}
        className="w-full text-left bg-transparent border-0 p-0"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{a.title}</div>
            <div className="text-[11px] text-text-secondary">
              De {a.creatorName} · {a.whenLabel}
              {a.round > 1 && <> · <Pill tone="indigo">Ronda {a.round}</Pill></>}
            </div>
          </div>
          <span className="text-sm font-bold text-danger tabular-nums">−{a.pointsCalculated.toFixed(0)} MP</span>
        </div>
      </button>
      <div className="flex gap-2 mt-2.5">
        <Button variant="primary" size="sm" fullWidth disabled={busy} onClick={() => onAccept(a.id)}>
          <Check size={14} /> Aceptar
        </Button>
        <Button variant="secondary" size="sm" fullWidth disabled={busy} onClick={() => onCounter(a.id)}>
          <Repeat size={14} /> Contraoferta
        </Button>
        <Button variant="outline" size="sm" disabled={busy} aria-label="Rechazar" onClick={() => onReject(a.id)}>
          <X size={14} />
        </Button>
      </div>
    </Card>
  )
}
```

Nota: si `<Pill>` no soporta el tono `indigo`, usar el tono neutro existente (ver `src/frontend/src/components/v2/primitives/Pill.tsx`) — ajustar en el momento.

- [ ] **Step 4: PASS ActivityActionCard**

```bash
cd src/frontend && npm run test -- ActivityActionCard
```

Expected: 5 passed.

- [ ] **Step 5: Test + Implementación `ActivityWaitingCard`**

Test:

```tsx
// ActivityWaitingCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityWaitingCard } from './ActivityWaitingCard'

describe('ActivityWaitingCard', () => {
  it('shows partner name waiting + dashed border styling cue', () => {
    render(<ActivityWaitingCard
      activity={{ id: 'e1', title: '🎬 Cine', partnerName: 'Eduardo', pointsCalculated: 25, whenLabel: 'vie 24 abr' }}
      onOpen={() => {}}
    />)
    expect(screen.getByText(/Esperando a Eduardo/)).toBeInTheDocument()
    expect(screen.getByText('−25 MP')).toBeInTheDocument()
  })

  it('opens on tap', () => {
    const onOpen = vi.fn()
    render(<ActivityWaitingCard
      activity={{ id: 'e1', title: 'x', partnerName: 'p', pointsCalculated: 1, whenLabel: 'hoy' }}
      onOpen={onOpen}
    />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpen).toHaveBeenCalledWith('e1')
  })
})
```

Implementación:

```tsx
import { Card } from '../primitives/Card'

export interface ActivityWaitingCardVM {
  id: string
  title: string
  partnerName: string
  whenLabel: string
  pointsCalculated: number
}

interface Props {
  activity: ActivityWaitingCardVM
  onOpen: (id: string) => void
}

export function ActivityWaitingCard({ activity, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(activity.id)}
      className="w-full text-left bg-transparent border-0 p-0 mx-4 mb-2 block"
    >
      <Card className="p-3 border-dashed opacity-80">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{activity.title}</div>
            <div className="text-[11px] text-text-secondary">
              Esperando a {activity.partnerName} · {activity.whenLabel}
            </div>
          </div>
          <span className="text-sm font-bold text-danger tabular-nums">−{activity.pointsCalculated.toFixed(0)} MP</span>
        </div>
      </Card>
    </button>
  )
}
```

- [ ] **Step 6: PASS ActivityWaitingCard**

```bash
cd src/frontend && npm run test -- ActivityWaitingCard
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/components/v2/activities/ActivityActionCard.tsx src/frontend/src/components/v2/activities/ActivityActionCard.test.tsx src/frontend/src/components/v2/activities/ActivityWaitingCard.tsx src/frontend/src/components/v2/activities/ActivityWaitingCard.test.tsx
git commit -m "feat(actividades): ActivityActionCard + ActivityWaitingCard"
```

---

### Task 3.3: `HistoryFilters`

**Files:**
- Create: `src/frontend/src/components/v2/activities/HistoryFilters.tsx`
- Test: `src/frontend/src/components/v2/activities/HistoryFilters.test.tsx`

Tres filtros: Estado (Todos/Aprobadas/Rechazadas/Forzadas), Quién (Todos/Yo/Pareja), Rango (Semana/Mes/Todo).

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryFilters, HistoryFilterValues } from './HistoryFilters'

const defaults: HistoryFilterValues = { status: 'all', who: 'all', range: 'month' }

describe('HistoryFilters', () => {
  it('renders all three groups', () => {
    render(<HistoryFilters partnerName="Edu" value={defaults} onChange={() => {}} />)
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('Aprobadas')).toBeInTheDocument()
    expect(screen.getByText('Rechazadas')).toBeInTheDocument()
    expect(screen.getByText('Forzadas')).toBeInTheDocument()
    expect(screen.getByText('Yo')).toBeInTheDocument()
    expect(screen.getByText('Edu')).toBeInTheDocument()
    expect(screen.getByText('Semana')).toBeInTheDocument()
    expect(screen.getByText('Mes')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
  })

  it('emits change on each chip tap with current state', () => {
    const onChange = vi.fn()
    render(<HistoryFilters partnerName="Edu" value={defaults} onChange={onChange} />)
    fireEvent.click(screen.getByText('Aprobadas'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'accepted', who: 'all', range: 'month' })
    fireEvent.click(screen.getByText('Yo'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'all', who: 'me', range: 'month' })
    fireEvent.click(screen.getByText('Semana'))
    expect(onChange).toHaveBeenLastCalledWith({ status: 'all', who: 'all', range: 'week' })
  })
})
```

- [ ] **Step 2: FAIL + Implementar**

```tsx
export type HistoryFilterValues = {
  status: 'all' | 'accepted' | 'rejected' | 'forced'
  who: 'all' | 'me' | 'partner'
  range: 'week' | 'month' | 'all'
}

interface Props {
  partnerName: string
  value: HistoryFilterValues
  onChange: (v: HistoryFilterValues) => void
}

export function HistoryFilters({ partnerName, value, onChange }: Props) {
  const set = <K extends keyof HistoryFilterValues>(k: K, v: HistoryFilterValues[K]) =>
    onChange({ ...value, [k]: v })

  return (
    <div className="px-4 py-2 flex flex-col gap-2">
      <Row>
        <Chip active={value.status === 'all'}      onClick={() => set('status', 'all')}>Todos</Chip>
        <Chip active={value.status === 'accepted'} onClick={() => set('status', 'accepted')}>Aprobadas</Chip>
        <Chip active={value.status === 'rejected'} onClick={() => set('status', 'rejected')}>Rechazadas</Chip>
        <Chip active={value.status === 'forced'}   onClick={() => set('status', 'forced')}>Forzadas</Chip>
      </Row>
      <Row>
        <Chip active={value.who === 'all'}     onClick={() => set('who', 'all')}>Todos</Chip>
        <Chip active={value.who === 'me'}      onClick={() => set('who', 'me')}>Yo</Chip>
        <Chip active={value.who === 'partner'} onClick={() => set('who', 'partner')}>{partnerName}</Chip>
      </Row>
      <Row>
        <Chip active={value.range === 'week'}  onClick={() => set('range', 'week')}>Semana</Chip>
        <Chip active={value.range === 'month'} onClick={() => set('range', 'month')}>Mes</Chip>
        <Chip active={value.range === 'all'}   onClick={() => set('range', 'all')}>Todo</Chip>
      </Row>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-1.5 overflow-x-auto">{children}</div>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border transition-colors',
        active
          ? 'bg-brand-amber text-white border-brand-amber'
          : 'bg-surface-elevated text-text-secondary border-brd-subtle',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: PASS**

```bash
cd src/frontend && npm run test -- HistoryFilters
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/components/v2/activities/HistoryFilters.tsx src/frontend/src/components/v2/activities/HistoryFilters.test.tsx
git commit -m "feat(actividades): HistoryFilters component"
```

---

### Task 3.4: `Activities.tsx` — página de Activas + Historial

**Files:**
- Create: `src/frontend/src/pages/Activities.tsx`
- Test: `src/frontend/src/pages/Activities.test.tsx`

- [ ] **Step 1: Test de la página (tabs + vacíos + aceptar)**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/renderWithProviders'

const respond = vi.fn(async () => ({ ok: true }))

vi.mock('../services/apiClient', () => ({
  apiClient: {
    events: {
      getAll: vi.fn(async () => ({
        events: [
          { id: 'p1', type: 'cena', title: 'Cena', status: 'pending', createdBy: 'partner',
            lastProposedBy: 'partner', pointsBase: '10', pointsCalculated: '12',
            dateStart: '2026-05-01T21:00:00Z', dateEnd: '2026-05-01T23:00:00Z',
            negotiationRound: 1, creator: { id: 'partner', name: 'Eduardo' },
            negotiations: [{ id: 'n1', roundNumber: 1, pointsProposed: '12', proposedBy: 'partner' }] },
          { id: 'w1', type: 'cine', title: 'Cine', status: 'pending', createdBy: 'me',
            lastProposedBy: 'me', pointsBase: '20', pointsCalculated: '25',
            dateStart: '2026-04-24T20:00:00Z', dateEnd: '2026-04-24T22:00:00Z',
            negotiationRound: 1, creator: { id: 'me', name: 'Blanca' },
            negotiations: [{ id: 'n2', roundNumber: 1, pointsProposed: '25', proposedBy: 'me' }] },
          { id: 'h1', type: 'yoga', title: 'Yoga', status: 'accepted', createdBy: 'me',
            lastProposedBy: 'partner', pointsBase: '8', pointsCalculated: '10',
            dateStart: '2026-04-15T10:00:00Z', dateEnd: '2026-04-15T11:00:00Z',
            negotiationRound: 1, creator: { id: 'me', name: 'Blanca' },
            negotiations: [] },
        ],
      })),
    },
    negotiations: { respond, force: vi.fn() },
  },
}))

vi.mock('../store/useAppStore', () => ({
  useAppStore: () => ({
    user: { id: 'me', name: 'Blanca' },
    couple: { id: 'c1', users: [{ id: 'me', name: 'Blanca' }, { id: 'partner', name: 'Eduardo' }] },
  }),
}))

beforeEach(() => vi.clearAllMocks())

describe('Activities page', () => {
  it('renders Activas tab with pending + waiting sections', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText(/REQUIEREN TU RESPUESTA/i)).toBeInTheDocument())
    expect(screen.getByText('Cena')).toBeInTheDocument()
    expect(screen.getByText(/TUS SOLICITUDES ESPERANDO/i)).toBeInTheDocument()
    expect(screen.getByText('Cine')).toBeInTheDocument()
    expect(screen.queryByText('Yoga')).not.toBeInTheDocument()  // it's history
  })

  it('switches to Historial and filters by status', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Historial/i }))
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    // filter to Rechazadas → nothing
    fireEvent.click(screen.getByText('Rechazadas'))
    expect(screen.queryByText('Yoga')).not.toBeInTheDocument()
    expect(screen.getByText(/Sin resultados/i)).toBeInTheDocument()
  })

  it('accepting a pending card calls negotiations.respond with accepted', async () => {
    const { default: Activities } = await import('./Activities')
    renderWithProviders(<Activities />, { route: '/home/activities' })
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Aceptar/i }))
    await waitFor(() => expect(respond).toHaveBeenCalledWith('n1', { responseType: 'accepted' }))
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- pages/Activities
```

- [ ] **Step 3: Implementar `Activities.tsx`**

Estructura:

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { useActivities, ActivityEvent } from '../hooks/useActivities'
import { useInvalidateActivity } from '../hooks/useInvalidateActivity'
import { ActivityActionCard } from '../components/v2/activities/ActivityActionCard'
import { ActivityWaitingCard } from '../components/v2/activities/ActivityWaitingCard'
import { HistoryFilters, HistoryFilterValues } from '../components/v2/activities/HistoryFilters'
import { Pill } from '../components/v2/primitives/Pill'

type Tab = 'active' | 'history'

export default function Activities() {
  const nav = useNavigate()
  const { user, couple } = useAppStore()
  const { pending, waiting, history, isLoading } = useActivities()
  const invalidate = useInvalidateActivity()

  const [tab, setTab] = useState<Tab>('active')
  const [filters, setFilters] = useState<HistoryFilterValues>({ status: 'all', who: 'all', range: 'month' })

  const partnerName = couple?.users?.find((u) => u.id !== user?.id)?.name ?? 'Tu pareja'

  const respondMut = useMutation({
    mutationFn: ({ negotiationId, responseType }: { negotiationId: string; responseType: 'accepted' | 'rejected' }) =>
      apiClient.negotiations.respond(negotiationId, { responseType }),
    onSuccess: (_, vars) => invalidate(vars.negotiationId),
    onError: () => {
      // No hay sistema de toasts aún. Feedback mínimo + invalidación para
      // resincronizar con el backend por si la acción se aplicó a medias.
      window.alert('No se pudo completar la acción. Inténtalo de nuevo.')
      invalidate()
    },
  })

  // Backend devuelve negociaciones ordenadas DESC por createdAt:
  // la más reciente es siempre [0]. Mantener este invariante en todo
  // el módulo (si cambia la API, cambiar aquí).
  function handleAccept(eventId: string) {
    const ev = pending.find((e) => e.id === eventId)
    const lastNeg = ev?.negotiations?.[0]
    if (!lastNeg) return
    respondMut.mutate({ negotiationId: lastNeg.id, responseType: 'accepted' })
  }
  function handleReject(eventId: string) {
    const ev = pending.find((e) => e.id === eventId)
    const lastNeg = ev?.negotiations?.[0]
    if (!lastNeg) return
    respondMut.mutate({ negotiationId: lastNeg.id, responseType: 'rejected' })
  }
  function handleCounter(eventId: string) {
    // BottomSheet de contraoferta llega en Fase 4 desde el banner.
    // Desde la vista Activas, ir al detalle (el flujo largo ya existe ahí).
    nav(`/home/activities/${eventId}`)
  }
  function handleOpen(eventId: string) {
    nav(`/home/activities/${eventId}`)
  }

  const filteredHistory = useMemo(() => filterHistory(history, filters, user?.id ?? ''), [history, filters, user])

  return (
    <main className="pb-4">
      <div className="mx-4 mt-2 mb-3 flex gap-2">
        <TabBtn active={tab === 'active'} onClick={() => setTab('active')}>
          Activas {pending.length + waiting.length > 0 && <Pill tone="danger">{pending.length + waiting.length}</Pill>}
        </TabBtn>
        <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>Historial</TabBtn>
      </div>

      {tab === 'active' && (
        <ActiveView
          isLoading={isLoading}
          pending={pending}
          waiting={waiting}
          partnerName={partnerName}
          meId={user?.id ?? ''}
          busy={respondMut.isPending}
          onAccept={handleAccept}
          onReject={handleReject}
          onCounter={handleCounter}
          onOpen={handleOpen}
        />
      )}

      {tab === 'history' && (
        <HistoryView
          isLoading={isLoading}
          history={filteredHistory}
          partnerName={partnerName}
          filters={filters}
          setFilters={setFilters}
          onOpen={handleOpen}
        />
      )}
    </main>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 py-2 rounded-lg text-xs font-bold',
        active ? 'bg-brand-purple text-white' : 'bg-surface-elevated text-text-secondary',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function toVM(ev: ActivityEvent): {
  id: string; title: string; whenLabel: string; pointsCalculated: number; round: number
} {
  const points = Number(ev.pointsAgreed ?? ev.pointsCalculated ?? ev.pointsBase ?? 0)
  const d = new Date(ev.dateStart)
  const whenLabel = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  return {
    id: ev.id,
    title: ev.title ?? labelFromType(ev.type),
    whenLabel,
    pointsCalculated: Math.round(points),
    round: ev.negotiationRound ?? 1,
  }
}

function labelFromType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function ActiveView({
  isLoading, pending, waiting, partnerName, meId, busy,
  onAccept, onReject, onCounter, onOpen,
}: {
  isLoading: boolean
  pending: ActivityEvent[]
  waiting: ActivityEvent[]
  partnerName: string
  meId: string
  busy: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onCounter: (id: string) => void
  onOpen: (id: string) => void
}) {
  if (isLoading) return <p className="text-center text-text-secondary py-6">Cargando…</p>
  if (pending.length === 0 && waiting.length === 0) {
    return (
      <div className="mx-4 text-center py-8">
        <div className="text-3xl mb-2">🎯</div>
        <div className="text-sm text-text-primary font-bold">Sin actividades activas.</div>
        <div className="text-[11px] text-text-secondary mt-1">Crea una con +.</div>
      </div>
    )
  }
  return (
    <>
      {pending.length > 0 && (
        <section>
          <h3 className="mx-4 mt-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Requieren tu respuesta ({pending.length})
          </h3>
          <div className="mx-4 flex flex-col gap-2">
            {pending.map((ev) => {
              const vm = toVM(ev)
              return (
                <ActivityActionCard
                  key={ev.id}
                  activity={{ ...vm, creatorName: ev.creator?.name ?? 'Tu pareja' }}
                  busy={busy}
                  onAccept={onAccept}
                  onReject={onReject}
                  onCounter={onCounter}
                  onOpen={onOpen}
                />
              )
            })}
          </div>
        </section>
      )}
      {waiting.length > 0 && (
        <section>
          <h3 className="mx-4 mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
            Tus solicitudes esperando ({waiting.length})
          </h3>
          {waiting.map((ev) => {
            const vm = toVM(ev)
            return (
              <ActivityWaitingCard
                key={ev.id}
                activity={{ ...vm, partnerName }}
                onOpen={onOpen}
              />
            )
          })}
        </section>
      )}
    </>
  )
}

function HistoryView({
  isLoading, history, partnerName, filters, setFilters, onOpen,
}: {
  isLoading: boolean
  history: ActivityEvent[]
  partnerName: string
  filters: HistoryFilterValues
  setFilters: (v: HistoryFilterValues) => void
  onOpen: (id: string) => void
}) {
  if (isLoading) return <p className="text-center text-text-secondary py-6">Cargando…</p>
  return (
    <>
      <HistoryFilters partnerName={partnerName} value={filters} onChange={setFilters} />
      {history.length === 0 && (
        <div className="mx-4 text-center py-8 text-text-secondary text-xs">
          {filters.status === 'all' && filters.who === 'all' && filters.range === 'all'
            ? '📋 Aún no has cerrado ninguna actividad.'
            : 'Sin resultados con estos filtros.'}
        </div>
      )}
      {history.map((ev) => {
        const vm = toVM(ev)
        return (
          <button
            key={ev.id}
            type="button"
            onClick={() => onOpen(ev.id)}
            className="w-full text-left bg-transparent border-0 p-0 mx-4 mb-2 block"
          >
            <div className="bg-surface-elevated border border-brd-subtle rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Pill tone={statusTone(ev.status)}>{statusLabel(ev.status)}</Pill>
                  <span className="text-sm font-bold text-text-primary truncate">{vm.title}</span>
                </div>
                <div className="text-[11px] text-text-secondary mt-1">
                  {ev.creator?.name ?? '—'} · {vm.whenLabel}{ev.negotiationRound > 1 ? ` · ronda ${ev.negotiationRound}` : ''}
                </div>
              </div>
              <span className="text-sm font-bold text-danger tabular-nums">−{vm.pointsCalculated} MP</span>
            </div>
          </button>
        )
      })}
    </>
  )
}

function statusLabel(s: string): string {
  return s === 'accepted' ? 'Aprobada' : s === 'rejected' ? 'Rechazada' : s === 'forced' ? 'Forzada' : s
}
function statusTone(s: string): 'success' | 'danger' | 'purple' | 'default' {
  return s === 'accepted' ? 'success' : s === 'rejected' ? 'danger' : s === 'forced' ? 'purple' : 'default'
}

function filterHistory(
  history: ActivityEvent[],
  f: HistoryFilterValues,
  meId: string,
): ActivityEvent[] {
  const now = Date.now()
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const MONTH = 30 * 24 * 60 * 60 * 1000
  return history.filter((e) => {
    if (f.status !== 'all' && e.status !== f.status) return false
    if (f.who === 'me' && e.createdBy !== meId) return false
    if (f.who === 'partner' && e.createdBy === meId) return false
    if (f.range !== 'all') {
      const ts = new Date(e.dateStart).getTime()
      const limit = f.range === 'week' ? WEEK : MONTH
      if (now - ts > limit) return false
    }
    return true
  })
}
```

**Notas:**
- Si `Pill` no expone los tonos indicados (`success`, `danger`, `purple`), mirar el archivo y usar los tonos que sí expone. Ajustar nombres en el momento.
- El detalle Contraoferta desde la pestaña Activas abre el detalle (el BottomSheet sólo aparece desde el Dashboard — Fase 4). Es deliberado: en Activas el usuario ya está en el módulo y el detalle es la siguiente parada natural.

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- pages/Activities
```

Expected: 3 passed.

- [ ] **Step 5: Conectar en `App.tsx`**

Reemplazar en `App.tsx` la ruta `/home/activities`:

```tsx
// antes
<HomeShell view="activities" activitiesCount={0}>
  <RequestInbox />
</HomeShell>

// después
<HomeShell view="activities" activitiesCount={0}>
  <Activities />
</HomeShell>
```

Añadir `import Activities from './pages/Activities'`. Quitar `import RequestInbox` si ya no se usa en `/home/activities` (pero SÍ se sigue usando en la ruta `/request-inbox`; no quitar).

- [ ] **Step 6: Actividades count en HomeShell**

Para que el selector marque el contador, el `HomeShell` necesita leer `useActivities()`. Modificar:

```tsx
function HomeShell({ view, children }: { view: HomeView; children: React.ReactNode }) {
  const nav = useNavigate()
  const { pendingCount } = useActivities()
  useEffect(() => {
    window.localStorage.setItem('home_last_selector', view)
  }, [view])
  return (
    <>
      <HomeSelector
        active={view}
        activitiesCount={pendingCount}
        onChange={(v) => nav(`/home/${v}`)}
      />
      {children}
    </>
  )
}
```

Eliminar el prop `activitiesCount` del JSX de las rutas (ya no se pasa desde fuera).

- [ ] **Step 7: Validación manual**

```bash
cd src/frontend && npm run dev
```

Crear una actividad desde `+` → aparece en `/home/activities` en "Tus solicitudes esperando". Pedirle al partner (o usar otra cuenta) que proponga algo → aparece en "Requieren tu respuesta". Aceptar → desaparece de Activas, aparece en Historial con pill "Aprobada". Filtrar por "Yo" + "Semana" → se ve. Balance en Dashboard actualizado (`/dashboard`).

- [ ] **Step 8: Commit**

```bash
git add src/frontend/src/pages/Activities.tsx src/frontend/src/pages/Activities.test.tsx src/frontend/src/App.tsx
git commit -m "feat(actividades): Activities page with Active + History tabs wired to /home/activities"
```

---

### Task 3.5: Limpiar tabs de Actividades/Historial en `RequestInbox.tsx`

**Files:**
- Modify: `src/frontend/src/pages/RequestInbox.tsx`

`RequestInbox.tsx` en producción todavía se abre por `/request-inbox`, pero en Fase 2 ya se redirigió a `/home/activities`. Antes de borrar el archivo (Fase 5) hay que eliminar el código muerto: los tabs "Actividades" e "Historial" + toda su lógica. Lo único que queda vivo es el tab "Tareas (verificar)", que ya tiene equivalente en `Tasks.tsx`.

- [ ] **Step 1: Borrar tabs Actividades/Historial**

En `RequestInbox.tsx`:
- Quitar el tipo `'activities'` y `'history'` de `InboxTab` → dejar sólo `'tasks'`.
- Quitar la barra de tabs (queda un solo contenido).
- Eliminar queries de actividades/negociaciones que sólo alimentaban esos tabs.
- Conservar la query de `pendingTaskLogs` y el render del tab Tareas (disputa).

- [ ] **Step 2: type-check**

```bash
cd src/frontend && npm run type-check
```

Expected: exit 0.

- [ ] **Step 3: Validación manual**

Visitar `/request-inbox` manualmente (aún accesible porque la ruta vieja existe). Ver sólo tareas para verificar. Disputar una tarea → funciona igual que antes.

- [ ] **Step 4: Quitar ruta temporal `/request-inbox/:id`**

En `App.tsx`, borrar la ruta `<Route path="/request-inbox/:id" …/>` que se añadió en Fase 1 Task 1.3. Ya no tiene sentido: el detalle de actividad vive en `/home/activities/:id`.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/pages/RequestInbox.tsx src/frontend/src/App.tsx
git commit -m "refactor(actividades): RequestInbox keeps only task-verification tab"
```

---

# FASE 4 — Dashboard: banner + RecentMovementsTabs + CounterOfferSheet

**Objetivo:** El Dashboard muestra el banner accionable con hasta 2 actividades pendientes + contadores. El widget de movimientos gana 3 chips (Todo/Actividades/Tareas).

**Mergeable:** Sí. Cambia visualmente el Dashboard.

---

### Task 4.1: `CounterOfferSheet` (BottomSheet)

**Files:**
- Create: `src/frontend/src/components/v2/activities/CounterOfferSheet.tsx`
- Test: `src/frontend/src/components/v2/activities/CounterOfferSheet.test.tsx`

BottomSheet con input numérico + textarea opcional + botón enviar. Usa `apiClient.negotiations.respond(id, { responseType: 'counter_proposed', pointsProposed, message })`.

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CounterOfferSheet } from './CounterOfferSheet'

const submit = vi.fn()

beforeEach(() => { submit.mockReset() })

describe('CounterOfferSheet', () => {
  it('is hidden when open=false', () => {
    render(<CounterOfferSheet open={false} onClose={() => {}} currentPoints={12} onSubmit={submit} />)
    expect(screen.queryByText(/Contraoferta/)).not.toBeInTheDocument()
  })

  it('shows current points as default in the input when opened', () => {
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i) as HTMLInputElement
    expect(input.value).toBe('12')
  })

  it('submits new points + message', async () => {
    const user = userEvent.setup()
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i)
    await user.clear(input); await user.type(input, '9')
    await user.type(screen.getByLabelText(/Mensaje/i), 'Demasiado')
    await user.click(screen.getByRole('button', { name: /Enviar/i }))
    expect(submit).toHaveBeenCalledWith({ pointsProposed: 9, message: 'Demasiado' })
  })

  it('rejects submit when points empty or ≤ 0', async () => {
    render(<CounterOfferSheet open currentPoints={12} onClose={() => {}} onSubmit={submit} />)
    const input = screen.getByLabelText(/Puntos propuestos/i)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /Enviar/i }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByText(/mayor que 0/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: FAIL + Implementar**

```tsx
import { useEffect, useState } from 'react'
import { BottomSheet } from '../primitives/BottomSheet'
import { Button } from '../primitives/Button'

interface Props {
  open: boolean
  currentPoints: number
  onClose: () => void
  onSubmit: (data: { pointsProposed: number; message?: string }) => void
}

export function CounterOfferSheet({ open, currentPoints, onClose, onSubmit }: Props) {
  const [points, setPoints] = useState<string>(String(currentPoints))
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPoints(String(currentPoints))
      setMessage('')
      setError(null)
    }
  }, [open, currentPoints])

  if (!open) return null

  function handleSubmit() {
    const n = Number(points)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Los puntos deben ser mayor que 0')
      return
    }
    onSubmit({ pointsProposed: n, message: message.trim() || undefined })
  }

  return (
    <BottomSheet open onClose={onClose} title="Contraoferta">
      <div className="flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          Puntos propuestos
          <input
            aria-label="Puntos propuestos"
            type="number"
            min={1}
            step="0.5"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="bg-surface-elevated border border-brd-subtle rounded-lg px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
          Mensaje (opcional)
          <textarea
            aria-label="Mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="bg-surface-elevated border border-brd-subtle rounded-lg px-3 py-2 text-sm text-text-primary"
          />
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <Button variant="primary" fullWidth onClick={handleSubmit}>Enviar contraoferta</Button>
      </div>
    </BottomSheet>
  )
}
```

Nota: comprobar la firma real de `BottomSheet` (prop `title`, `open`, `onClose`) en `src/frontend/src/components/v2/primitives/BottomSheet.tsx` y adaptar si difiere.

- [ ] **Step 3: PASS**

```bash
cd src/frontend && npm run test -- CounterOfferSheet
```

Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/components/v2/activities/CounterOfferSheet.tsx src/frontend/src/components/v2/activities/CounterOfferSheet.test.tsx
git commit -m "feat(actividades): CounterOfferSheet bottom sheet"
```

---

### Task 4.2: `ActivitiesBanner`

**Files:**
- Create: `src/frontend/src/components/v2/dashboard/ActivitiesBanner.tsx`
- Test: `src/frontend/src/components/v2/dashboard/ActivitiesBanner.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'

const respond = vi.fn(async () => ({ ok: true }))

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    events: {
      getAll: vi.fn(async () => ({
        events: [
          makeEv('p1', 'Cena', 'partner', 'partner'),
          makeEv('p2', 'Pádel', 'partner', 'partner'),
          makeEv('p3', 'Pádel 2', 'partner', 'partner'),
          { ...makeEv('w1', 'Cine', 'me', 'me'), status: 'pending' },
        ],
      })),
    },
    negotiations: { respond, force: vi.fn() },
  },
}))
vi.mock('../../../store/useAppStore', () => ({
  useAppStore: () => ({ user: { id: 'me' }, couple: { id: 'c1', users: [{ id: 'me', name: 'Blanca' }, { id: 'partner', name: 'Edu' }] } }),
}))

function makeEv(id: string, title: string, createdBy: string, lastProposedBy: string) {
  return {
    id, title, type: 'cena', status: 'pending', createdBy, lastProposedBy,
    pointsBase: '10', pointsCalculated: '12', dateStart: '2026-05-01T21:00:00Z', dateEnd: '2026-05-01T23:00:00Z',
    negotiationRound: 1, creator: { id: createdBy, name: createdBy === 'me' ? 'Blanca' : 'Edu' },
    negotiations: [{ id: 'n-' + id, roundNumber: 1, pointsProposed: '12', proposedBy: createdBy }],
  }
}

beforeEach(() => vi.clearAllMocks())

describe('ActivitiesBanner', () => {
  it('renders nothing when no pending and no waiting', async () => {
    vi.doMock('../../../services/apiClient', () => ({
      apiClient: { events: { getAll: vi.fn(async () => ({ events: [] })) }, negotiations: { respond: vi.fn(), force: vi.fn() } },
    }))
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    const { container } = renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('shows at most 2 action cards + overflow link', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    expect(screen.getByText('Cena')).toBeInTheDocument()
    expect(screen.getByText('Pádel')).toBeInTheDocument()
    expect(screen.queryByText('Pádel 2')).not.toBeInTheDocument()
    expect(screen.getByText(/y 1 más/)).toBeInTheDocument()
  })

  it('shows waiting summary when you have outgoing requests', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText(/solicitudes tuyas/i)).toBeInTheDocument())
  })

  it('accepting calls respond(accepted)', async () => {
    const { ActivitiesBanner } = await import('./ActivitiesBanner')
    renderWithProviders(<ActivitiesBanner />)
    await waitFor(() => expect(screen.getByText('Cena')).toBeInTheDocument())
    const acceptBtns = screen.getAllByRole('button', { name: /Aceptar/i })
    fireEvent.click(acceptBtns[0])
    await waitFor(() => expect(respond).toHaveBeenCalledWith('n-p1', { responseType: 'accepted' }))
  })
})
```

- [ ] **Step 2: FAIL**

```bash
cd src/frontend && npm run test -- ActivitiesBanner
```

- [ ] **Step 3: Implementar `ActivitiesBanner.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'
import { useActivities } from '../../../hooks/useActivities'
import { useInvalidateActivity } from '../../../hooks/useInvalidateActivity'
import { ActivityActionCard } from '../activities/ActivityActionCard'
import { CounterOfferSheet } from '../activities/CounterOfferSheet'

const MAX_CARDS = 2

export function ActivitiesBanner() {
  const nav = useNavigate()
  const { user } = useAppStore()
  const { pending, waiting, pendingCount, waitingCount } = useActivities()
  const invalidate = useInvalidateActivity()

  const [counterFor, setCounterFor] = useState<string | null>(null)

  const respond = useMutation({
    mutationFn: (v: { negotiationId: string; payload: Parameters<typeof apiClient.negotiations.respond>[1] }) =>
      apiClient.negotiations.respond(v.negotiationId, v.payload),
    onSuccess: (_, v) => invalidate(v.negotiationId),
    onError: () => {
      window.alert('No se pudo completar la acción. Inténtalo de nuevo.')
      invalidate()
    },
  })

  if (pendingCount === 0 && waitingCount === 0) return null

  const visible = pending.slice(0, MAX_CARDS)
  const overflow = Math.max(0, pendingCount - MAX_CARDS)

  // Backend devuelve negociaciones DESC por createdAt → [0] es la más reciente.
  function lastNegOf(eventId: string) {
    const e = pending.find((x) => x.id === eventId)
    return e?.negotiations?.[0]
  }

  function handleAccept(eventId: string) {
    const neg = lastNegOf(eventId)
    if (neg) respond.mutate({ negotiationId: neg.id, payload: { responseType: 'accepted' } })
  }
  function handleReject(eventId: string) {
    const neg = lastNegOf(eventId)
    if (neg) respond.mutate({ negotiationId: neg.id, payload: { responseType: 'rejected' } })
  }
  function handleOpen(eventId: string) { nav(`/home/activities/${eventId}`) }

  const currentCounter = counterFor ? pending.find((e) => e.id === counterFor) : null
  const currentNeg = currentCounter?.negotiations?.[0]
  const currentPoints = Number(currentCounter?.pointsAgreed ?? currentCounter?.pointsCalculated ?? 0)

  return (
    <div className="mx-4 mt-2 mb-3 rounded-xl bg-brand-amber/10 border border-brand-amber/30 p-3">
      {pendingCount > 0 && (
        <>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-amber mb-2">
            🎯 Responder ({pendingCount})
          </h4>
          <div className="flex flex-col gap-2">
            {visible.map((ev) => (
              <ActivityActionCard
                key={ev.id}
                activity={{
                  id: ev.id,
                  title: ev.title ?? ev.type,
                  creatorName: ev.creator?.name ?? 'Tu pareja',
                  whenLabel: formatWhen(ev.dateStart),
                  pointsCalculated: Math.round(Number(ev.pointsAgreed ?? ev.pointsCalculated ?? 0)),
                  round: ev.negotiationRound ?? 1,
                }}
                busy={respond.isPending}
                onAccept={handleAccept}
                onReject={handleReject}
                onCounter={(id) => setCounterFor(id)}
                onOpen={handleOpen}
              />
            ))}
          </div>
          {overflow > 0 && (
            <button
              type="button"
              onClick={() => nav('/home/activities')}
              className="block mt-2 text-xs font-bold text-brand-amber"
            >
              …y {overflow} más · Ver todas →
            </button>
          )}
        </>
      )}

      {waitingCount > 0 && (
        <button
          type="button"
          onClick={() => nav('/home/activities')}
          className="mt-3 w-full text-left rounded-lg border border-dashed border-brand-purple/40 bg-brand-purple/10 p-2 text-xs text-text-secondary"
        >
          ⏳ <strong>{waitingCount} solicitudes tuyas</strong> · Ver →
        </button>
      )}

      <CounterOfferSheet
        open={Boolean(counterFor && currentNeg)}
        currentPoints={currentPoints}
        onClose={() => setCounterFor(null)}
        onSubmit={({ pointsProposed, message }) => {
          if (!currentNeg) return
          respond.mutate({
            negotiationId: currentNeg.id,
            payload: { responseType: 'counter_proposed', pointsProposed, message },
          })
          setCounterFor(null)
        }}
      />
    </div>
  )
}

function formatWhen(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}
```

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- ActivitiesBanner
```

Expected: 4 passed.

- [ ] **Step 5: Montar en Dashboard**

Editar `src/frontend/src/pages/Dashboard.tsx`. Añadir import `import { ActivitiesBanner } from '../components/v2/dashboard/ActivitiesBanner'` y en el JSX del return, colocarlo justo después de `<StreakStrip .../>` y antes de `<TodayTasksSection .../>`:

```tsx
<StreakStrip … />
<ActivitiesBanner />
<TodayTasksSection … />
```

- [ ] **Step 6: Validación manual**

`npm run dev`. Entrar a `/dashboard` con 2+ actividades pendientes (o lanzar desde otro usuario): se ven hasta 2 tarjetas con botones. Aceptar una → desaparece, balance cambia, RecentMovements se actualiza. Contraoferta → sheet se abre, enviar → sheet cierra, el detalle muestra ronda 2. Sin pendientes: banner no se muestra.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/components/v2/dashboard/ActivitiesBanner.tsx src/frontend/src/components/v2/dashboard/ActivitiesBanner.test.tsx src/frontend/src/pages/Dashboard.tsx
git commit -m "feat(actividades): actionable ActivitiesBanner on Dashboard with counter-offer sheet"
```

---

### Task 4.3: `RecentMovementsTabs`

**Files:**
- Create: `src/frontend/src/components/v2/dashboard/RecentMovementsTabs.tsx`
- Test: `src/frontend/src/components/v2/dashboard/RecentMovementsTabs.test.tsx`

Misma firma de entrada que `RecentMovements` (array de `Movement`), más un campo nuevo `type: 'activity' | 'task'` y un `eventId`/`taskLogId` para navegar correctamente al tocar.

- [ ] **Step 1: Ampliar el tipo en el shape de Dashboard**

En `Dashboard.tsx` localizar dónde se construye `movements` a partir de `recentActivities`. Verificar que `RecentActivity` ya tiene algún campo que distinga actividades de tareas (buscar en `src/frontend/src/types/activity.ts`). Si no hay: se usa `tx.type` que vuelve del endpoint (`event_accepted`, `task_completed`, `forced_payment`, etc.).

El enriquecimiento que va al widget:

```ts
const movements = recentActivities.slice(0, 50).map((a) => ({
  id: a.id,
  userName: a.userId ? (usersById.get(a.userId) ?? user.name) : user.name,
  action: a.name,
  delta: a.delta ?? 0,
  when: new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  kind: deriveKind(a),   // 'activity' | 'task'
  refId: a.eventId ?? a.taskLogId ?? a.id,
}))
```

`deriveKind` se añade local al Dashboard:

```ts
function deriveKind(a: RecentActivity): 'activity' | 'task' {
  // event_accepted / forced_payment / event_* ⇒ activity
  if (a.type?.startsWith('event') || a.type === 'forced_payment') return 'activity'
  return 'task'
}
```

- [ ] **Step 2: Test del componente**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RecentMovementsTabs } from './RecentMovementsTabs'

const data = [
  { id: '1', userName: 'Edu', action: 'Cena',     delta: -18, when: '20 abr', kind: 'activity', refId: 'e1' },
  { id: '2', userName: 'Blanca', action: 'Cocinar', delta: 12, when: '20 abr', kind: 'task',     refId: 't1' },
  { id: '3', userName: 'Blanca', action: 'Baños',   delta: 8,  when: '19 abr', kind: 'task',     refId: 't2' },
] as const

function wrap(ui: React.ReactElement) { return render(<MemoryRouter>{ui}</MemoryRouter>) }

describe('RecentMovementsTabs', () => {
  it('renders 3 items from All tab', () => {
    wrap(<RecentMovementsTabs movements={[...data]} />)
    expect(screen.getByText(/Cena/)).toBeInTheDocument()
    expect(screen.getByText(/Cocinar/)).toBeInTheDocument()
    expect(screen.getByText(/Baños/)).toBeInTheDocument()
  })

  it('filters by Activities tab', () => {
    wrap(<RecentMovementsTabs movements={[...data]} />)
    fireEvent.click(screen.getByRole('button', { name: /Actividades/ }))
    expect(screen.getByText(/Cena/)).toBeInTheDocument()
    expect(screen.queryByText(/Cocinar/)).not.toBeInTheDocument()
  })

  it('filters by Tasks tab', () => {
    wrap(<RecentMovementsTabs movements={[...data]} />)
    fireEvent.click(screen.getByRole('button', { name: /^Tareas$/ }))
    expect(screen.queryByText(/Cena/)).not.toBeInTheDocument()
    expect(screen.getByText(/Cocinar/)).toBeInTheDocument()
  })

  it('renders empty hint per tab', () => {
    wrap(<RecentMovementsTabs movements={[]} />)
    expect(screen.getByText(/Aún no hay movimientos/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: FAIL + Implementar**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../primitives/Avatar'

export interface MovementVM {
  id: string
  userName: string
  userAvatarEmoji?: string
  userAvatarColor?: string
  action: string
  delta: number
  when: string
  kind: 'activity' | 'task'
  refId: string
}

interface Props { movements: MovementVM[] }
type Tab = 'all' | 'activity' | 'task'

export function RecentMovementsTabs({ movements }: Props) {
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('all')

  const filtered = useMemo(
    () => (tab === 'all' ? movements : movements.filter((m) => m.kind === tab)).slice(0, 3),
    [movements, tab],
  )

  function onRowTap(m: MovementVM) {
    if (m.kind === 'activity') nav(`/home/activities/${m.refId}`)
    else nav(`/home/tasks?logId=${m.refId}`)
  }

  return (
    <div className="mx-4 mb-3.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-text-primary m-0">Últimos movimientos</h3>
        <div className="flex gap-1">
          <ChipTab active={tab === 'all'}      onClick={() => setTab('all')}>Todo</ChipTab>
          <ChipTab active={tab === 'activity'} onClick={() => setTab('activity')}>Actividades</ChipTab>
          <ChipTab active={tab === 'task'}     onClick={() => setTab('task')}>Tareas</ChipTab>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[11px] text-text-tertiary text-center py-3">Aún no hay movimientos.</p>
      ) : (
        <div className="rounded-md bg-[rgba(26,16,53,0.3)] overflow-hidden">
          {filtered.map((m, i) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onRowTap(m)}
              className={['flex items-center gap-2 px-3 py-2.5 w-full text-left bg-transparent border-0',
                i > 0 ? 'border-t border-brd-subtle' : ''].join(' ')}
            >
              <Avatar emoji={m.userAvatarEmoji} color={m.userAvatarColor} size="sm" />
              <div className="flex-1 min-w-0 text-xs">
                <span className="text-text-primary font-semibold">{m.userName}</span>
                <span className="text-text-secondary"> · {m.action}</span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)} MP
              </span>
              <span className="text-[10px] text-text-tertiary">{m.when}</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => nav('/analytics?tab=movements')} className="text-xs text-brand-purple font-bold mt-2">
        Ver historial completo →
      </button>
    </div>
  )
}

function ChipTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-[10px] font-bold',
        active ? 'bg-brand-amber text-white' : 'bg-surface-elevated text-text-secondary border border-brd-subtle',
      ].join(' ')}
    >{children}</button>
  )
}
```

- [ ] **Step 4: PASS**

```bash
cd src/frontend && npm run test -- RecentMovementsTabs
```

Expected: 4 passed.

- [ ] **Step 5: Sustituir en Dashboard**

En `Dashboard.tsx`:
- Cambiar import: de `RecentMovements` a `RecentMovementsTabs`.
- Añadir `deriveKind` helper local.
- Ajustar el objeto de cada movimiento con `kind` + `refId` como se describió en Step 1.
- Sustituir `<RecentMovements movements={movements} />` por `<RecentMovementsTabs movements={movements} />`.

**Nota:** el endpoint `/api/points/history` devuelve `relatedEventId` y `relatedTaskLogId` (ver `CLAUDE.md §6`). Si `RecentActivity` en `types/activity.ts` no los expone, ampliarlo:

```ts
export interface RecentActivity {
  id: string
  type: string
  name: string
  delta?: number
  date: string
  userId?: string
  eventId?: string       // relatedEventId del backend
  taskLogId?: string     // relatedTaskLogId del backend
}
```

Verificar `fetchRecentActivity` en `apiClient.ts` para ver qué nombre usan los campos y mapear consistentemente.

- [ ] **Step 6: Validación manual**

`npm run dev`, ir a Dashboard. Chips Todo/Actividades/Tareas filtran. Tap en una fila de actividad → `/home/activities/:id`. Tap en una de tarea → `/home/tasks?logId=xxx` y, si `Tasks.tsx` ya procesa ese query param, se abre el panel correspondiente.

- [ ] **Step 7: Commit**

```bash
git add src/frontend/src/components/v2/dashboard/RecentMovementsTabs.tsx src/frontend/src/components/v2/dashboard/RecentMovementsTabs.test.tsx src/frontend/src/pages/Dashboard.tsx src/frontend/src/types/activity.ts
git commit -m "feat(actividades): RecentMovementsTabs with All/Activities/Tasks chips"
```

---

# FASE 5 — Limpieza

**Objetivo:** Eliminar archivos muertos. Mantener redirects como puente permanente.

**Mergeable:** Sí, al final. Recomendable en PR separado para mantener el diff limpio.

---

### Task 5.1: Borrar `RequestInbox.tsx` y `RecentMovements.tsx`

**Files:**
- Delete: `src/frontend/src/pages/RequestInbox.tsx`
- Delete: `src/frontend/src/components/v2/dashboard/RecentMovements.tsx`
- Modify: `src/frontend/src/App.tsx`

- [ ] **Step 1: Verificar que nadie importa `RequestInbox`**

```bash
grep -rn "RequestInbox" src/frontend/src --include="*.ts" --include="*.tsx"
```

Sólo debería aparecer en `App.tsx` (la ruta legacy `/inbox` y `/request-inbox` que redirigen). Si aparece algo más → revisar.

- [ ] **Step 2: Borrar import + sustituir ruta**

En `App.tsx`:
- Quitar `import RequestInbox from './pages/RequestInbox'`.
- La ruta `/inbox` ya es un `<Navigate to="/home/activities" replace />` desde Fase 2.
- La ruta `/request-inbox` también. Verificar y si renderiza `RequestInbox` directamente, cambiar a redirect.

- [ ] **Step 3: Eliminar los archivos**

```bash
rm src/frontend/src/pages/RequestInbox.tsx
rm src/frontend/src/components/v2/dashboard/RecentMovements.tsx
```

- [ ] **Step 4: Grep RecentMovements**

```bash
grep -rn "RecentMovements" src/frontend/src --include="*.ts" --include="*.tsx"
```

Sólo debería salir `RecentMovementsTabs`. Si el Dashboard conserva el import viejo (typo), corregirlo.

- [ ] **Step 5: type-check + build + test**

```bash
cd src/frontend && npm run type-check && npm run build && npm run test
```

Expected: los tres pasan.

- [ ] **Step 6: Commit**

```bash
git add -A src/frontend/src/
git commit -m "chore(actividades): remove RequestInbox and legacy RecentMovements"
```

---

### Task 5.2: Validación E2E manual final

**Files:** — (no code changes)

- [ ] **Step 1: Flow completo en dev**

```bash
cd src/backend && npm run dev &
cd src/frontend && npm run dev
```

Recorrer la lista de la sección 9 del spec (E2E manual antes de deploy):
1. Aceptar 1 actividad desde el banner → balance cambia, Historial muestra Aprobada.
2. Crear solicitud → aparece en "Tus solicitudes esperando" de Activas.
3. Contraofertar una pendiente desde el banner → partner la ve con ronda 2.
4. Forzar tras 2 rondas → descuento en mi propio saldo.
5. Filtrar Historial por Aprobadas + Yo + Semana → sólo las correctas.
6. Tocar una fila de `RecentMovementsTabs` (actividad) → abre detalle.
7. Tocar una fila (tarea) → abre `/home/tasks?logId=xxx` y funciona.
8. Regresión: `/tasks?logId=xxx` (URL vieja) → redirect preserva el query y abre el panel.

Si algo falla, abrir un bug aparte; no bloquea este plan.

- [ ] **Step 2: Verificaciones automatizadas previas al merge**

```bash
cd src/frontend && npm run type-check && npm run lint && npm run test && npm run build
```

Todos deben pasar. Si el lint marca warnings en los archivos nuevos, corregir.

- [ ] **Step 3: Commit final si se aplicó algún fix**

```bash
git add -A
git commit -m "chore(actividades): lint fixes after E2E"
```

---

## Resumen de commits (orden)

```
chore(frontend): install vitest + react testing library
chore(frontend): configure vitest with jsdom + testing-library setup
test(frontend): add renderWithProviders helper for RTL
feat(actividades): extract ActivityDetail page from RequestInbox
refactor(actividades): RequestInbox delegates detail view to ActivityDetail route
feat(actividades): HomeSelector chip component
feat(actividades): Home page with last-selector redirect
feat(actividades): add /home/* routes and legacy redirects
feat(actividades): BottomNav Tareas→Hogar + request post-submit redirect
feat(actividades): useActivities hook + invalidation helper
feat(actividades): ActivityActionCard + ActivityWaitingCard
feat(actividades): HistoryFilters component
feat(actividades): Activities page with Active + History tabs wired to /home/activities
refactor(actividades): RequestInbox keeps only task-verification tab
feat(actividades): CounterOfferSheet bottom sheet
feat(actividades): actionable ActivitiesBanner on Dashboard with counter-offer sheet
feat(actividades): RecentMovementsTabs with All/Activities/Tasks chips
chore(actividades): remove RequestInbox and legacy RecentMovements
```

Cada bloque (0, 1, 2, 3, 4, 5) es mergeable a `main` de forma independiente tras su último commit.
