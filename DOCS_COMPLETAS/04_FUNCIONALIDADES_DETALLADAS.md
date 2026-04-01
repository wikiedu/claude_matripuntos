# 🎮 FUNCIONALIDADES DETALLADAS DE MATRIPUNTOS

## Introducción

Este documento describe **cada funcionalidad** de Matripuntos en detalle: qué hace, cómo funciona, casos de uso, flujos paso a paso, y validaciones.

---

## 1. AUTENTICACIÓN Y CUENTA

### 1.1 Sign-Up (Crear Cuenta de Pareja)

**Descripción:**
Dos usuarios crean una cuenta compartida (pareja). Ambos proporcionan datos y establecen la relación.

**Pantalla: Login (Sign-Up Tab)**

**Campos:**
```
Sección 1 - Usuario 1:
- Email 1: (obligatorio, único, formato email)
- Contraseña 1: (mínimo 8 caracteres, alphanumeric + símbolo)
- Nombre 1: (obligatorio, max 50 caracteres)

Sección 2 - Usuario 2:
- Email 2: (obligatorio, único, diferente a email 1)
- Contraseña 2: (mínimo 8 caracteres)
- Nombre 2: (obligatorio, max 50 caracteres)

Configuración Inicial (Opcional):
- ¿Cuántos hijos tienes? (0, 1, 2, 3+)
  → Se usa como multiplicador por defecto
- ¿Quieres importar tabla de tareas predeterminada?
  → Sí / No / Personalizado

Botón: [CREAR CUENTA DE PAREJA]
```

**Validaciones:**
```
✓ Emails únicos (no puede haber otro usuario con mismo email)
✓ Emails diferentes (no pueden ser el mismo email para ambos)
✓ Contraseña: mín 8 chars, debe tener número o símbolo
✓ Nombres: no vacíos, máx 50 chars
✓ Email válido (formato RFC 5322 básico)

Errores:
- "El email ya está registrado"
- "Contraseña muy débil"
- "No puedes usar el mismo email para ambos"
- "Email inválido"
```

**Flujo:**
```
1. Usuario A completa formulario
2. App valida datos
3. App crea Couple en base de datos
4. App crea User 1 (Usuario A) y User 2 (Usuario B)
5. App crea Configuration (con hijos por defecto)
6. App genera JWT token para Usuario A
7. App redirige al Dashboard
```

**Respuesta API:**
```json
{
  "couple": {
    "id": "uuid",
    "users": [
      { "id": "uuid1", "name": "Alice", "email": "alice@test.com" },
      { "id": "uuid2", "name": "Bob", "email": "bob@test.com" }
    ],
    "childrenCount": 2
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "uuid1", "name": "Alice", "email": "alice@test.com" }
}
```

---

### 1.2 Login (Iniciar Sesión)

**Descripción:**
Un usuario inicia sesión con email + contraseña. Recibe JWT token.

**Pantalla: Login (Sign-In Tab)**

**Campos:**
```
- Email: (obligatorio, formato email)
- Contraseña: (obligatorio, mín 8 chars)

Botón: [INICIAR SESIÓN]
Enlace: "¿No tienes cuenta? Crear pareja"
```

**Validaciones:**
```
✓ Email formato válido
✓ Contraseña no vacía
✓ Credenciales coinciden en BD

Errores:
- "Email o contraseña incorrectos"
- "El usuario no existe"
- "Contraseña incorrecta"
```

**Flujo:**
```
1. Usuario introduce email + contraseña
2. App valida formato
3. App busca usuario por email
4. Si existe: app valida contraseña (bcryptjs)
5. Si coincide: app genera JWT token (7 días expiración)
6. App guarda token en localStorage
7. App redirige al Dashboard
8. Si falla: muestra error, sin redirigir
```

**JWT Token:**
```json
{
  "userId": "uuid",
  "coupleId": "uuid",
  "email": "alice@test.com",
  "exp": 1234567890,
  "iat": 1234567800
}
```

---

### 1.3 Sesión (JWT y Persistencia)

**Descripción:**
El token JWT se guarda en localStorage. Se auto-inyecta en cada request. Si expira, redirecciona al login.

**Implementación:**
```typescript
// localStorage key
localStorage.getItem('matripuntos_token')

// Auto-inyección en headers
fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

// Expiración
Token válido: 7 días
Si expira: app pide login de nuevo
Si inválido: GET /me retorna 401, app limpia token y redirige
```

