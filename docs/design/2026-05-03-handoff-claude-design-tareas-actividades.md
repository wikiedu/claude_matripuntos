# 🎨 Handoff a Claude Design — Tareas y Actividades (delta v2.1.x)

**Fecha:** 2026-05-03 (noche)
**Adenda al doc principal:** `docs/design/2026-05-03-handoff-claude-design.md`
**Versión actual en producción:** v2.1.0
**Decisiones del founder:** confirmadas 2026-05-03

> **Por qué esta adenda:** tras la primera entrega tuya, hemos refinado el flujo del CORE de la app — cómo añadir tareas y cómo gestionar actividades. Estos dos flujos los usa el usuario cada día, así que necesitamos una segunda iteración tuya con mockups.

---

## 1. Decisiones tomadas (no negociables)

### TAREAS

**Dos botones en `/home/tasks`:**
1. **PRIMARIO — "+ Añadir tarea"** (más visible, prominente):
   - Abre un selector con el catálogo de tareas: las del seed estático (~30 sugerencias por categoría: cocina, baños, limpieza, compra, logística, cuidado, mantenimiento, jardinería, mascotas) **+** las que la pareja haya creado previamente.
   - Al elegir una, se abre form de configuración: nombre (read-only), categoría (read-only), **puntos sugeridos editables**, recurrencia (sí/no + frecuencia), día programado, asignado a (tú/pareja/cualquiera).
   - Submit añade la tarea a la lista couple-scoped.

2. **SECUNDARIO — "+ Crear tarea nueva"** (botón ghost o de menos peso, ej: outline gris):
   - Form en blanco para una tarea que no existe en el catálogo.
   - Submit crea la tarea + la guarda en el catálogo de pareja para reuso futuro (visible en próximos "Añadir tarea").

**Las tareas siguen siendo couple-scoped**: ambos las ven. (Igual que hoy.)

**Tareas no requieren consenso** para crear/editar: cualquiera de los dos hace cambios. (Igual que hoy.)

### ACTIVIDADES

**Wizard "Nueva actividad"** (`/request-activity`):
- **Quitar el botón "🔎 Catálogo"** que añadimos en v2.0.6 (no funcionaba bien).
- Volver al flujo histórico de 3 pasos: tipo/categoría → fecha/duración → puntos/compensación → enviar a pareja para negociar.
- **No cambia más.**

**Tab "Catálogo"** en `/home/activities` (la tab existente desde v2.0.8):
- Aquí se gestionan las plantillas reutilizables de actividades.
- **Categorías**: 8 cerradas/globales (Trabajo, Salud, Ocio, Social, Alto impacto, Viaje, Cuidado, Personal). El usuario **NO puede crear categorías nuevas**.
- **Subcategorías**: el usuario sí puede añadir subcategorías personalizadas dentro de cualquier categoría existente.
- **Actividades dentro de categoría**: el usuario añade nuevas plantillas con nombre, subcategoría, emoji, puntos sugeridos, duración default, impacto.
- **Consenso de puntos (CORE)**:
  - Al crear una plantilla nueva o editar puntos de una existente, el campo **"puntos sugeridos"** queda en estado **"pendiente de acuerdo"** hasta que el partner acepte.
  - El resto de campos (nombre, subcategoría, emoji, duración) se aplican inmediatamente.
  - Mientras los puntos no están acordados, la plantilla aparece marcada visualmente (badge "Puntos pendientes" + valor en gris) y al usar la plantilla en un evento, el puntos sugerido se ignora (cae al default 10).
  - El partner ve la propuesta, acepta o rechaza. Si rechaza, vuelve al valor anterior (o queda en estado "sin acordar").

---

## 2. Lo que necesito de ti (Claude Design)

Por cada pantalla y componente, **mockup en alta fidelidad** + **especificación adjunta en formato estructurado** (debajo de cada mockup) con esto:

### 2.1 Para cada pantalla/sheet, dame:
```
NOMBRE: <ej: AddTaskFromCatalogSheet>
RUTA SUGERIDA EN CÓDIGO: src/frontend/src/components/v2/tasks/AddTaskFromCatalogSheet.tsx
TIPO: bottom-sheet | modal | inline-card | full-page
TRIGGER: qué evento la abre (ej: tap sobre "+ Añadir tarea")
ESTADOS QUE COBERTURA EL MOCKUP:
  - empty (catálogo vacío)
  - loading
  - normal (lista de templates)
  - filtrando por categoría
  - tras seleccionar template (form de config)
  - error
COMPONENTES INTERIORES: lista de su árbol (ej: SearchInput, CategoryFilter, TemplateList, TemplateRow, ConfigureForm, SubmitButton)
```

