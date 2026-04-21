# Módulo "Hogar" y Actividades — Spec de diseño

**Fecha:** 2026-04-21
**Versión tentativa:** incremento sobre v1.4 (La Evolución), previo a v1.5
**Estado:** diseño aprobado por el usuario, pendiente de plan de implementación

---

## 1. Motivación

Los **matripuntos** se generan y se restan por dos tipos de acción: **tareas del hogar** (completadas y verificadas) y **actividades** (eventos negociados entre la pareja: cenas, salidas, ocio, ausencias). Hoy el módulo "Tareas" es visible y tiene su propio lugar en la navegación inferior, pero **las actividades están escondidas** detrás de la "bandeja de entrada" (`RequestInbox`) y no hay un lugar en el Dashboard que grite "tienes algo que responder".

El usuario lo describe como "la base" del sistema: si no se aprueban las actividades, no hay movimiento de puntos y no hay dinámica de pareja. Por tanto hay que elevar las actividades a ciudadano de primera clase en la UI.

## 2. Objetivos

1. Unificar Tareas y Actividades bajo una única pestaña de navegación ("Hogar") que contiene un selector grande entre ambas.
2. Dar al Dashboard un **banner accionable** para las actividades pendientes de respuesta (como el "Día libre" lo hace para tareas).
3. Permitir al usuario ver **histórico filtrable** de actividades con estado, quién las propuso, y rango.
4. Que cada actividad tenga una **pantalla de detalle completa** (la que ya existe) con toda la negociación y opciones grandes.
5. No romper ningún flujo existente. Cambios reversibles por fases.

## 3. No-objetivos (fuera de alcance)

- Cambios en el backend, el modelo de datos, o las reglas de negocio de negociación.
- Rediseñar la wizard de "Solicitar actividad".
- Notificaciones push nuevas.
- Filtro por categoría, búsqueda por texto, u ordenación por puntos en el Historial (YAGNI — se pueden añadir después si hacen falta).

## 4. Decisiones clave

| # | Decisión | Alternativas consideradas | Por qué |
|---|---|---|---|
| 1 | BottomNav: **"Tareas" se renombra a "Hogar"** y dentro hay un selector grande entre TAREAS y ACTIVIDADES | (a) Actividades como tab propio en BottomNav sacrificando un slot; (b) Actividades como sub-tab dentro de Tareas + banner | Agrupa todo lo que genera/resta MP en un lugar coherente, sin comprimir la barra ni esconder Actividades |
| 2 | Dashboard: **banner accionable** con tarjetas inline y botones ✓ / ⇄ / ✕ | (a) Banner compacto solo con contador y "Ver →" | La mayoría de aceptaciones son triviales ("sí, ve a ese partido"); un click resuelve sin navegar. Los casos complejos siguen teniendo detalle. |
| 3 | Tap en la tarjeta (fuera de botones) navega al **detalle completo** | — | Consistente con "todas las opciones en grande" que pidió el usuario |
| 4 | ⇄ Contraoferta desde el banner abre un **BottomSheet** en el Dashboard | Navegar a detalle | Mantiene contexto del Dashboard; si se prefiere, es trivial cambiar |
| 5 | Módulo Actividades: sub-tabs **Activas** (con 2 secciones internas) + **Historial** | (a) Tres tabs Responder/Mis/Historial; (c) vista única con filtros | "Lo vivo" se ve de un vistazo; Historial es mentalmente distinto y tiene filtros propios |
| 6 | Dashboard: `Últimos movimientos` se **enriquece** con chips Todo/Actividades/Tareas | (a) Reemplazar; (b) sumar widget adicional | Sin crecer el Dashboard, respeta lo existente |
| 7 | Filtros en Historial: **Estado · Quién · Rango** | Añadir categoría y búsqueda | Suficiente para el MVP; ampliable sin romper nada |
| 8 | Persistencia del selector: **localStorage** | URL query params | Rápido, el usuario vuelve donde estaba sin ruido en la URL |

## 5. Arquitectura

### 5.1 Rutas

```
/home                         Home.tsx     (redirige al último selector usado)
/home/tasks                   Tasks.tsx    (reutiliza la página actual, sin cambios)
/home/activities              Activities.tsx  (nuevo)
/home/activities/:id          ActivityDetail.tsx  (extraído de RequestInbox)

/tasks          →  Redirect /home/tasks
/inbox          →  Redirect /home/activities
/request-inbox  →  Redirect /home/activities
```

