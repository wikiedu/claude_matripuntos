# Matripuntos Mobile + PWA Strategy — Design Spec

> Estado: aprobado por usuario 2026-05-12, pendiente de plan de implementación
> Branch destino: `feature/v3.x-mobile-pwa`
> Tags previstos al mergear cada fase: `v3.0`, `v3.1`, `v3.2`, `v3.3`
> Release anterior en producción: `v2.8.0` · Sprint 26 — achievements V2 canonical
> Audit base que motiva infra: `docs/audits/2026-05-05-full-audit/10-infra-deploy.md` S1-I-2 (cold start), S1-I-4 (no backups)

---

## 1. Objetivo

Convertir Matripuntos en una **PWA instalable que se siente como app nativa** en iOS y Android, sin pasar inicialmente por App Store ni Google Play. Mantener el mismo código React/Vite y la misma base de datos. Modernizar la infra hosting/BD para soportar la experiencia mobile (sin cold start, con CDN, con backups, con previews por rama).

**Resultado final esperado para el usuario:**
- Una pareja abre `matripuntos.com` en su iPhone o Android → un banner les invita a instalar.
- Al instalar, queda un icono en home con la marca Matripuntos.
- Al abrir desde el icono: splash → primera pantalla utilizable en < 1 s.
- La app se siente como nativa: sin barra del navegador, transiciones suaves entre páginas, pull-to-refresh, swipe-back en iOS, push notifications funcionando, modo offline básico para lectura.
- Cuando un día se decida ir a stores, envolver con Capacitor es trabajo mecánico — el código fuente no cambia.

**Principios de diseño:**
- **Mobile-first, no mobile-tolerable.** La UI se diseña primero para 375×667 (iPhone SE), luego se adapta a desktop. Hoy es al revés y se nota.
- **PWA puro como punto de salida.** Cero coste de stores, cero proceso de review, distribución por URL.
- **Arquitectura Capacitor-ready.** Cualquier API browser-specific se aísla detrás de un adapter para que el día que envuelvamos con Capacitor sustituyamos implementación sin tocar UI.
- **Migración de infra escalonada, no big-bang.** Migramos primero lo de bajo riesgo (Cloudflare Pages, Render Starter), validamos PWA encima, y solo después tocamos backend y BD.
- **Calidad release equipo grande.** Lighthouse PWA score > 90, tests Playwright en viewports mobile, QA con dos cuentas reales antes de merge de cada fase.

---

## 2. Alcance aprobado

### In-scope

**Fase 0a · Quick wins infra (~3h):**
- Migrar frontend de FTP keepitup.io a Cloudflare Pages (gratis, CDN global, previews por PR).
- Subir backend de Render Free a Render Starter ($7/mes) — mata cold start sin migrar de proveedor.
- DNS de matripuntos.com → Cloudflare con managed SSL.
- Mantener Supabase como BD por ahora (sin cambios).
- Verificación: cold-start test, deploy preview por PR funciona.

**Fase 1 · Mobile-first responsive de verdad (~1 semana):**
- Auditar y reescribir pantallas críticas para 375×667 y 390×844 como primer breakpoint: Dashboard, Tasks, Calendar, Negotiations, Settings, Onboarding completo, Request flows, Analytics, Achievements.
- Consolidar bottom-nav como navegación principal mobile (hoy hay mezcla `BottomNav` + algunos headers desktop).
- Tipografía responsive consistente (sistema de tokens ya existe).
- Touch targets ≥ 44 px en TODO control interactivo.
- Forms: keyboards apropiados (`inputmode`, `enterkeyhint`), scroll-into-view en focus, no zoom en focus (font-size ≥ 16 px en inputs).
- Bottom sheets en lugar de modales centrados en mobile (varios ya existen, completar el patrón).
- Container queries donde el componente puede vivir en columnas distintas.
- Eliminar layouts horizontales que asumen ancho desktop (Analytics charts, Calendar grid mensual, Tables de history).

