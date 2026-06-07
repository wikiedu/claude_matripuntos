# CLAUDE_AUDIT.md — Auditoría pre-refactor de Matripuntos

> **Fecha:** 2026-06-07 · **Rama:** `refactor/opus-4-8` · **Modo:** solo lectura (no se modificó código).
> Metodología: lectura directa del árbol + 3 investigaciones paralelas (seguridad, code smells/performance, realtime+mobile), con verificación manual de los hallazgos críticos. Toda afirmación lleva evidencia `ruta:línea`. Donde no hay evidencia, se dice "no encontrado".

---

## ⚠️ Aviso previo — tres supuestos del encargo que NO se sostienen

Antes de entrar en materia, hay que corregir el punto de partida, porque condiciona todo el refactor:

1. **NO es Next.js.** Es **Vite 5 + React 18 + react-router-dom 6** (SPA pura). No hay `next.config.*`, no hay `app/` ni `pages/` de Next, no hay SSR/RSC. (`src/frontend/package.json`, ausencia de `next`).
2. **NO hay backend realtime.** No existe `@supabase/supabase-js`, ni Firebase, ni `socket.io`, ni `ws`, ni SSE/`EventSource` — ni en dependencias ni en código. La "conexión en tiempo real entre A y B" es **polling de React Query cada 30s** + un `setInterval` de 60s. Supabase se usa **solo como Postgres alojado** (cadena de conexión de Prisma), no como realtime ni como auth.
3. **`ESTADO_PRE_REFACTOR.md` es una plantilla vacía sin rellenar.** Sus líneas son literalmente `[features que funcionen]`, `[bugs conocidos]`, `[acción principal de Matripuntos]`. Me pediste leerlo "para saber qué funciona hoy" — pero no contiene información real. **Lo que afirma sí dice ("Conexión realtime cuando ambos están logueados") es engañoso**: esa conexión es polling, no realtime. Si quieres un baseline fiable de features, hay que construirlo (ver §10).

El stack real, por tanto, es un **monorepo Vite-SPA + API REST Express/Prisma** bastante más convencional (y más sano) de lo que sugería el brief. La buena noticia: es un terreno conocido y refactorizable. La mala: si el rediseño asume realtime nativo o Next.js, hay que decidir eso *antes* de tocar nada (§10).

---

## 1. Stack real detectado

| Aspecto | Realidad | Evidencia |
|---|---|---|
| **Framework** | React 18.2 SPA con **Vite 5.0.8** (no Next.js) | `src/frontend/package.json`; sin `next.config.*` |
| **Router** | `react-router-dom` 6.20 — ni `app/` ni `pages/` de Next; las "pages" son componentes en `src/frontend/src/pages/` | `App.tsx`, `package.json` |
| **TypeScript** | Sí. **Frontend `strict: true`**. **Backend `strict: false` + `noImplicitAny: false`** ⚠️ | `src/frontend/tsconfig.json`; `src/backend/tsconfig.json` |
| **Backend "realtime"** | **No hay.** API REST Express 4.18 + Prisma 5.7. Sync A↔B = polling React Query (30s) + `setInterval` 60s | `package.json`; `src/frontend/src/layout/AuthedLayout.tsx:31-58` |
| **DB** | PostgreSQL en producción (**Supabase como host**, sin RLS porque Prisma usa conexión directa) · SQLite en local | `prisma/schema.prisma`; `DATABASE_URL` |
| **Auth** | **JWT custom** (`jsonwebtoken` HS256, 7d) + `bcryptjs` (10 rounds). Refresh-token rotation implementado pero **inactivo**. No es un provider gestionado | `services/authService.ts:10-18`; `services/refreshTokenService.ts`; `middleware/authMiddleware.ts` |
| **Estado** | **Zustand** 4.4 (auth/user/couple global) + **React Query** 5.28 (server state) | `store/useAppStore.ts`; `App.tsx:35-44` |
| **Styling** | **Tailwind CSS 3.3** + `tailwind-merge` + `clsx` + `tailwindcss-animate`. Iconos Lucide | `package.json`; `tailwind.config` |
| **Observabilidad** | Sentry (front + back) + PostHog (front + back) | `@sentry/*`, `posthog-*` en deps |
| **Otros** | Stripe (pagos, esqueleto), web-push (VAPID, **roto**, ver §3), node-cron (jobs), Resend (email) | `package.json` |

