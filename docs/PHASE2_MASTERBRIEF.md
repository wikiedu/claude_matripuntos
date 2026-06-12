# PHASE2_MASTERBRIEF — Matripuntos
## Auditoría profunda + refactor total + brainstorming con Plan Max

> **Para qué:** brief completo para sesiones intensivas con el Plan Max de Claude.
> Cada módulo es una sesión de ~5h (~150k tokens). Auto-contenido: no necesitas
> explorar el repo — todo lo que necesitas para el 90% del trabajo está aquí.
> El 10% restante son los archivos citados por archivo:línea en cada módulo.
>
> **Estado de entrada:** `main` en tag `v2.9.0` (post-refactor/opus-4-8). Ver §2.

---

## 0. Cómo usar este brief

### Flujo de sesión
1. **Arranque**: `/model <max>` + `/effort high`. Lee este archivo + `docs/TODO_PHASE2.md`.
2. **No explores el repo a ciegas**: lee solo los archivos citados en el módulo activo.
3. **Checkpoint al 75% de contexto**: commit de lo que esté verde → anota en `docs/TODO_PHASE2.md` → `/clear`.
4. **Una pieza lógica por commit**: `type-check 0 + test:e2e 12 verdes` antes de cada commit.
5. **Si te bloqueas**: anota bloqueo en `docs/TODO_PHASE2.md` y para. No improvises arquitectura.

### Comandos de verificación (idénticos para TODO el trabajo)
```bash
# Backend
cd src/backend
npx prisma generate && npm run type-check    # → 0 errores
npm run test:e2e                             # → 4 suites / 12 tests verdes

# Frontend
cd src/frontend
npx tsc --noEmit                             # → 0 errores
npm run build                               # → sin errores críticos
```

### Reglas de commit
```
Co-Authored-By: claude-flow <ruv@ruv.net>
```
Formato: `fix(security):`, `perf(frontend):`, `refactor(backend):`, `feat:`, `test:`, `docs:`

---

## 1. Estado post-refactor (v2.9.0) — qué hay hecho y qué NO TOCAR

### ✅ Ya hecho en refactor/opus-4-8
- `strict:true` en backend (0 errores), helper `requireAuth(req)` tipado
- Pino logger central (`src/lib/logger.ts`), 131 `console.*` sustituidos
- `apiClient.ts` partido en 12 módulos de dominio (`services/api/*`)
- `Tasks.tsx` descompuesto (1132→563 ln), 6 componentes de sección
- V2 negociación deprecada retirada + E2E flujo #3 contra V1 canónica
- PWA Fase 1: vite-plugin-pwa, SW con push handler, `WEB_PUSH_ENABLED=true`
- Helper `parseJsonField` — 36 `JSON.parse` inseguros sustituidos
- N+1 recurrente semanal batched por pareja
- Refresh tokens: código completo (bcrypt 10→12, `maybeIssueRefreshPair`)
- E2E harness: 4 suites / 12 tests (postgres embebido, sin Docker)

### 🚫 NO TOCAR (lista definitiva — si la tocas, rompes algo sutil)
| Qué | Por qué |
|---|---|
| `services/pointsCalculator.ts` | Fórmula con tests unitarios. Fuente de verdad. |
| `services/negotiationEngine.ts` | Concurrencia con `$transaction` + status guards muy sutil. Sin consumidores pero no borrar hasta revisar con tests. |
| `lib/prisma.ts` (singleton) | Nunca `new PrismaClient()` por archivo. |
| Rutas V1 (`/api/negotiations`, `/api/tasks`, etc.) | Consumidores activos. NO eliminar. |
| Aislamiento `coupleId` app-level | Único filtro de datos entre parejas. Sin RLS debajo. No migrar a RLS sin un sprint dedicado. |
| Patrón mobile-first Tailwind | `max-w-[500px]`, `base + sm:/md:`. No invertir a desktop-first. |
| `validateEnv()` fail-fast | No comentar ni debilitar. |

---

## 2. Módulo A — Seguridad S0/S1 ⚡ PRIORIDAD 1
**Duración estimada:** 2-3h. **Riesgo:** ALTO en S1-2, MEDIO en S0.

### A.1 — Math.random() → crypto (S0-1, S0-2)
Dos usos de `Math.random()` en contextos criptográficos:

