# Matripuntos — Roadmap de Versiones
**Fecha:** 2026-04-11  
**Tipo:** Diseño de producto · Roadmap completo  
**Estado:** Aprobado por usuario

---

## Contexto y visión

Matripuntos es una app web gamificada para parejas que centraliza la gestión equitativa del hogar. La visión a largo plazo es ser la herramienta 360 de gestión, planificación y control de la relación: todo lo que una pareja tiene "de viva voz" o repartido en muchas apps, en un solo lugar.

**Audiencia:** Parejas en general. Producto público desde el inicio.  
**Modelo de negocio:** Todo gratis al lanzar para traccionar. Cuando haya base de usuarios activos se aplican límites en features clave (freemium B: funcional completo con topes, premium elimina límites + features extra).  
**Ritmo de versiones:** Frecuente, iterativo. Cada versión minor es deployable a producción.  
**Estilo visual:** Warm + dark. Base cálida (amber, crema) con fondos oscuros púrpura y acentos premium. Referencia: Headspace + Discord.

---

## Sistema de versiones

Formato: `vX.Y · Nombre` donde el nombre da identidad comunicable al release.

| Versión | Nombre | Estado |
|---|---|---|
| MVP 1 | Los Cimientos | Casi listo (3 bugs pendientes) |
| v1.1 | La Chispa | Planificado |
| v1.2 | El Juego | Planificado |
| v1.3 | La Casa | Planificado |
| v2.0 | Hogar 360 | Planificado |
| v2.1 | Conectados | Planificado |
| v3.0 | Premium | Futuro |

---

## MVP 1 · Los Cimientos

**Descripción:** Base completa funcional ya implementada. Cerrar con 3 bug fixes.

**Contenido ya implementado:**
- Auth + invitaciones + onboarding (4 pasos)
- Eventos: CRUD, negociación, forzar
- Tareas: CRUD, logs, verificación, disputa
- Puntos: balance, historial, transacciones
- Configuración editable (tareas, multiplicadores, tipos)
- Notificaciones in-app
- Perfiles + familia (V2)
- Categorías personalizadas (V2)
- Logros/Achievements base (V2)
- Calendario base (V2)
- Analytics: overview, trends, equity (V2)

### Bug 1 — Calendario no muestra tareas

**Root cause:** El backend de `/api/calendar` solo devuelve eventos, no task logs.  
**Fix:** Incluir tareas completadas/planificadas como `CalendarEntry` de tipo `task` en el endpoint del calendario.

### Bug 2 — Horario no sincronizado al PC

**Root cause:** Los timestamps se guardan en UTC pero el frontend no convierte a timezone local al mostrar horas.  
**Fix:** Usar la timezone del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) en todos los displays de hora del frontend.

### Bug 3 — Notificación al crear actividad (debe ser al responder)

**Root cause:** Se dispara una notificación al partner cuando el usuario crea la actividad. Solo debería dispararse cuando el partner responde (acepta / rechaza / contraoferta).  
**Fix:** Mover el `notificationService.create()` del endpoint `POST /events` al endpoint de respuesta (`POST /events/:id/accept`, `POST /events/:id/reject`, `POST /events/:id/counter`).

---

## v1.1 · La Chispa

**Foco:** Rediseño UX/UI completo + primeros elementos de personalidad diaria.  
**Objetivo:** La app pasa de funcional a deseable. Primera versión presentable a usuarios externos.

### Rediseño UX/UI 2.0

**Paleta de color:**
- Fondo: `#0f0a1e` → `#1a1035` (púrpura oscuro)
- Acento primario: `#f59e0b` (amber)
- Acento secundario: `#a855f7` (purple)
- Texto principal: `#e2e8f0`
- Texto secundario: `#9ca3af`

**Navegación:** Bottom navigation bar con 5 posiciones:
- `🏠 Inicio` · `✅ Tareas` · `[➕]` (botón central elevado, acción rápida) · `📅 Calendario` · `🏆 Logros`
- Módulos secundarios (Analytics, Lista compra, To-dos, Journaling, Settings) accesibles desde menú "Más" o pantalla secundaria

**Áreas de rediseño:**
- Dashboard: cards con glassmorphism, stats con iconografía clara, gráfico de balance rediseñado
- Tareas: cards más visuales con categoría en color, estado prominente
- Eventos/Actividades: flujo de negociación más claro, estados diferenciados visualmente
- Bandeja de entrada: pestañas más claras, badges de conteo
- Analytics: gráficos con colores cálidos, selector de periodo mejorado
- Onboarding: flujo más pulido para nuevos usuarios públicos

### Mood del día

- 6–10 estados de ánimo seleccionables: animado, tranquilo, estresado, saturado, necesito espacio, feliz, cansado, etc.
- Visible en el header/perfil del usuario
- La pareja puede ver el estado del otro en tiempo real
- Se puede cambiar en cualquier momento del día
- No genera puntos ni notificaciones

### Frase motivacional diaria

- Una frase distinta cada día, parte de la gamificación
- Aparece en el dashboard al abrir la app
- Biblioteca de frases propia (no API externa), mezclando humor, motivación y contexto de pareja

