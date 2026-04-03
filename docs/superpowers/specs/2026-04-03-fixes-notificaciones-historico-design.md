# Fase 1: Fixes de Notificaciones y Histórico de Movimientos

**Fecha:** 2026-04-03  
**Estado:** Design (awaiting user review)  
**Scope:** Bandeja de Entrada (Tareas pendientes) + Dashboard (Últimos movimientos)

---

## Visión

Mejorar la experiencia de usuario en dos áreas críticas:

1. **Bandeja de Entrada > Tareas:** Actualmente muestra solo un tick verde sin contexto. El usuario no sabe qué tarea es, cuándo se realizó, ni puede verificarla directamente.

2. **Dashboard > Últimos movimientos:** Actualmente solo muestra el día (no el mes) y no muestra las actividades. El usuario no tiene visibilidad clara de qué ha pasado en la pareja.

**Solución:** Enriquecer ambas áreas con información completa, acciones directas y navegación clara.

---

## Historias de Usuario

### Historia A: Bandeja de Entrada - Verificación de Tareas

**Como:** partner que debe verificar una tarea completada  
**Quiero:** ver toda la información de la tarea (nombre, categoría, cuándo se completó, quién la hizo)  
**Para que:** pueda decidir verificarla o rechazarla sin salir de la tarjeta

**Aceptación:**
- ✅ Veo nombre de la tarea
- ✅ Veo categoría (cocina, baños, limpieza, etc.)
- ✅ Veo fecha completa (ej: "3 de abril") y hora (ej: "14:30")
- ✅ Veo quién completó la tarea
- ✅ Puedo verificar directamente desde la tarjeta (botón "✓ Verificar")
- ✅ Puedo rechazar directamente desde la tarjeta (botón "✗ Rechazar")
- ✅ Si hay error, veo un mensaje claro

### Historia B: Dashboard - Últimos Movimientos

**Como:** usuario de la pareja  
**Quiero:** ver los últimos 5 movimientos significativos (eventos, tareas, negociaciones)  
**Para que:** tenga visibility de qué ha pasado sin necesidad de revisar cada sección por separado

**Aceptación:**
- ✅ Veo tipo de movimiento (icono + etiqueta: "Evento", "Tarea", "Negociación")
- ✅ Veo nombre del movimiento
- ✅ Veo fecha completa (día + mes) e idealmente hora
- ✅ Los movimientos están ordenados por fecha descendente (más reciente primero)
- ✅ Al hacer click en un movimiento, navego al detalle
- ✅ Si no hay movimientos, veo un mensaje amable

---

## Arquitectura

### Backend

**Nuevo endpoint: `GET /api/recent-activity`**

- **Auth:** Requiere JWT (inyecta `req.coupleId`)
- **Query:** Obtiene últimos 5 movimientos de la pareja, ordenados DESC por fecha
- **Fuentes de datos:**
  - **Eventos:** `Event` con `status IN ('accepted', 'rejected', 'forced')`, ordena por `dateEnd DESC`
  - **Tareas:** `TaskLog` con `status = 'verified'`, ordena por `date DESC`
  - **Negociaciones:** `Negotiation` con `responseType != 'awaiting'`, ordena por `respondedAt DESC`
- **Response:**
  ```typescript
  {
    id: string,
    type: 'event' | 'task' | 'negotiation',
    name: string,
    date: DateTime,
    relatedId: string  // para navegar al detalle
  }
  ```

**Actualizar endpoint: `GET /api/tasks/logs?status=pending`**

- Agregar relaciones: `include: { task: true, completedBy: true }`
- Devuelve objeto enriquecido:
  ```typescript
  {
    id: string,
    taskId: string,
    task: { id, name, category },
    completedBy: { id, name },
    date: DateTime,
    pointsBase: Decimal,
    pointsFinal: Decimal,
    status: 'pending'
  }
  ```

### Frontend

**Nuevo componente: `TaskPendingCard.tsx`**

```typescript
interface TaskPendingCardProps {
  taskLog: TaskLogWithRelations,
  onVerify: (taskLogId: string) => Promise<void>,
  onReject: (taskLogId: string) => Promise<void>
}
```

- Estructura:
  - Encabezado: `[Emoji categoría] Nombre tarea`
  - Subtítulo: `Completada por [nombre] el [fecha completa + hora]`
  - Botones: "✓ Verificar" y "✗ Rechazar" (side-by-side, compactos)
- Estados: normal, loading (botones deshabilitados), error (toast rojo)
- Ubicación: `src/frontend/src/components/TaskPendingCard.tsx`

**Nuevo componente: `RecentMovementItem.tsx`**

```typescript
interface RecentMovementItemProps {
  movement: RecentActivity,
  onClick: () => void
}
```