**Logout:**
```
1. Usuario hace click en [CERRAR SESIÓN]
2. App elimina token de localStorage
3. App borra datos de usuario de Zustand store
4. App redirige al login
```

---

## 2. SOLICITUD DE ACTIVIDAD (AUSENCIA/EVENTO)

### 2.1 Crear Solicitud de Actividad

**Descripción:**
Un usuario propone una actividad (cena, viaje, evento) con cálculo automático de puntos.

**Pantalla: RequestActivity**

**Campos:**
```
1. Tipo de Actividad: (dropdown)
   - Cena/Copas (8 pts)
   - Comida de trabajo (3 pts)
   - Evento deportivo (5 pts)
   - Viaje de día (20 pts)
   - Viaje fin de semana (40 pts)
   - Viaje de trabajo 3 días (60 pts)
   - Despedida/Boda (25 pts)
   - Hobby/Deporte (2 pts)
   - Médico/Urgencia (2 pts)
   - Otro (especificar)

2. Fecha y Hora:
   - Fecha inicio: (date picker)
   - Hora inicio: (time picker, ej: 19:30)
   - Hora fin: (time picker, ej: 23:30)
   → Se calcula duración automáticamente

3. Detalles:
   - Descripción: (texto, máx 200 chars)
   - ¿Con hijos? (sí/no, si no = usar el default de pareja)

4. Compensación (opcional):
   - Tipo: (dropdown: dormir más, cena especial, tarea mañana, dinero, otro)
   - Descripción: (texto, máx 100 chars)
   - Descuento estimado: (auto-calculado, ej: -10%)

Botón: [CALCULAR] (si cambios) → [SOLICITAR ACTIVIDAD]
```

**Cálculo en Tiempo Real:**
```
Mientras el usuario completa el formulario, la app calcula en vivo:

Base: 8 pts (cena)
Hora: 21h → Factor 1.5 (noche)
Duración: 2h → Factor 1.0
Hijos: 2 → Factor 1.8
Subtotal: 8 × 1.5 × 1.0 × 1.8 = 21.6 pts

Compensación: -10% (dormir más)
TOTAL: 21.6 × 0.9 = 19.44 → 19.5 pts

MUESTRA EN TIEMPO REAL:
"Esta solicitud te costará 19.5 matripuntos"
Desglose: (21.6 base - 2.1 compensación)
```

**Validaciones:**
```
✓ Tipo seleccionado
✓ Fecha en futuro o hoy
✓ Hora inicio < Hora fin
✓ Duración > 0 minutos
✓ Descripción no vacía (mín 5 chars)

Errores:
- "Selecciona un tipo de actividad"
- "La fecha debe ser hoy o futura"
- "La hora de fin debe ser después de inicio"
- "Describe brevemente qué harás"
```

**Flujo:**
```
1. Usuario completa form + calcula
2. App valida todos los campos
3. App crea Event en BD (status: "pending")
4. App crea Negotiation (proposer: usuario actual, base_points: 19.5)
5. App redirige a Dashboard con confirmación
6. La otra persona recibe notificación: "X propone actividad, costo 19.5 pts"
```

**Respuesta API (POST /api/events):**
```json
{
  "event": {
    "id": "uuid",
    "type": "dinner",
    "startDate": "2026-04-10T21:30:00Z",
    "endDate": "2026-04-10T23:30:00Z",
    "description": "Cena con amigos de la uni",
    "hasChildren": true,
    "status": "pending",
    "createdBy": "uuid_user1"
  },
  "negotiation": {
    "id": "uuid",
    "status": "pending",
    "proposedPoints": 19.5,
    "currentRound": 1,
    "maxRounds": 2
  }
}
```

---

### 2.2 Responder a Solicitud de Actividad

**Descripción:**
La otra persona ve la solicitud y elige: aceptar, rechazar, o contra-proponer.

**Pantalla: RequestInbox**