### 5.2 Navegación inferior

```
Antes:  Inicio · Tareas · [+] · Calendario · Analítica
Ahora:  Inicio · Hogar  · [+] · Calendario · Analítica
```

El FAB no cambia: "Solicitar actividad" sigue llevando a `/request-activity`. Al guardar, ahora redirige a `/home/activities` en vez de a inbox.

### 5.3 Componentes nuevos

```
src/frontend/src/
├── pages/
│   ├── Home.tsx                         Selector TAREAS/ACTIVIDADES + persistencia
│   ├── Activities.tsx                   Tabs Activas/Historial
│   └── ActivityDetail.tsx               Detalle con negociación
└── components/
    ├── v2/home/
    │   └── HomeSelector.tsx             Chips grandes Tareas/Actividades con badges
    ├── v2/activities/
    │   ├── ActivityActionCard.tsx       Tarjeta accionable (banner + Activas)
    │   ├── ActivityWaitingCard.tsx      Tarjeta "esperando" solo-lectura
    │   ├── HistoryFilters.tsx           Chips Estado/Quién/Rango
    │   └── CounterOfferSheet.tsx        BottomSheet de contraoferta
    └── v2/dashboard/
        ├── ActivitiesBanner.tsx         Banner del Dashboard
        └── RecentMovementsTabs.tsx      Reemplaza RecentMovements
```

### 5.4 Dashboard — orden final

```
DailyPhrase
BalanceLevelHero           ← intacto
StreakStrip                ← intacto
ActivitiesBanner           ← NUEVO · render condicional
TodayTasksSection          ← intacto
RecentMovementsTabs        ← reemplaza RecentMovements
QuickPreviews              ← intacto
```

### 5.5 `ActivitiesBanner` — contrato

Render condicional: solo si `pendingCount > 0 || waitingCount > 0`.

```
┌─ 🎯 Responder (N) ────────────────────┐
│  Hasta 2 ActivityActionCard inline    │
│  "…y K más · Ver todas →"  (si K>0)  │
│  ─────                                │
│  ⏳ M solicitudes tuyas · Ver →       │  (si M>0)
└───────────────────────────────────────┘
```

**Interacciones:**
- Tap en cuerpo de tarjeta → `navigate(`/home/activities/${id}`)`
- ✓ Aceptar → `respond({responseType: 'accepted'})` + optimistic update
- ✕ Rechazar → `respond({responseType: 'rejected'})` + optimistic update
- ⇄ Contraoferta → abre `<CounterOfferSheet>` con el `activityId`
- "…y K más" / "⏳ M solicitudes" → `navigate('/home/activities')`

### 5.6 `RecentMovementsTabs` — contrato

```
Últimos movimientos            [Todo | Actividades | Tareas]
 🦊 Eduardo · 🍽️ Cena amigos                    −18 MP · 20 abr
 🐼 Blanca  · ✅ Cocinar cena                    +12 MP · 20 abr
 🐼 Blanca  · ✅ Limpiar baños                    +8 MP · 19 abr
                                    [Ver historial completo →]
```

3 items visibles. Tap en item → detalle correspondiente:
- Actividad → `/home/activities/:id`
- Tarea → `/tasks?logId=...` (ruta existente que la abre)

Filtro en el cliente (ya existe `userMeta`, `CAT_EMOJI`, `TYPE_LABEL` en `MovementsTab.tsx` — reutilizar esa lógica).

### 5.7 `Activities.tsx` — vista Activas

```
┌─ Hogar ─────────────────  [↻] [+] ──┐
│ [🏠 Tareas] [🎯 Actividades (N)]    │
│ ─────────────────────────────        │
│ [Activas (N)] [Historial]            │
│                                      │
│ REQUIEREN TU RESPUESTA (X)           │
│   ActivityActionCard × X             │
│                                      │
│ TUS SOLICITUDES ESPERANDO (Y)        │
│   ActivityWaitingCard × Y            │
└──────────────────────────────────────┘
```

Si no hay nada en ninguna sección: estado vacío "🎯 Sin actividades activas. Crea una con +."

### 5.8 `Activities.tsx` — vista Historial

Lista plana cronológica descendente. Tres chips arriba (Estado · Quién · Rango). Tap → detalle.

Ítem:
```
[Pill estado] Título                                Puntos
Quien · fecha · ronda final                         Tap →
```

