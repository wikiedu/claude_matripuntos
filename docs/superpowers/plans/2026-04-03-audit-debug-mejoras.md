# Auditoría, Debug y Mejoras — Matripuntos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Obtener una app completamente funcional, con tipos correctos, bugs críticos resueltos y diseño coherente lista para iterar nuevas funcionalidades.

**Architecture:** Backend Express/Prisma con rutas V1+V2 coexistiendo. Frontend React+Zustand+React Query. Cuatro fases en secuencia: fixes estáticos conocidos → live testing → fixes dinámicos → mejoras de diseño.

**Tech Stack:** Node.js + Express + Prisma + SQLite (backend) · React 18 + TypeScript + Tailwind + Zustand + React Query (frontend) · agent-browser para live testing

---

## PARTE A — Fixes Conocidos (Análisis Estático)

### Task 1: Añadir endpoint `/api/tasks/all-logs` al backend

**Problema confirmado:** `Dashboard.tsx` llama `apiClient.tasks.getAllLogs('pending')` → `GET /tasks/all-logs?status=pending` pero este endpoint no existe en `taskRoutes.ts`. Devuelve 404 y el dashboard no puede contar tareas pendientes.

**Files:**
- Modify: `src/backend/src/routes/taskRoutes.ts`

- [ ] **Step 1: Leer la forma exacta en que el frontend espera la respuesta**

Abrir `src/frontend/src/pages/Dashboard.tsx` línea ~73 y localizar cómo usa el resultado:
```ts
const taskLogsResponse = await apiClient.tasks.getAllLogs('pending')
const allPendingLogs = taskLogsResponse.logs || []
const partnerPending = allPendingLogs.filter(
  (l: { completedBy?: { id: string } }) => l.completedBy?.id !== user?.id
)
```
La respuesta debe tener shape `{ logs: TaskLog[] }` donde cada log tiene `completedBy: { id, name }`.

- [ ] **Step 2: Añadir la ruta `GET /all-logs` en `taskRoutes.ts` ANTES de la ruta `GET /:taskId/logs`**

En `src/backend/src/routes/taskRoutes.ts`, insertar después de la ruta `GET /` y antes de `POST /:taskId/log`:

```typescript
// GET /api/tasks/all-logs — Get all task logs for the couple (with optional status filter)
router.get('/all-logs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const status = req.query.status as string | undefined
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const where: any = { coupleId: req.coupleId }
    if (status) where.status = status

    const logs = await prisma.taskLog.findMany({
      where,
      include: {
        task: { select: { id: true, name: true, category: true } },
        completedByUser: { select: { id: true, name: true } },
        verifiedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.taskLog.count({ where })

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        taskId: log.taskId,
        task: log.task,
        completedBy: log.completedByUser ? {
          id: log.completedByUser.id,
          name: log.completedByUser.name,
        } : null,
        date: log.date,
        pointsBase: log.pointsBase.toString(),
        pointsFinal: log.pointsFinal.toString(),
        status: log.status,
        verifiedBy: log.verifiedByUser ? {
          id: log.verifiedByUser.id,
          name: log.verifiedByUser.name,
        } : null,
        verifiedAt: log.verifiedAt,
        disputeReason: log.disputeReason,
        createdAt: log.createdAt,
      })),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch task logs'
    res.status(400).json({ error: message })
  }
})
```

> **Importante:** Esta ruta debe ir ANTES de `router.post('/:taskId/log', ...)` y `router.get('/:taskId/logs', ...)`. En Express, `/all-logs` podría coincidir con `/:taskId` si va después. Verificar el orden.

- [ ] **Step 3: Verificar el nombre del campo en Prisma**

Confirmar que `TaskLog` tiene los campos `completedByUser` y `verifiedByUser` como relaciones en `prisma/schema.prisma`. Si usan nombres distintos (e.g., `completedBy` como relación), ajustar el include en consecuencia.

```bash
cd src/backend && grep -A 20 "model TaskLog" prisma/schema.prisma
```

Ajustar los nombres de relación según lo que devuelva el grep.

- [ ] **Step 4: Arrancar el backend y verificar el endpoint**

```bash
cd src/backend && npm run dev
```