---

## 2. Mapa de arquitectura

### Árbol comentado (resumen — el detalle completo está en `CLAUDE.md` §3, ya actualizado)

```
Matripuntos/
├── packages/shared/         # Zod schemas compartidos back↔front + catálogo de eventos de telemetría.
│                            #   Se compila a dist/ y el backend lo importa. CORE de contrato.
├── scripts/                 # Utilidades de operación (reconcile migraciones, seed prod, start/stop server)
├── src/
│   ├── frontend/src/
│   │   ├── pages/           # 23 páginas = rutas React Router (Home, Tasks, Activities, Calendar,
│   │   │                    #   Analytics, Achievements, Journal, Settings, auth, onboarding/, legal/)
│   │   ├── components/      # 8 legacy en raíz + components/v2/ con 19 subcarpetas por dominio (UI nueva)
│   │   │   └── v2/primitives/   # Design system propio (Button, Card, BottomSheet, Input, Avatar…)
│   │   ├── layout/          # AuthedLayout.tsx ← AQUÍ vive el "realtime" (polling). CORE.
│   │   ├── hooks/           # ~23 hooks React Query, 1 por dominio
│   │   ├── store/           # useAppStore.ts (Zustand)
│   │   ├── services/        # apiClient.ts (axios, 938 líneas), telemetry, consent
│   │   └── lib/             # sheetLock.ts (pausa el polling cuando hay un sheet abierto)
│   └── backend/src/
│       ├── server.ts        # CORE. Express app, montaje de 36 rutas, rate limiters, cron jobs
│       ├── lib/prisma.ts    # Singleton PrismaClient (importado por 57 archivos)
│       ├── routes/          # 36 archivos (V1 + V2 conviven)
│       ├── services/        # ~40 servicios de dominio
│       ├── middleware/      # authMiddleware.ts (JWT → req.userId + req.coupleId). CORE de seguridad
│       └── prisma/          # schema.prisma (47 modelos), migrations/, seed.ts
```

### Diagrama mental de dependencias

```
  [Cliente A]                         [Cliente B]
   React SPA                           React SPA
      │  axios + JWT (interceptor)        │
      └──────────────┬────────────────────┘
                     ▼   (ambos hacen POLLING cada 30s)
            Express API (server.ts)
                     │  authMiddleware → req.coupleId
                     ▼
              Prisma (singleton)
                     │  filtra TODO por coupleId  ← único aislamiento entre parejas
                     ▼
              PostgreSQL (Supabase, SIN RLS)
```

- **El "core" del sistema** son tres archivos: `backend/server.ts` (orquestación + jobs), `backend/middleware/authMiddleware.ts` (deriva `coupleId`, única barrera de aislamiento), y `frontend/layout/AuthedLayout.tsx` (el motor de sincronización por polling). Si tocas estos tres, tocas el corazón.
- **`packages/shared`** es core de contrato: los Zod schemas viven ahí y los usan ambos lados.
- **Periférico / por dominio**: cada par `routes/X.ts` ↔ `services/Xservice.ts` ↔ `hooks/useX.ts` ↔ `components/v2/X/` es una vertical relativamente desacoplada (journal, shopping, gamification, calendar…). Esto es bueno para refactorizar dominio a dominio.

---

## 3. Lógica de 2 usuarios — análisis dedicado

### 3.1 Cómo se "conectan" A y B (no hay conexión directa)
No existe canal entre clientes. A y B son **dos navegadores independientes** que comparten un `coupleId` (dos filas `User` con el mismo `coupleId`). Cada uno hace polling al mismo backend; el backend filtra por `coupleId`. **La "pareja" es un identificador compartido, no una sesión conjunta.** La latencia de propagación de un cambio de A a la pantalla de B es de **hasta 30s** (refetch de la query) o **hasta 60s** (tick de presencia/couple). No es instantáneo y no debe venderse como realtime.