Estados vacíos: "📋 Aún no has cerrado ninguna actividad." o "Sin resultados con estos filtros."

## 6. Datos y API

**No hay cambios en el backend.** Todo el contenido se sirve desde endpoints existentes:

| Dato | Endpoint |
|---|---|
| Pendientes de responder | `GET /api/events` → filtro cliente por `status=pending` y turno |
| Mis solicitudes esperando | `GET /api/events` → filtro cliente por `createdBy === me && status=pending` |
| Historial | `GET /api/events` → filtro cliente por `status ∈ {accepted, rejected, forced}` |
| Detalle con negociaciones | `GET /api/events/:id` |
| Aceptar/Rechazar/Contraoferta | `POST /api/negotiations/:id/respond` |
| Forzar tras rondas agotadas | `POST /api/negotiations/:id/force` |
| Recientes Todo/Actividades/Tareas | `GET /api/points/history` → filtro cliente por `type` |

### 6.1 React Query keys

Una sola lista de eventos; las 3 sub-listas (pending / waiting / history) se derivan con `useMemo` en el componente. Evita N llamadas para N subsets.

```ts
['events', 'all']           // lista completa de eventos (usada por banner, Activas e Historial)
['events', id]              // detalle concreto
```

Tras cualquier mutación sobre una actividad se invalida:

```ts
['events', 'all'], ['events', id],
['balance'], ['recentActivity'], ['gamification', 'status'],
['achievements', 'map'], ['notifications']
```

Se encapsula en un helper `invalidateAfterActivityAction(queryClient, eventId?)` usado desde el banner, desde `ActivityActionCard` y desde `ActivityDetail`. Única fuente de verdad.

## 7. Estados y comportamientos

### 7.1 Estado persistente

`localStorage.home_last_selector` guarda `'tasks' | 'activities'`. `Home.tsx` lo lee y hace `<Navigate to={`/home/${last}`} replace />`. Al primer uso, default `'tasks'`.

### 7.2 Estados vacíos

| Sitio | Mensaje |
|---|---|
| Banner del Dashboard | No se renderiza (no se muestra nada) |
| Activas (sin nada) | 🎯 "Sin actividades activas. Crea una con +." |
| Historial vacío global | 📋 "Aún no has cerrado ninguna actividad." |
| Historial sin resultados de filtro | "Sin resultados con estos filtros." |
| Movimientos (cada tab) | Ya tratado en `MovementsTab` — se reutiliza el mismo mensaje |

### 7.3 Errores

- Fallo de mutación (aceptar/rechazar/contraoferta/forzar) → toast de error + revertir optimistic update.
- Fallo al cargar lista → mensaje "No se pudo cargar. Reintenta." + botón de refresh.
- Actividad no encontrada en detalle → 404 dentro del layout con botón "Volver a Actividades".

### 7.4 Overflow del banner

Hasta **2** tarjetas accionables visibles. Si hay N > 2 pendientes, debajo de las 2 tarjetas aparece "…y (N-2) más · Ver todas →" que lleva al tab Activas.

## 8. Refactor de `RequestInbox`

`RequestInbox.tsx` se desmonta en 3 fases:

1. **Fase 1 (extracción):** Se saca el bloque `if (selectedEvent)` a `ActivityDetail.tsx`. `RequestInbox` pasa a importarlo. Sin cambios visibles.
2. **Fase 3 (montaje paralelo):** Se monta `/home/activities` con la nueva UI. `RequestInbox` sigue accesible por su ruta vieja con redirect a la nueva. Se empieza a borrar la parte de Actividades/Historial del componente viejo.
3. **Fase 5 (limpieza):** Se borra `RequestInbox.tsx` entero. Su lógica de disputa de tareas ya vive en `Tasks.tsx` (ya existe — se usa la suya).

El tab "Tareas (verificar)" del RequestInbox actual **no se mueve**: ya existe un sub-tab equivalente en `Tasks.tsx`. El flujo de disputa de tareas sigue viviendo allí.

## 9. Testing

**Unit (Vitest):**
- `HomeSelector` — renderizado, marca activo, persiste en localStorage, emite navegación correcta
- `ActivityActionCard` — dispara los 3 callbacks, deshabilita botones durante mutación
- `ActivityWaitingCard` — render de estado, tap navega a detalle
- `HistoryFilters` — combina Estado + Quién + Rango, no pierde estado entre cambios
- `RecentMovementsTabs` — filtra por tipo correctamente, tap navega a detalle correcto
- `ActivitiesBanner` — render condicional (0/1/2/3+ pendientes; 0/N esperando)