### Dark mode toggle

- El diseño base ya es oscuro; el toggle permite cambiar a modo claro (warm light: cremas y ambers)
- Preferencia guardada por usuario

### Avatares / perfil visual

- Selección de avatar de entre una biblioteca de ilustraciones (no fotos reales en MVP)
- Mostrado en el header, en la pantalla de pareja, y en logros conjuntos

### Mejora de onboarding

- Onboarding más visual y narrativo para usuarios que llegan solos (sin código de pareja)
- Explica la propuesta de valor antes de pedir datos
- Permite crear cuenta y explorar en modo "demo" antes de invitar a la pareja

---

## v1.2 · El Juego

**Foco:** Gamificación potente como corazón visible + configurabilidad de reglas por pareja.

### Sistema de niveles de pareja

Nivel compartido que sube con la actividad combinada de ambos. Da identidad y progresión al equipo.

| Nivel | Nombre | Rango |
|---|---|---|
| 🥚 | Nido | 1–3 |
| 🌱 | Brote | 4–7 |
| 🏠 | Hogar | 8–14 |
| 🌳 | Raíces | 15–24 |
| 💎 | Diamante | 25–39 |
| 🌟 | Leyenda | 40+ |
| ♾️ | Eterno | Infinito (sin techo) |

El nivel sube acumulando puntos totales de la pareja (suma de ambos usuarios).

### Mapa de logros estilo Duolingo

- Camino visual serpentante con nodos desbloqueables en orden
- El camino nunca termina: siempre hay logros nuevos por desbloquear
- Nodos completados: dorado con glow
- Nodo en curso: morado brillante con indicador "EN CURSO"
- Nodos bloqueados: gris tenue con borde punteado
- Cada nodo muestra: emoji, nombre, descripción breve y puntos de recompensa

### Categorías de logros

| Categoría | Icono | Descripción |
|---|---|---|
| Constancia | 🔥 | Rachas, días seguidos, regularidad |
| Equilibrio | ⚖️ | Semanas/meses con aportación igualada |
| Consenso | 🤝 | Acuerdos negociados, actividades aprobadas |
| Rendimiento | ⚡ | Puntos acumulados, tareas completadas |
| Pareja | 💑 | Hitos conjuntos: primer mes, aniversario app, nivel |
| Secretos | 🌙 | Logros ocultos que se descubren por sorpresa |

### Rareza de logros

| Rareza | Color | Criterio |
|---|---|---|
| Común | ⬜ Gris | Primeras semanas de uso |
| Poco común | 🔵 Azul | Algo de esfuerzo sostenido |
| Raro | 🟣 Morado | Dedicación real (semanas) |
| Épico | 🟡 Dorado | Meses de trabajo conjunto |
| Legendario | 🔴 Rojo | Solo las parejas más constantes |

### Rachas con multiplicador de puntos

| Racha | Multiplicador |
|---|---|
| 3 días | ×1.1 |
| 7 días | ×1.25 |
| 14 días | ×1.5 |
| 30 días | ×2.0 |

- Racha se rompe si pasan 48h sin actividad de ninguno de los dos
- Congelador de racha: 1 disponible por semana (como Duolingo), preserva la racha un día

### Editor de categorías de actividades

- Igual que el editor de tareas: CRUD de categorías y subcategorías
- Una pareja propone una categoría/subcategoría nueva con puntos base → la otra acepta o rechaza (sin negociación, solo sí/no)
- Actividades rechazadas quedan en historial reactivable: se pueden reabrir sin recriar desde cero

### Panel "Reglas del Juego"

- Movido desde Configuración a un apartado propio accesible desde Settings
- La pareja puede ver y proponer cambios en: puntos base por categoría, multiplicadores por horario / duración / hijos / mascotas
- Cambios propuestos por un miembro → el otro acepta o rechaza sin contraoferta
- Si se rechaza, permanece la configuración anterior

### Mascotas como factor en tareas

Añadir `FactorMascotas` al cálculo de puntos de tareas:

```
FactorMascotas: 0 mascotas ×1.0 · 1 mascota ×1.1 · 2+ mascotas ×1.2
```

El campo `pets` ya existe en el schema (modelo `Pet`). Se usa el count de mascotas activas de la pareja.

---

## v1.3 · La Casa

**Foco:** Hub de gestión doméstica real — planificación, compras, recordatorios.

### Tareas 2.0 — Planificador con calendario

El módulo de tareas gana una vista de planificación semanal/mensual.

**Tipos de tarea:**
- **Puntual:** fecha y franja horaria únicas
- **Recurrente:** diaria / bisemanal / semanal / quincenal / mensual

**Comportamiento:**
- Al crear una tarea recurrente se generan instancias futuras automáticamente
- Cada instancia tiene su propia franja horaria configurable
- La notificación de verificación al partner se envía al finalizar la franja horaria, no al crearla
- El partner valida que la tarea se ha realizado; si no responde en 24h → auto-verificado

**Vistas:**
- Vista lista (actual) + vista semanal tipo agenda
- En la vista semanal cada tarea muestra: nombre, franja, puntos, estado