**Fase 2 · PWA shell instalable (~3-4 días):**
- `manifest.webmanifest` completo: name, short_name, theme_color, background_color, display=standalone, start_url, scope, orientation, categories, lang=es.
- Set completo de icons: 192, 512, 192-maskable, 512-maskable + Apple touch icons (152, 167, 180).
- Splash screens iOS por dispositivo (apple-touch-startup-image para los 8 modelos principales) generados con script.
- Migrar de Service Worker custom (`/push-sw.js`) a Workbox vía `vite-plugin-pwa` con dos estrategias:
  - **App shell**: precache de assets críticos (HTML, JS, CSS, fonts, icons).
  - **API**: NetworkFirst con fallback a cache para GET /api/* (offline lectura básica). Mutations NO se cachean, fallan con mensaje.
- Mantener la funcionalidad de Web Push del SW actual portada al nuevo SW unificado.
- **Adapter pattern para APIs browser-specific:** crear `src/frontend/src/platform/` con módulos:
  - `platform/install.ts` (beforeinstallprompt + iOS instructions)
  - `platform/notifications.ts` (Web Push hoy → Capacitor Push mañana)
  - `platform/haptics.ts` (Vibration API hoy → Capacitor Haptics mañana)
  - `platform/share.ts` (Web Share API hoy → Capacitor Share mañana)
  - `platform/storage.ts` (localStorage/IndexedDB hoy → Capacitor Preferences mañana)
  - Cada módulo exporta una interfaz idéntica y detecta runtime (`window.Capacitor?` futuro).
- Install prompt UX:
  - Android Chrome: capturar `beforeinstallprompt`, mostrar banner contextual ("Instala Matripuntos en tu pantalla de inicio") tras 2 sesiones o trigger explícito en Settings.
  - iOS Safari: mostrar instrucciones nativas ("Toca compartir → Añadir a inicio") en un sheet, solo si detectamos Safari iOS y no instalado. Dismissible per session.
  - Settings → "Instalar app" siempre visible si no instalado.

**Fase 0b · Migración profunda backend + BD (~2 días):**
- Render → Railway Hobby ($5/mes): nuevo servicio con misma config, smoke test, switchover DNS API.
- Supabase → Neon: dump + restore + reapuntar `DATABASE_URL`, validar Prisma con `migrate resolve` + `db pull` para reconciliar migrations corruptas (audit S0-5).
- Aprovechar para resolver audit S0-5: regenerar baseline de migrations limpio en Postgres puro.
- Neon branching configurado: rama `main` para prod, ramas efímeras por PR (CI integration).
- Backups: Neon automatic 7-day point-in-time recovery + script `npm run db:dump` mensual a S3-compatible (Backblaze B2 ~$0.005/GB/mes).
- Monitoring: Render → Railway built-in metrics, Sentry mantenido, PostHog mantenido.

**Fase 3 · Polish "se siente como app" (~1 semana):**
- View Transitions API entre rutas (con fallback a CSS fade en navegadores que no soportan).
- Pull-to-refresh nativo en Dashboard, Tasks list, Calendar.
- Swipe-back gesture detection en iOS (CSS `overscroll-behavior` + edge swipe handler).
- Haptic feedback en acciones clave (completar tarea, aceptar negociación, push notification recibida) via `navigator.vibrate` con duraciones cortas (10-20 ms).
- Skeleton states ya existen (Sprint 22) — auditar consistencia: TODA pantalla que tarde > 200 ms muestra skeleton, no spinner.
- Optimistic UI más agresiva en flows de alta frecuencia (mark task done, react to journal entry).
- Font loading: preload Inter, `font-display: optional` para evitar FOUT.
- Keyboard handling: cuando un input recibe focus, scroll-into-view con offset para no quedar tapado por keyboard.
- Safe-area completo: ya hay `pb-safe` y `pt-safe` en algunos sitios, extender a TODA la app sistemáticamente.
- Splash → first paint: medir con Lighthouse, optimizar critical path. Objetivo p95 < 1500 ms en conexión 4G.

### Out-of-scope (futuro)

- **Fase 4 · Capacitor wrapper**: lo dejamos *arquitecturalmente preparado* (adapter pattern en `platform/`) pero NO se ejecuta en este spec. Tendrá su propio spec cuando el usuario decida ir a stores.
- **In-app purchases / suscripciones de pago**: no es parte de mobile, va por otro track.
- **Push notifications reescritas**: se mantiene el sistema actual (Web Push), simplemente se porta al nuevo SW unificado. Mejoras de UX de notifications van por otro spec.
- **Refactor del sistema de auth para soportar deep links Capacitor**: cuando Fase 4 llegue.
- **Modo offline completo (mutations en cola, sincronización al volver online)**: requiere CRDTs o queue de mutations + conflict resolution. En este spec solo offline LECTURA básica (cache de GETs).
- **i18n (multi-idioma)**: ya hay spec separado (v2.2 Multiidiomas), no se mezcla.
- **Migración a Cloudflare Workers como backend**: requeriría reescribir Express, fuera de scope.

---

## 3. Decisiones clave

### D-1 · Stack final: Cloudflare Pages + Railway + Neon
**Decisión:** Frontend en Cloudflare Pages (gratis), backend en Railway Hobby ($5/mes), BD en Neon Free→Pro ($0-19/mes).
**Razón:** $5/mes vs $32/mes del alternativo (Render Starter + Supabase Pro); CDN global gratis; previews por rama tanto en front como en BD (Neon branching); sin cold start desde día 1; mantiene Postgres+Prisma+Node sin reescritura.
**Alternativa descartada:** Status quo upgradeado (Render Starter + Supabase Pro): mismo coste $32/mes pero sin CDN, sin Neon branching, FTP no escala bien para 50+ deploys durante Fase 1+2.
**Migración:** escalonada en Fase 0a (Cloudflare Pages + Render Starter) y Fase 0b (Railway + Neon). No big-bang.

### D-2 · PWA puro como punto de salida (no Capacitor desde día 1)
**Decisión:** Construir PWA distribuible por URL, sin pasar por App Store / Play Store inicialmente.
**Razón:** Coste cero (sin Apple Developer $99/año, sin Play $25), cero proceso de review, distribución por link en redes/mailings. Capacitor queda como fase opcional futura — cuando un día decidamos ir a stores envolvemos esto mismo, no reescribimos.
**Alternativa descartada:** Empezar directamente con Capacitor → coste de stores + proceso de review + retraso de salida + cuando aún no hay validación de mercado.

### D-3 · Mobile-first antes que PWA shell
**Decisión:** Fase 1 (responsive de verdad) precede a Fase 2 (manifest + install prompt).
**Razón:** Instalar como app una UI rota es peor que no instalarla. El usuario que añade a home y abre algo que escrolla horizontalmente desinstala y no vuelve.
**Implicación:** No habrá install prompt visible hasta que Fase 1 esté en producción.

### D-4 · Adapter pattern en `src/frontend/src/platform/`
**Decisión:** Toda API browser-specific (notifications, haptics, share, storage, install) vive detrás de un módulo en `platform/` con interfaz estable.
**Razón:** Cuando llegue Fase 4 (Capacitor), sustituimos la implementación concreta sin tocar UI. Hoy `platform/notifications.ts` usa Web Push; mañana usa `@capacitor/push-notifications`. La UI llama `notifications.subscribe()` igual.
**Implicación:** Algunos componentes actuales que llaman directamente a `navigator.serviceWorker.register` (`useWebPush.ts`) deben refactorizarse a usar el adapter.

### D-5 · Workbox vía vite-plugin-pwa, no SW custom
**Decisión:** Sustituir el SW custom actual (`public/push-sw.js`) por SW generado por `vite-plugin-pwa` con Workbox.
**Razón:** Workbox da precaching + runtime caching maduros, manejo de versioning automático, skip-waiting / clients-claim configurable. Mantener un SW a mano es deuda técnica.
**Implicación:** Migrar lógica de push del SW custom al SW de vite-plugin-pwa (via `injectManifest` mode si la lógica de push lo requiere, o `generateSW` con `importScripts`).
**Riesgo controlado:** El SW custom ya está en producción. Hay que asegurar que el reemplazo no rompe suscripciones push existentes. Estrategia: nuevo SW se publica con misma `scope`, el navegador hace `update` automático, el `subscription` permanece válido si el VAPID key es el mismo.

### D-6 · Cache strategy: NetworkFirst con fallback offline para GETs, mutations sin cache
**Decisión:** Las requests GET a `/api/*` van con NetworkFirst (intenta red, si tarda más de 3 s o falla, sirve de cache). Las mutations (POST/PUT/DELETE) NO se cachean; fallan con mensaje "Sin conexión, vuelve a intentarlo".
**Razón:** Offline LECTURA básico es suficiente para "se siente como app". Offline ESCRITURA requiere queue + conflict resolution → out-of-scope.
**Implicación:** Si el usuario crea una tarea offline → mensaje claro de error. NO se guarda silenciosamente para sincronizar después.

### D-7 · Resolver audit S0-5 durante Fase 0b
**Decisión:** Al migrar a Neon, regenerar el baseline de Prisma migrations en Postgres puro y dejar `_prisma_migrations` consistente. Borrar las 6 primeras migrations SQLite-dialect, sustituir por una `0000_init.sql` Postgres limpia.
**Razón:** El audit (`docs/audits/2026-05-05-full-audit/03-database-prisma.md` S0-5) lleva pendiente desde 2026-04-10. Aprovechar la migración para zanjarlo de raíz. Si no lo hacemos ahora, vamos a arrastrarlo a Fase 3 y Fase 4.

### D-8 · Eliminar FTP de deploy frontend
**Decisión:** Tras Fase 0a, el script `deploy-frontend.sh` y los workflows que usan lftp se borran o quedan documentados como deprecated. Deploys frontend son GitHub push → Cloudflare Pages build automático.
**Razón:** FTP es deuda técnica, lento, sin previews, sin atomic deploys (ventana de inconsistencia entre files subiendo).

### D-9 · No usar PWA install prompt agresivo
**Decisión:** El banner de "Instalar Matripuntos" solo aparece tras 2 sesiones distintas o trigger explícito desde Settings. Nunca en primera visita.
**Razón:** Install prompts en primera visita son fricción que mata retención (estadísticas Chrome: < 5 % acept en primer-visit, > 25 % tras engagement).

---

## 4. Arquitectura

### 4.1 Topología post-fase-0a (transición)

```
Usuario → matripuntos.com
              │
              ├─→ Cloudflare CDN → Cloudflare Pages (frontend estático React build)
              │     ▲
              │     └ Deploy: git push → CF build → CF edge
              │
              └─→ matripuntos-api.onrender.com (sin cambios respecto a hoy)
                    │
                    └─→ Supabase Postgres EU (sin cambios)
```

### 4.2 Topología final post-fase-0b (objetivo)

```
Usuario → matripuntos.com
              │
              ├─→ Cloudflare CDN → Cloudflare Pages (frontend estático)
              │     │
              │     ├─→ Service Worker (Workbox)
              │     │     ├─→ Precache: app shell (HTML/JS/CSS/fonts/icons)
              │     │     └─→ Runtime: NetworkFirst para GET /api/*
              │     │
              │     └─→ Browser APIs vía src/platform/*
              │            ├─→ install.ts (beforeinstallprompt + iOS)
              │            ├─→ notifications.ts (Web Push)
              │            ├─→ haptics.ts (Vibration API)
              │            ├─→ share.ts (Web Share API)
              │            └─→ storage.ts (localStorage + IndexedDB)
              │
              └─→ api.matripuntos.com → Railway Hobby (Node Express)
                    │
                    ├─→ Neon Postgres EU (rama main)
                    │     └ Branches efímeras por PR (CI)
                    │
                    └─→ Backblaze B2 / scheduled dumps (backup offsite)
```

### 4.3 Estructura de carpetas nueva

```
src/frontend/
├── public/
│   ├── manifest.webmanifest       ← nuevo
│   ├── icons/                     ← nuevo, generados
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-192-maskable.png
│   │   ├── icon-512-maskable.png
│   │   ├── apple-touch-icon-152.png
│   │   ├── apple-touch-icon-167.png
│   │   ├── apple-touch-icon-180.png
│   │   └── apple-splash-*.png     ← 8 splashes iOS
│   └── push-sw.js                 ← se elimina al final de Fase 2
│
└── src/
    ├── platform/                  ← nuevo, adapter pattern
    │   ├── index.ts
    │   ├── install.ts
    │   ├── notifications.ts
    │   ├── haptics.ts
    │   ├── share.ts
    │   ├── storage.ts
    │   └── transitions.ts
    │
    ├── components/
    │   └── pwa/                   ← nuevo
    │       ├── InstallBanner.tsx
    │       ├── InstallIOSInstructions.tsx
    │       ├── UpdateAvailableToast.tsx
    │       └── OfflineBanner.tsx
    │
    ├── hooks/
    │   ├── usePWAInstall.ts       ← nuevo
    │   ├── useOnlineStatus.ts     ← nuevo
    │   ├── useWebPush.ts          ← refactor a usar platform/notifications
    │   └── ...
    │
    └── ...
```

### 4.4 Manifest y service worker

`manifest.webmanifest`:
```json
{
  "name": "Matripuntos - Equilibrio en pareja",
  "short_name": "Matripuntos",
  "description": "Gamifica la equidad en tu pareja",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0f172a",
  "background_color": "#0f172a",
  "lang": "es",
  "categories": ["productivity", "lifestyle"],
  "icons": [/* 192, 512, maskable variants */]
}
```

`vite.config.ts` (cambios):
```ts
import { VitePWA } from 'vite-plugin-pwa';
// ...
plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    strategies: 'injectManifest',     // Para mantener lógica push custom
    srcDir: 'src',
    filename: 'sw.ts',                // Nuevo SW unificado en TS
    manifest: { /* del JSON anterior */ },
    workbox: {
      runtimeCaching: [{
        urlPattern: /\/api\/.*$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }
        }
      }]
    }
  })
]
```

### 4.5 Migración de DNS y certificados

**Fase 0a:**
1. Crear cuenta Cloudflare → añadir `matripuntos.com` → CF asigna 2 nameservers.
2. Cambiar nameservers en panel keepitup.io → propagación 1-24h.
3. Durante propagación: tráfico va en parte a old FTP, en parte a CF Pages — debe servir lo mismo (último build subido por FTP).
4. Cuando propagación termina: deshabilitar deploy FTP, dejar solo CF Pages auto-deploy desde `main`.
5. Render API queda con DNS propio (`matripuntos-api.onrender.com` ya activo).

**Fase 0b:**
1. Provisionar servicio Railway con misma config (Node 20, env vars, build command).
2. Crear DB en Neon, hacer `pg_dump` de Supabase, `psql` restore a Neon.
3. Migration cleanup (D-7): preparar nuevo baseline en una rama Neon staging, validar idempotencia con `prisma migrate deploy` desde cero.
4. Switchover: cambiar env var `DATABASE_URL` del nuevo Railway service apuntando a Neon.
5. Crear CNAME `api.matripuntos.com` → Railway URL.
6. Frontend: actualizar `VITE_API_URL` → `https://api.matripuntos.com`, deploy.
7. Maintenance window: ~30 min con banner "Mejorando la app, vuelve en 30 minutos". Notificación previa por mail si hay base usuaria.

