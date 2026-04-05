# Matripuntos — Bug Fixes + UX Improvements
**Fecha:** 2026-04-05  
**Branch:** feature/matripuntos-mvp  
**Tipo:** Bug fix (4 críticos) + UX/UI moderada

---

## 1. Bug 1 — Lógica de puntos en actividades

### Comportamiento actual (incorrecto)
Al aceptar un evento se crean dos transacciones:
- `event_accepted` → `-pts` para el creador ✓
- `event_accepted_credit` → `+pts` para el que acepta ✗

### Comportamiento correcto
Al aceptar un evento: **solo** se resta al solicitante. El que acepta no recibe nada.

### Cambios

**Backend** `src/backend/src/routes/negotiationRoutes.ts`
- Eliminar el segundo `prisma.pointsTransaction.create` (tipo `event_accepted_credit`, líneas 171–182).
- Solo queda la transacción negativa para `creatorId`.

**Frontend** `src/frontend/src/pages/RequestInbox.tsx`
- Eliminar el texto `"+{pts} pts para ti"` en la vista de detalle del evento (línea 329).
- Eliminar el texto `"+{pts} tuyos"` en las cards de actividades pendientes (línea 589).
- El `-{pts}` para el solicitante se mantiene como referencia visual.

---

## 2. Bug 2 — Flujo completo de Tareas

### Root cause
`fetchPendingTaskLogs` en `apiClient.ts` devuelve `{ logs: [], pagination: {} }` (objeto), pero el `useQuery` en `RequestInbox` lo trata como array. Resultado: `pendingTaskLogs.length === undefined` → ninguna tarea se muestra.

### Flujo correcto completo
```
Usuario A marca tarea como completada (Tasks.tsx → POST /tasks/:id/log)
  ↓
Backend crea TaskLog (status: 'pending') + envía notificación al usuario B
  ↓
Usuario B ve badge en "Bandeja de Entrada"
  ↓
Usuario B abre Bandeja → pestaña "Tareas"
  ↓
Ve las tareas completadas por A que esperan verificación (filtradas: completedBy !== user.id)
  ↓
B hace clic en Verificar → PUT /tasks/:taskId/logs/:logId/verify
  ↓
Backend crea PointsTransaction(+pts) para A → TaskLog status: 'verified'
  ↓
HistorialTab muestra el log con status 'verified' o 'disputed'
```

### Cambios

**Frontend** `src/frontend/src/services/apiClient.ts`
- Cambiar `fetchPendingTaskLogs` para extraer y devolver solo el array `.logs`:
  ```ts
  export const fetchPendingTaskLogs = async (): Promise<TaskPendingLog[]> => {
    const result = await apiClient.tasks.getAllLogs('pending')
    return (result.logs ?? []) as TaskPendingLog[]
  }
  ```

**Frontend** `src/frontend/src/pages/RequestInbox.tsx`
- En el `useQuery` de `pendingTaskLogs`, añadir `select` para filtrar solo tareas del partner:
  ```ts
  select: (logs) => logs.filter(log => log.completedBy?.id !== user?.id),
  ```
- Verificar que `verifyMutation` llama correctamente a `PUT /tasks/:taskId/logs/:logId/verify` usando el `taskId` del log (ya lo hace, pero confirmar que `fetchPendingTaskLogs` devuelve `taskId`).
- El historial de tareas (`historyTaskLogs`) ya funciona correctamente desde `loadAll()` → `allTaskLogs`.

**Frontend** — Mejora UX en pestaña Tareas:
- Añadir contador de tareas pendientes en el badge de "Bandeja de Entrada" del dashboard.
- Mostrar nombre de quien completó la tarea + fecha en la `TaskPendingCard`.
- En el historial, mostrar si fue verificada o disputada con icono visual claro.

**Backend** — Verificar que el endpoint `all-logs` devuelve `taskId` en cada log:
- Ya incluido (`l.taskId` en el modelo). Confirmar en `taskRoutes.ts` que `taskId` está en el response.

---

## 3. Bug 3 — Gráfico del dashboard: últimos 30 días

### Root cause
- Si `couple.users.length < 2` → backend devuelve `chartData: []`
- En Dashboard: `{chartData.length > 0 && ...}` → el bloque entero se oculta

### Comportamiento correcto
El gráfico muestra siempre los últimos 30 días desde hoy, con la tendencia acumulada de puntos de cada usuario. Si hay un solo usuario, se muestra solo su línea. Si no hay transacciones, las líneas van a 0 (estado inicial válido).

### Cambios

**Backend** `src/backend/src/routes/pointsRoutes.ts` — endpoint `/chart-data`
- Quitar la restricción `couple.users.length < 2`. Si hay un solo usuario, `partner` = null, se devuelven datos solo de `you`.
- Devolver siempre `chartData` con 30 puntos (incluso si todos son 0).
- Si hay un solo usuario: `partnerName: null` (o string vacío).