### Lista de la compra compartida

- Lista compartida entre los dos miembros de la pareja
- Cualquiera puede añadir items, tacharlos, o asignárselos
- Items sin asignar son "de ambos"
- Categorías predefinidas: Fresca, Verdura, Carne, Despensa, Limpieza, Utensilios, Otros
- Historial de listas anteriores (últimas 4 semanas)
- No genera puntos (es gestión pura, no gamificada)

### Módulo To-dos personal

- Recordatorios individuales (no compartidos por defecto)
- Campos: texto, fecha opcional, sin categoría obligatoria
- Sin puntos ni gamificación
- **Base para versiones futuras:** compartir con pareja, convertir en tarea gamificada

### Resumen semanal (digest)

- Notificación push / in-app cada lunes con resumen de la semana anterior
- Incluye: balance de puntos, logros desbloqueados, tareas completadas, estado de racha

---

## v2.0 · Hogar 360

**Foco:** Convertir Matripuntos en la app completa de la vida en pareja.

### Calendario avanzado compartido

- Eventos sin puntos: citas médicas, cumpleaños, vacaciones, reuniones de colegio, etc.
- Eventos puntuales o recurrentes con franja horaria
- Vista unificada: eventos de pareja (con puntos), tareas planificadas (con puntos), y eventos de calendario (sin puntos) en un solo lugar
- Vistas: día / semana / mes
- Schema: campo `googleCalendarId` añadido a `CalendarEntry` pero sin implementar sync (preparado para v2.1)

### Journaling de pareja

- Entrada diaria opcional por usuario
- Privada por defecto; puede marcarse como "compartida con pareja" post-escritura
- Sin comentarios ni reacciones del partner — espacio de reflexión, no chat
- Vista en línea de tiempo tipo feed dentro del módulo
- Búsqueda por fecha

### Aniversarios e hitos

- La pareja registra fechas especiales: aniversario, primer piso juntos, nacimiento de hijos, etc.
- Aparecen destacados en el calendario avanzado
- El día del aniversario se desbloquea un logro especial de categoría "Pareja"

### Analytics pro

- Extensión del módulo de analytics existente
- Nuevas métricas: tendencias a 3/6/12 meses, predicción de desequilibrio, heatmap de actividad por día de semana

---

## v2.1 · Conectados

**Foco:** Integraciones externas y crecimiento.

- Push notifications en móvil (PWA o app nativa)
- Sync Google Calendar (bidireccional: eventos Matripuntos → Google Cal, Google Cal → Matripuntos en modo lectura)
- Export de datos: CSV de historial de puntos y tareas, PDF de resumen mensual
- Sistema de referidos: invitar a otras parejas con código propio, recompensa en puntos o logro especial

---

## v3.0 · Premium

**Foco:** Monetización una vez hay base de usuarios activos.

**Modelo freemium B — límites en free:**
- Máx X actividades/mes (por definir con datos reales de uso)
- Máx X tareas recurrentes activas
- Máx 2 rondas de negociación (ya implementado)
- Analytics histórico limitado a 3 meses

**Premium desbloquea:**
- Todo sin límites
- Rondas de negociación ilimitadas
- Analytics histórico completo
- Acceso prioritario a nuevas features
- Badge "Premium" en el perfil de pareja

**Implementación:**
- Stripe para pagos
- App móvil React Native

---

## Features propuestas adicionales (no estaban en la lista original)

| Feature | Versión | Justificación |
|---|---|---|
| Dark mode toggle | v1.1 | Coherente con paleta warm+dark; fácil de implementar |
| Avatares de pareja | v1.1 | Mejora identidad y personalización; impacto visual alto |
| Rachas con multiplicador | v1.2 | Core de la gamificación Duolingo-style; aumenta engagement |
| Digest semanal | v1.3 | Retención de usuarios; notificación de alto valor |
| Aniversarios e hitos | v2.0 | Refuerza el vínculo emocional con la app |
| Sistema de referidos | v2.1 | Crecimiento orgánico pareja a pareja |
| Export de datos | v2.1 | Confianza del usuario; GDPR-friendly |

---

## Decisiones de diseño clave

1. **Navegación:** Bottom nav con botón ➕ central elevado. Módulos secundarios en "Más".
2. **Estilo visual:** Warm (amber, crema) sobre dark (púrpura oscuro). No completamente oscuro ni completamente claro.
3. **Freemium:** Todo gratis al lanzar. Límites se activan cuando hay usuarios reales y datos de uso.
4. **Gamificación:** El nivel es de pareja (compartido), los logros pueden ser individuales o de pareja. Las rachas son de pareja.
5. **Reglas del juego:** Configurables por pareja, con sistema de aprobación bilateral sin negociación.
6. **Notificaciones:** Solo se notifica al partner cuando hay una acción que requiere su respuesta, nunca al crear unilateralmente.
7. **Mascotas:** Factor de puntos en tareas, no módulo separado.
8. **Journaling:** Espacio íntimo sin social features. No es un chat ni un feed compartido por defecto.