**Integration (React Testing Library):**
- Aceptar desde banner → balance actualizado, actividad aparece en Historial, desaparece del banner
- Contraoferta desde banner → sheet abre, envío cierra sheet + toast, detalle muestra nueva ronda
- Tap en tarjeta del banner → navega a detalle con datos correctos
- Filtros Historial combinados → lista se reduce correctamente
- `/tasks` → redirect a `/home/tasks`; `/inbox` → redirect a `/home/activities`

**E2E manual antes de deploy:**
1. Aceptar 1 actividad desde banner → balance cambia, historial muestra aprobada
2. Crear solicitud → aparece en "esperando" del tab Activas
3. Contraofertar una pendiente → compañero la ve con ronda 2
4. Forzar tras 2 rondas → se descuenta puntos del propio saldo
5. Filtrar historial por Aprobadas + Tú + Semana → solo las que tocan

## 10. Plan de fases

Cada fase es un PR mergeable y desplegable por sí solo. Sin feature flags.

**Fase 1 — Extracción de `ActivityDetail`.** Sacar el bloque detalle de `RequestInbox.tsx` a su propio archivo y reutilizarlo. Deploy seguro, sin cambios visibles.

**Fase 2 — Ruta Home + selector.** Crear `Home.tsx` + `HomeSelector`. Montar `/home`, `/home/tasks`, `/home/activities` (este último apunta todavía a `RequestInbox` como placeholder). Cambiar BottomNav a "Hogar". Redirecciones de rutas antiguas. El usuario ya ve el cambio de nav.

**Fase 3 — Módulo Actividades.** Construir `Activities.tsx` con tabs Activas/Historial, `ActivityActionCard`, `ActivityWaitingCard`, `HistoryFilters`. `/home/activities` ya renderiza la nueva UI. Borrar la parte "Actividades" + "Historial" del `RequestInbox`.

**Fase 4 — Dashboard.** `ActivitiesBanner` + `CounterOfferSheet`. Reemplazar `RecentMovements` por `RecentMovementsTabs`.

**Fase 5 — Limpieza.** Borrar `RequestInbox.tsx` y tests obsoletos. `/inbox` queda como redirect permanente.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Enlaces antiguos rotos | Redirecciones `<Navigate>` mantenidas de forma permanente |
| Lógica del detalle duplicada | Extraer `ActivityDetail` **antes** de la UI nueva (Fase 1) |
| Invalidaciones de RQ inconsistentes | Helper único `invalidateAfterActivityAction` |
| Overflow visual del banner | Máximo 2 tarjetas + link a Ver todas |
| Pérdida del flujo de disputa de tareas | El sub-tab "Verificar" de `Tasks.tsx` ya lo soporta — no se toca |
| Usuario se pierde entre TAREAS y ACTIVIDADES | Selector grande siempre visible + badges con pendientes |

## 12. Métricas de éxito

Para revisar tras 2 semanas en producción:

- **Tiempo desde notificación hasta respuesta** cae (banner accionable debería ayudar)
- **Ratio de actividades aceptadas vía banner vs detalle** (si >50% vía banner, el banner accionable ha sido una buena idea)
- **Uso del filtro Historial** (si >30% de visitas al Historial usa filtros, confirma que son útiles)
- **Regresiones en `/tasks` / disputa de tareas** (debería ser 0)

## 13. Preguntas abiertas (pequeñas, para plan)

- ¿El botón ⇄ Contraoferta en el banner abre BottomSheet o navega a detalle? Decisión: BottomSheet. Revisable.
- ¿Nombre exacto del sub-tab "Mis solicitudes" vs "Esperando"? Decisión: en Activas, la sección se llama "Tus solicitudes esperando".
- ¿Mostrar avatar del proponente en la tarjeta del banner? Sí, pequeño a la izquierda.
- ¿Chips de filtro en Historial con `Pill` existentes o crear `FilterChip`? Reutilizar el patrón ya usado en `MovementsTab` (`.chip` de Tailwind, mismo estilo).

---

*Siguiente paso: plan de implementación detallado por archivos y tests en `docs/superpowers/plans/`.*