---

## 5. Plan de fases (alto nivel — el detalle por archivo va al plan)

### Fase 0a (~3h) — tag `v3.0`

1. Crear cuenta Cloudflare, añadir dominio.
2. Conectar repo GitHub a CF Pages, configurar build (Vite, output `dist/`, env vars).
3. Subir branch `feature/v3.0-infra-quickwins` con `wrangler.toml` opcional, verificar preview deploy.
4. Cambiar nameservers en keepitup.io.
5. Subir Render free → Starter en dashboard Render (1 click, $7).
6. Verificar: `lighthouse https://matripuntos.com` Performance > 80, cold start eliminado (esperar 30 min y hacer request, debe responder < 1 s).
7. Documentar en `docs/DEPLOY.md` el nuevo flujo. Borrar referencias FTP (o marcar deprecated).
8. PR → merge → tag `v3.0`.

### Fase 1 (~1 semana) — tag `v3.1`

Trabajo distribuido en subagentes especializados por área. Cada subagente recibe spec de su área y devuelve PR.

- **Agente A · Dashboard + Bottom Nav** (Dashboard.tsx, BottomNav.tsx, headers).
- **Agente B · Tasks + Calendar** (Tasks.tsx, Calendar variants, CalendarDay/Week/Month).
- **Agente C · Negotiations + Inbox** (RequestActivity, RequestInbox, EventNegotiationCard, CounterProposalForm, NegotiationHistory).
- **Agente D · Settings + Profile + Onboarding** (Settings, Onboarding 1-4, JoinFlow).
- **Agente E · Analytics + Achievements** (AnalyticsPage, AnalyticsDashboard, GamificationDashboard, AchievementsPanel).
- **Agente F (consolidador)**: revisa los 5 PRs, resuelve solapes, garantiza tokens consistentes, ejecuta QA two-account en cada viewport (iPhone SE, iPhone 13, iPad mini).