**Vista de Solicitud Pendiente:**
```
┌─────────────────────────────────┐
│ SOLICITUD DE JUAN               │
│ Cena viernes 21h-23h            │
│ (2 horas, con niños)            │
├─────────────────────────────────┤
│ COSTO PROPUESTO: 19.5 pts       │
│ Desglose: 8 base × 1.5 (noche) │
│           × 1.0 (duración)      │
│           × 1.8 (2 hijos)       │
│           - 10% (compensación)  │
├─────────────────────────────────┤
│ [✅ ACEPTAR]                    │
│ [🔄 AJUSTAR]                    │
│ [❌ RECHAZAR]                   │
│ [↩️ PROPONER OTRO DÍA]          │
└─────────────────────────────────┘
```

**Opción A: Aceptar**
```
Flujo:
1. María hace click [ACEPTAR]
2. App actualiza Negotiation: status = "accepted"
3. App crea PointsTransaction: +19.5 pts para María, -19.5 para Juan
4. App actualiza Event: status = "accepted"
5. Ambos reciben notificación: "Actividad aceptada ✓"
6. Historial muestra evento completado

Resultado: Fin de la negociación
```

**Opción B: Ajustar Puntos**
```
Entra en RONDA 1 DE NEGOCIACIÓN

Campo: "¿Cuántos puntos debería costar?"
- Input numérico: (default: 19.5)
- Textarea: "¿Por qué?" (opcional)

Ejemplo:
María: "Creo que deberían ser 17.5, porque es fin de semana y tú duermes más"

Botón: [ENVIAR CONTRA-PROPUESTA]

Flujo:
1. App crea NegotiationRound: { type: 'counter', proposedPoints: 17.5, comment: "..." }
2. App incrementa currentRound: 2 (última ronda gratis)
3. Juan recibe notificación: "María propone 17.5 pts, ¿qué dices?"
4. Juan ve opciones: [Aceptar 17.5] [Proponer 18.5] [Rechazar] [Ver detalles]
```

**Opción C: Rechazar**
```
Textarea: "¿Por qué?" (obligatorio)

María: "No, tengo que dormir y no me quiero quedar sola con los niños toda la noche"

Flujo:
1. App crea NegotiationRound: { type: 'rejected', comment: "..." }
2. Juan recibe notificación: "María rechazó tu solicitud"
3. Juan ve opciones: [Proponer otra fecha] [Insistir] [Cancelar solicitud]
   - Si "Insistir" + tiene matripuntos: puede forzar (PARTE 2.3)
   - Si "Proponer otra": vuelve al formulario de solicitud
   - Si "Cancelar": evento se borra
```

**Opción D: Proponer Otro Día**
```
Redirecciona a formulario de solicitud con fecha/hora pre-cargada.
María puede ajustar fecha/hora para proponer otra opción.

Flujo: Mismo que 2.1 (crear solicitud), pero como "contra-propuesta"
```

---

### 2.3 Negociación Avanzada (Rondas + Mediación + Fuerza)

**Descripción:**
Si después de 2 rondas no hay acuerdo, opciones: mediación, fuerza, o premium.

**Escenario:**
```
Ronda 1: Juan propone 19.5 pts
Ronda 2: María contra-propone 17.5 pts
Ronda 3: Juan quiere 18.5 pts
→ No acuerdan después de 2 rondas gratis
```

**Opción A: Mediación (3 Subopciones)**

```
App sugiere:

1. DIVIDIR ACTIVIDAD:
   "Reduce a cena solo (sin copas)" → 15 pts
   Botón: [ACEPTAR 15 PTS]

2. AÑADIR COMPENSACIÓN:
   "Contratas canguro 3h mañana" → resta 6 pts → Total 13.5 pts
   Botón: [ACEPTAR 13.5 PTS + CANGURO]

3. DONACIÓN:
   "Juan regala 2 pts a María" → Total 19.5 - 2 = 17.5 pts
   Campo: ¿Cuántos pts regalas? (1-10)
   Botón: [ACEPTAR + DONAR X PTS]
```

**Opción B: Fuerza (Usar Matripuntos)**

```
Si Juan tiene saldo positivo (ej: +50 pts):

"Tienes 50 matripuntos acumulados.
¿Quieres usar 18.5 de ellos para forzar la actividad?"

Botón: [FORZAR CON 18.5 PTS]

Flujo:
1. Juan hace click
2. App verifica saldo (≥ 18.5)
3. App crea PointsTransaction: Juan -18.5 (de acumulado), -18.5 (de evento)
4. App marca Event: status = "forced"
5. María recibe notificación: "Juan forzó la actividad"
6. Evento se acepta automáticamente (no puede rechazar)

Resultado:
- Saldo Juan: +50 → +50 - 18.5 = +31.5 pts
- Evento: Aprobado
- María: Sin opción (Juan tiene derecho a usar sus puntos)
```