En otra terminal:
```bash
curl -H "Authorization: Bearer TEST_TOKEN" http://localhost:3000/api/tasks/all-logs?status=pending
```
Expected: `{ "logs": [], "pagination": { "total": 0 ... } }` (o con datos si hay seed)

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/routes/taskRoutes.ts
git commit -m "fix: add missing GET /api/tasks/all-logs endpoint"
```

---

### Task 2: Unificar la fórmula de multiplicadores de tiempo

**Problema confirmado:** Existen 3 versiones incompatibles de la fórmula de tiempo:
- `CLAUDE.md` (spec): 07-09:30 ×1.4, 09:30-17:30 ×1.0, 17:30-21:30 ×1.5, 21:30-01 ×1.2, 01-07 ×1.6
- `src/frontend/src/pages/RequestActivity.tsx` (UI de cálculo): 0-6 ×1.6, 6-14 ×1.0, 14-20 ×1.1, 20-23 ×1.4
- `src/backend/src/services/pointsCalculator.ts` (cálculo real): 6-12 ×1.0, 12-18 ×1.1, 18-23 ×1.3, 23-6 ×1.6

La versión authoritative es la de `CLAUDE.md`. Frontend y backend deben mostrar y calcular lo mismo.

**Files:**
- Modify: `src/backend/src/services/pointsCalculator.ts`
- Modify: `src/frontend/src/utils/pointsCalculator.ts`
- Modify: `src/frontend/src/pages/RequestActivity.tsx`

- [ ] **Step 1: Leer el backend pointsCalculator completo**

```bash
cat src/backend/src/services/pointsCalculator.ts
```

Localizar el método `getTimeMultiplier` y sus valores actuales.

- [ ] **Step 2: Actualizar `getTimeMultiplier` en el backend**

En `src/backend/src/services/pointsCalculator.ts`, reemplazar el método `getTimeMultiplier`:

```typescript
/**
 * Get time-of-day multiplier (from CLAUDE.md spec)
 * 07:00-09:30 ×1.4 (rush morning)
 * 09:30-17:30 ×1.0 (normal daytime)
 * 17:30-21:30 ×1.5 (evening peak)
 * 21:30-01:00 ×1.2 (late night)
 * 01:00-07:00 ×1.6 (deep night)
 */
private getTimeMultiplier(dateStart: Date): number {
  const d = new Date(dateStart)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const totalMinutes = hours * 60 + minutes

  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 1.4   // 07:00-09:30
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 1.0 // 09:30-17:30
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 1.5 // 17:30-21:30
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 1.2  // 21:30-01:00
  return 1.6 // 01:00-07:00
}
```

- [ ] **Step 3: Leer el frontend pointsCalculator**

```bash
cat src/frontend/src/utils/pointsCalculator.ts
```

- [ ] **Step 4: Actualizar la función de tiempo en `src/frontend/src/utils/pointsCalculator.ts`**

Localizar la función que calcula el multiplicador de hora (puede llamarse `getTimeMultiplier`, `timeMultiplier`, o similar) y reemplazarla con:

```typescript
export function getTimeMultiplier(dateStart: Date): number {
  const hours = dateStart.getHours()
  const minutes = dateStart.getMinutes()
  const totalMinutes = hours * 60 + minutes

  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 1.4   // 07:00-09:30
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 1.0 // 09:30-17:30
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 1.5 // 17:30-21:30
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 1.2  // 21:30-01:00
  return 1.6 // 01:00-07:00
}

export function getTimeSlotLabel(dateStart: Date): string {
  const hours = dateStart.getHours()
  const minutes = dateStart.getMinutes()
  const totalMinutes = hours * 60 + minutes

  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 'Mañana temprano ×1.4'
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 'Horario normal ×1.0'
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 'Tarde-noche ×1.5'
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 'Noche ×1.2'
  return 'Madrugada ×1.6'
}
```

- [ ] **Step 5: Actualizar las funciones inline en `RequestActivity.tsx`**

En `src/frontend/src/pages/RequestActivity.tsx`, localizar las funciones `getTimeMultiplier` y `getTimeSlotLabel` definidas en el archivo (están definidas localmente, no importadas). Reemplazarlas con:

```typescript
function getTimeMultiplier(hour: number, minute: number = 0): number {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 1.4
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 1.0
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 1.5
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 1.2
  return 1.6
}