**Fix A.1a — Código de borrado de cuenta** (`src/backend/src/routes/account.ts:35`)
```typescript
// ANTES (weak):
const code = String(Math.floor(100000 + Math.random() * 900000))

// DESPUÉS (crypto seguro):
import { randomInt } from 'crypto'
const code = String(randomInt(100000, 1000000))  // [100000, 999999]
```

**Fix A.1b — secretKey de pareja** (`src/backend/src/services/invitationService.ts:56,159`)
```typescript
// ANTES (weak, predecible con timestamp):
secretKey: `couple_${Date.now()}_${Math.random().toString(36).slice(2)}`

// DESPUÉS (32 bytes hex, crypto seguro):
import { randomBytes } from 'crypto'
secretKey: `couple_${randomBytes(16).toString('hex')}`
```

**Fix A.1c — jitter email** (`src/backend/src/services/emailService.ts:49`)
```typescript
// ANTES: Math.random() — impacto low pero anti-pattern
const jitter = Math.round(ms * (0.75 + Math.random() * 0.5))

// DESPUÉS (crypto.getRandomValues):
const buf = new Uint8Array(4)
crypto.getRandomValues(buf)
const ratio = 0.75 + (buf[0] / 255) * 0.5
const jitter = Math.round(ms * ratio)
```

**Verificación A.1:** `npm run type-check` + `test:e2e` + test unitario de emailService.

---

### A.2 — Audit IDOR en invitations.ts V2 (S1-3)
`src/backend/src/routes/invitations.ts` tiene Sunset vencido (01 Jun 2026) y NO fue auditado
para IDOR cross-couple en Fase 0. Endpoints críticos:
- `POST /invite-partner` — crea invitación sin check de coupleId en `fromUserId`?
- `POST /accept-link-partner` — acepta propuesta: ¿valida que el proposalId pertenece a req.coupleId?
- `GET /pending-link-requests` — ¿filtra por coupleId o solo userId?

**Tarea A.2:**
1. Lee `src/backend/src/routes/invitations.ts` completo.
2. Para cada handler que toca la BD: verifica que el WHERE incluye coupleId o userId del JWT.
3. Añade guards donde falten.
4. Escribe test cross-couple (patrón: create invite en couple A, intentar accept desde couple B → 404/403).
5. Anota si la ruta entera puede retirarse o si sigue siendo V1 también.

---

### A.3 — Update axios + npm audit fix (S1-1)
```bash
cd src/frontend
npm audit                          # Ver severidad y qué fix hay
npm audit fix --force              # Solo si no hay breaking changes
npx tsc --noEmit                   # Verificar que no rompe tipos
npm run build                      # Verificar build
```

También revisar `package.json` de backend:
```bash
cd src/backend && npm audit
```

---

### A.4 — Credenciales hardcoded en seed (S2-2)
`src/backend/prisma/seed.ts` — verifica que no hay contraseñas reales (solo debe haber hashes bcrypt de passwords de test como "test1234"). Si hay passwords literales, reemplazar por `bcrypt.hashSync('test1234', 10)`.

---

### A.5 — DECISIÓN ARQUITECTÓNICA: localStorage JWT → httpOnly cookies (S1-2)
`src/frontend/src/services/api/http.ts:28,36` — `auth_token` y `refresh_token` en localStorage.

**Riesgo real:** XSS puede robar tokens. **Impacto de migrar:** enorme (backend + frontend).

**Recomendación para esta sesión:** NO migrar todavía — documentar como deuda en `docs/TODO_PHASE2.md` con plan de implementación (Set-Cookie httpOnly en `/auth/login`, interceptor frontend que ya no usa localStorage, CSRF token para mutaciones). Si el usuario quiere proceder, dedicar una sesión completa solo a esto.

---

## 3. Módulo B — Performance: Bundle + DB + Queries ⚡ PRIORIDAD 2
**Duración estimada:** 4-5h. **Riesgo:** BAJO-MEDIO.

### B.1 — Code splitting (QUICK WIN ENORME)
**Problema:** El bundle es UN SOLO CHUNK de **898 KB** (gzip: 246 KB). No hay lazy loading.
Todo el app se carga en el primer request.