### 2.2 Para cada elemento interactivo, dame:
```
ELEMENTO: <ej: botón "Añadir tarea">
ACCIÓN: qué hace al hacer click/tap (ej: abre AddTaskFromCatalogSheet)
NAVEGACIÓN: si lleva a otra ruta (ej: navigate('/tasks/123'))
API CALL: si dispara una llamada (ej: POST /api/tasks/:id/schedule { scheduledFor, isRecurring, frequency })
SIGUIENTE ESTADO: qué pasa después (ej: cierra sheet, refetch tasks, toast "✅ Añadida")
DISABLED CUANDO: condiciones que deshabilitan el botón
LOADING CUANDO: condiciones que muestran spinner
```

### 2.3 Para cada formulario, dame:
```
CAMPOS:
  - <nombre>: tipo (text/number/date/select/toggle), required sí/no, validación, placeholder, default
ON SUBMIT: API call exacta, success state, error state
ON CANCEL: qué pasa
```

### 2.4 Tokens y estilos
- Usa los design tokens existentes (`text-text-primary`, `bg-surface-card`, `border-brd-subtle`, `bg-brand-purple`, `bg-warn`, `bg-danger`, etc.). Si necesitas tokens nuevos, lístalos al final con propuesta de valor hex.
- Iconos de **lucide-react** (Plus, Trash, Pencil, Filter, RefreshCw, Check, X, Sparkles, Clock, Calendar, etc.).
- Mobile-first: dimensiona para 390px ancho como referencia. Adaptación responsive a desktop.
- Dark theme estricto (no hay light theme aún).
- Focus rings visibles en todos los inputs y botones (`focus-visible:ring-2 focus-visible:ring-brand-purple`).

### 2.5 Estados especiales que NO debo olvidar
Por cada flujo, asegúrate de cubrir:
- **Empty state**: "no tienes tareas todavía" / "tu catálogo de actividades está vacío".
- **Loading state**: skeleton o spinner.
- **Error state**: mensaje inline + reintento.
- **Permission state**: si el usuario no puede hacer algo (ej: editar template global), badge "global · solo lectura".
- **Pending consenso**: badge "Puntos pendientes" + tooltip "Esperando aprobación de [partner]".
- **Confirm destructive**: dialog antes de eliminar.

---

## 3. Pantallas concretas que necesito mockup

### 3.1 Tasks (`/home/tasks`) — header
**Mockup esperado**: dos botones diferenciados ("Añadir tarea" primario + "Crear tarea nueva" secundario), refresh, filtros existentes mantenidos.

### 3.2 AddTaskFromCatalogSheet
**Mockup esperado**: bottom sheet que se abre al tap "+ Añadir tarea". Lista del catálogo (TASK_CATALOG estático con grupos por categoría + tareas custom de la pareja). Búsqueda. Al seleccionar una, transición a configure-form (puntos editables + recurrencia + día programado + asignado). Submit.

### 3.3 CreateTaskNewSheet
**Mockup esperado**: form similar al sheet anterior pero campos en blanco (nombre, categoría, puntos, descripción opcional). Mismo estilo, mismo botón submit. Al guardar, la tarea queda en el catálogo de la pareja además de añadirse a la lista.

### 3.4 Activities (`/home/activities`) — Tab Catálogo refinada
**Mockup esperado**:
- Header con "+ Nueva actividad del catálogo" y refresh.
- Filtro chip por las 8 categorías cerradas (no se pueden crear nuevas).
- Lista por categoría. Cada actividad muestra nombre, subcategoría, puntos (con badge "pendiente acuerdo" si aplica), emoji.
- Templates propias: editar/eliminar. Globales: read-only.

### 3.5 AddActivityTemplateSheet (refinada)
**Mockup esperado**: form similar al actual pero con:
- Selector de categoría (8 fijas).
- Campo subcategoría (libre, autocompletando con las que ya existen para esa categoría).
- Banner explicativo: "Los puntos sugeridos quedan pendientes hasta que [partner] los acepte. El resto de campos se aplican inmediatamente."
- Submit → crea + dispara propuesta de puntos a partner.

