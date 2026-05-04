# 🎨 Handoff a Claude Design — Refactor visual Tareas/Actividades

**Fecha:** 2026-05-04
**Versión actual en producción:** v2.2.12
**Para:** proyecto existente "Matripuntos Design System" en Claude Design (mismo proyecto donde ya iteramos los 14 canvases anteriores).
**De:** Eduardo + Claude Code

> **Por qué este handoff aparte:** Tareas/Actividades es el CORE económico de la app — donde el usuario pasa el 80% del tiempo. Lo iteramos en v2.0.x→v2.1.x y aunque la lógica funciona, **visualmente es un caos** para alguien que no domina la app. Necesitamos rediseño con jerarquía clara.

---

## 0. Estado actual (4 pantallazos clave que paso)

He capturado 4 estados reales del usuario. Resumen del problema:

### Pantallazo A — Header del dashboard tras v2.2.0+
```
┌──────────────────────────────────┐
│ [recargar] [🔔] [⋯]      [avatar] │
│ Edu                          ❤️   │
│ Blanca está 🤗 Cariñosa hoy       │
│ ● hace 22 min                     │
├──────────────────────────────────┤
│ [TAREAS (orange)]  [Actividades]  │ ← top tabs
│                                   │
│ Tareas [chip "Esta semana"] [↺] [+ Añadir tarea] [+ Crear nueva] │
│                                                                  │
│ [Lista]  [Semana]                 │ ← view toggle
│                                   │
│ [Mis Tareas] [Recurrentes] [Verificar] [Historial] │ ← inner tabs
│                                                     │
│ ⚠ "Failed to fetch" (banner rojo)  │ ← arreglado en v2.2.12
│                                   │
│ [Todas] [Cocina] [Limpieza] [Compra] [Logística] ←→ │ ← chips scroll horizontal
│                                                     │
│ 🔥 Hoy  0/0                       │
│   ┌─────────────────────────────┐ │
│   │ ✓✓ Sin tareas en tu lista   │ │
│   │ Empieza añadiendo del catá- │ │
│   │ logo o crea la tuya         │ │
│   │   [+ Nueva tarea]           │ │
│   └─────────────────────────────┘ │
│                                   │
│ [📋 Ver catálogo (40 ideas) ▼]    │
└──────────────────────────────────┘
```

### Pantallazo B — Estado "Todo al día"
Igual que A pero el bloque "Hoy 0/0" muestra:
```
✨ Todo al día
Las tareas de hoy están completadas
o esperando a que tu pareja las verifique.
```

### Pantallazo C — Vista Actividades (mismo layout pero menos contenido)
```
┌──────────────────────────────────┐
│ [Tareas]  [ACTIVIDADES (purple)]  │
│                                   │
│ [Activas]  [Historial]  [Catálogo]│ ← inner tabs
│                                   │
│ [+ Nueva actividad]               │
│                                   │
│        🎯                          │
│   Sin actividades activas.         │
│   Crea una con +.                 │
└──────────────────────────────────┘
```

### Pantallazo D — Hero del dashboard
Importante: el hero está bien (v2.2.0 + v2.2.12). No tocar.

---

## 1. Diagnóstico de los problemas — orden por gravedad

### 1.1 Demasiados niveles de tabs/filtros apilados (CRÍTICO)
En la pantalla A hay **4 niveles** de tabs/filtros apilados verticalmente:
1. Top tabs `Tareas | Actividades`
2. Header con título + view toggle Lista/Semana + 2 botones de acción
3. Inner tabs `Mis Tareas | Recurrentes | Verificar | Historial`
4. Chips scroll horizontal de categorías `Todas | Cocina | Limpieza | ...`

Antes de ver UNA tarea hay que escanear 4 filas de UI. Para alguien nuevo, **abruma**.

### 1.2 Dos botones primarios competiendo
"+ Añadir tarea" (orange filled) vs "+ Crear nueva" (ghost). El orange grita "elígeme" pero el usuario no sabe la diferencia hasta que abre cada uno. **El "+ Crear nueva" debería ser secundario o un menú dentro de "+ Añadir".**

### 1.3 "Ver catálogo (40 ideas)" colapsado al final
El catálogo es la fuente principal de tareas y queda **debajo del fold**, colapsado, casi escondido. Si "+ Añadir tarea" abre un selector del catálogo, ¿para qué hay un acordeón "Ver catálogo" separado? Redundante.

### 1.4 Inconsistencia Tareas vs Actividades
- Tareas: 4 inner tabs (Mis Tareas / Recurrentes / Verificar / Historial).
- Actividades: 3 inner tabs (Activas / Historial / Catálogo).
- ¿Por qué Tareas no tiene "Catálogo" como tab si lo gestionamos en otro sitio? ¿Por qué Actividades no tiene "Recurrentes" si los eventos también se pueden repetir?

