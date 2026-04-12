# Matripuntos — Roadmap de Versiones

> Estado actualizado: 2026-04-12  
> Spec completo: `docs/superpowers/specs/2026-04-11-roadmap-versiones-design.md`

---

## Estado actual

| Versión | Nombre | Estado | Branch | Tag |
|---|---|---|---|---|
| MVP 1 | Los Cimientos | ✅ En producción | `main` | `mvp1` |
| v1.1 | La Chispa | ✅ En producción | `main` | `v1.1` |
| v1.2 | El Juego | Planificado | `feature/v1.2-el-juego` | — |
| v1.3 | La Casa | Planificado | `feature/v1.3-la-casa` | — |
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

## v1.3 · La Casa

**Foco:** Hub de gestión doméstica real.

**Features:**
- Tareas 2.0: tipos puntual/recurrente, planificador semanal/mensual, instancias automáticas
- Lista de la compra compartida (con categorías, historial 4 semanas)
- Módulo To-dos personal (sin puntos, sin gamificación)
- Digest semanal (resumen lunes: balance, logros, rachas)

---

## v2.0 · Hogar 360

**Foco:** App completa de la vida en pareja.

**Features:**
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