Estándares para cada agente:
- Primary breakpoint: 375×667 (sin breakpoint = mobile, `md:` ≥ 768 = desktop variant).
- Touch target ≥ 44 px (Tailwind `min-h-[44px] min-w-[44px]` o `p-3` mínimo).
- Inputs: `text-base` o mayor (Safari iOS no zoomea), `inputMode` apropiado, `enterKeyHint`.
- Forms con scroll-into-view en `onFocus`.
- Tests: snapshot a 375×667 y 1280×800 en Playwright.

### Fase 2 (~3-4 días) — tag `v3.2`

1. Generar set completo de icons + splash screens (script `scripts/generate-pwa-assets.sh` con `pwa-asset-generator` o ImageMagick).
2. Escribir `manifest.webmanifest` y enlazarlo en `index.html`.
3. Migrar a `vite-plugin-pwa` con `injectManifest`, portar lógica push del SW antiguo.
4. Crear `src/platform/*` con adapters; refactorizar `useWebPush.ts` para usar `platform/notifications`.
5. Implementar `InstallBanner.tsx` y `InstallIOSInstructions.tsx` con lógica `usePWAInstall` (engagement gate: tras 2 sesiones).
6. `UpdateAvailableToast.tsx` cuando SW detecta nueva versión.
7. `OfflineBanner.tsx` con `useOnlineStatus`.
8. Tests: Lighthouse PWA > 90, install flow Playwright, install instructions en Safari iOS (manual).
9. Verificación two-account: usuario A instala en iPhone, usuario B instala en Android, verifican que push aún llega tras la migración del SW.
10. PR → merge → tag `v3.2`.