**Fix B.1 — Lazy loading de rutas pesadas** (`src/frontend/src/App.tsx`):
```typescript
// Importar React.lazy para todas las páginas (no el shell):
import { lazy, Suspense } from 'react'

const Tasks = lazy(() => import('./pages/Tasks'))
const Activities = lazy(() => import('./pages/Activities'))
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'))
const Calendar = lazy(() => import('./pages/Calendar'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Journal = lazy(() => import('./pages/Journal'))
const Settings = lazy(() => import('./pages/Settings'))
const ShoppingListPage = lazy(() => import('./pages/ShoppingListPage'))
const TodoListPage = lazy(() => import('./pages/TodoListPage'))
// ... etc, exceptuando Home/Login/Signup (críticos para LCP)

// Wrappear rutas con Suspense + Skeleton
<Suspense fallback={<SkeletonList />}>
  <Routes>...</Routes>
</Suspense>
```

**Resultado esperado:** chunk principal ~200KB + chunks por ruta ~30-80KB cada uno.
Verificar con `npm run build` — debe mostrar múltiples chunks.

También revisar `vite.config.ts` — añadir `manualChunks` para librerías pesadas:
```typescript
manualChunks: {
  'vendor-recharts': ['recharts'],
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-query': ['@tanstack/react-query'],
}
```

---

### B.2 — Índices DB faltantes (Prisma)
`src/backend/prisma/schema.prisma` — tablas con consultas frecuentes sin índices:

Candidatos a añadir (verificar con EXPLAIN en Supabase o testing local):
```prisma
// Event — búsquedas frecuentes por pareja + estado
@@index([coupleId, status])
@@index([coupleId, dateStart])

// TaskLog — filtros por pareja + rango de fechas
@@index([task.coupleId, date])   // via join

// Notification — unread count por usuario
@@index([userId, isRead])
@@index([userId, createdAt])

// CalendarEntry — calendario por pareja + mes
@@index([coupleId, date])

// MoodLog — historial por usuario + fecha
@@index([userId, createdAt])

// JournalEntry — entries por pareja + fecha
@@index([coupleId, createdAt])
```

Para cada índice añadido: `npm run migrate` en local + verificar que migration aplica.

---

### B.3 — N+1 restantes en analytics y calendar
`src/backend/src/services/analyticsService.ts` y `analyticsAggregator.ts` — verificar si hay
loops con queries dentro. Patrón a buscar:
```typescript
// MALO: N+1
for (const item of items) {
  const detail = await prisma.model.findUnique({ where: { id: item.id } })
}

// BIEN: batch
const ids = items.map(i => i.id)
const details = await prisma.model.findMany({ where: { id: { in: ids } } })
```

`src/backend/src/services/calendarService.ts` — el endpoint `/calendar/month/:y/:m` hace
múltiples queries independientes. Evaluar si se pueden paralelizar con `Promise.all`.

---

### B.4 — Fuentes Inter innecesarias
El build genera **~50 archivos de fuentes** (woff + woff2 para 5 subsets × 5 pesos × 2 formatos).
En `vite.config.ts` o la configuración de `@fontsource/inter`, restringir a solo latin + latin-ext:
```typescript
// En main.tsx o index.css:
import '@fontsource-variable/inter/latin.css'      // solo latin
// Eliminar: cyrillic, greek, cyrillic-ext si no hay usuarios de esos idiomas
```

---

## 4. Módulo C — Arquitectura + Deuda técnica ⚡ PRIORIDAD 3
**Duración estimada:** 3-4h. **Riesgo:** MEDIO.

### C.1 — Evaluar y retirar negotiationEngine.ts
`src/backend/src/services/negotiationEngine.ts` — **sin consumidores** desde T3 (retirada de
la ruta V2). El servicio queda como código muerto.

**Tarea C.1:**
1. `grep -r "negotiationEngine" src/backend/src/ --include="*.ts"` — confirmar 0 importaciones.
2. Si 0: borrar archivo + actualizar `TODO_PHASE2.md`.
3. Verificar que los tests unitarios de `tests/negotiationEngine.test.ts` siguen útiles como
   documentación (si no, borrar también).
4. `type-check 0 + test:e2e 12 verdes`.

---

### C.2 — Plan migración achievements V1 → V2
`src/backend/src/routes/achievements.ts` — las rutas V1 están detrás de `LEGACY_ACHIEVEMENTS_ENABLED`
(default: `true`). El frontend aún no consume V2 canónico desde el dashboard.

