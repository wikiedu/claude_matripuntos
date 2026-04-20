# Changelog - Matripuntos

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