### Fase 0b (~2 días) — tag `v3.0.1`

1. Provisionar Railway service, copiar env vars, configurar build command, healthcheck `/api/health`.
2. Crear Neon project EU, copiar `DATABASE_URL`.
3. Dump Supabase: `pg_dump --no-owner --clean -Fc > matripuntos.dump`.
4. Migration cleanup en rama Neon staging: backup esquema, dropear todo, aplicar SQL puro Postgres generado de Prisma, validar `prisma migrate deploy` corre limpio.
5. Restore datos sobre el nuevo schema en staging branch.
6. Validación: comparar counts por tabla Supabase vs Neon, sample data, full E2E Playwright.
7. Maintenance window: anunciar 30 min antes vía banner + email (si > 10 usuarios activos). Bloquear mutations, dump fresco, restore final, switchover env var Railway, verificar.
8. Borrar config FTP del repo (D-8), documentar nuevo flujo.
9. PR → merge → tag `v3.0.1` (parcheamos hacia atrás porque v3.1 y v3.2 ya están en prod).

### Fase 3 (~1 semana) — tag `v3.3`

Cross-cutting polish:
- View Transitions API en router.
- Pull-to-refresh en listas críticas.
- Swipe-back gesture iOS.
- Haptic feedback en 12 acciones clave (definir lista exacta en plan).
- Auditar skeleton coverage, completar.
- Optimistic UI: mark task done, react to journal, accept negotiation.
- Font preload + `font-display: optional`.
- Keyboard handling (scroll on focus).
- Safe-area completo: barrer toda la app.
- Lighthouse score final: Performance > 85 mobile, PWA > 95.