**Tarea C.2:** mapear qué componentes frontend consumen `/api/achievements` (V1) vs `/api/achievements-v2`.
Archivo: `src/frontend/src/hooks/` — buscar `useAchievements*`. Si los componentes del dashboard
ya consumen V2, cambiar el flag default a `false` y añadir E2E.

---

### C.3 — Error boundaries en frontend
`src/frontend/src/App.tsx` o `src/frontend/src/layout/AuthedLayout.tsx` — no hay `ErrorBoundary`.
Si un componente hijo lanza, la app entera se queda en blanco sin mensaje.

**Fix C.3:**
```typescript
// src/frontend/src/components/ErrorBoundary.tsx (nuevo)
class ErrorBoundary extends React.Component<...> {
  // Render fallback UI + log a Sentry si SENTRY_DSN está configurado
}

// En App.tsx: wrappear cada ruta con ErrorBoundary propio
```

---

### C.4 — Remaining `any` types + implicit type widening
Con `strict:true` activo, puede haber `any` explícitos en handlers o servicios. Buscar:
```bash
grep -rn ": any\|as any\|<any>" src/backend/src/ --include="*.ts" | grep -v "\.d\.ts" | grep -v test
grep -rn ": any\|as any" src/frontend/src/ --include="*.ts" --include="*.tsx" | grep -v test
```
Resolver los más críticos (rutas de auth, negotiation, puntos).

---

### C.5 — Invitations.ts V2: plan de retirada
`src/backend/src/routes/invitations.ts` tiene Sunset vencido pero sigue activo porque
`StepJoinAccount.tsx` y `Onboarding.tsx` la usan. **Tarea de mapeo:**
1. Leer `src/frontend/src/pages/onboarding/StepJoinAccount.tsx` — qué endpoints llama.
2. Leer `src/frontend/src/routes/invitations.ts` — qué rutas existen.
3. Determinar si las rutas que usa el onboarding tienen equivalente en V1 (`authRoutes.ts`).
4. Documentar plan de migración en `docs/TODO_PHASE2.md`.

---

## 5. Módulo D — Brainstorming: Features + Mejoras de lógica ⚡ PRIORIDAD 4
**Duración estimada:** 4-5h (análisis + propuestas detalladas). **Riesgo:** 0 (sin código).

Este módulo es **100% análisis y propuestas** — no escribe código, escribe un doc de decisiones.
Salida: `docs/PHASE2_FEATURE_PROPOSALS.md` con propuestas priorizadas.

### D.1 — Análisis del flujo de negociación
Lee `src/frontend/src/pages/ActivityDetail.tsx` + `src/frontend/src/components/EventNegotiationCard.tsx`.
**Preguntas a responder:**
- ¿Es intuitivo el flujo proponer → contraoferta → aceptar para un usuario nuevo?
- ¿Qué pasa cuando expire la ronda sin respuesta? ¿Hay feedback claro?
- ¿El botón "forzar" está suficientemente explicado? (paga de tu propio saldo)
- Propuesta: ¿wizard de negociación con pasos explícitos?
- Propuesta: ¿historial de negociación visible en ActivityDetail?

### D.2 — Gamificación: nivel de engagement actual
Lee `src/backend/src/services/gamificationService.ts` + `challengeService.ts` + `streakService.ts`.
**Preguntas:**
- ¿Los retos semanales tienen suficiente variedad? ¿Cuántos tipos hay?
- ¿El streak diario es demasiado fácil/difícil de mantener?
- ¿La curva de XP/nivel es satisfactoria? (ver fórmula en `achievementEngineV2.ts`)
- ¿Hay momentos de "celebración" suficientes? (level up modal existe, pero ¿qué más?)
- Propuesta: ¿challenges colaborativos pareja vs pareja? ¿tourneos?
- Propuesta: ¿insignias por racha de tareas verificadas?

### D.3 — Push notifications: strategy
`WEB_PUSH_ENABLED=true` pero NO hay UI para suscribirse. El hook `useWebPush.ts` tiene
la función `subscribe()` pero nada la llama.
**Preguntas:**
- ¿Dónde debe aparecer el prompt de activar push? ¿Settings/Notificaciones?
- ¿Qué eventos deben generar push? (negociación nueva, tarea por verificar, reto nuevo)
- ¿Cómo manejar el caso iOS PWA que no soporta push en algunos navegadores?
- Propuesta: onboarding step opcional "¿Recibir notificaciones?" después de instalar PWA.
- Propuesta: `Settings.tsx` → sección "Notificaciones" con toggle por tipo.