**Opción C: Premium (Rondas Ilimitadas)**

```
"Has agotado las 2 rondas gratuitas.
Suscríbete a Premium para continuar negociando."

Botón: [SUSCRIBIRSE A PREMIUM - €2.99/mes]

Si se suscribe:
- Se desbloquea Ronda 3, 4, 5...
- Sin límite hasta que acuerden
- Incluye mediación avanzada

Luego: Vuelven al formulario de contra-propuesta
```

---

## 3. TAREAS RECURRENTES (DIARIAS)

### 3.1 Crear Tarea Recurrente

**Descripción:**
Se crea una tarea que se repite semanalmente (cocina, limpieza, cuidado de niños, etc.).

**Pantalla: Dashboard (Botón "Nueva Tarea")**

**Campos:**
```
1. Tipo de Tarea: (dropdown)
   - Cocina (base 2.0 pts)
   - Limpieza diaria (base 1.5 pts)
   - Limpieza profunda (base 2.5 pts)
   - Compra/Supermercado (base 1.5 pts)
   - Logística escolar (base 1.5 pts)
   - Cuidado directo <3h (base 2.5 pts)
   - Cuidado directo 3-4h (base 3.5 pts)
   - Gestiones/Trámites (base 1.0 pts)
   - Lavandería (base 1.0 pts)
   - Baños/Higiene (base 1.0 pts)
   - Otro (especificar base)

2. Responsable: (dropdown)
   - Yo
   - Mi pareja
   - Alternado (lunes yo, martes pareja, etc.)
   - Por acuerdo

3. Frecuencia: (dropdown)
   - Diaria (excepto fines de semana)
   - Diaria (incluyendo fines de semana)
   - Lunes a viernes
   - Fin de semana
   - Personalizado (elegir días)

4. Detalles:
   - Descripción: (ej: "Cocina para comida principal")
   - Notas: (opcional, ej: "Preferencia de hora")

Botón: [CREAR TAREA]
```

**Validaciones:**
```
✓ Tipo seleccionado
✓ Responsable seleccionado
✓ Frecuencia válida
✓ Descripción no vacía (mín 3 chars)

Errores:
- "Selecciona un tipo de tarea"
- "Elige responsable"
- "Define la frecuencia"
```

**Flujo:**
```
1. Usuario crea tarea
2. App valida datos
3. App crea Task en BD
4. App genera instancias de TaskLog para próximas 4 semanas
5. Ambos usuarios ven tarea en Dashboard
6. Notificación: "Tarea creada: Cocina (responsable: Juan)"
```

**Respuesta API (POST /api/tasks):**
```json
{
  "task": {
    "id": "uuid",
    "name": "Cocina",
    "type": "cooking",
    "basePoints": 2.0,
    "assignedTo": "uuid_user1",
    "frequency": "daily",
    "status": "active"
  },
  "logs": [
    { "date": "2026-04-02", "status": "pending" },
    { "date": "2026-04-03", "status": "pending" },
    ...
  ]
}
```

---

### 3.2 Registrar Tarea (Marcar Completada)

**Descripción:**
Al final del día, el responsable marca que completó la tarea.

**Pantalla: Dashboard (Sección "Tareas de Hoy")**

```
┌──────────────────────────────┐
│ TAREAS DE HOY (2 abril)      │
├──────────────────────────────┤
│ ☐ Cocina - Responsable: Juan │
│  └ 2.0 pts × 1.8 (hijos) = 3.5 pts
│                              │
│ ☐ Limpieza - Responsable: María
│  └ 1.5 pts × 1.8 (hijos) = 2.7 pts
│                              │
│ ☐ Compra - Responsable: Juan │
│  └ 1.5 pts × 1.8 (hijos) = 2.7 pts
│                              │
│ ✓ Cuidado niños - María      │
│  └ 2.5 pts × 1.8 = 4.5 pts   │
│     (Pendiente verificación) │
└──────────────────────────────┘
```

**Flujo:**