---

## 6. Error handling y rollback

### Fase 0a (Cloudflare Pages + Render Starter)

**Riesgo principal:** propagación DNS deja a usuarios con cache antiguo durante 24-48h. Algunos siguen llegando a la IP de keepitup mientras otros llegan a CF.

**Mitigación:**
- Antes de cambiar nameservers, dejar el último build estable en ambos sitios (FTP keepitup actualizado + CF Pages con mismo build).
- Reducir TTL DNS a 5 min antes de la migración (24h antes).
- Tras propagación completa (verificar con `dig matripuntos.com @8.8.8.8` y `@1.1.1.1`), deshabilitar deploys FTP.

**Rollback:** Si CF Pages causa problemas, volver nameservers a keepitup.io. Propagación inversa 24-48h. Durante ese tiempo, los deploys FTP siguen funcionando — los hacemos manualmente desde local.

### Fase 1 (mobile-first)

**Riesgo principal:** un cambio de layout que rompe desktop visible.

**Mitigación:**
- Cada PR de Fase 1 debe pasar Playwright tests en viewports 375, 768, 1280.
- Snapshot visual: comparar antes/después en cada viewport.
- Deploy preview por CF Pages permite validar en URL única antes de merge.

**Rollback:** revertir PR específico. Fases 1.A-1.F son independientes, no hay dependencias cruzadas.

### Fase 2 (PWA shell)

**Riesgo principal #1:** el nuevo SW rompe suscripciones push existentes → usuarios dejan de recibir notifications.