### D.4 — Analytics Pro: ¿está siendo útil?
Lee `src/frontend/src/components/v2/analytics/` (todos los archivos).
**Preguntas:**
- ¿El desglose por categoría aporta valor o es demasiado granular?
- ¿La equity curve (gráfico de equilibrio) se entiende sin contexto?
- ¿Los "insights" generados automáticamente son accionables?
- Propuesta: ¿resumen semanal automático por email/push?
- Propuesta: ¿comparativa mes a mes interactiva?
- Propuesta: ¿"punto de inflexión" — detectar cuando el desequilibrio escala?

### D.5 — Supabase Realtime vs polling
Actualmente: polling React Query 30s + `setInterval` 60s en `AuthedLayout.tsx`.
**Análisis a hacer:**
- ¿Qué eventos son time-sensitive? (negociación nueva → sí, stats analytics → no)
- ¿Supabase Realtime selectivo: solo `Event`, `Notification`, `TaskLog`?
- ¿Coste en el free tier de Supabase?
- Propuesta: hybrid — Supabase Realtime para notificaciones + polling para el resto.

### D.6 — Mejoras del sistema de puntos
Lee `docs/PUNTOS.md` + `src/backend/src/services/pointsCalculator.ts`.
**Preguntas:**
- ¿Los multiplicadores de franja horaria incentivan el comportamiento deseado?
- ¿El factor "hijos" (×1.4/1.8/2.2) sigue pareciendo justo con el uso real?
- ¿Existe "inflación de puntos" a largo plazo? ¿Debería haber un techo?
- ¿Las tareas recurrentes tienen puntos base apropiados vs las actividades negociadas?
- Propuesta: ¿"bonificación de consistencia" — puntos extra por N semanas seguidas?

### D.7 — Onboarding: tasa de completado
Lee `src/frontend/src/pages/onboarding/` (todos los steps).
**Preguntas:**
- ¿Es el onboarding demasiado largo? ¿Cuántos steps hay?
- ¿`StepCategories` y `StepRules` son necesarios en el onboarding o pueden ir a Settings?
- ¿`PartnerCatchUp` (cuando un partner se une después) está bien explicado?
- Propuesta: onboarding "rápido" (3 pasos) vs "completo" (10 pasos).
- Propuesta: "tour guiado" al entrar al dashboard (DashboardTour ya existe — ¿se usa?).

### D.8 — Funcionalidades nuevas a explorar
Ideas para roadmap, evaluar factibilidad técnica y valor de negocio:
- **Modo vacaciones** mejorado: tareas pausadas pero puntos congelados (no deuda)
- **Acuerdos recurrentes**: plantillas de negociación para eventos que se repiten
- **Historial de pareja**: timeline visual de todos los eventos/hitos
- **Comparativa con parejas anónimas**: "estáis en el X% más equilibrado"
- **Modo solo** (sin partner) con auto-verificación de tareas
- **Widget iOS/Android** con saldo actual y próxima tarea
- **Exportación de datos en PDF**: resumen mensual/anual para la pareja
- **Modos de categoría custom**: cada pareja define sus propias categorías con pesos

---

## 6. Módulo E — UX/UI Polish ⚡ PRIORIDAD 5
**Duración estimada:** 4-5h. **Riesgo:** BAJO.

### E.1 — Empty states audit
Buscar páginas/secciones que pueden estar vacías y verificar tienen estado vacío:
```bash
grep -rn "\.length === 0\|\.length == 0\|!.*\.length" src/frontend/src/pages/ --include="*.tsx" | grep -v test
```
Páginas sospechosas:
- `ShoppingListPage.tsx` — ¿tiene empty state cuando la lista está vacía?
- `TodoListPage.tsx` — ¿tiene empty state?
- `Journal.tsx` — ¿sin entradas muestra algo útil?
- `Notifications.tsx` — ¿"sin notificaciones" tiene ilustración?
- `Achievements.tsx` tabs de Ranking/Historial — ¿datos vacíos?