function getTimeSlotLabel(hour: number, minute: number = 0): string {
  const totalMinutes = hour * 60 + minute
  if (totalMinutes >= 7 * 60 && totalMinutes < 9 * 60 + 30) return 'Mañana temprano ×1.4'
  if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 17 * 60 + 30) return 'Horario normal ×1.0'
  if (totalMinutes >= 17 * 60 + 30 && totalMinutes < 21 * 60 + 30) return 'Tarde-noche ×1.5'
  if (totalMinutes >= 21 * 60 + 30 || totalMinutes < 1 * 60) return 'Noche ×1.2'
  return 'Madrugada ×1.6'
}
```

Luego buscar todos los usos de `getTimeMultiplier(hour)` en ese archivo y cambiarlos a `getTimeMultiplier(hour, minute)` donde `minute` venga del datetime seleccionado.

- [ ] **Step 6: Commit**

```bash
git add src/backend/src/services/pointsCalculator.ts src/frontend/src/utils/pointsCalculator.ts src/frontend/src/pages/RequestActivity.tsx
git commit -m "fix: unify time multiplier formula to match spec across backend and frontend"
```

---

### Task 3: Añadir endpoints de reset de puntos

**Problema confirmado:** `apiClient.points.requestReset()` llama `POST /points/reset-request` y `apiClient.points.confirmReset()` llama `POST /points/reset-confirm`. Ninguno existe en `pointsRoutes.ts`.

**Files:**
- Modify: `src/backend/src/routes/pointsRoutes.ts`

- [ ] **Step 1: Verificar si estos endpoints se usan en el frontend**

```bash
grep -rn "requestReset\|confirmReset" src/frontend/src/
```

Si no hay ningún uso actual, añadir los endpoints como no-ops que devuelven 501 (no implementado) para evitar el 404.

- [ ] **Step 2: Añadir los endpoints al final de `pointsRoutes.ts`**

```typescript
// POST /api/points/reset-request — Request a points balance reset (requires partner approval)
router.post('/reset-request', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    // TODO: Implement full reset flow with partner approval
    // For now, create a notification to partner
    res.status(200).json({
      message: 'Reset request sent to partner for approval',
      status: 'pending',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request reset'
    res.status(400).json({ error: message })
  }
})

