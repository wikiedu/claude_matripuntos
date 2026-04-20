# Changelog - Matripuntos

## [1.4.0] · La Evolución · 2026-04-20

Rediseño visual y estructural completo sobre Claude Design v2 (dark-only), nueva analítica con gate Premium, onboarding de 6 pasos y limpieza de componentes v1.

### Added
- **Claude Design v2 tokens**: paleta `brand-amber/purple/indigo`, gradientes `grad-cta/hero/page/premium`, superficies `surface-card/elevated/muted`, bordes `brd-subtle/purple`, tipografía Inter + `text-primary/secondary/tertiary` aplicados vía `tailwind.config.js` + `globals.css`.
- **Primitivas v2**: `Button`, `Input`, `Pill`, `ProgressBar`, `Avatar`, `Card`, `BottomSheet` (con `tailwindcss-animate`).
- **Shell global**: `AppHeader` (saludo temporal + mood partner + menú ⋯), `HeaderMenu` dropdown (Logros, Perfil, Pareja, Reglas, Ajustes, Ayuda, Logout), `BottomNav` 5-slots con FAB amber central, `FabActionSheet` (📅 Actividad · 🛒 Compra rápida · 📝 To-do rápido), `AuthedLayout` unificador.
- **Dashboard v2**: `DailyPhrase`, `BalanceLevelHero` fusionado, `StreakStrip` compacto, `TodayTasksSection` con CTAs por asignación, `RecentMovements` 3-items, `ShoppingPreview`+`TodoPreview` (hidden si vacío).
- **Tareas v2**: ViewToggle Lista/Semana, `CategoryFilterStrip`, secciones 🔥 Hoy / 📅 Esta semana / Catálogo, `AddTaskSheet` (3 pasos) desde FAB.
- **Calendario v2**: ViewToggle Mes/Semana, `MonthGrid` con día seleccionado border-amber, `WeekStripChart` con barras tú/partner, `EventCardV2` con Status Pills.
- **Logros v2**: 3 tabs (Badges · Ranking · Historial), `LevelHero` full-width con detalles, `AchievementBadgeV2` con rarity y progreso.
- **Analítica completa** (`/analytics`): Básica (WeeklyBars, CategoryPie, BalanceEvolution, TimeInvested) + Avanzada con `PremiumOverlay` (Heatmap, CompletionGauge, EquityLines, TopCategories, InsightCard) + `MovementsTab` con filtros who/cat/range. Ruta legacy `/history` redirige a `/analytics?tab=movements`.
- **Premium teaser** (`PremiumInterestModal`): captura de email con CTA; backend `POST /api/premium/interest` + tabla `PremiumInterest`.
- **Backend endpoints analytics** (heurísticos, sin LLM):
  - `GET /api/analytics/time-invested?range=week|month`
  - `GET /api/analytics/heatmap?weeks=N` (grid dow × hour bucket)
  - `GET /api/analytics/completion-rate?range=month`
  - `GET /api/analytics/insight` (plantillas con cache 6h)
  - `GET /api/analytics/points-by-category?groupByUser=true` (extensión del existente)
- **Onboarding v2** (6 pasos): Welcome · Profile · Pair · Rules · Categorías · Done, con token-skip, avatar 6×3, rules con multiplicador nocturno.
- **Login/Signup v2**: Login con OAuth placeholders disabled, Signup wizard 2 pasos.
- **Settings v2**: 7 secciones con subrutas (Perfil, Pareja, Hijos, Reglas, Notificaciones, Datos, Cuenta).
- **Shopping v2**: categorías auto-inferidas en cliente (fresco/despensa/hogar/mascotas/otros), collapse "Completados hoy", archivo + histórico.
- **Todos v2**: segmento Mis/Compartidos con contador, editor inline con due date + toggle compartir.
- **RequestActivity** rediseñado como wizard 3 pasos (categoría → fecha/duración/hijos → breakdown + compensación).
- **RequestInbox** rediseñado con 3 tabs (Actividades/Tareas/Historial), dispute modal en `BottomSheet`, botón "Forzar y pagar" cableado.
- **NotFound v2** con ilustración 🌸, sugerencias navegables.

### Changed
- **Dark-only**: se elimina el toggle `theme` del store y las ramas light de todos los componentes.
- **Topología de navegación** nueva: bottom nav `🏠 Inicio · ✅ Tareas · ➕ FAB · 📅 Calendario · 📊 Analítica`; el resto accesible desde header ⋯.

### Removed
- 30 componentes v1 sin uso tras la migración: `AchievementBadge/Card/Map/Panel/Widget`, `Avatar/AvatarSelector/MoodSelector`, `BottomNav` v1, `CalendarDashboard/Day/Month/Week`, `CategoryManager`, `CounterProposalForm`, `CoupleScoreGauge`, `GamificationDashboard`, `LevelProgress`, `NegotiationHistory`, `NotificationBell`, `PointsBreakdown`, `RecentMovementItem`, `StreakWidget`, `TaskVerificationCard`, `OnboardingStep1-4`, `OnboardingJoinFlow`, y la página `History` (sustituida por redirect a `/analytics?tab=movements`).