Para cada empty state faltante: añadir ilustración emoji + título + CTA accionable.

### E.2 — PWA Install prompt
`src/frontend/src/main.tsx` registra el SW pero no hay prompt de instalación.
**Fix E.2:**
```typescript
// Capturar el evento beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e  // guardarlo
})

// En Settings.tsx o Notifications.tsx: mostrar botón "Instalar app"
// solo si deferredPrompt existe (Chrome/Edge en Android/desktop)
```
En iOS (donde no hay `beforeinstallprompt`): mostrar banner manual con instrucciones
"Pulsa 'Compartir' → 'Añadir a inicio'" si el app no está instalado (`navigator.standalone === false`).

### E.3 — Accessibility audit rápido
```bash
# Buscar botones/inputs sin aria-label
grep -rn "onClick={" src/frontend/src/components/ --include="*.tsx" | grep -v "aria-label\|aria-labelledby\|title=" | head -20
```
Específicamente:
- `BottomNav.tsx` — ¿cada icono tiene `aria-label`?
- `FabActionSheet.tsx` — ¿el FAB tiene descripción accesible?
- Modales: ¿tienen `role="dialog"` + `aria-modal="true"` + `aria-labelledby`?

### E.4 — Loading states consistencia
Verificar que todas las páginas tienen skeleton mientras cargan:
- `Activities.tsx` — ¿usa `SkeletonList` o solo spinner?
- `Calendar.tsx` — ¿esqueleto del grid?
- `Analytics.tsx` — ¿placeholders de las gráficas?
- `Achievements.tsx` — ¿skeleton del ranking?

Componente `Skeleton` existe en `components/v2/primitives/Skeleton.tsx` — verificar adopción.

### E.5 — Settings.tsx organización
`src/frontend/src/pages/Settings.tsx` — posiblemente un god-component.
**Tarea E.5:**
1. Leer Settings.tsx y mapear secciones.
2. Si supera 500 líneas: dividir en tabs (Cuenta / Pareja / Preferencias / Notificaciones).
3. Añadir sección "Notificaciones Push" con toggle que llama `useWebPush().subscribe()`.

### E.6 — Calendario: UX day view + event cards
`src/frontend/src/pages/Calendar.tsx` + `components/v2/calendar/` —
el Calendar day view puede estar incompleto o sin acciones directas desde el card.
**Tarea E.6:**
1. Revisar el flujo de crear/editar un evento desde el calendario.
2. ¿Se puede navegar desde el CalendarEntry a ActivityDetail?
3. ¿Los service providers recurrentes son visibles en el calendario?

### E.7 — Journal UX improvements
`src/frontend/src/pages/Journal.tsx` —
- ¿El prompt del día está visible antes de hacer scroll?
- ¿Las retrospectivas mensuales tienen un CTA claro para verlas?
- ¿La reacción a una entrada de la pareja es fácil (un tap)?

### E.8 — Dark mode consistency
```bash
grep -rn "bg-white\|text-black\|text-gray-900" src/frontend/src/ --include="*.tsx" | grep -v "dark:" | head -20
```
Cualquier color hardcodeado sin variante `dark:` puede romper el dark mode. Revisar y añadir variantes donde falten.

---

## 7. Módulo F — Testing + Cobertura ⚡ PRIORIDAD 6
**Duración estimada:** 3-4h. **Riesgo:** BAJO.

### F.1 — E2E: flujos UI sin cobertura (deuda T2 + T3)
Los siguientes flujos tienen cobertura 0 de E2E porque son interacciones UI puras:

**F.1a — Tasks.tsx visual** (deuda T2):
- Flujo: abrir tab "Hoy" → marcar tarea → verificar que desaparece de pendientes
- Flujo: navegar a "Semana" → ver WeekStrip → navegar entre semanas
- Flujo: abrir catalog → añadir tarea → aparece en lista

**F.1b — Calendar EventNegotiationCard** (deuda T3):
- Flujo: abrir evento en Calendar → click "Proponer" → se abre negociación
- Flujo: aceptar una negociación desde el Calendar card
- Flujo: link "Ver detalle" → navega a ActivityDetail correcta

Usar Playwright (ya instalado en `src/frontend/test/` si existe) o añadir a los E2E de Playwright.