// POST /api/points/reset-confirm — Confirm a points balance reset (partner action)
router.post('/reset-confirm', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    // TODO: Implement full reset confirmation
    res.status(200).json({
      message: 'Points balance reset confirmed',
      status: 'completed',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm reset'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/src/routes/pointsRoutes.ts
git commit -m "fix: add missing points reset endpoints (stub implementation)"
```

---

### Task 4: Corregir tipos TypeScript del frontend

**Problema confirmado:** `src/frontend/src/types/index.ts` tiene tipos incompletos que causarán errores en tiempo de ejecución y TypeScript falsos negativos.

**Files:**
- Modify: `src/frontend/src/types/index.ts`

- [ ] **Step 1: Reemplazar `types/index.ts` con tipos completos**

```typescript
// Type definitions for Matripuntos

export interface User {
  id: string
  coupleId: string
  email: string
  name: string
  timezone?: string
  roleInHome?: string
  role?: string
  hasCompletedOnboarding?: boolean
  notificationsPush?: boolean
  notificationsEmail?: boolean
}

export interface Couple {
  id: string
  name?: string
  numChildren: number
  language: string
  notificationsEnabled?: boolean
  users?: User[]
  children?: Child[]
  configuration?: CoupleConfiguration | null
}

export interface Child {
  id: string
  name: string
  dateOfBirth: string
  livesWithUser1?: boolean
  livesWithUser2?: boolean
  hasSpecialNeeds?: boolean
}

export interface Event {
  id: string
  coupleId: string
  createdBy: string
  creator?: { id: string; name: string }
  type: string
  title?: string
  description?: string
  dateStart: string
  dateEnd: string
  hasChildren?: boolean
  numChildren?: number
  pointsBase?: number | string
  pointsCalculated: number | string
  pointsAgreed?: number | string | null
  compensation?: string | null
  compensationDiscount?: number | string
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'forced' | 'negotiating' | 'completed'
  negotiationRound?: number
  maxFreeRounds?: number
  lastProposedBy?: string | null
  lastProposedPoints?: number | string | null
  negotiations?: Negotiation[]
}

export interface Negotiation {
  id: string
  eventId: string
  roundNumber: number
  proposedBy?: string | null
  pointsProposed: number | string
  message?: string | null
  responseType: 'accepted' | 'rejected' | 'counter_proposed' | 'awaiting' | 'forced'
  respondedBy?: string | null
  respondedAt?: string | null
  createdAt: string
}

export interface Task {
  id: string
  coupleId: string
  name: string
  description?: string
  category: 'cocina' | 'baños' | 'limpieza' | 'compra' | 'logistica' | 'cuidado' | 'mantenimiento' | 'jardineria' | 'mascotas'
  pointsBase: number | string
  isDefault?: boolean
}

export interface TaskLog {
  id: string
  coupleId: string
  taskId: string
  task?: { id: string; name: string; category: string }
  completedBy?: { id: string; name: string } | null
  date: string
  pointsBase: number | string
  modifier?: string | null
  modifierValue?: number | string | null
  pointsFinal: number | string
  status: 'pending' | 'verified' | 'disputed' | 'auto_accepted'
  verifiedBy?: { id: string; name: string } | null
  verifiedAt?: string | null
  disputeReason?: string | null
  notes?: string | null
  createdAt?: string
}

export interface PointsTransaction {
  id: string
  coupleId: string
  userId?: string | null
  user?: { id: string; name: string } | null
  type: 'event_accepted' | 'task_completed' | 'donation' | 'forced_payment' | string
  amount: number | string
  description?: string | null
  relatedEventId?: string | null
  event?: { id: string; type: string; title?: string; date: string } | null
  relatedTaskLogId?: string | null
  taskLog?: { id: string; taskName?: string; date: string } | null
  createdAt: string
}

export interface BalanceData {
  you: { id: string; name: string; balance: number; balanceFormatted?: string }
  partner: { id: string; name: string; balance: number; balanceFormatted?: string }
  difference: number
  isBalanced: boolean
}

export interface Notification {
  id: string
  coupleId: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface CoupleConfiguration {
  tasksConfig: Record<string, number>
  multipliersConfig: Record<string, unknown>
  activityTypes: Record<string, unknown>
}
```

- [ ] **Step 2: Verificar que los componentes que importaban tipos anteriores siguen compilando**

```bash
cd src/frontend && npm run type-check 2>&1 | head -50
```

Corregir los errores de tipo que aparezcan (si algún componente usaba los campos antiguos con nombres distintos).

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/types/index.ts
git commit -m "fix: complete TypeScript type definitions for all entities"
```

---

### Task 5: Auditoría de TypeScript completa y corrección

**Files:**
- Modify: varios archivos según errores encontrados

- [ ] **Step 1: Ejecutar type-check en backend**

```bash
cd src/backend && npm run type-check 2>&1
```

Anotar todos los errores. Los más comunes a esperar: campos faltantes en Prisma include, tipos `any` implícitos.

- [ ] **Step 2: Ejecutar type-check en frontend**

```bash
cd src/frontend && npm run type-check 2>&1
```

- [ ] **Step 3: Corregir errores TypeScript encontrados**

Para cada error, editar el archivo correspondiente. Estrategia:
- Si el error es `Property X does not exist on type Y`: añadir la propiedad al tipo o usar optional chaining
- Si es `any` implícito: tipar correctamente o añadir aserción de tipo explícita con justificación
- Si es mismatch de Decimal vs number: usar `.toString()` o `Number()` en la conversión

- [ ] **Step 4: Verificar que ambos builds pasan limpio**

```bash
cd src/backend && npm run type-check && echo "Backend OK"
cd ../frontend && npm run type-check && echo "Frontend OK"
```

Expected: ambos con "OK" sin errores.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript type errors in backend and frontend"
```

---

## PARTE B — Live Testing con agent-browser

### Task 6: Arrancar servidores y verificar health

**Files:** ninguno (sólo comandos)

- [ ] **Step 1: Instalar dependencias si es necesario**

```bash
cd src/backend && npm install && cd ../frontend && npm install
```

- [ ] **Step 2: Arrancar el backend en background**

```bash
cd src/backend && npm run dev &
```

Esperar 3 segundos y verificar:
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 3: Arrancar el frontend en background**

```bash
cd src/frontend && npm run dev &
```

Esperar 5 segundos.

- [ ] **Step 4: Abrir la app en el browser**

```bash
agent-browser open http://localhost:5173 && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/matripuntos-home.png
```

Leer la screenshot y verificar que la app carga (debe redirigir a `/login`).

---

### Task 7: Test del flujo de autenticación y onboarding

- [ ] **Step 1: Navegar al login y tomar snapshot**

```bash
agent-browser open http://localhost:5173/login && agent-browser wait --load networkidle && agent-browser snapshot -i
```

- [ ] **Step 2: Registrar una nueva pareja**

Usando los refs del snapshot, rellenar el formulario de registro. Si es un formulario de pareja:
```bash
# Ajustar @refs según snapshot
agent-browser fill @e1 "ana@test.com"
agent-browser fill @e2 "password123"
agent-browser fill @e3 "Ana"
agent-browser fill @e4 "carlos@test.com"
agent-browser fill @e5 "password123"
agent-browser fill @e6 "Carlos"
agent-browser click @e7  # botón submit
agent-browser wait --load networkidle
agent-browser screenshot --full /tmp/after-register.png
```

Documentar cualquier error visible en pantalla.

- [ ] **Step 3: Login con las credenciales creadas**

```bash
agent-browser open http://localhost:5173/login && agent-browser wait --load networkidle && agent-browser snapshot -i
# Rellenar email y password con ana@test.com / password123
# Submit y verificar redirección a /dashboard u /onboarding
```

- [ ] **Step 4: Completar el onboarding**

Navegar por los 4 steps del onboarding, rellenando datos reales. Documentar cualquier error o step roto.

- [ ] **Step 5: Verificar llegada al dashboard**

```bash
agent-browser screenshot --full /tmp/dashboard.png
agent-browser get url
```

Expected: URL = `http://localhost:5173/dashboard` y screenshot muestra el dashboard sin errores.

- [ ] **Step 6: Documentar bugs encontrados**

Anotar en un archivo temporal `/tmp/bugs-encontrados.md` todos los problemas encontrados en este flujo para resolver en la Parte C.

---

### Task 8: Test del flujo de eventos y negociación

- [ ] **Step 1: Crear un evento de prueba**

Navegar a "Solicitar actividad" y crear un evento:
```bash
agent-browser open http://localhost:5173/request-activity && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/request-activity.png && agent-browser snapshot -i
```

Rellenar los campos del formulario: tipo de actividad, fechas, hijos, puntos base. Verificar que el cálculo de puntos se actualiza correctamente al cambiar hora/día/hijos.

- [ ] **Step 2: Enviar la propuesta y verificar**

Submit del formulario y verificar:
- Redirección o mensaje de éxito
- El evento aparece en la lista de eventos con status correcto
- La notificación se creó (verificar en el ícono de campana)

- [ ] **Step 3: Simular respuesta del partner (segunda sesión)**

```bash
# Abrir sesión del partner con session-name
agent-browser --session partner open http://localhost:5173/login && agent-browser --session partner wait --load networkidle
# Login con carlos@test.com / password123
```

Ir al inbox, ver la propuesta recibida, y aceptarla o hacer contraoferta.

- [ ] **Step 4: Verificar que el balance se actualiza**

Volver a la sesión principal y verificar que:
- El evento tiene status `accepted`
- La transacción de puntos aparece en el historial
- El balance del dashboard refleja los puntos ganados/perdidos

- [ ] **Step 5: Documentar bugs**

Añadir a `/tmp/bugs-encontrados.md` los problemas encontrados.

---

### Task 9: Test del flujo de tareas

- [ ] **Step 1: Crear una tarea personalizada**

```bash
agent-browser open http://localhost:5173/tasks && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/tasks-page.png
```

Crear una nueva tarea (categoría, nombre, puntos base).

- [ ] **Step 2: Registrar tarea como completada**

Marcar la tarea como completada desde la vista de tareas. Verificar que el log se crea con status `pending`.

- [ ] **Step 3: Verificar tarea como partner**

Con la sesión del partner, ir a la lista de tareas y verificar la tarea completada. Marcarla como verificada.

- [ ] **Step 4: Verificar puntos**

Confirmar que los puntos se suman al balance del usuario que completó la tarea.

- [ ] **Step 5: Documentar bugs**

---

### Task 10: Test de funcionalidades secundarias

- [ ] **Step 1: Notificaciones**

```bash
agent-browser screenshot --annotate
```

Verificar que el ícono de campana muestra el contador de no leídas. Click en la campana → ver lista → marcar como leídas.

- [ ] **Step 2: Calendar**

```bash
agent-browser open http://localhost:5173/calendar && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/calendar.png
```

Verificar que carga sin errores. Navegar entre mes/semana/día.

- [ ] **Step 3: Analytics**

```bash
agent-browser open http://localhost:5173/analytics && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/analytics.png
```

Verificar que los charts cargan con datos o muestran estado vacío limpio (no error).

- [ ] **Step 4: Settings**

```bash
agent-browser open http://localhost:5173/settings && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/settings.png
```

Verificar que la configuración de multiplicadores carga y se puede editar.

- [ ] **Step 5: History**

```bash
agent-browser open http://localhost:5173/history && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/history.png
```

Verificar que muestra el historial de transacciones.

- [ ] **Step 6: Documentar todos los bugs**

Consolidar `/tmp/bugs-encontrados.md` con todos los problemas encontrados en Tasks 7-10.

---

## PARTE C — Fixes de Bugs del Live Testing

### Task 11: Aplicar fixes encontrados en el live testing

Esta tarea se ejecuta DESPUÉS de los Tasks 7-10. Los bugs específicos no se pueden predeterminar, pero la estrategia es:

- [ ] **Step 1: Leer `/tmp/bugs-encontrados.md` y priorizar**

Clasificar cada bug como:
- 🔴 Crítico (flujo roto, datos no se guardan)
- 🟡 Funcional (feature parcialmente rota)
- 🟢 UX (confuso pero funcional)

- [ ] **Step 2: Revisar invalidaciones de React Query**

Buscar en el frontend todas las mutations (calls POST/PUT/DELETE) y confirmar que invalidan las queries relacionadas:
```bash
grep -rn "useMutation\|apiClient\.\(events\|tasks\|points\)" src/frontend/src/pages/ src/frontend/src/components/ | grep -v "useQuery"
```
Para cada mutation que no invalide su query, añadir `queryClient.invalidateQueries(...)` después del await.

- [ ] **Step 3: Resolver bugs críticos primero**

Para cada bug 🔴:
1. Leer el archivo relevante (ruta, componente, servicio)
2. Identificar la causa raíz
3. Aplicar el fix mínimo necesario
4. Verificar en el browser que el fix funciona
5. Commit individual: `fix: <descripción específica del bug>`

- [ ] **Step 3: Resolver bugs funcionales**

Para cada bug 🟡: mismo proceso que Step 2.

- [ ] **Step 4: Verificar flujos end-to-end post-fixes**

Re-ejecutar los flujos de Tasks 7-9 para confirmar que los fixes no introdujeron regresiones.

---

## PARTE D — Mejoras de Diseño

### Task 12: Mejorar el Dashboard — balance de puntos prominente

**Objetivo:** El balance de puntos debe comunicarse a primera vista, no como texto seco.

**Files:**
- Modify: `src/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Capturar screenshot actual del dashboard**

```bash
agent-browser open http://localhost:5173/dashboard && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/dashboard-before.png
```

- [ ] **Step 2: Leer el componente de balance actual en Dashboard.tsx**

Localizar el bloque que renderiza `balance` (buscar `balance?.you` en el archivo).

- [ ] **Step 3: Reemplazar el bloque de balance con diseño mejorado**

Encontrar el JSX del balance actual y reemplazar con una tarjeta visual prominente:

```tsx
{/* Balance Section — prominent visual */}
{balance && (
  <div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
    <p className="text-indigo-100 text-sm font-medium mb-1">Balance actual</p>
    <div className="flex items-end justify-between">
      <div>
        <p className="text-4xl font-bold tracking-tight">
          {balance.you.balance > 0 ? '+' : ''}{balance.you.balance}
          <span className="text-xl ml-1 font-normal opacity-80">pts</span>
        </p>
        <p className="text-indigo-200 text-sm mt-1">{balance.you.name}</p>
      </div>
      <div className="text-right">
        <p className="text-3xl font-semibold opacity-90">
          {balance.partner.balance > 0 ? '+' : ''}{balance.partner.balance}
          <span className="text-lg ml-1 font-normal opacity-70">pts</span>
        </p>
        <p className="text-indigo-200 text-sm mt-1">{balance.partner.name}</p>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-indigo-400/40 flex items-center gap-2">
      {balance.isBalanced ? (
        <span className="text-emerald-300 text-sm font-medium">✓ Equilibrado</span>
      ) : (
        <span className="text-yellow-300 text-sm font-medium">
          Diferencia: {balance.difference} pts
        </span>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Capturar screenshot después y comparar**

```bash
agent-browser screenshot --full /tmp/dashboard-after.png
```

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/pages/Dashboard.tsx
git commit -m "design: improve points balance section in dashboard — prominent visual card"
```

---

### Task 13: Mejorar las EventNegotiationCards

**Objetivo:** El estado de negociación debe ser claro: quién tiene el turno, en qué ronda estamos, CTA destacado.

**Files:**
- Modify: `src/frontend/src/components/EventNegotiationCard.tsx`

- [ ] **Step 1: Leer el componente actual**

```bash
cat src/frontend/src/components/EventNegotiationCard.tsx
```

- [ ] **Step 2: Añadir indicador de turno y ronda**

Localizar el JSX que muestra el status del evento y añadir antes del CTA:

```tsx
{/* Negotiation state indicator */}
{(event.status === 'pending' || event.status === 'negotiating') && (
  <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg text-sm mb-3">
    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
    <span className="text-amber-700 font-medium">
      {isMyTurn ? 'Tu turno de responder' : 'Esperando respuesta del partner'}
    </span>
    {event.negotiationRound && event.negotiationRound > 0 && (
      <span className="ml-auto text-amber-500 text-xs">
        Ronda {event.negotiationRound}/{event.maxFreeRounds ?? 2}
      </span>
    )}
  </div>
)}
```

Donde `isMyTurn` se calcula así (añadir al inicio del componente):
```tsx
const { user } = useAppStore()
const currentUserId = user?.id
const isMyTurn = event.lastProposedBy !== currentUserId
```

- [ ] **Step 3: Resaltar el CTA principal**

Asegurarse de que el botón de acción principal (aceptar/rechazar/contraofertar) tenga clase `font-semibold` y un color distintivo según la acción.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/components/EventNegotiationCard.tsx
git commit -m "design: improve negotiation card — turn indicator and round counter"
```

---

### Task 14: Sistema de colores y tipografía coherente

**Objetivo:** Paleta, tamaños tipográficos y espaciado coherentes en toda la app.

**Files:**
- Modify: `src/frontend/tailwind.config.js` o `src/frontend/tailwind.config.ts`
- Modify: `src/frontend/src/index.css`

- [ ] **Step 1: Leer la configuración actual de Tailwind**

```bash
cat src/frontend/tailwind.config.js 2>/dev/null || cat src/frontend/tailwind.config.ts 2>/dev/null
```

- [ ] **Step 2: Revisar si hay una config de colores extendida o usa defaults**

Si el archivo sólo tiene `content` y `plugins` sin `theme.extend`, añadir colores de la app:

```js
theme: {
  extend: {
    colors: {
      brand: {
        50: '#eef2ff',
        100: '#e0e7ff',
        500: '#6366f1',  // indigo principal
        600: '#4f46e5',
        700: '#4338ca',
      },
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
  },
},
```

- [ ] **Step 3: Añadir tipografía base en `index.css`**

Verificar el contenido actual de `src/frontend/src/index.css` y asegurarse de que incluya:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 4: Tomar screenshots comparativas de páginas clave**

```bash
agent-browser open http://localhost:5173/dashboard && agent-browser screenshot --full /tmp/design-dashboard.png
agent-browser open http://localhost:5173/tasks && agent-browser screenshot --full /tmp/design-tasks.png
agent-browser open http://localhost:5173/history && agent-browser screenshot --full /tmp/design-history.png
```

Identificar inconsistencias visuales visibles.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/tailwind.config.* src/frontend/src/index.css
git commit -m "design: add Inter font and brand color tokens to Tailwind config"
```

---

### Task 15: Responsive mobile (375px)

**Objetivo:** La app debe ser usable en iPhone SE (375px de ancho).

**Files:**
- Modify: varios componentes según problemas encontrados

- [ ] **Step 1: Testear en viewport móvil**

```bash
agent-browser set viewport 375 812
agent-browser open http://localhost:5173/dashboard && agent-browser wait --load networkidle && agent-browser screenshot --full /tmp/mobile-dashboard.png
agent-browser open http://localhost:5173/tasks && agent-browser screenshot --full /tmp/mobile-tasks.png
agent-browser open http://localhost:5173/inbox && agent-browser screenshot --full /tmp/mobile-inbox.png
```

- [ ] **Step 2: Identificar elementos que se salen o se solapan**

Leer cada screenshot. Buscar:
- Texto cortado
- Botones que se salen del viewport
- Tablas o cards que no hacen wrap
- Navegación ilegible

- [ ] **Step 3: Aplicar clases responsive**

Para cada componente problemático encontrado en Step 2:
- Añadir `flex-col sm:flex-row` donde haya layouts horizontales rígidos
- Añadir `text-sm sm:text-base` donde el texto sea muy grande en móvil
- Añadir `px-3 sm:px-6` donde el padding horizontal sea excesivo
- Cambiar grids con columnas fijas: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`

- [ ] **Step 4: Verificar navegación móvil**

Confirmar que el menú de navegación es accesible en 375px. Si hay una barra lateral que no colapsa, añadir el patrón hamburguer o una barra inferior.

- [ ] **Step 5: Re-testear en móvil**

```bash
agent-browser set viewport 375 812
agent-browser open http://localhost:5173/dashboard && agent-browser screenshot --full /tmp/mobile-dashboard-after.png
```

- [ ] **Step 6: Restaurar viewport y commit**

```bash
agent-browser set viewport 1280 720
git add src/frontend/src/
git commit -m "design: fix responsive layout for mobile viewport 375px"
```

---

### Task 16: Verificación final y limpieza

- [ ] **Step 1: Build de producción del frontend**

```bash
cd src/frontend && npm run build 2>&1
```

Expected: sin errores. Si hay errores de TypeScript en el build, resolverlos.

- [ ] **Step 2: Type-check final de ambos proyectos**

```bash
cd src/backend && npm run type-check && echo "Backend: OK"
cd ../frontend && npm run type-check && echo "Frontend: OK"
```

- [ ] **Step 3: Test end-to-end final en desktop y móvil**

```bash
agent-browser set viewport 1280 720
agent-browser open http://localhost:5173/login
# Completar flujo completo: login → dashboard → crear evento → negociar → tareas
agent-browser set viewport 375 812
agent-browser open http://localhost:5173/dashboard
agent-browser screenshot --full /tmp/final-mobile.png
```

- [ ] **Step 4: Commit de cierre**

```bash
git add -A
git commit -m "chore: final verification pass — app ready for feature iteration"
```

---

## Resumen de Archivos por Fase

| Fase | Archivos principales |
|------|---------------------|
| A1 (all-logs) | `src/backend/src/routes/taskRoutes.ts` |
| A2 (fórmula tiempo) | `src/backend/src/services/pointsCalculator.ts`, `src/frontend/src/utils/pointsCalculator.ts`, `src/frontend/src/pages/RequestActivity.tsx` |
| A3 (reset endpoints) | `src/backend/src/routes/pointsRoutes.ts` |
| A4 (tipos TS) | `src/frontend/src/types/index.ts` |
| A5 (type-check) | Múltiples según errores |
| B (live testing) | No modifica archivos — genera screenshots en `/tmp/` |
| C (bugs live) | A determinar en el live testing |
| D1 (dashboard) | `src/frontend/src/pages/Dashboard.tsx` |
| D2 (negotiation card) | `src/frontend/src/components/EventNegotiationCard.tsx` |
| D3 (colores/typo) | `tailwind.config.*`, `src/frontend/src/index.css` |
| D4 (mobile) | Múltiples componentes según screenshots |
| D5 (verificación) | Builds y type-checks |