**Frontend** `src/frontend/src/pages/Dashboard.tsx`
- Quitar la condición `{chartData.length > 0 &&`: siempre renderizar la sección del gráfico.
- Si ambas líneas están a 0 (no hay transacciones aún): mostrar un mensaje overlay suave "Aún no hay movimientos registrados".
- Si `partnerName` es null/vacío: no renderizar la segunda `<Line>`.
- Mejora visual: usar `area` en lugar de `line` sola (LineChart con área sombreada sutil) para mayor legibilidad.

---

## 4. Bug 4 — Analytics avanzado: gráfica diaria por período

### Root cause
- La gráfica "Tendencia Semanal" usa `getWeeklyTrends()` sin parámetros de fecha → siempre muestra las últimas 8 semanas, ignorando el período seleccionado.

### Comportamiento correcto
Según el período seleccionado, la gráfica principal debe mostrar **días individuales** del período:

| Período | X axis | Datos |
|---------|--------|-------|
| Esta semana | Lun → hoy (ej: L,M,X si hoy es miércoles) | actividad diaria |
| Este mes | Día 1 → hoy (ej: 1 abr → 4 abr) | actividad diaria |
| Semana anterior | Lun → Dom (semana completa anterior) | actividad diaria |
| Mes anterior | Día 1 → último día (ej: 1 mar → 31 mar) | actividad diaria |

La escala del eje X se adapta al número de días del período (no es fija en 7 o 30).

### Cambios

**Backend** `src/backend/src/routes/analytics.ts` — nuevo endpoint (o extender `/daily-activity`)
- Añadir endpoint `GET /analytics/daily-breakdown?startDate=&endDate=` que devuelve un punto por día del período con:
  ```json
  { "date": "2026-04-01", "label": "lun 1", "events": 2, "points": 13.5, "tasks": 1 }
  ```
- Implementar en `analyticsService.ts`: agrupar eventos + task logs por día dentro del rango.

**Frontend** `src/frontend/src/components/AnalyticsDashboard.tsx`
- Reemplazar la llamada a `getWeeklyTrends()` por `getDailyBreakdown(startDate, endDate)`.
- El componente `AnalyticsChart` con `type="daily"` ya usa `BarChart` con eje X por fecha — se reutiliza con los nuevos datos.
- El eje X muestra la fecha abreviada (`"lun 1"`, `"mar 2"`, etc.) escalada al número de días del período.
- Si el período tiene ≤7 días: BarChart (una barra por día, más legible).
- Si el período tiene >7 días: LineChart (tendencia diaria continua).

---

## 5. Mejoras UX/UI (Opción B)

### Dashboard
- Balance card: mejorar el contraste y legibilidad, añadir indicador visual del usuario con más puntos.
- Gráfico: usar colores más vivos para las líneas, añadir zona sombreada bajo cada línea (área).
- Stats debajo del gráfico: reemplazar los TrendingUp/Down icons con un layout más limpio.

### Bandeja de Entrada — Tareas
- `TaskPendingCard`: añadir fecha más prominente, mostrar categoría con fondo de color suave.
- Tab "Tareas": añadir subtítulo explicativo solo cuando hay tareas pendientes.
- Historial: diferenciar visualmente `verified` (verde) vs `disputed` (naranja).

### Analytics Avanzado
- Mejorar el selector de períodos (botones más grandes, estado activo más visible).
- Añadir un subtítulo dinámico bajo el título que explique el período actual ("1 abr – 4 abr 2026").
- El chart "Puntos por Tipo" ya tiene buen diseño, solo limpiar el spacing.

---

## Archivos afectados

### Backend
| Archivo | Cambio |
|---------|--------|
| `src/backend/src/routes/negotiationRoutes.ts` | Eliminar `event_accepted_credit` |
| `src/backend/src/routes/pointsRoutes.ts` | Fix single-user chart, always return 30 days |
| `src/backend/src/routes/analytics.ts` | Nuevo endpoint `daily-breakdown` |
| `src/backend/src/services/analyticsService.ts` | Nueva función `getDailyBreakdown` |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `src/frontend/src/services/apiClient.ts` | Fix `fetchPendingTaskLogs` return type |
| `src/frontend/src/pages/RequestInbox.tsx` | Fix tasks tab + remove "+pts para ti" |
| `src/frontend/src/pages/Dashboard.tsx` | Always render chart, UX improvements |
| `src/frontend/src/components/AnalyticsDashboard.tsx` | Use daily breakdown, period label |
| `src/frontend/src/components/AnalyticsChart.tsx` | Adapt chart type by period length |

---

## Out of scope
- Notificaciones push
- Stripe / premium
- Cambios en el schema de Prisma
- El endpoint `activityRoutes.ts` (reciente activity feed) — no afecta estos bugs