### F.2 — Contract tests para invitations V2
Una vez auditado en Módulo A.2, añadir:
- Test cross-couple: accept invite de otra pareja → 403/404
- Test token expirado: usar invitation token expirado → 400
- Test token reutilizado: usar invitation ya aceptada → 409

### F.3 — Aumentar cobertura de unit tests
Servicios con 0 tests unitarios (candidatos):
- `activityTemplateService.ts` — lógica de catálogo
- `achievementCheckService.ts` — lógica de logros (tiene unit test pero ¿cubre edge cases?)
- `calendarService.ts` — recurrencia de entries
- `insightsGenerator.ts` — generación de insights (ya tiene test, ampliar)

### F.4 — Ejecutar suite completa y reportar
```bash
cd src/backend
npm test 2>&1 | tail -30   # toda la suite (unit + integration + e2e)
```
Identificar tests que pasan en rojo (hay 24 DB-bound tests que fallan en local sin Postgres).
Documentar cuáles son esperables (DB-bound sin setup) vs cuáles son bugs reales.

---

## 8. Módulo G — Architecture + Future-proofing ⚡ PRIORIDAD 7
**Duración estimada:** 3-4h (análisis + implementación parcial). **Riesgo:** MEDIO.

### G.1 — Capacitor: preparar el frontend para native
El roadmap indica Vite SPA como base para futuro Capacitor (iOS/Android nativo).
**Análisis:**
- ¿Existen llamadas a APIs web-only que Capacitor no soporta? (`navigator.serviceWorker`, `window.location`)
- ¿El router usa `BrowserRouter` (correcto para Capacitor con base URL)? 
- ¿Las imágenes de prueba de tareas (`TASK_PROOF_ENABLED`) usan `<input type="file">`? ¿Funciona en native?
- ¿Los deep links para invitaciones funcionarían en native?

### G.2 — Supabase Realtime selective implementation
Si se decide en Módulo D.5:
- Instalar `@supabase/supabase-js` en frontend
- Subscribe solo a tabla `Notification` (userId scope)
- Subscribe a tabla `Event` (coupleId scope, solo status changes)
- Reducir polling de 30s a 5m para el resto

### G.3 — httpOnly cookies JWT (plan detallado)
Si se decide en Módulo A.5:
Plan de implementación:
1. Backend: `POST /auth/login` devuelve `Set-Cookie: auth_token=...; httpOnly; SameSite=Lax; Secure`
2. Frontend: `http.ts` elimina localStorage, las cookies se envían automáticamente
3. CSRF: añadir `X-CSRF-Token` en mutaciones (o usar `SameSite=Strict`)
4. CORS: verificar `credentials: 'include'` en fetch
5. Mobile/Capacitor: evaluar compatibilidad

### G.4 — Rate limiting audit completo
`src/backend/src/middleware/rateLimiter.ts` + `src/backend/src/server.ts` — verificar que
TODOS los endpoints públicos y auth tienen rate limit configurado:
- `/api/auth/forgot-password` — debe ser muy restrictivo (anti-spam)
- `/api/auth/login` — ¿per-IP o per-email?
- `/api/auth/register` — ¿límite de registros por IP?
- `/api/premium/interest` — ya tiene rate limit
- Endpoints de upload (prueba imagen) — ¿tienen límite de size/rate?

---

## 9. Estado de TODO_PHASE2.md (crear al inicio)
Al comenzar la Fase 2, crear `docs/TODO_PHASE2.md` con esta estructura:

```markdown
# TODO_PHASE2 — estado vivo de la Fase 2

## Hecho
(vacío al inicio)

## En progreso
(tarea actual)

## Pendiente
- [ ] A.1 Math.random() → crypto (account.ts:35, invitationService.ts:56,159)
- [ ] A.2 IDOR audit invitations.ts V2
- [ ] A.3 npm audit fix axios
- [ ] A.4 Hardcoded test credentials en seed
- [ ] B.1 Code splitting + lazy loading (bundle 898KB → ~200KB)
- [ ] B.2 DB indexes (Event, TaskLog, Notification, CalendarEntry, MoodLog)
- [ ] B.3 N+1 analytics + calendar (Promise.all)
- [ ] B.4 Fuentes Inter → solo latin
- [ ] C.1 Evaluar + retirar negotiationEngine.ts
- [ ] C.2 Plan achievements V1→V2 migration
- [ ] C.3 ErrorBoundary frontend
- [ ] C.4 Remaining `any` types
- [ ] C.5 Plan retirada invitations.ts V2
- [ ] D.1-D.8 Brainstorming docs (sin código)
- [ ] E.1-E.8 UX/UI polish
- [ ] F.1-F.4 Testing coverage
- [ ] G.1-G.4 Architecture
```