### 3.6 ProposalsPanel — refinado
**Mockup esperado**: la sección actual de Settings → Propuestas pendientes debe mostrar:
- Propuestas de puntos para actividades del catálogo (nuevo en este sprint).
- Propuestas de cambio de regla (ya existían).
- Cada una con: campo, valor actual → valor propuesto, razón (opcional), expira en X días, botones aceptar/rechazar (si eres el partner) o cancelar (si eres el proposer).

### 3.7 Wizard "Nueva actividad" (RequestActivity)
**Mockup esperado**: vuelta al diseño previo a v2.0.6 (sin botón catálogo) — confirmar visualmente que el resto de pasos no cambia.

### 3.8 Estados consenso visibles
**Mockup esperado**: cómo se ve una actividad del catálogo con puntos pendientes vs acordados (badges, color, opacidad).

---

## 4. Convenciones técnicas que debes asumir

- **Stack**: React 18 + TypeScript + Tailwind + react-query + Zustand.
- **API client**: `apiClient.request(path, options)` — devuelve JSON o lanza Error.
- **Hooks pattern**: cada feature tiene un hook `useX()` que envuelve react-query con el endpoint correspondiente.
- **Couple-scoped**: ambos miembros ven todo (tareas, actividades, catálogo). El backend valida con JWT (`req.coupleId`).
- **Forms**: validación inline (sin librerías extra). Mensaje de error debajo del campo. Submit deshabilitado mientras hay errores.
- **Dialogs/sheets**: animación slide-up desde abajo en mobile, fade en desktop. ESC + click fuera + botón ✕ cierran. `aria-modal="true"`.
- **Toasts**: existe un sistema de banners inline arriba de la página (`success` verde, `error` rojo). NO uses toasts flotantes nuevos.

---

## 5. Convenciones de implementación que tú DECIDES y yo SIGO

Cuando entregues el mockup, decide:
- Iconos exactos (de la lista lucide-react).
- Espaciados (px-3 vs px-4, gap-2 vs gap-3).
- Tamaños tipográficos (text-xs / text-sm / text-base).
- Colores de los badges (success/warn/danger/info).
- Animaciones (transition-all, duration-150, etc.).
- Si usas grid o flex y cómo.

**Yo replicaré exactamente** lo que tú decidas. No inventes inconsistencias con el resto del producto: revisa el doc principal `docs/design/2026-05-03-handoff-claude-design.md` y los componentes existentes que mencionamos para mantener coherencia.

---

## 6. Datos de prueba que puedes asumir

```
TASK_CATALOG estático (extracto):
  cocina: ['Cocinar la cena' 12pts, 'Cocinar la comida' 10pts, 'Preparar el desayuno' 6pts, 'Fregar los platos' 8pts, ...]
  limpieza: ['Pasar la aspiradora' 10pts, 'Fregar el suelo' 12pts, 'Planchar' 10pts, ...]
  baños: ['Limpiar baño completo' 15pts, ...]
  compra: ['Hacer la compra semanal' 18pts, ...]
  ...

ActivityTemplate (backend):
  ~50 templates globales seed (coupleId=null), ej:
    { category: 'salud', subcategory: 'deporte', name: 'Gimnasio / entreno', pointsBaseSuggested: 4, defaultDurationMinutes: 60, defaultImpact: 'health', emoji: '🏋️' }
  Custom de la pareja (coupleId=<id>): se añaden y muestran junto a globales.

Categorías (cerradas):
  trabajo · salud · ocio · social · alto_impacto · viaje · cuidado · personal
```

---

## 7. Entregable que espero

1. Mockups en alta fidelidad (Figma export PNG/JPG está bien) de cada pantalla/sheet listada en §3.
2. Por cada mockup, **especificación estructurada** (formato de §2.1, §2.2, §2.3) directamente al lado o debajo de la imagen.
3. Lista de **decisiones que has tomado** (espaciados, iconos, tokens).
4. Lista de **decisiones que dejas en mi tejado** si las hay.
5. (Opcional) Storyboard del flujo end-to-end de "Añadir una tarea de cocina del catálogo" y "Crear una nueva subcategoría con propuesta de puntos en Actividades".

Cuando me pases todo eso, yo replico en una sesión.

---

## 8. Restricciones de tiempo

Estamos en sprint diario. Cuanto antes entregues, antes itero. Si tienes dudas mientras maquetas, lánzalas en el chat y respondo en el momento.