Resultado: el usuario aprende dos modelos mentales distintos para conceptos casi idénticos.

### 1.5 View toggle "Lista | Semana" dentro de las tareas
Es un toggle **terciario** que hoy está apilado al mismo nivel visual que "Mis Tareas / Recurrentes / Verificar / Historial". Debería ser un sub-control discreto.

### 1.6 Empty states que asustan
"Sin tareas en tu lista · Empieza añadiendo del catálogo o crea la tuya". El user lee dos opciones con la misma jerarquía y se paraliza. Mejor: **una sola CTA dominante** + el resto a un secondary action.

### 1.7 Falta jerarquía clara entre Tareas y Actividades como conceptos
El usuario no entiende que Tareas SUMAN puntos y Actividades los GASTAN. Esto es el core del producto y no se muestra en la UI. Los emojis en los iconos de top-tab (🏠 Tareas / 🎯 Actividades) no transmiten la diferencia económica.

---

## 2. Lo que NO hay que tocar

- **El hero del dashboard** (balance + nivel) está bien tras v2.2.12.
- **El sistema de niveles** (10 niveles Encuentro→Mito) está bien.
- **El flujo "Añadir del catálogo" y "Crear nueva"** funcionan bien por dentro — el problema es solo la visualización.
- **Categorías cerradas** (cocina, limpieza, baños, compra, logística, cuidado, mantenimiento, jardinería, mascotas) — son producto.
- **El catálogo estático de tareas (~40 ideas)** y el dinámico de actividades (~50 templates + custom).

---

## 3. Lo que SÍ pido que rediseñes

### 3.1 Top tabs Tareas/Actividades — refrescar el lenguaje visual

Hoy son dos pills grandes con emoji. Quiero que comuniquen la diferencia económica:
- Tareas → **"+ MP"** (suman, color verde/amber sutil).
- Actividades → **"− MP"** (restan, color purple/pink sutil).

Mockup esperado: dos pills lado a lado donde el contenido visual indica suma/resta + iconografía limpia.

### 3.2 Página Tareas refactorizada — máximo 2 niveles de UI antes del contenido

Hoy hay 4 niveles. Propón un layout con **máximo 2**:
- Nivel 1: una línea de tabs/filtros (lo más importante).
- Nivel 2: una línea de chips/sub-filtros (opcional).
- Resto: el contenido (la lista de tareas).

Sugerencias para que decidas:
- ¿Combinar "Mis Tareas / Recurrentes / Verificar / Historial" en un menú de filtro?
- ¿Mover "Recurrentes" a Settings?
- ¿"Verificar" como notification card que aparece arriba cuando hay algo, no como tab permanente?
- ¿"Historial" como link al final ("Ver historial completo →") en vez de tab?

### 3.3 Botón primario único de acción

Actualmente: "+ Añadir tarea" (orange) + "+ Crear nueva" (ghost).
Proponer un solo CTA primario "+ Tarea" que abra un sheet con dos pestañas internas:
1. **Del catálogo** (40 ideas pre-hechas)
2. **Crear nueva** (form en blanco)

O bien mantener dos pero con tamaños/peso visual MUY distintos (uno ~80% del peso, otro ~20%).

### 3.4 Catálogo siempre presente, no colapsado

El catálogo es el activo principal. Debe estar **integrado en el flujo "Añadir"**, no ser un acordeón al fondo.

### 3.5 Página Actividades simétrica con Tareas

Mismo patrón visual. Ahora:
- Activas → equivale a "Mis Tareas" en Tareas.
- Catálogo → ya existe, perfecto.
- Historial → simétrico.

Y proponer si "Recurrentes" / "Verificar" deben existir o no en Actividades.

### 3.6 Empty states con UNA sola CTA

Cuando no hay tareas hoy, mostrar:
- Hero icon (✨ o ✓✓).
- Mensaje claro y cálido.
- **UNA** CTA primaria. Si hay opción secundaria, subordinarla visualmente (ghost/link).

### 3.7 Decisión sobre "View toggle Lista/Semana"

¿Lo dejamos? Si sí, ¿cómo lo bajamos en jerarquía visual? Mi sugerencia: icono pequeño 📋/📅 al lado del refresh, sin label.

### 3.8 Cómo se ve "Hoy" cuando hay tareas pendientes

Hoy aparece "🔥 Hoy 0/0" + empty card. Cuando haya 3 tareas pendientes, ¿cómo se ven? Mockup con datos reales.

### 3.9 Verificación de tareas (cuando tu pareja completó algo)

Hoy es una sub-tab "Verificar" que casi nunca tiene contenido. **Mejor moverlo a una notification card** arriba del listado cuando haya algo que verificar. ¿Mockup?

### 3.10 Recurrentes y "Esta semana"