---

## 10. Prompt de arranque para cada sesión

### Sesión 1 (Módulo A — Seguridad)
```
Eres el ejecutor de la Fase 2 de Matripuntos (rama main, tag v2.9.0).

Lee SOLO estos archivos antes de empezar:
1. docs/PHASE2_MASTERBRIEF.md (este brief)
2. docs/TODO_PHASE2.md (estado vivo)

Tarea de esta sesión: Módulo A — Seguridad S0/S1.

Contexto: post-refactor/opus-4-8. strict:true, pino logger, E2E harness (4 suites/12 tests).
Lista NO TOCAR: negotiationEngine.ts, pointsCalculator.ts, Prisma singleton, rutas V1, coupleId aislamiento.

Empezar por A.1 (Math.random → crypto), luego A.2 (IDOR invitations audit), A.3 (npm audit),
A.4 (seed credentials). A.5 es DECISIÓN ARQUITECTÓNICA — documentar el plan pero NO implementar.

Antes de cada commit: cd src/backend && npx prisma generate && npm run type-check && npm run test:e2e
Commits: Co-Authored-By: claude-flow <ruv@ruv.net>

Al 75% de contexto: commit lo que esté verde + actualiza TODO_PHASE2.md + para.

Confirma en 3 líneas tu plan para hoy. Luego ejecútalo.
```

### Sesión 2 (Módulo B — Performance)
```
[Mismo encabezado, sustituir módulo]
Tarea: Módulo B — Performance: bundle split + DB indexes + queries.

Empezar por B.1 (code splitting) que tiene el mayor impacto. Luego B.2 (DB indexes).
B.3 y B.4 si hay tiempo.

IMPORTANTE en B.1: verificar que `npm run build` produce múltiples chunks Y que `npx tsc --noEmit`
y `test:e2e` siguen verdes ANTES de commitear. El lazy loading NO debe afectar el comportamiento.
```

### Sesión 3 (Módulo C — Deuda técnica)
```
Tarea: Módulo C — Arquitectura + deuda técnica.
Empezar por C.1 (negotiationEngine.ts candidato a borrar — verificar 0 consumidores).
C.2, C.3, C.4, C.5 en ese orden.
```

### Sesión 4 (Módulo D — Brainstorming)
```
Tarea: Módulo D — Brainstorming de features y mejoras.
Esta sesión NO escribe código. Escribe docs/PHASE2_FEATURE_PROPOSALS.md con:
- Análisis de cada punto D.1-D.8
- Para cada uno: situación actual, problema identificado, 2-3 propuestas con pros/contras,
  esfuerzo estimado (S/M/L), recomendación
- Al final: ranking de las 5 propuestas más impactantes con plan de implementación resumido
No hagas commits de código. Solo el doc.
```

### Sesión 5 (Módulo E — UX/UI)
```
Tarea: Módulo E — UX/UI polish.
Empezar por E.2 (PWA install prompt) + E.1 (empty states audit).
E.3-E.8 según tiempo disponible.
Verificación: frontend tsc --noEmit + npm run build OK.
```

---

## Apéndice: Contexto técnico rápido (no releer CLAUDE.md)

**Imports ESM backend:** extensión `.js` aunque el archivo sea `.ts`.
**Auth en handlers:** `requireAuth(req).userId` / `.coupleId` (helper `src/lib/requireAuth.ts`).
**Logger:** `import logger from '../lib/logger.js'` — NO `console.*`.
**Errores:** `res.status(4xx).json({ error: 'mensaje legible' })`.
**Prisma singleton:** `import prisma from '../lib/prisma.js'`.
**Frontend state:** Zustand (`useAppStore`) para auth/couple global, React Query para servidor.
**Test E2E:** `cd src/backend && npm run test:e2e` (PostgreSQL embebido, sin Docker, ~13s).
**Branch activo:** `main` (para esta fase no hace falta rama separada; cada módulo es un bloque de commits).