---

## [1.3.0] · La Casa · 2026-04-20

### Added
- **Tareas 2.0**: tipos puntual/recurrente con planificador (daily/weekly/monthly) y cron semanal que genera instancias los lunes a las 00:00.
- **Shopping list**: lista de compra compartida por pareja con categorías, checkpoints y histórico.
- **Todos**: módulo de to-dos personales (sin puntos, sin gamificación) con opción de compartir con la pareja.
- **WeeklyTaskView**: nueva vista semanal en Tareas, toggle lista/semana.
- **Weekly digest**: cron lunes 08:00 crea una notificación in-app con el resumen semanal (balance, rachas, logros).
- **FAB action sheet**: botón ➕ abre hoja con 3 opciones (actividad, compra, to-do).
- **TaskScheduleForm**: embebido en el modal de crear tarea para definir recurrencia.

### Security
- **Rate limit** en `/api/auth` (20 peticiones / 15 min) con `express-rate-limit`.
- **CORS allowlist** soporta dev (localhost:5173/4173) y producción (`FRONTEND_URL`).
- **JWT_SECRET** obligatorio y mínimo 32 chars — el backend falla al arrancar si no se cumple.
- `crypto.randomBytes(16)` sustituye a `Math.random()` para generar `secretKey` de parejas.
- `express.json({ limit: '1mb' })` para evitar payloads grandes.
- **Zod**: validación con longitudes máximas, bounds numéricos y orden de fechas en eventos/tareas.

### Fixed
- **Auto-accept TaskLogs**: cron horario que verifica automáticamente los TaskLogs pendientes con más de 24h (la regla estaba en `CLAUDE.md` pero no implementada).
- **Auth duplicado**: `middleware/auth.ts` y `middleware/authMiddleware.ts` divergían. Consolidados, `auth.ts` queda como re-export.
- **useAuth** ahora es un re-export de `useAppStore` (única fuente de verdad del estado de sesión).

### Infra
- `deploy-frontend.sh`: script FTP (lftp) con credenciales en `.deploy-credentials` (gitignored).
- `VITE_API_URL` permite apuntar el build a un backend alternativo.
- `.gitignore`: ignora `.claude-flow/`, `.swarm/`, `.mcp.json`, agent caches y `src/frontend/.env.production`.

---

## [1.2.0] · El Juego · 2026-04-13

Gamificación profunda: sistema de niveles de pareja (Nido → Eterno), mapa de logros estilo Duolingo, rachas con multiplicador, editor de categorías, panel "Reglas del Juego", factorMascotas en puntos.

---

## [1.1.0] · La Chispa · 2026-04-12

Primer rediseño visual: paleta amber+purple sobre indigo dark, bottom nav con FAB central, mood del día, frase diaria, avatares, onboarding mejorado.

---

## [0.1.0] - 2026-03-31

### 🎉 MVP Released

**Added**
- Complete specification with 5 comprehensive documents
- React frontend with 3 fully functional screens
- Dashboard with real-time balance display and 30-day chart
- Request Activity form with real-time points calculation
- Request Inbox with negotiation history
- Points calculation engine (pure, testable service)
- Express backend boilerplate with Prisma schema
- 11-table database schema (Couple, User, Event, Task, TaskLog, Negotiation, PointsTransaction, Compensation, Configuration, Notification, Subscription)
- Tailwind CSS styling with custom configuration
- Recharts integration for data visualization
- Zustand store setup for state management
- TypeScript throughout for type safety
- Setup scripts for easy onboarding (setup.sh, setup.bat)
- Comprehensive documentation (GETTING_STARTED.md, README.md, etc)

**Features**
- ✅ Real-time points calculation with all multipliers (activity type, time slot, duration, children)
- ✅ Compensation discounts (-10% to -20%)
- ✅ Automatic rounding to 0.5 points
- ✅ Step-by-step breakdown for transparency
- ✅ Responsive design (mobile + desktop)
- ✅ Mock data for realistic demo
- ✅ Clean git history with semantic commits

**Technical**
- React 18 + TypeScript + Vite
- Tailwind CSS + Recharts
- Node.js + Express
- Prisma ORM
- Monorepo with npm workspaces
- ESLint + Prettier ready

### 📊 Statistics
- **3,656 lines of code**
- **41 files**
- **6 specification documents**
- **3 functional screens**
- **85% MVP completeness**

### 🚀 Getting Started
```bash
npm install
npm run dev       # Frontend
npm run server    # Backend
```

Open: http://localhost:5173

### 📈 Next Steps
- [ ] Connect to PostgreSQL (Supabase)
- [ ] Implement authentication
- [ ] Create API endpoints
- [ ] Add remaining screens
- [ ] Unit tests for calculation engine
- [ ] Deploy to production

### 🎯 Demo Ready
The MVP is ready to demonstrate to stakeholders with:
- Complete specification
- Functional prototype
- Real-time points calculation
- Professional UI/UX
- Clear path to production

---

**MVP Status: ✅ READY FOR DEMO**