```
1. Juan marca "Yo hice cocina hoy" → Click [✓ MARCAR HECHO]
2. App crea TaskLog: { date: '2026-04-02', completedBy: uuid_user1, status: 'pending_verification' }
3. María recibe notificación: "Juan dice que cocinó, ¿confirmas?"
4. María elige:
   a) [✅ CONFIRMAR] → Se aplican 3.5 pts a Juan
   b) [⚠️ DISPUTAR] → Entra en negociación
   c) [⏭️ PASAR POR AHORA] → Vuelve a preguntar mañana
```

**Opción A: Confirmar**
```
Flujo:
1. María hace click [CONFIRMAR]
2. App crea PointsTransaction: +3.5 pts para Juan, -3.5 para María
3. TaskLog: status = 'verified'
4. Ambos ven tarea como completada + puntos aplicados
5. Notificación: "Cocina confirmada ✓ +3.5 pts para Juan"
```

**Opción B: Disputar**
```
Campo: "¿Cuántos puntos crees que debería costar?"
Input numérico: (default: 3.5)
Textarea: "¿Por qué?" (opcional)

Ejemplo:
María: "Fue solo reheating del día anterior, máximo 1.5 pts"

Botón: [PROPONER PUNTOS AJUSTADOS]

Flujo:
1. App crea TaskDispute: { proposedPoints: 1.5, reason: "..." }
2. Juan recibe notificación: "María disputó tu tarea de cocina"
3. Juan ve opciones:
   - [Aceptar 1.5 pts]
   - [Proponer 2.5 pts]
   - [Ver detalles]
   - [Dejar pendiente para mañana]

Si no acuerdan en 1-2 intercambios: Se aplica promedio (2.5 pts)
```

---

### 3.3 Ver Historial de Tareas

**Descripción:**
Dashboard muestra últimas 7 días de tareas completadas y puntos acumulados.

**Vista:**
```
ÚLTIMAS 7 DÍAS:

Juan:
- Lunes: Cocina (3.5 pts) ✓
- Martes: Compra (2.7 pts) ✓
- Miércoles: Cocina (3.5 pts) ✓
- Jueves: Gestión escuela (1.5 pts) ✓
Total: 11.2 pts

María:
- Lunes: Limpieza (2.7 pts) ✓
- Martes: Cocina (3.5 pts) ✓
- Miércoles: Limpieza profunda (4.5 pts) ✓
- Jueves: Cuidado niños (4.5 pts) ✓
- Viernes: Cocina (3.5 pts) ✓
Total: 18.7 pts

BALANCE SEMANAL:
Juan: +11.2 pts
María: +18.7 pts
Diferencia: María +7.5 pts (ligeramente a favor de María)

[VER DETALLES] [EXPORTAR SEMANA]
```

---

## 4. DASHBOARD (PÁGINA PRINCIPAL)

### 4.1 Vista General

**Descripción:**
Centro de control: muestra saldo, actividades pendientes, tareas, y acciones rápidas.

**Estructura:**