### 3.2 Dónde se suscriben los "canales"/listeners
Todo en `src/frontend/src/layout/AuthedLayout.tsx`:
- **`setInterval(tick, 60_000)`** (`:31-43`): cada 60s refresca user/couple (presencia del partner vía `lastSeenAt`, mood). Se salta si la pestaña está en background (`visibilityState`) o hay un sheet abierto (`isSheetOpen()`).
- **`refetchInterval` 30s** (`:51-58`): query `['notifications','unread-count']`, pausada con `sheetLock`.
- **Efecto cascada** (`:71-84`): cuando sube el contador de no-leídas, invalida `['balance']`, `['activities']`, `['tasks','logs','all']`, `['gamification','status']`, `['couple']`. Este es el truco que "cierra el ciclo" entre usuarios: el acto de B genera una notificación que A detecta en su siguiente poll, y eso dispara la invalidación del resto.
- Mismo patrón replicado en `pages/Tasks.tsx:371,384` y `pages/Calendar.tsx:121`.

### 3.3 Cleanup (unsubscribe) — 2 BUGS
La mayoría está **bien**: el `setInterval` principal (`AuthedLayout.tsx:42`) y **todos** los `addEventListener` (BottomSheet, ConfirmDialog, AlertDialog, HeaderMenu, CookieConsentBanner, useConsent, Tasks) tienen cleanup correcto.

Dos `setTimeout` guardados en refs **sin cleanup de desmontaje** (severidad baja, pero son bugs reales):
- 🐛 **`components/v2/dashboard/PointsBurst.tsx:37-41`** — timeouts de 1400ms en un `Map` ref; si el componente se desmonta antes de disparar, ejecutan `setState` sobre componente desmontado. No hay "clear-all" en unmount.
- 🐛 **`components/v2/calendar/MonthGrid.tsx:89-93`** — timer de long-press (500ms); se limpia en mouseup/touchend pero **no en desmontaje**; si cambias de mes/ruta durante un press activo, dispara `onLongPress` tras el unmount.

### 3.4 Race conditions
- **Frontend: 0 optimistic updates** (`grep onMutate` = 0). Todo es invalidar + refetch (77 `invalidateQueries`). No hay versioning en cliente.
- **Backend: la concurrencia de negociación SÍ está protegida** con optimistic-concurrency por status-guard en `services/negotiationEngine.ts`: `updateMany({ where: { id, status: { in: [...] } } })` dentro de `$transaction`; si el count es 0 (otro ya resolvió) → `throw 'Event already resolved'` (`:162-178`, `:244-260`). Resultado: **gana el primer commit**, el segundo recibe error/409. No hay corrupción de datos, solo desfase visual de hasta 30s hasta el siguiente poll del perdedor.
- Donde NO hay protección de concurrencia es en mutaciones simples (editar tarea, marcar item de compra): es **last-write-wins** silencioso. Aceptable para el dominio, pero conviene tenerlo presente con el rediseño.

### 3.5 Qué pasa si un usuario se desconecta a media negociación
"Desconectarse" = cerrar pestaña (no hay socket ni sesión viva, ni locks server-side; el `sheetLock` es solo memoria del cliente). El evento queda en su último `status` en DB. **El otro usuario no queda bloqueado**: en su próximo poll ve el evento y puede actuar. ⚠️ **Caso colgado**: un evento puede quedarse **indefinidamente en `pending`/`proposed`** porque **no hay timeout server-side para negociaciones de eventos**. (El auto-accept de 24h documentado aplica a **TaskLog**, no a Event.)