**Mitigación:**
- Misma VAPID public key entre SW viejo y nuevo. Las suscripciones permanecen válidas.
- Test: antes del switch, listar `PushSubscription` registradas en BD. Tras switch en staging, verificar que se renuevan automáticamente y siguen apuntando al mismo endpoint.
- Si una suscripción se invalida (`410 Gone` desde push service), nuestro backend ya tiene lógica de cleanup (audit Sprint 22 S2-I).

**Rollback:** Si nuevo SW falla, publicar versión que llame a `self.registration.unregister()` + redirect a página de aviso. Usuarios pierden install pero la app vuelve a funcionar como webapp.

**Riesgo principal #2:** Workbox cachea HTML viejo, usuarios ven UI desactualizada tras deploy.

**Mitigación:**
- `registerType: 'autoUpdate'` + `skipWaiting: true` + `clientsClaim: true`.
- Versionar `manifest.webmanifest` por hash de build (vite-plugin-pwa lo hace).
- `UpdateAvailableToast` informa al usuario y permite "Recargar".

### Fase 0b (Railway + Neon migration)

**Riesgo principal:** pérdida de datos durante el switchover.

**Mitigación:**
- **Triple dump:** Supabase pg_dump 1 día antes, 1 hora antes, en el momento del switch.
- **Read-only mode** durante la ventana de mantenimiento: backend deshabilita mutations vía env var `MAINTENANCE_MODE=true`.
- **Validación post-switch**: query `SELECT COUNT(*)` por tabla en Supabase y Neon, deben coincidir bit a bit (excepto rows creadas durante R/O mode → ninguna).
- **Smoke test Playwright** completo antes de declarar éxito.

**Rollback:**
- Switchover es por cambio de `DATABASE_URL` en Railway. Si algo falla en validación, revertir env var → vuelve a Supabase en < 1 min.
- Si fallo se detecta más tarde (datos corruptos en Neon), tenemos los dumps de Supabase para restore en cualquier momento. Pérdida máxima: writes hechos entre dump más reciente y detección — minimizable con dump frecuente.

**Riesgo secundario:** Prisma `_prisma_migrations` desync rompe `migrate deploy`.

**Mitigación (D-7):** Resolver el audit S0-5 *durante* esta migración:
1. En rama Neon staging vacía, ejecutar `prisma migrate deploy` desde cero — falla por las 6 migrations SQLite-only.
2. Generar `0000_init_postgres.sql` desde `prisma migrate diff --from-empty --to-schema-datamodel`.
3. Borrar las 6 migrations SQLite, crear el nuevo init Postgres, validar que `migrate deploy` corre limpio en branch nueva.
4. Mantener `_prisma_migrations` en sincronía vía `prisma migrate resolve --applied 0000_init_postgres` tras restore de datos.

### Fase 3 (polish)

**Riesgo principal:** View Transitions API o gestures rompen accesibilidad o lectores de pantalla.

**Mitigación:**
- `prefers-reduced-motion` respetado (ya hay infra en Sprint 22).
- Tests Playwright con axe-core integration.
- Test manual con VoiceOver iOS y TalkBack Android.

---

## 7. Testing strategy

### 7.1 Unit + integration (existente)

- Vitest frontend, Jest backend — sin cambios mayores. Añadir tests para `src/platform/*` con mocks de browser APIs.

### 7.2 E2E con Playwright (existente, ampliar)

- Añadir viewports mobile (375×667 iPhone SE, 390×844 iPhone 13, 393×852 Pixel 7) a la matriz de tests existente.
- Test específicos PWA:
  - Manifest válido (parse + schema check).
  - Service worker registra y cachea assets esperados.
  - `beforeinstallprompt` capturado en headless Chrome (con `--user-data-dir` y flags PWA).
  - Offline mode: navegar offline, verificar que GET cacheado responde, mutation muestra error correcto.

### 7.3 Lighthouse CI

- Nuevo workflow `.github/workflows/lighthouse.yml`: corre Lighthouse contra deploy preview por PR.
- Umbrales como gates:
  - Performance > 80 mobile, > 90 desktop.
  - PWA > 90 a partir de Fase 2.
  - Accessibility > 95.
  - Best Practices > 90.

### 7.4 QA two-account manual

Memoria de feedback persistente del usuario: **"audits must simulate real two-account usage"**.

Para CADA fase, antes de merge:
- Cuenta A en iPhone físico (Safari + Chrome iOS).
- Cuenta B en Android físico (Chrome).
- Recorrer happy path completo de la fase.
- Específico Fase 2: instalar la PWA en ambos, ver push de A → B y B → A funcionando tras la instalación.
- Específico Fase 0b: tras switchover, login con cuenta A y B, verificar datos consistentes con pre-switch.