```
┌─────────────────────────────────────────┐
│ DASHBOARD - Bienvenido, Juan            │
├─────────────────────────────────────────┤
│                                         │
│ 📊 SALDO ACTUAL                         │
│ ┌──────────────────────────────┐        │
│ │ TÚ: -15 pts (debes 15)      │        │
│ │ PAREJA: +15 pts (le debes)  │        │
│ │                              │        │
│ │ Gráfico últimos 30 días      │        │
│ │ (línea roja tu saldo,        │        │
│ │  línea azul pareja)          │        │
│ └──────────────────────────────┘        │
│                                         │
│ 🔔 SOLICITUDES PENDIENTES (1)           │
│ ┌──────────────────────────────┐        │
│ │ "María quiere salir sábado"  │        │
│ │ Costo: 22.5 pts              │        │
│ │ [VER]                        │        │
│ └──────────────────────────────┘        │
│                                         │
│ ✅ TAREAS DE HOY (3)                    │
│ ┌──────────────────────────────┐        │
│ │ ☐ Cocina (tuya)   3.5 pts   │        │
│ │ ☐ Limpieza (María) 2.7 pts  │        │
│ │ ☐ Compra (tuya)   2.7 pts   │        │
│ │ [MARCAR TODOS HECHOS]        │        │
│ └──────────────────────────────┘        │
│                                         │
│ 📅 PRÓXIMOS EVENTOS (2)                 │
│ ┌──────────────────────────────┐        │
│ │ Viernes: Cena (Pendiente)    │        │
│ │ Domingo: Viaje día (Aceptado)│        │
│ └──────────────────────────────┘        │
│                                         │
│ [+ SOLICITAR ACTIVIDAD] [+ NUEVA TAREA]│
│ [CONFIGURACIÓN] [HISTORIAL] [LOGOUT]  │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes:**

1. **Saldo (Card)**
   - Muestra balance actual de ambos
   - Gráfico interactivo de últimos 30 días
   - Color: Rojo si debes, Verde si te deben

2. **Solicitudes Pendientes (Lista)**
   - Muestra todas las actividades esperando respuesta
   - Botones: [VER] [RESPONDER]
   - Contador: "1 solicitud pendiente"

3. **Tareas de Hoy (Checklist)**
   - Tareas programadas para hoy
   - Checkboxes para marcar completadas
   - Puntos calculados automáticamente

4. **Próximos Eventos (Timeline)**
   - Próximas 3 actividades planificadas
   - Status: Pendiente, Aceptada, Rechazada

5. **Acciones Rápidas (Botones)**
   - Solicitar actividad
   - Nueva tarea
   - Configuración
   - Historial completo
   - Logout

---

### 4.2 Gráfico de Saldo (Últimos 30 días)

**Descripción:**
Línea de tendencia mostrando cómo ha evolucionado el saldo del mes.

**Formato:**
```
Eje X: Días (1-30)
Eje Y: Puntos (-100 a +100)

Línea Roja: Tu saldo
Línea Azul: Saldo pareja

Punto de intersección: Balance perfecto (0,0)

Hover: Muestra valores exactos y transacciones de ese día
```

**Ejemplo:**
```
Día 1: Juan +5, María -5 (María cocinó extra)
Día 5: Juan -20, María +20 (Juan salió a cena)
Día 10: Juan +10, María -10 (Juan cuidó niños)
Día 15: Juan -50, María +50 (Juan viajó)
Día 25: Juan +35, María -35 (Juan hizo tareas)
Día 30: Juan -10, María +10 (Saldo casi equilibrado)
```

---

## 5. CONFIGURACIÓN

### 5.1 Ajustes de Pareja

**Descripción:**
Configuración compartida: hijos, multiplicadores, tabla de tareas, etc.

**Pantalla: Configuración**

```
TAB 1: DATOS BÁSICOS
├─ Nombre pareja: (editable)
├─ Número de hijos: (dropdown: 0, 1, 2, 3+)
├─ Rango de edad hijos: (opcional)
└─ Zona horaria: (para notificaciones)

TAB 2: TABLA DE PUNTOS (Tareas)
├─ Cocina: 2.0 pts (editable)
├─ Limpieza: 1.5 pts (editable)
├─ Compra: 1.5 pts (editable)
├─ Cuidado niños: 2.5 pts (editable)
├─ Logística: 1.5 pts (editable)
└─ [RESTAURAR DEFAULTS]

TAB 3: MULTIPLICADORES
├─ Factor franja (noche): 1.5x (editable, solo PREMIUM)
├─ Factor duración: 1.0-1.35x (view only)
├─ Factor hijos: auto (basado en Datos Básicos)
└─ [OPCIONES AVANZADAS] (solo PREMIUM)

TAB 4: REGLAS DE NEGOCIACIÓN
├─ Rondas gratuitas: 2 (view only)
├─ Máxima compensación: -30% (editable)
├─ Máximo puntos por evento: 200 (editable)
├─ Auto-aceptar tareas: Sí/No
└─ Notification preferences (email, push, in-app)

TAB 5: PAREJA
├─ Nombre pareja: (view)
├─ Email pareja: (view)
├─ Invitar a pareja: (si no está conectada)
├─ Desconectar pareja: [BUTTON] (requiere confirmación)
└─ Historial de cambios: (log de quién cambió qué y cuándo)
```

**Validaciones:**
```
✓ Número de hijos: 0-10
✓ Puntos base: 0.5-50
✓ Multiplicadores: 0.5x-3.0x
✓ Máximo puntos: 50-500

