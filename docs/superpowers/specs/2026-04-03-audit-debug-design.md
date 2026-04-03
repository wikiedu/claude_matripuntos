# Auditoría, Debug y Mejora de Diseño — Matripuntos

**Fecha:** 2026-04-03
**Rama:** feature/matripuntos-mvp
**Enfoque:** Opción A — análisis estático → live testing → fixes → diseño

---

## Objetivo

Obtener una app funcional, limpia y visualmente coherente como base sólida para iterar nuevas funcionalidades. No es un rediseño total ni una reescritura: es depuración profunda + mejora coherente del sistema existente.

---

## Fase 1 — Auditoría Estática de Código

### Backend

**Rutas y endpoints:**
- Verificar que cada llamada en `apiClient.ts` tiene su correspondiente ruta en el backend
- Detectado preliminarmente: `apiClient.auth.signup` llama a `/auth/signup` pero el backend registra `/auth/register`
- `pointsV2Routes` y `pointsRoutes` ambos montan en `/api/points` — verificar colisiones de rutas
- `apiClient.auth.getMe` llama a `/auth/me` — confirmar que existe en `authRoutes.ts`
- `apiClient.auth.getCouple` llama a `/auth/couple` — confirmar que existe

**Tipos y validaciones:**
- Revisar uso de `Decimal` de Prisma vs `number` en cálculos de puntos
- Validaciones Zod: confirmar presencia en rutas V2 (profile, family, categories, achievements, calendar, analytics)
- Detectar campos opcionales que deberían ser requeridos

**Seguridad:**
- Confirmar que todas las rutas protegidas usan `authMiddleware`
- Revisar que `req.coupleId` se valida antes de queries (evitar acceso cross-couple)
- Inputs de usuario: confirmar sanitización en rutas que aceptan strings libres

**Lógica de negocio:**
- Fórmula de puntos: verificar consistencia entre `pointsCalculator.ts` (backend service) y `pointsCalculator.ts` (frontend utils)
- Negociación: flujo de rondas (maxFreeRounds, bloqueo al agotarlas, forzar)
- Auto-aceptación de TaskLogs a las 24h: confirmar implementación o marcar como pendiente
- `compensationDiscount`: confirmar que se aplica correctamente como multiplicador

### Frontend

**API client vs backend:**
- Auditar cada método de `apiClient.ts` contra rutas reales del backend
- Parámetros: confirmar que los nombres de campos coinciden (camelCase vs snake_case, etc.)
- Respuestas: confirmar que el frontend maneja la forma real del response

**Estado:**
- Zustand: detectar actualizaciones de estado que no se reflejan en UI
- React Query: confirmar que mutations invalidan las queries relacionadas
- `loadUserData` en `App.tsx`: confirmar que no hay race conditions con el token

**TypeScript:**
- Localizar `any` en componentes y servicios críticos
- Tipos de `types/index.ts`: confirmar cobertura completa de entidades del backend
- Props de componentes sin tipar o con tipos demasiado amplios

**Componentes:**
- Verificar que todos los estados de carga/error/vacío están manejados
- Formularios: validación antes de submit, feedback de errores inline
- Navegación: confirmar que todas las rutas de `App.tsx` tienen su página implementada

---

## Fase 2 — Live Testing con agent-browser

Arrancar ambos servidores y ejecutar los flujos críticos:

**Flujo 1 — Registro y onboarding:**
1. Registro de nuevo usuario
2. Onboarding steps 1-4
3. Invitación al partner + join flow

**Flujo 2 — Eventos y negociación:**
1. Crear evento (tipo, fechas, hijos, puntos base)
2. Ver puntos calculados
3. Proponer → partner contraoferta → aceptar
4. Verificar que `PointsTransaction` se crea y balance se actualiza

**Flujo 3 — Tareas:**
1. Crear tarea personalizada
2. Log de tarea completada
3. Verificación por partner
4. Disputa de puntos

**Flujo 4 — Funcionalidades secundarias:**
1. Notificaciones: aparecen, se marcan como leídas
2. Calendar: carga entradas, crea nueva
3. Analytics: carga datos reales (overview, trends, equity)
4. Settings: editar configuración de multiplicadores
5. Achievements: visualización de logros

**Capturas de pantalla** de cada página para auditoría de diseño.

---

## Fase 3 — Aplicar Fixes

**Prioridad 1 — Críticos (app no arranca o flujo principal roto):**
- Endpoints rotos en `apiClient.ts`
- Auth: login/registro/token
- Crashes de runtime en páginas principales

**Prioridad 2 — Funcionales (feature rota):**
- Lógica de puntos incorrecta
- Negociación bloqueada o mal contabilizada
- Datos no persisten o no se recargan

**Prioridad 3 — Calidad:**
- Tipos `any` críticos → tipos concretos
- Validaciones Zod ausentes en rutas importantes
- Queries React Query sin invalidar tras mutations
- Duplicación de lógica entre frontend y backend

---

## Fase 4 — Mejoras de Diseño

**Dirección:** Sistema de diseño coherente que refuerza la naturaleza gamificada de la app. No rediseño — mejora del sistema Tailwind existente.

**Dashboard:**
- Balance de puntos prominente y visual (no sólo texto)
- Indicador de equilibrio pareja (quién "debe" a quién)
- Accesos rápidos a acciones frecuentes

**Cards de negociación:**
- Estado del flujo claro (en qué ronda estamos, quién tiene el turno)
- Historial de propuestas visible inline
- CTA principal destacado

**Sistema de colores y tipografía:**
- Paleta coherente en todas las páginas
- Jerarquía tipográfica consistente (headings, labels, values)
- Estados: success/warning/error/neutral uniformes

**Onboarding:**
- Progress indicator más visual
- Cada step con propósito claro y microcopy de ayuda

**Micro-feedback:**
- Animación al ganar puntos
- Badge de logro desbloqueado
- Confirmación visual al completar una tarea

**Responsive:**
- Verificar y corregir layout en 375px (iPhone SE)
- Navegación mobile funcional

---

## Criterios de Éxito

| Área | Criterio |
|------|---------|
| Funcional | Flujos 1-4 completan sin errores en el browser |
| TypeScript | `tsc --noEmit` limpio en backend y frontend |
| API | Cero llamadas a endpoints inexistentes |
| Diseño | UI coherente, balance visible en dashboard, negociación clara |
| Mobile | Usable en viewport 375px |

---

## Fuera de Scope

- Integración con Stripe (pagos premium)
- App móvil nativa
- Google Calendar integration
- Notificaciones push
- Eliminar rutas V1 del backend
- Migraciones destructivas del schema de Prisma