### 7.5 Visual regression

- Cada PR de Fase 1 incluye screenshots Playwright en 375 y 1280. Comparación manual en review.

---

## 8. Métricas de éxito

| Métrica | Antes | Objetivo post-fase | Cómo medir |
|---|---|---|---|
| Tailwind responsive utilities | 41 usos | > 400 | grep en repo |
| Lighthouse Performance mobile | ~50 | > 80 | Lighthouse CI |
| Lighthouse PWA score | ~20 | > 90 | Lighthouse CI |
| Time to Interactive (4G, p95) | desconocido | < 2500 ms | Lighthouse + RUM PostHog |
| Cold start backend | 10-30 s | < 500 ms | curl `/api/health` tras 30 min idle |
| Deploy frontend duration | 2-5 min FTP | < 60 s | CF Pages dashboard |
| Backup BD coverage | 0 % (free) | 100 % daily | Neon dashboard |
| % usuarios mobile que instalan tras 2 sesiones | n/a | > 15 % | PostHog event `pwa_installed` |
| Coste hosting mensual | $0 (free, no backups) | ~$5 inicial, ~$24 cuando crezca | facturas |

---

## 9. Riesgos generales

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración DNS afecta SEO temporalmente | Media | Bajo | Mantener mismas URLs, certificados válidos en ambos lados durante propagación |
| Neon free tier insuficiente al escalar | Baja al inicio | Medio | Monitoring de uso, upgrade a Pro $19 antes de hit limit |
| iOS Safari no soporta features de Fase 3 | Alta para algunas | Bajo | Cada feature con detection + fallback CSS/JS |
| Push notifications se rompen tras migrar SW | Media | Alto | Test exhaustivo en staging con suscripciones reales antes de prod |
| Trabajo paralelo en subagentes Fase 1 produce conflicts | Alta | Medio | Subagentes trabajan en archivos disjuntos, agente F consolida con tests automáticos |
| Falta de previews por PR durante Fase 1 (CF aún no migrado si retrasamos 0a) | Baja | Alto | Fase 0a se hace SIEMPRE primero, no negociable |
| Cuenta Cloudflare/Railway/Neon del usuario no creada a tiempo | Media | Alto | El usuario crea cuentas como pre-requisito de cada fase de infra. Si no están, esa fase se bloquea pero las otras avanzan |

---

## 10. Dependencias del usuario

El usuario debe crear las siguientes cuentas y proporcionar credenciales / acceso en su momento:

**Pre-Fase 0a:**
- [ ] Cuenta Cloudflare (gratis, https://dash.cloudflare.com/sign-up)
- [ ] Upgrade Render Free → Starter ($7/mes, en dashboard Render existente)

**Pre-Fase 0b:**
- [ ] Cuenta Railway (https://railway.app, $5/mes Hobby plan)
- [ ] Cuenta Neon (https://neon.tech, free tier para empezar)
- [ ] Cuenta Backblaze B2 para backups offsite (opcional, ~$0.005/GB/mes)

**Pre-Fase 4 (futuro, fuera de este spec):**
- Apple Developer Program ($99/año)
- Google Play Console ($25 una vez)

---

## 11. Comunicación durante implementación

Bajo instrucción del usuario ("sin que me pidas nada, hazlo directamente"):
- NO se piden micro-confirmaciones durante implementación.
- SE informa al inicio y final de cada fase con resumen.
- SE pausa solo en casos: (a) decisión arquitectural no cubierta por este spec, (b) credencial/cuenta requerida, (c) cambio destructivo o irreversible (DNS switchover, BD migration final).
- Subagentes despachados con prompts auto-contenidos por área; cada uno reporta antes/después.

---

## 12. Sesiones siguientes (mismo bloque)

Tras este spec:
- Sesión 1: writing-plans → plan detallado por fase (archivos, ordering, comandos).
- Sesión 2: executing-plans Fase 0a (~3h, mayormente en CLI con el usuario).
- Sesión 3-4: subagentes en paralelo para Fase 1+2.
- Sesión 5: executing-plans Fase 0b (con maintenance window).
- Sesión 6-7: Fase 3 polish.
- (Futuro, spec aparte): Fase 4 Capacitor.

---

**Estado:** spec escrito, pendiente de self-review y aprobación del usuario antes de pasar a `writing-plans`.