Errores:
- "El valor debe ser mayor a 0"
- "No puede ser mayor a X"
```

**Flujo:**
```
1. Usuario edita valor (ej: Cocina → 2.5)
2. App muestra preview: "Esto afectará futuras cocinas"
3. Usuario hace click [GUARDAR]
4. App actualiza Configuration en BD
5. Ambos usuarios ven cambio en tiempo real
6. Log: "Juan cambió puntos de cocina de 2.0 a 2.5" (timestamp)
```

---

## 6. NOTIFICACIONES

### 6.1 Tipos de Notificaciones

**En-App (siempre):**
```
1. "X propuso solicitar actividad: [tipo]. Costo: Y puntos"
   → Click para ver detalles

2. "X respondió a tu solicitud: [aceptó/rechazó/contra-propuso]"
   → Click para ver respuesta

3. "X disputó tu tarea de [tipo]. ¿Aceptas X puntos?"
   → Click para resolver

4. "Solicitud aceptada ✓ +X puntos"
   → Confirmación

5. "Cambios en configuración: X modificó [campo]"
   → Para que ambos se mantengan informados
```

**Email (opcional, configurar):**
```
Mismos eventos, pero por email
Frecuencia: Inmediato o Diario (digest)
```

**Push (si PWA/App):**
```
Similar a en-app, pero con sonido/vibración
```

---

## 7. HISTORIAL Y ANALYTICS

### 7.1 Historial Completo

**Descripción:**
Log de todas las transacciones, tareas, eventos, negociaciones.

**Pantalla: Historial**

```
Filtros:
- Tipo: Todos / Eventos / Tareas / Transacciones
- Rango fechas: (date picker)
- Responsable: Yo / Pareja / Ambos
- Status: Todos / Completadas / Pendientes / Disputadas

Tabla:
| Fecha | Tipo | Descripción | Puntos | Status |
|-------|------|-------------|--------|--------|
| 2/4 | Tarea | Cocina | +3.5 | ✓ |
| 2/4 | Evento | Cena | -19.5 | Aceptada |
| 3/4 | Tarea | Limpieza | +2.7 | Disputada |
| 5/4 | Evento | Viaje | -50 | Pendiente |

[Exportar CSV] [Imprimir] [Compartir]
```

### 7.2 Analytics (Solo PREMIUM)

**Descripción:**
Estadísticas avanzadas sobre equidad, tendencias, insights.

**Métricas:**
```
1. EQUIDAD SCORE (0-100)
   - ¿Qué tan equilibrados están los puntos?
   - 100 = Balance perfecto
   - Debajo 50 = Muy desbalanceado

2. TAREAS MÁS FRECUENTES
   - Ranking de tareas más completadas
   - Quién hace más cada una

3. EVENTOS MÁS COSTOSOS
   - Promedio de puntos por evento
   - Tendencia: ¿aumentan o disminuyen?

4. VELOCIDAD DE ACUERDO
   - Promedio de rondas por negociación
   - Tasa de resolución

5. COMPENSACIONES MÁS USADAS
   - Qué compensaciones funcionan más
   - Efectividad de cada una

6. PREDICCIÓN MENSUAL
   - Si continúan así, ¿cuál será el saldo en fin de mes?
   - Sugerencia: "Necesitas X más tareas para equilibrar"
```

---

## RESUMEN DE FUNCIONALIDADES

| Feature | MVP | PREMIUM | PRO |
|---------|-----|---------|-----|
| Crear pareja | ✅ | ✅ | ✅ |
| Login/Logout | ✅ | ✅ | ✅ |
| Solicitar actividad | ✅ | ✅ | ✅ |
| 2 rondas negociación | ✅ | ✅ | ✅ |
| Tareas diarias | ✅ | ✅ | ✅ |
| Dashboard básico | ✅ | ✅ | ✅ |
| Historial básico | ✅ | ✅ | ✅ |
| Notif en-app | ✅ | ✅ | ✅ |
| | | | |
| Rondas ilimitadas | ❌ | ✅ | ✅ |
| Mediación avanzada | ❌ | ✅ | ✅ |
| Analytics completos | ❌ | ✅ | ✅ |
| Email notif | ❌ | ✅ | ✅ |
| Custom multipliers | ❌ | ❌ | ✅ |
| Google Calendar | ❌ | ❌ | ✅ |
| Slack integration | ❌ | ❌ | ✅ |

---

**Próximo documento: `05_MOCKUPS_ASCII.md`**

Allí verás wireframes ASCII de todas las pantallas.