### 3.6 RLS / reglas de seguridad
- **No hay RLS.** Supabase aloja Postgres pero Prisma conecta con credenciales directas que **saltan cualquier RLS**. El **único aislamiento entre parejas es el filtro `coupleId` a nivel de aplicación** en cada query. Esto significa: **si un endpoint olvida filtrar por `coupleId`, no hay red de seguridad debajo.** Y eso es exactamente lo que pasa en el hallazgo de §5.
- 🔴 **IDOR cross-couple confirmado** en las rutas V2 de negociación (`routes/negotiation.ts`, montadas en `/api/events`): `/:eventId/propose` y `/:eventId/respond` cargan el evento con `findUnique({ where: { id: eventId } })` **sin `coupleId`** y solo comprueban `event.createdBy === userId`. Un usuario de **otra pareja** no es el creador → pasa el check → puede responder/aceptar/contraofertar un evento ajeno, e incluso corromper saldos cross-couple vía el `PointsTransaction` que crea el engine. Verificado en `routes/negotiation.ts:97-116` y `services/negotiationEngine.ts:125-205`. Estas rutas llevan cabecera `Sunset: 01 Jun 2026` (ya vencida) pero **siguen montadas y sirviendo** (`server.ts:217`).

---

## 4. Code smells — Top 10 ofensores

| # | Archivo | Problema | Severidad | Recomendación |
|---|---|---|---|---|
| 1 | `frontend/src/pages/Tasks.tsx` | God-component: la función `Tasks()` ocupa ~775 líneas (357-1132), con 10+ handlers inline sin memoizar → repinta todo el subárbol | **Alta** | Extraer lista/filtros/modales a archivos propios; memoizar handlers |
| 2 | `backend/src/server.ts:355` | N+1: el cron de auto-verify lanza un `$transaction` **por cada** TaskLog vencido | **Alta** | Batch con `updateMany`+`createMany` o agrupar transacciones |
| 3 | `backend/src/routes/negotiation.ts` | IDOR cross-couple (ver §3.6) — ruta V2 ya "Sunset" pero activa | **Alta** | Retirar el montaje o añadir filtro `coupleId` |
| 4 | Backend global (131 `console.*`, sin logger) | Logging crudo sin niveles ni correlación en Render | **Media** | Introducir `pino` y reemplazar `console.*` |
| 5 | Backend global (196 `any`, sobre todo `(req as any).user`) | `strict:false` enmascara el tipado; auth sin tipos en cada handler | **Media** | Augmentar `Express.Request`; activar `strict` gradual |
| 6 | `frontend/.../proof/TaskProofUploader.tsx:54` + `schema.prisma:381` | Imágenes guardadas como **data-URL base64 en Postgres** (infla filas ~33%, sin CDN/lazy) | **Media** | Migrar a object storage (Supabase Storage/S3), guardar solo URL |
| 7 | `backend/src/routes/notificationsPush.ts:84` | N+1: envíos push **secuenciales** en `for await` | **Media** | `Promise.all(subs.map(...))` |
| 8 | `frontend/src/services/apiClient.ts` (938 ln) | God-service: todos los endpoints en un archivo | **Media** | Dividir por dominio |
| 9 | Backend (51 `JSON.parse` dispersos para JSON-en-SQLite) | Serialización repetida sin helper, propensa a errores | **Baja** | Helper `parseJsonField`/`stringifyJsonField` |
| 10 | `backend/src/services/recurringTaskService.ts:140` | N+1 anidado en generación recurrente (cron semanal) | **Baja** | `createMany` por couple |

> Honestidad: `Settings.tsx` (1119 ln) y `RequestActivity.tsx` (940 ln) también son grandes, pero están razonablemente descompuestos en sub-componentes; no entran en el top por gravedad real.

---

## 5. Seguridad

**Estado general: mejor de lo esperado para un prototipo**, con un agujero real que destaca.

