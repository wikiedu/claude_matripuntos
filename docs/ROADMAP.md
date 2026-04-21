# Matripuntos — Roadmap de Versiones

> Estado actualizado: 2026-04-20  
> Spec completo: `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md`

---

## Estado actual

| Versión | Nombre | Estado | Branch | Tag |
|---|---|---|---|---|
| MVP 1 | Los Cimientos | ✅ En producción | `main` | `mvp1` |
| v1.1 | La Chispa | ✅ En producción | `main` | `v1.1` |
| v1.2 | El Juego | ✅ En producción | `main` | `v1.2` |
| v1.3 | La Casa | ✅ En producción | `main` | `v1.3` |
| v1.4 | La Evolución (diseño v2) | ⏳ Listo para merge | `feature/v1.4-la-evolucion` | — |
| v2.0 | Hogar 360 | Planificado | `feature/v2.0-hogar-360` | — |
| v2.1 | Conectados | Planificado | `feature/v2.1-conectados` | — |
| v3.0 | Premium | Futuro | `feature/v3.0-premium` | — |

---

## MVP 1 · Los Cimientos ✅

**Auth + invitaciones + onboarding · Eventos con negociación · Tareas + logs + verificación · Puntos: balance, historial · Configuración editable · Notificaciones in-app · Perfiles + familia · Categorías personalizadas · Logros base · Calendario · Analytics (overview/trends/equity)**

Bugs corregidos antes de lanzar:
- Calendario no mostraba TaskLogs
- Fechas en UTC en lugar de timezone local
- Notificaciones al crear (corregido: solo al responder)

---

## v1.1 · La Chispa

**Foco:** Rediseño UX/UI completo + primeros elementos de personalidad diaria.  
Primera versión presentable a usuarios externos.

**Features:**
- Rediseño visual completo (paleta warm+dark: `#0f0a1e` fondo, `#f59e0b` amber, `#a855f7` purple)
- Bottom navigation bar con botón ➕ central elevado (5 posiciones)
- Mood del día (6–10 estados, visible para la pareja)
- Frase motivacional diaria (biblioteca propia, no API)
- Dark mode toggle (base oscura; toggle a warm light)
- Avatares de perfil (biblioteca de ilustraciones)
- Onboarding mejorado con modo demo

---

## v1.2 · El Juego

**Foco:** Gamificación potente como corazón visible + configurabilidad de reglas.

**Features:**
- Sistema de niveles de pareja (Nido → Brote → Hogar → Raíces → Diamante → Leyenda → Eterno)
- Mapa de logros estilo Duolingo (camino serpentante, nodos, nunca termina)
- Categorías de logros: Constancia, Equilibrio, Consenso, Rendimiento, Pareja, Secretos
- Rareza: Común/Poco común/Raro/Épico/Legendario
- Rachas con multiplicador de puntos (×1.1 a ×2.0, congelador de racha semanal)
- Editor de categorías de actividades con aprobación bilateral
- Panel "Reglas del Juego" con propuesta y aprobación
- FactorMascotas en puntos de tareas (×1.0 / ×1.1 / ×1.2)

---

## v1.3 · La Casa ✅

**Foco:** Hub de gestión doméstica real.

**Features enviadas:**
- Tareas 2.0: tipos puntual/recurrente, planificador semanal/mensual, instancias automáticas (cron semanal)
- Lista de la compra compartida con categorías (ShoppingList/ShoppingItem)
- Módulo To-dos personal (sin puntos, sin gamificación)
- Digest semanal in-app (lunes 08:00: balance, logros, rachas)
- WeeklyTaskView: toggle lista/semana en Tareas
- FAB con action sheet: quick-add shopping + todo

**Mejoras técnicas incluidas:**
- Security hardening: rate-limit /api/auth, CORS allowlist, JWT_SECRET min 32 chars, crypto.randomBytes para secretKey, body limit 1mb, validación zod con bounds y longitudes
- Auto-accept TaskLogs pendientes >24h (cron horario)
- Auth middleware consolidado en una sola implementación

---

## v1.4 · La Evolución (diseño v2)

**Foco:** Rediseño UX completo end-to-end según Claude Design v2 + pantalla Analytics dedicada + Premium teaser.

**Spec aprobado:** `docs/superpowers/specs/2026-04-20-v1.4-la-evolucion-design.md`

**Scope cerrado:**
- Navegación nueva: Inicio · Tareas · Calendario · Analítica (Logros → menú ⋯ del header)
- Dashboard condensado: BalanceLevelHero fusionado, StreakStrip compacto, frase diaria, tareas arriba del fold
- FAB menú con 📅 Actividad / 🛒 Compra / 📝 To-do
- Nueva pantalla Analytics: 3 tabs (Básico 4 gráficos · Avanzado 5 gráficos blur+overlay · Movimientos)
- Header con saludo temporal, mood partner, bell + menú ⋯ (Logros, Perfil, Pareja, Reglas, Ajustes, Ayuda, Logout)
- Redesign full de las 16 pantallas (incluyendo Login/Signup/Onboarding 6 pasos/Calendar/Settings/Achievements/Shopping/Todos/History→Movements/RequestActivity/RequestInbox/NotFound)
- Dark-only: se elimina el toggle theme
- Tokens del bundle v2 vía `tailwind.config.js` extend + `globals.css`
- Backend: 4 endpoints analytics nuevos (time-invested, heatmap, completion-rate, insight heurístico) + tabla `PremiumInterest` + `POST /api/premium/interest`
- Google/Apple OAuth botones visibles pero disabled (backend OAuth real → v2.1)
- Stripe → v3.0 (en v1.4 el CTA Premium solo captura email de interés)

---

## v2.0 · Hogar 360

**Foco:** App completa de la vida en pareja.

**Features:**
- **Módulo Calendario Mejorado:**
  - Vista día completo por horas con planificación visual (tareas + eventos + to-dos)
  - Click en día → abre vista día con timeline horario
  - Crear/editar tareas directamente desde calendario (hoy sólo se puede crear actividad)
  - Mostrar TaskLogs recurrentes en el mes, no sólo eventos
  - Drag & drop para reprogramar tareas entre días
- Calendario avanzado (eventos sin puntos: citas, cumpleaños, vacaciones; vistas día/semana/mes)
- Journaling de pareja (privado por defecto, compartible, sin social)
- Aniversarios e hitos especiales con logro desbloqueable
- Analytics pro (tendencias 3/6/12 meses, predicción, heatmap)

---

## v2.1 · Conectados

**Foco:** Integraciones externas y crecimiento.

**Features:**
- Push notifications (PWA o nativa)
- Sync Google Calendar (bidireccional)
- Export de datos (CSV, PDF mensual)
- Sistema de referidos con recompensa

---

## v3.0 · Premium

**Foco:** Monetización con base de usuarios real.

**Modelo freemium B:** Todo gratis hasta tener datos de uso. Luego:
- Free: límites en actividades/mes, tareas recurrentes, analytics a 3 meses, 2 rondas negociación
- Premium: sin límites + rondas ilimitadas + badge + acceso prioritario
- Pagos: Stripe · App móvil: React Native