- Estructura:
  - Icono según tipo: 🎉 (evento), ✅ (tarea), 💬 (negociación)
  - Texto: `[Tipo] | [Nombre] | [Fecha completa]`
  - Hover effect (fondo ligeramente más claro)
  - Cursor pointer
- Ubicación: `src/frontend/src/components/RecentMovementItem.tsx`

**Actualizar: `RequestInbox.tsx`**

- Reemplazar componente antiguo de tareas pendientes con `TaskPendingCard`
- Usar React Query: `useQuery(['taskLogs', 'pending'], fetchPendingTasks)`
- En `onVerify`/`onReject`: usar `useMutation` para actualizar backend, invalidar cache

**Actualizar: `Dashboard.tsx`**

- Agregar nueva sección: "Últimos movimientos" (después del contenido actual)
- Usar React Query: `useQuery(['recentActivity'], fetchRecentActivity)`
- Mapear array de movimientos con `RecentMovementItem[]`
- Navegación en `onClick` según tipo: `/events/:id`, `/tasks/:id`, etc.

### Data Flow

**Bandeja de Entrada (Verificar/Rechazar):**
1. `RequestInbox` carga tareas pendientes via React Query
2. Usuario ve `TaskPendingCard` con toda la info
3. Hace click en "Verificar" → `onVerify(taskLogId)`
4. `useMutation` llama `PATCH /api/tasks/logs/:id { status: 'verified' }`
5. Backend actualiza `TaskLog.status`, crea `PointsTransaction`
6. React Query invalida `['taskLogs', 'pending']` → lista se refresca automáticamente
7. Tarjeta desaparece o cambia de estado

**Dashboard (Últimos Movimientos):**
1. `Dashboard` carga con `useQuery(['recentActivity'], fetchRecentActivity)`
2. Backend devuelve array de 5 movimientos, ya ordenados DESC
3. Frontend renderiza `RecentMovementItem[]`
4. Usuario click en movimiento → componente navega según tipo

---

## Detalles Técnicos

### Comentarios en el Código

- **Backend `recent-activity.ts`:** Comentar la lógica de unir eventos/tareas/negociaciones y ordenar
- **Frontend `TaskPendingCard.tsx`:** Comentar la estructura visual y el flujo de verificación
- **Frontend `RecentMovementItem.tsx`:** Comentar el mapeo de tipos a íconos
- **Servicios `apiClient.ts`:** Comentar las nuevas funciones `fetchRecentActivity()` y `fetchPendingTasks()`

### Error Handling

| Escenario | Comportamiento |
|-----------|---|
| `/api/recent-activity` falla | Mostrar "No hay actividad reciente" (fallback) |
| `/api/tasks/logs/:id` falla al verificar | Toast rojo: "Error al verificar, intenta de nuevo" |
| Red lenta | React Query muestra estado loading, botones deshabilitados |
| Múltiples clicks | Mutation deshabilita botones automáticamente |

### Testing

- `TaskPendingCard.tsx`: renderea con datos, botones llaman callbacks
- `RecentMovementItem.tsx`: renderea con tipo correcto, click ejecuta callback
- `RequestInbox.tsx`: carga tareas, verifica/rechaza actualiza estado
- `Dashboard.tsx`: carga movimientos, click navega correctamente

---

## Orden de Implementación

1. **Backend (día 1):**
   - Crear `src/backend/src/routes/activityRoutes.ts` con endpoint `/api/recent-activity`
   - Actualizar `src/backend/src/routes/taskRoutes.ts` para incluir relaciones en query de logs

2. **Frontend (día 1-2):**
   - Crear `TaskPendingCard.tsx` y `RecentMovementItem.tsx`
   - Actualizar `RequestInbox.tsx` para usar `TaskPendingCard`
   - Actualizar `Dashboard.tsx` para mostrar `RecentMovementItem[]`
   - Crear servicios en `apiClient.ts`: `fetchRecentActivity()`, `fetchPendingTasks()`

3. **Testing (día 2):**
   - Tests unitarios para componentes nuevos
   - Verificar que mutations/queries funcionan correctamente

4. **Polish (día 2):**
   - Ajustar estilos, colores, espaciado
   - Verificar responsive en móvil
   - User acceptance testing

---

## Métricas de Éxito

- ✅ Usuario ve información completa en bandeja de entrada sin confusión
- ✅ Usuario puede verificar/rechazar tareas sin salir de la vista
- ✅ Dashboard muestra últimos 5 movimientos de forma clara
- ✅ Click en movimiento navega al detalle correctamente
- ✅ No hay errores en consola; manejo de errores es amable
- ✅ Performance: cargas < 500ms en red normal

---

## Notas

- Este es un **fix de UX**, no una feature nueva. El flujo existe; solo enriquecemos la presentación.
- No afecta el sistema de puntos ni la lógica de negociación.
- Preparación para futuras mejoras (ej: filtros de movimientos, export de histórico).