- **Variables de entorno**: bien gestionadas. Existe `.env.example` (raíz y backend). El backend hace **fail-fast**: `validateEnv()` aborta el arranque si falta `JWT_SECRET`/`DATABASE_URL` o si el secret tiene <32 chars (`server.ts:69-80`, `services/authService.ts:10-13`). Env vars en uso: `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `VAPID_*`, `RESEND_API_KEY`, `SENTRY_DSN`, `POSTHOG_*`, `STRIPE` (implícito), + ~20 feature flags. Frontend solo `VITE_*` públicos (correcto).
- **Secretos hardcoded**: **ninguno.** No hay fallbacks tipo `JWT_SECRET || 'dev-secret'`. El único `.env` en git es `src/backend/.env.test` y contiene solo un placeholder (`JWT_SECRET=test-secret-key-change-in-production`) y un path SQLite local — **sin secretos de producción**. El `.env` real está gitignorado. *(Mejora cosmética: renombrar a `.env.test.example`.)*
- **Validación de inputs**: ~74% de las rutas validan el body con Zod. El **26% restante** no, y son las peores: `routes/negotiation.ts:31,82` (V2, `pointsProposed` sin validar que sea número), `routes/achievements.ts:122` (`POST /check`). Las rutas core (auth, tasks, events, journal, categories, calendarV2) sí validan con `safeParse`.
- 🔴 **Autorización / IDOR**: el hallazgo de §3.6 (`routes/negotiation.ts`). El resto del código tiene **buena disciplina** de `coupleId`: `eventRoutes.ts`, `taskRoutes.ts` y especialmente `journal.ts` (usa `updateMany` con `coupleId` precisamente para evitar IDOR). El problema está aislado en las rutas V2 deprecadas.
- **Sanitización antes de DB**: se confía en Prisma parametrizado. **Cero** `$executeRaw`/`$queryRawUnsafe` con interpolación de input de usuario. El único raw query es SQL estático en el health check (`server.ts:175`). **Sin riesgo de SQL injection.**
- **CORS/Helmet/Rate-limit**: allowlist de origins (sin wildcard con credentials), Helmet activo, rate limiters en auth/reset/writes. Correcto (`server.ts:125-207`).
- **Auth hardening**: bcrypt 10 rounds (subir a 12 sería conservador); JWT a **7 días sin revocación server-side** (el refresh-token con rotación y detección de reuse está implementado en `refreshTokenService.ts` pero **NO activado** — el cliente debe mandar `X-Want-Refresh`). El access token largo es la superficie real hoy.

---

## 6. Mobile-first check

**El código es genuinamente mobile-first** (no desktop-first con media queries): contenedor `max-w-[500px] mx-auto` (`AuthedLayout.tsx:141`), clases base + `sm:`/`md:` para ampliar, y **cero** `max-md:`/`max-sm:` (patrón desktop-first). Dicho esto, hay agujeros importantes:

- 🔴 **`viewport` sin `viewport-fit=cover`** (`index.html:13` = `width=device-width, initial-scale=1.0`). Consecuencia grave: **todo el código de `env(safe-area-inset-*)`** (BottomNav, BottomSheet, varios sheets — escrito explícitamente en sprints anteriores) **queda inerte en iPhone con notch**, porque `env(safe-area-inset-*)` devuelve 0 sin `viewport-fit=cover`. Es decir, hay trabajo de safe-area ya hecho que **no funciona** por una línea que falta.
- 🔴 **NO es PWA**: no hay `manifest.json`/`.webmanifest`, no hay `vite-plugin-pwa`/Workbox, no hay registro de service worker. Faltan `theme-color` y todas las meta `apple-mobile-web-app-*`. (Hay specs de PWA en `docs/` recientes pero **nada implementado**.)
- 🔴 **`/push-sw.js` referenciado pero inexistente**: `useWebPush.ts:43` hace `register('/push-sw.js')` y ese archivo **no existe** (`public/` solo tiene `.htaccess`). → **El web push está roto en producción** (404 al registrar el SW).
- **Touch targets**: BottomNav cumple 44px (`min-w-[44px] min-h-[44px]`, `BottomNav.tsx:30`). Pero el **Button primitive no fuerza `min-height`**: `size="sm"` ≈28px y `size="md"` ≈40px quedan **por debajo de 44px** (`primitives/Button.tsx:21-25`). Ejemplo de target pequeño: botón cerrar con `p-1` en `Tasks.tsx:165`.
- **Gestos**: prácticamente inexistentes. **No hay** swipe-to-dismiss en BottomSheet, ni drag, ni pull-to-refresh. Único gesto táctil real: long-press en `MonthGrid` para crear evento. El refresco es siempre automático por polling.

---

## 7. Performance

- **Bundle**: no medido con build real (no ejecuté `vite build`). Por dependencias, los pesos pesados son **Recharts** (~recharts+d3), `react-markdown`+`remark-gfm`, `@sentry/react`, `posthog-js`, `date-fns` (v2, sin tree-shaking óptimo). Sin code-splitting por ruta visible → probable bundle inicial grande. **Acción pendiente: medir** (`vite build` + `rollup-plugin-visualizer`).
- **Re-renders**: `React.memo` usado solo **2 veces**; `useCallback` solo 10 vs `useMemo` 63 → callbacks recreados que se pasan a hijos. El god-component `Tasks.tsx` es el peor caso (repinta todo). 11 `key={index}`, de los cuales 2 sobre listas dinámicas reales (`EventNegotiationCard.tsx:353`, `DashboardTour.tsx:106`).
- **Imágenes**: solo 1 `<img>` en todo el front (`TaskProofUploader.tsx:72`); el problema no es cantidad sino que las pruebas de tarea se guardan como **base64 en la BD** (§4 #6). 0 `loading="lazy"` (irrelevante hoy).
- **N+1**: confirmados varios (§4 #2, #7, #10 + `analyticsV2.ts:290` `create` en bucle, `analyticsService.ts:174` count por usuario). El más grave es el cron de auto-verify (`server.ts:355`) porque escala con volumen de datos.
- **Prisma pool**: ✅ **No es problema.** Hay **singleton** en `lib/prisma.ts` (57 archivos lo importan); solo el seed crea su propia instancia. *(Ojo: `CLAUDE.md` §10 sigue prescribiendo el anti-patrón "`new PrismaClient()` por archivo" — está obsoleto y debe corregirse para no inducir regresiones.)*

---

## 8. Top 10 mejoras priorizadas

Escala 1-5. **Orden recomendado** balancea (impacto alto + esfuerzo/riesgo bajo primero).

| # | Mejora | Impacto | Esfuerzo | Riesgo | Orden |
|---|---|---|---|---|---|
| 1 | **Cerrar IDOR de negociación V2** (retirar montaje o filtrar `coupleId`) | 5 | 1 | 1 | **1** |
| 2 | **Añadir `viewport-fit=cover`** (activa toda la safe-area ya escrita) | 4 | 1 | 1 | **2** |
| 3 | **Arreglar/retirar web push** (crear `push-sw.js` o desactivar la feature) | 3 | 2 | 1 | **3** |
| 4 | **Corregir `CLAUDE.md` obsoleto** (Prisma singleton, pointsCalculator front inexistente, dashboard) | 3 | 1 | 1 | **4** |
| 5 | **Rellenar `ESTADO_PRE_REFACTOR.md` de verdad** (baseline funcional para el refactor) | 5 | 2 | 1 | **5** |
| 6 | **Logger central (`pino`) + quitar 131 `console.*`** | 3 | 2 | 1 | **6** |
| 7 | **Cleanup de timers** PointsBurst + MonthGrid (2 bugs) | 2 | 1 | 1 | **7** |
| 8 | **Descomponer `Tasks.tsx`** (god-component) + memoizar | 4 | 4 | 3 | **8** |
| 9 | **Activar refresh tokens + bajar JWT a ~15min** (infra ya existe) | 4 | 3 | 3 | **9** |
| 10 | **Imágenes de prueba a object storage** (sacar base64 de la BD) | 3 | 4 | 3 | **10** |

> El **bloque 1-7 es "quick wins" de alto valor y bajo riesgo** — ideal para hacer *antes* del rediseño, ya que limpia el terreno sin tocar arquitectura. El bloque 8-10 ya es refactor estructural y conviene decidirlo con el rediseño en mano (§10).

---

## 9. Lo que NO tocaría

- **El aislamiento por `coupleId` a nivel de aplicación.** Es consistente en casi todo el código (salvo el IDOR aislado de §3). Migrar a RLS de Supabase sería un proyecto en sí y rompería el acceso directo de Prisma. No lo toques sin una razón de peso.
- **El singleton de Prisma** (`lib/prisma.ts`). Está bien resuelto. (Lo que hay que tocar es el *CLAUDE.md* que lo contradice, no el código.)
- **La fórmula de puntos** (`services/pointsCalculator.ts`, con tests). Fuente de verdad única, sin duplicación en frontend. No la reescribas "de paso".
- **La protección de concurrencia de negociación** (`negotiationEngine.ts`, `$transaction` + status guards). Es correcta y sutil; tocarla es fácil de romper.
- **El patrón mobile-first de Tailwind** (contenedor `max-w-[500px]`, base + `sm:`/`md:`). Es coherente; el rediseño debería respetarlo, no invertirlo a desktop-first.
- **La estructura por verticales de dominio** (routes/services/hooks/components por feature). Facilita el refactor incremental; no la aplanes.
- **El fail-fast de env vars** (`validateEnv`). Bien hecho.

---

## 10. Preguntas para Edu (decidir ANTES de refactorizar)

1. **¿Realtime de verdad, sí o no?** Hoy es polling de 30s. El rediseño puede: (a) **quedarse en polling** (más simple, ya funciona) y solo afinarlo; (b) migrar a **Supabase Realtime** (implicaría meter `@supabase/supabase-js` y posiblemente RLS); o (c) **WebSockets propios** (socket.io sobre el Express actual). Cada camino cambia radicalmente el refactor. ¿Cuál es la expectativa real de "tiempo real" para una app de pareja — segundos bastan o necesitas instantáneo?
2. **¿El rediseño asume Next.js?** Porque hoy es Vite SPA. Si el nuevo diseño/UX necesita SSR, SEO o RSC, eso es una **migración de framework**, no un refactor. ¿Mantenemos Vite SPA (recomendado para una app privada tras login) o migramos a Next?
3. **PWA: ¿es objetivo de esta fase?** Hay specs en `docs/` pero **cero implementación** y el push está roto. ¿Lo metemos ahora (manifest + SW + safe-area + push) o lo aparcamos para después del rediseño?
4. **Backend `strict: true`: ¿lo activamos?** Eliminaría ~196 `any` y muchos bugs latentes, pero es trabajo y romperá la compilación temporalmente. ¿Lo abordamos como parte del refactor o lo dejamos?
5. **Refresh tokens / sesión.** La infra está hecha pero inactiva (JWT a 7d). ¿Activamos rotación + access token corto ahora (mejora seguridad) o no es prioridad de esta fase?
6. **Imágenes de prueba de tareas.** ¿Se usa esa feature de verdad? Si sí, hay que sacarla de base64-en-DB a storage. Si no, la desactivamos y nos ahorramos el trabajo.
7. **Rutas V1 vs V2.** Conviven (negociación V1/V2, points V1/V2, etc.). El CLAUDE.md dice "no eliminar V1". Para el refactor, ¿podemos **retirar las V1/V2 deprecadas** (la de negociación V2 está vencida y es la del IDOR) o el frontend aún depende de alguna?
8. **`ESTADO_PRE_REFACTOR.md` está vacío.** ¿Me lo rellenas tú (sabes qué features usáis de verdad) o quieres que yo levante el baseline ejecutando la app y mapeando flujos? Necesito esto para no romper lo que funciona.

---

*Notas de método: no ejecuté `vite build` (bundle size es estimación por dependencias) ni levanté la app en runtime — todo el análisis es estático sobre el código a fecha 2026-06-07. Los hallazgos críticos (IDOR, push-sw inexistente, viewport) fueron verificados manualmente además del análisis automatizado. Donde digo "no encontrado" es ausencia confirmada por grep, no suposición.*