¿Cómo se renderiza la vista "Esta semana"? Hoy hay un view toggle Lista/Semana que cambia el layout. ¿Lo mantenemos o lo unificamos en un solo layout que muestre la columna semanal por defecto?

---

## 4. Qué debes entregar

Como en handoffs anteriores: HTML mockup + spec estructurada al lado de cada artboard. Para CADA mockup:

```
NOMBRE: <ej: TasksHomeRedesigned>
RUTA SUGERIDA: src/frontend/src/pages/Tasks.tsx (refactor de la existente)
ESTADOS COBERTURA:
  - empty (0 tareas hoy)
  - 3 tareas pendientes
  - todo al día
  - vista semana
  - error de fetch
COMPONENTES INTERIORES: lista
DECISIONES TOMADAS: lista
```

Por cada elemento interactivo:
```
ACCIÓN onClick: ...
NAVEGACIÓN: ...
API CALL: ...
```

---

## 5. Pantallas concretas que necesito mockup

1. **Tareas — vista principal con datos** (3 tareas hoy + 2 esta semana).
2. **Tareas — empty state hoy completado** ("✨ Todo al día").
3. **Tareas — vista Semana** (columna por día).
4. **Tareas — modal "+ Tarea"** (catálogo + crear).
5. **Tareas — banner "Tu pareja completó X, ¿lo verificas?"**.
6. **Actividades — vista principal con 2 activas pendientes**.
7. **Actividades — Catálogo tab** (mantengo lo de v2.0.4-v2.1.1 si está bien).
8. **Top tabs Tareas/Actividades con la nueva semantic visual** (+MP / −MP).

---

## 6. Restricciones técnicas

- **Mobile-first** (390px ancho ref).
- **Dark theme estricto**.
- **Tokens existentes** (`text-text-primary`, `bg-surface-card`, `border-brd-subtle`, `bg-grad-cta`, `bg-grad-hero`, `brand-amber`, `brand-purple`, `success`, `warn`, `danger`). Si propones tokens nuevos, lístalos al final con valor hex.
- **Iconos lucide-react** (Plus, Check, Clock, Calendar, Filter, RefreshCw, ChevronDown, X, Sparkles, Trash, Pencil).
- **Stack**: React 18 + TypeScript + Tailwind + react-query + Zustand.
- **API client**: `apiClient.tasks.getAll()`, `apiClient.tasks.getAllLogs()`, `apiClient.tasks.logCompletion()`, `apiClient.tasks.verifyLog()`.
- **Catálogo de tareas**: array estático en `Tasks.tsx` con 9 categorías y ~40 ideas.
- **Catálogo de actividades**: dinámico `/api/activity-templates` (~50 globales + custom de pareja).

---

## 7. Decisiones que YO necesito que TÚ tomes

| # | Decisión | Mi instinto |
|---|---|---|
| 1 | ¿Cuántos niveles de UI antes del contenido? | **Máximo 2** |
| 2 | ¿Qué hacer con "Recurrentes" tab? | **Mover a Settings o subordinar** |
| 3 | ¿"Verificar" como tab fija o banner condicional? | **Banner** |
| 4 | ¿"Historial" como tab o link al final? | **Link al final** |
| 5 | ¿1 botón primario "+ Tarea" con sheet o 2 botones diferenciados? | **1 con sheet** |
| 6 | ¿"Lista vs Semana" cómo se reduce? | **Icono toggle pequeño** |
| 7 | ¿Top tabs Tareas/Actividades con +MP/−MP visual? | **Sí, fundamental** |
| 8 | ¿Symmetry entre Tareas y Actividades — mismo modelo? | **Sí, lo mismo** |

---

## 8. Pantallazos del estado actual

He guardado los 4 pantallazos que te paso (Edu y Blanca con datos reales) en `docs/design/state-2026-05-04/`:
- `dashboard-edu.png` — hero + nivel ok, no tocar.
- `tasks-failed-fetch.png` — caos de tabs + error transitorio (arreglado v2.2.12).
- `tasks-todo-al-dia.png` — empty state actual.
- `actividades-vacio.png` — Actividades con menos contenido aún.

(Si no los ves, los re-pego en la conversación cuando los necesites.)

---

## 9. Tono y filosofía (recordatorio)

- Spanish (Spain), informal "vosotros".
- Cálido, no infantil, no terapéutico-clínico.
- Sin lenguaje competitivo entre la pareja.
- Sin emojis de afecto fingido en automatismos.
- Las tareas SUMAN matripuntos. Las actividades los CONSUMEN.
- Es una **conversación entre dos**, no una herramienta productivity.

---

**Cuando me pases mockups + spec, lo replico tal cual en una sesión.** Lo más importante es que el usuario nuevo pueda **completar su primera tarea sin escanear 4 niveles de UI**.
