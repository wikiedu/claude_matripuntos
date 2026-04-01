# 🎨 WIREFRAMES Y MOCKUPS ASCII - MATRIPUNTOS

Este documento contiene visualizaciones de todas las pantallas principales de Matripuntos con layout, componentes, y flujos.

---

## 1. PANTALLA DE LOGIN

### 1.1 Desktop View (1920x1080)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║                        🎯 MATRIPUNTOS                                         ║
║                Gamifying Couples' Household Balance                           ║
║                                                                                ║
║  ┌──────────────────────────────────────────────────────────────────────────┐ ║
║  │                                                                          │ ║
║  │  ┌─────────────────────┐        ┌──────────────────────────────────┐   │ ║
║  │  │   CREAR CUENTA      │        │    INICIAR SESIÓN              │   │ ║
║  │  │     [ACTIVO]        │        │                                │   │ ║
║  │  └─────────────────────┘        └──────────────────────────────────┘   │ ║
║  │                                                                          │ ║
║  │  USUARIO 1:                    USUARIO 2:                              │ ║
║  │  ┌──────────────────────┐      ┌──────────────────────┐               │ ║
║  │  │Email 1               │      │                      │               │ ║
║  │  │[alice@test.com      ]│      │  Email               │               │ ║
║  │  └──────────────────────┘      │  [___________@____]  │               │ ║
║  │  ┌──────────────────────┐      │                      │               │ ║
║  │  │Contraseña 1          │      │  Contraseña          │               │ ║
║  │  │[••••••••••••]        │      │  [••••••••]          │               │ ║
║  │  └──────────────────────┘      │                      │               │ ║
║  │  ┌──────────────────────┐      │  Nombre              │               │ ║
║  │  │Nombre 1              │      │  [Bob____________]   │               │ ║
║  │  │[Alice____________]   │      │                      │               │ ║
║  │  └──────────────────────┘      └──────────────────────┘               │ ║
║  │                                                                          │ ║
║  │  CONFIGURACIÓN INICIAL (Opcional)                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────────────┐  │ ║
║  │  │ ¿Cuántos hijos tienes?  [Dropdown ▼]                            │  │ ║
║  │  │ ○ Sin hijos  ○ 1 hijo  ○ 2 hijos  ○ 3+ hijos                    │  │ ║
║  │  │                                                                  │  │ ║
║  │  │ ☑ Importar tabla de tareas predeterminada                        │  │ ║
║  │  └──────────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                          │ ║
║  │  ┌────────────────────────────────────────────────────────────────────┐ ║
║  │  │            [CREAR CUENTA DE PAREJA]                              │ ║
║  │  └────────────────────────────────────────────────────────────────────┘ ║
║  │                                                                          │ ║
║  │  ┌────────────────────────────────────────────────────────────────────┐ ║
║  │  │            [INICIAR SESIÓN]                                       │ ║
║  │  └────────────────────────────────────────────────────────────────────┘ ║
║  │                                                                          │ ║
║  └──────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 1.2 Mobile View (375x812)

```
┌────────────────────────────────┐
│ 📱 Matripuntos                 │
├────────────────────────────────┤
│                                │
│        🎯 MATRIPUNTOS          │
│  Couples' Balance Game         │
│                                │
│  [CREAR CUENTA] [INICIAR SESIÓN]
│                                │
│  INICIAR SESIÓN:              │
│  ┌──────────────────────────┐ │
│  │Email: [___________@_____]│ │
│  │Contraseña: [••••••••]    │ │
│  │                          │ │
│  │[INICIAR SESIÓN]         │ │
│  │                          │ │
│  │¿No tienes cuenta?       │ │
│  │[CREAR PAREJA]           │ │
│  └──────────────────────────┘ │
│                                │
└────────────────────────────────┘
```

---

## 2. PANTALLA DASHBOARD

### 2.1 Desktop View

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  🏠 Dashboard                                    Bienvenido, Juan │ ⚙️ │ 🚪  ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  ┌────────────────────────────────┐   ┌──────────────────────────────────┐   ║
║  │ 💰 SALDO ACTUAL                │   │ 🔔 SOLICITUDES PENDIENTES (1)   │   ║
║  ├────────────────────────────────┤   ├──────────────────────────────────┤   ║
║  │                                │   │                                  │   ║
║  │  TÚ: -15 pts 📉                │   │  "María quiere salir sábado"     │   ║
║  │  (debes 15 puntos)             │   │   Cena 19h-23h con amigas       │   ║
║  │                                │   │   Costo propuesto: 22.5 pts     │   ║
║  │  PAREJA: +15 pts 📈            │   │                                  │   ║
║  │  (te deben 15 puntos)          │   │   [VER DETALLES] [RESPONDER]    │   ║
║  │                                │   │                                  │   ║
║  │  ┌─ Gráfico 30 días ──────┐   │   └──────────────────────────────────┘   ║
║  │  │                         │   │                                          ║
║  │  │   ↗ Tu saldo (rojo)     │   │   ┌──────────────────────────────────┐   ║
║  │  │   ↙ Pareja (azul)       │   │   │ ✅ TAREAS DE HOY (3)            │   ║
║  │  │                         │   │   ├──────────────────────────────────┤   ║
║  │  │   1  5  10  15  20  25│   │   │                                  │   ║
║  │  │   ↓   ↓   ↓   ↓   ↓   ↓│   │   │  ☐ Cocina (tuya)     3.5 pts   │   ║
║  │  └────┼────┼────┼────┼───┘   │   │     [Marcar hecho]               │   ║
║  │       │    │    │    │       │   │                                  │   ║
║  │      -15  -10  -20  +5   +15 │   │  ☐ Limpieza (María)   2.7 pts   │   ║
║  │                                │   │     [Marcar hecho]               │   ║
║  │                                │   │                                  │   ║
║  └────────────────────────────────┘   │  ☐ Compra (tuya)      2.7 pts   │   ║
║                                        │     [Marcar hecho]               │   ║
║  ┌────────────────────────────────┐   │                                  │   ║
║  │ 📅 PRÓXIMOS EVENTOS (2)         │   │  [MARCAR TODO HECHO]             │   ║
║  ├────────────────────────────────┤   │                                  │   ║
║  │                                │   └──────────────────────────────────┘   ║
║  │ Viernes (5/4):                 │                                          ║
║  │ "Cena con amigos"              │   ┌──────────────────────────────────┐   ║
║  │ Status: ⏳ Pendiente            │   │ ⚙️ ACCIONES                      │   ║
║  │ Costo: 19.5 pts                │   ├──────────────────────────────────┤   ║
║  │                                │   │                                  │   ║
║  │ Domingo (7/4):                 │   │  [+ SOLICITAR ACTIVIDAD]         │   ║
║  │ "Viaje a casa familia"         │   │  [+ NUEVA TAREA]                 │   ║
║  │ Status: ✅ Aceptada            │   │  [📊 HISTORIAL]                  │   ║
║  │ Costo: 65 pts                  │   │  [⚙️ CONFIGURACIÓN]              │   ║
║  │                                │   │  [🚪 LOGOUT]                     │   ║
║  │ [VER TODOS]                    │   │                                  │   ║
║  └────────────────────────────────┘   └──────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 2.2 Mobile View

```
┌────────────────────────────────┐
│ 🏠 Dashboard      ⚙️ 🚪         │
├────────────────────────────────┤
│                                │
│ 💰 SALDO ACTUAL                │
│ ┌──────────────────────────┐  │
│ │ TÚ: -15 pts 📉           │  │
│ │ PAREJA: +15 pts 📈       │  │
│ │                          │  │
│ │  [Gráfico pequeño 30d]  │  │
│ └──────────────────────────┘  │
│                                │
│ 🔔 SOLICITUDES (1)             │
│ ┌──────────────────────────┐  │
│ │ María: Salida sábado     │  │
│ │ 22.5 pts                 │  │
│ │ [VER] [RESPONDER]        │  │
│ └──────────────────────────┘  │
│                                │
│ ✅ TAREAS DE HOY (3)           │
│ ┌──────────────────────────┐  │
│ │ ☐ Cocina       3.5 pts   │  │
│ │ ☐ Limpieza     2.7 pts   │  │
│ │ ☐ Compra       2.7 pts   │  │
│ │ [MARCAR TODO]            │  │
│ └──────────────────────────┘  │
│                                │
│ 📅 PRÓXIMOS (2)                │
│ ┌──────────────────────────┐  │
│ │ Viernes: Cena (Pendiente)│  │
│ │ Domingo: Viaje (✓)       │  │
│ │ [VER TODOS]              │  │
│ └──────────────────────────┘  │
│                                │
│ [+ ACTIVIDAD] [+ TAREA]        │
│ [HISTORIAL] [CONFIG]           │
│                                │
└────────────────────────────────┘
```

---

## 3. PANTALLA SOLICITAR ACTIVIDAD

### 3.1 Desktop View

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  + Solicitar Actividad              ← Dashboard                      [✓] [✕]  ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  NUEVA SOLICITUD DE ACTIVIDAD                                                 ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                        │   ║
║  │  Tipo de Actividad:                                                   │   ║
║  │  ┌──────────────────────────────────────────────────────┐             │   ║
║  │  │ [Cena/Copas ▼]                                       │             │   ║
║  │  │  (Opciones: Cena, Comida trabajo, Deporte,          │             │   ║
║  │  │   Viaje día, Viaje fin semana, Despedida, etc.)     │             │   ║
║  │  └──────────────────────────────────────────────────────┘             │   ║
║  │                                                                        │   ║
║  │  Fecha y Hora:                                                        │   ║
║  │  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐           │   ║
║  │  │ 🗓️ 10/04/2026   │  │ 🕐 21:30     │  │ 🕐 23:30     │           │   ║
║  │  │ Fecha inicio     │  │ Hora inicio  │  │ Hora fin     │           │   ║
║  │  └──────────────────┘  └──────────────┘  └──────────────┘           │   ║
║  │  → Duración detectada: 2 horas                                        │   ║
║  │                                                                        │   ║
║  │  Descripción:                                                         │   ║
║  │  ┌────────────────────────────────────────────────────────────┐      │   ║
║  │  │ Cena con amigos de la universidad                         │      │   ║
║  │  │                                                            │      │   ║
║  │  └────────────────────────────────────────────────────────────┘      │   ║
║  │  ← 200 caracteres máximo                                             │   ║
║  │                                                                        │   ║
║  │  Hijos:                                                               │   ║
║  │  ○ Sí (2)   ○ No   ○ Otro: [2]                                       │   ║
║  │                                                                        │   ║
║  │  Compensación Propuesta (Opcional):                                   │   ║
║  │  ┌────────────────────┐  ┌──────────────────────────────────────┐   │   ║
║  │  │ Tipo: [Dormir más▼]│  │ Detalles: Mañana duermo hasta 10am  │   │   ║
║  │  └────────────────────┘  └──────────────────────────────────────┘   │   ║
║  │  Descuento estimado: -10%                                            │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
║  CÁLCULO AUTOMÁTICO (ACTUALIZADO EN VIVO):                                   ║
║  ┌────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                    │   ║
║  │  Base (Cena):                      8.0 pts                        │   ║
║  │  × Factor Franja (21:00-23:30):    1.5x                           │   ║
║  │  × Factor Duración (2h):           1.0x                           │   ║
║  │  × Factor Hijos (2):               1.8x                           │   ║
║  │  ──────────────────────────────────────────                       │   ║
║  │  Subtotal:                         21.6 pts                       │   ║
║  │                                                                    │   ║
║  │  Compensación (-10%):              -2.1 pts                       │   ║
║  │  ══════════════════════════════════════════════                  │   ║
║  │  TOTAL:                            19.5 pts                       │   ║
║  │                                                                    │   ║
║  │  ✨ Esta solicitud te costará 19.5 matripuntos ✨                │   ║
║  │                                                                    │   ║
║  └────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                    │   ║
║  │          [SOLICITAR ACTIVIDAD]  [CANCELAR]                       │   ║
║  │                                                                    │   ║
║  └────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 3.2 Mobile View

```
┌────────────────────────────────┐
│ + Solicitar Actividad  ← [✕]   │
├────────────────────────────────┤
│                                │
│ Tipo de Actividad:             │
│ [Cena ▼]                       │
│                                │
│ Fecha y Hora:                  │
│ [10/04/2026] [21:30] [23:30]  │
│ Duración: 2h                   │
│                                │
│ Descripción:                   │
│ ┌──────────────────────────┐  │
│ │ Cena con amigos         │  │
│ └──────────────────────────┘  │
│                                │
│ Hijos: ○ Sí (2)  ○ No         │
│                                │
│ Compensación:                  │
│ [Dormir más ▼]                 │
│ -10%                           │
│                                │
│ ┌──────────────────────────┐  │
│ │ Base:        8.0 pts    │  │
│ │ × Franja:    1.5x       │  │
│ │ × Duración:  1.0x       │  │
│ │ × Hijos:     1.8x       │  │
│ │ = Subtotal:  21.6 pts   │  │
│ │ - Compensación: -2.1    │  │
│ │ = TOTAL:  19.5 pts      │  │
│ └──────────────────────────┘  │
│                                │
│ [SOLICITAR] [CANCELAR]         │
│                                │
└────────────────────────────────┘
```

---

## 4. PANTALLA RESPONDER A SOLICITUD (INBOX)

### 4.1 Vista de Solicitud (Detalle)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  📮 Solicitudes Pendientes                                            [← Atrás]║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                        │   ║
║  │  SOLICITUD DE JUAN                                  Hace 2 horas      │   ║
║  │  ┌──────────────────────────────────────────────────────────────────┐ │   ║
║  │  │                                                                  │ │   ║
║  │  │  🍽️  CENA VIERNES 21H-23H                                       │ │   ║
║  │  │  ┌──────────────────────────────────────────────────────────┐  │ │   ║
║  │  │  │ Descripción: "Cena con amigos de la uni"                │  │ │   ║
║  │  │  │ Fecha: Viernes 5 de abril de 2026                       │  │ │   ║
║  │  │  │ Hora: 21:30 - 23:30 (2 horas)                           │  │ │   ║
║  │  │  │ Con hijos: Sí (2 niños)                                 │  │ │   ║
║  │  │  │ Compensación propuesta: "Duermo más mañana"             │  │ │   ║
║  │  │  └──────────────────────────────────────────────────────────┘  │ │   ║
║  │  │                                                                  │ │   ║
║  │  │  💰 COSTO PROPUESTO: 19.5 MATRIPUNTOS                           │ │   ║
║  │  │  ┌──────────────────────────────────────────────────────────┐  │ │   ║
║  │  │  │ Base (Cena):              8.0 pts                       │  │ │   ║
║  │  │  │ × Franja (noche):         1.5x                          │  │ │   ║
║  │  │  │ × Duración (2h):          1.0x                          │  │ │   ║
║  │  │  │ × Hijos (2):              1.8x                          │  │ │   ║
║  │  │  │ = Subtotal:               21.6 pts                      │  │ │   ║
║  │  │  │ - Compensación (-10%):    -2.1 pts                      │  │ │   ║
║  │  │  │ ═══════════════════════════════════════════            │  │ │   ║
║  │  │  │ TOTAL:                    19.5 pts                      │  │ │   ║
║  │  │  └──────────────────────────────────────────────────────────┘  │ │   ║
║  │  │                                                                  │ │   ║
║  │  │  ¿QUÉ HACES?                                                     │ │   ║
║  │  │  ┌─────────────────────────────────────────────────────────────┐│ │   ║
║  │  │  │                                                             ││ │   ║
║  │  │  │  [✅ ACEPTAR 19.5 PTS]                                     ││ │   ║
║  │  │  │  (Tu saldo: -19.5, su saldo: +19.5)                       ││ │   ║
║  │  │  │                                                             ││ │   ║
║  │  │  │  [🔄 AJUSTAR PUNTOS]                                       ││ │   ║
║  │  │  │  (Entra en negociación)                                    ││ │   ║
║  │  │  │                                                             ││ │   ║
║  │  │  │  [❌ RECHAZAR]                                              ││ │   ║
║  │  │  │  (Rechaza la solicitud)                                    ││ │   ║
║  │  │  │                                                             ││ │   ║
║  │  │  │  [↩️ PROPONER OTRO DÍA]                                    ││ │   ║
║  │  │  │  (Sugiere alternativa)                                     ││ │   ║
║  │  │  │                                                             ││ │   ║
║  │  │  └─────────────────────────────────────────────────────────────┘│ │   ║
║  │  │                                                                  │ │   ║
║  │  └──────────────────────────────────────────────────────────────────┘ │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 4.2 Negociación (Ronda 1)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  🔄 Negociación - Cena viernes                                    [← Atrás]   ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  HISTORIAL DE NEGOCIACIÓN:                                                    ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                        │   ║
║  │  RONDA 1 (INICIAL)                                                     │   ║
║  │  ┌──────────────────────────────────────────────────────────────────┐ │   ║
║  │  │ JUAN propone: 19.5 pts                                           │ │   ║
║  │  │ "Cena con amigos de la uni"                                      │ │   ║
║  │  │ Hora: 2 hours                                                     │ │   ║
║  │  │ Compensación: "Duermo más mañana"                               │ │   ║
║  │  └──────────────────────────────────────────────────────────────────┘ │   ║
║  │                                                                        │   ║
║  │  RONDA 2 (ACTUAL)                                                     │   ║
║  │  ┌──────────────────────────────────────────────────────────────────┐ │   ║
║  │  │ ¿Quieres aceptar 19.5 pts o proponer algo diferente?            │ │   ║
║  │  │                                                                  │ │   ║
║  │  │ Mi contra-propuesta:                                             │ │   ║
║  │  │ Puntos: [17.5__]                                                 │ │   ║
║  │  │                                                                  │ │   ║
║  │  │ Justificación (opcional):                                        │ │   ║
║  │  │ ┌──────────────────────────────────────────────────────────┐   │ │   ║
║  │  │ │ Creo que deberían ser 17.5, porque es viernes          │   │ │   ║
║  │  │ │ y tú duermes más mañana. Es bastante justo.            │   │ │   ║
║  │  │ │                                                         │   │ │   ║
║  │  │ └──────────────────────────────────────────────────────────┘   │ │   ║
║  │  │                                                                  │ │   ║
║  │  │ [ENVIAR CONTRA-PROPUESTA] [VOLVER A ACEPTAR 19.5]               │ │   ║
║  │  │ [RECHAZAR COMPLETAMENTE]                                        │ │   ║
║  │  │                                                                  │ │   ║
║  │  └──────────────────────────────────────────────────────────────────┘ │   ║
║  │                                                                        │   ║
║  │  ℹ️ Has usado 1 de 2 rondas gratuitas. Próxima ronda: PREMIUM         │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 4.3 Después de Ronda 2 Sin Acuerdo (Opciones)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  🔄 Negociación - Cena viernes                                    [← Atrás]   ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  ⚠️ NO SE HA LLEGADO A ACUERDO DESPUÉS DE 2 RONDAS                            ║
║                                                                                ║
║  Propuesta Inicial: 19.5 pts (Juan)                                           ║
║  Contra-propuesta: 17.5 pts (María)                                           ║
║                                                                                ║
║  Tienes 3 opciones:                                                            ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │ OPCIÓN A: MEDIACIÓN (Sugerencias de la app)                           │   ║
║  ├────────────────────────────────────────────────────────────────────────┤   ║
║  │                                                                        │   ║
║  │  1️⃣ DIVIDIR ACTIVIDAD                                                │   ║
║  │     "Reduce a cena sin discoteca" → 15 pts                           │   ║
║  │     [ACEPTAR 15 PTS]                                                 │   ║
║  │                                                                        │   ║
║  │  2️⃣ AÑADIR COMPENSACIÓN                                             │   ║
║  │     "Contratas canguro 3h mañana" (-6 pts) → Total 13.5 pts         │   ║
║  │     [ACEPTAR 13.5 PTS + CANGURO]                                     │   ║
║  │                                                                        │   ║
║  │  3️⃣ DONACIÓN DE PUNTOS                                              │   ║
║  │     "Yo regalo 2 matripuntos" → Total 17.5 pts                      │   ║
║  │     [REGALAR 2 PTS Y ACEPTAR 17.5]                                   │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │ OPCIÓN B: FUERZA CON MATRIPUNTOS                                      │   ║
║  ├────────────────────────────────────────────────────────────────────────┤   ║
║  │                                                                        │   ║
║  │  Tu saldo actual: +45 pts                                            │   ║
║  │                                                                        │   ║
║  │  "Puedo forzar esta actividad usando 19.5 de mis pts acumulados"    │   ║
║  │  [FORZAR CON 19.5 MATRIPUNTOS]                                       │   ║
║  │  (Tu saldo: +45 → +25.5 después)                                     │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │ OPCIÓN C: PREMIUM (Rondas Ilimitadas)                                │   ║
║  ├────────────────────────────────────────────────────────────────────────┤   ║
║  │                                                                        │   ║
║  │  "Suscríbete a Premium para desbloquear rondas de negociación       │   ║
║  │   ilimitadas. Continúa negociando sin límite."                       │   ║
║  │                                                                        │   ║
║  │  [SUSCRIBIRSE A PREMIUM - €2.99/mes]                                │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## 5. PANTALLA CONFIGURACIÓN

### 5.1 Desktop View (Tab: Datos Básicos)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚙️ Configuración                                                   [← Volver] ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  [DATOS BÁSICOS] [TAREAS] [MULTIPLICADORES] [REGLAS] [PAREJA]                ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │                                                                        │   ║
║  │  DATOS BÁSICOS DE LA PAREJA                                           │   ║
║  │  ┌──────────────────────────────────────────────────────────────────┐ │   ║
║  │  │ Nombre de la pareja: [Juan & María___________]                  │ │   ║
║  │  │ Número de hijos:     [2 hijos ▼]                                │ │   ║
║  │  │ Rango de edad:       [3-6 años y 7-12 años]                     │ │   ║
║  │  │ Zona horaria:        [Europe/Madrid ▼]                          │ │   ║
║  │  │                                                                  │ │   ║
║  │  │ [GUARDAR CAMBIOS] [DESCARTAR]                                   │ │   ║
║  │  └──────────────────────────────────────────────────────────────────┘ │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

### 5.2 Desktop View (Tab: Tabla de Puntos)

```
╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚙️ Configuración - Tabla de Tareas                                [← Volver] ║
╠════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  [DATOS BÁSICOS] [TAREAS] [MULTIPLICADORES] [REGLAS] [PAREJA]                ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐   ║
║  │ TABLA DE PUNTOS BASE (Antes de multiplicadores)                      │   ║
║  ├────────────────────────────────────────────────────────────────────────┤   ║
║  │                                                                        │   ║
║  │ Tarea                    Puntos Base    Notas                         │   ║
║  │ ──────────────────────────────────────────────────────────────────    │   ║
║  │ Cocina                   [2.0] pts      Comida principal              │   ║
║  │ Limpieza diaria          [1.5] pts      Cocina + salón               │   ║
║  │ Limpieza profunda        [2.5] pts      A fondo                      │   ║
║  │ Compra/Supermercado      [1.5] pts      Incluye transporte           │   ║
║  │ Logística escolar        [1.5] pts      Llevar/recoger              │   ║
║  │ Cuidado directo (3h)     [2.5] pts      Atención exclusiva           │   ║
║  │ Cuidado directo (4h+)    [3.5] pts      Mañana/tarde completa        │   ║
║  │ Gestiones/Trámites      [1.0] pts      Admin, médico                 │   ║
║  │ Lavandería              [1.0] pts      Lavar, tender, planchar       │   ║
║  │ Baños/Higiene           [1.0] pts      Limpiar baños                │   ║
║  │                                                                        │   ║
║  │ [GUARDAR CAMBIOS]  [RESTAURAR DEFAULTS]                              │   ║
║  │                                                                        │   ║
║  └────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
```

---

## 6. RESPONSIVE DESIGN (BREAKPOINTS)

### Desktop (1920x1080)
- 2-3 columnas
- Cards grandes
- Gráficos con más detalles
- Todas las opciones visibles

### Tablet (768x1024)
- 1-2 columnas
- Cards medianas
- Gráficos simplificados
- Menú colapsable

### Mobile (375x812)
- 1 columna
- Cards apiladas
- Gráficos mínimos (barras)
- Navegación bottom/hamburger

---

## 7. COMPONENTES REUTILIZABLES

### Card
```
┌──────────────────────┐
│ 📊 Título            │
├──────────────────────┤
│ Contenido            │
│ Contenido            │
│ Contenido            │
│ [ACCIÓN]  [ACCIÓN]   │
└──────────────────────┘
```

### Button
```
[PRIMARIO - Acción principal]
[SECUNDARIO - Acción alternativa]
[PELIGRO - Acción destructiva]
```

### Input
```
Label:
[___________________]
← Placeholder, validación en tiempo real
```

### Notification
```
┌─ TIPO ICONO ─────────────────┐
│ Mensaje de la notificación   │
│ [ACCIÓN] [DESCARTAR]         │
└──────────────────────────────┘
```

### Alert
```
⚠️ ADVERTENCIA
Mensaje importante para el usuario
[ENTENDIDO]
```

---

## RESUMEN DE PANTALLAS

| Pantalla | Flujo | Status |
|----------|-------|--------|
| Login | Signup / Signin | ✅ MVP |
| Dashboard | Centro control | ✅ MVP |
| RequestActivity | Crear solicitud | ✅ MVP |
| RequestInbox | Responder solicitud | ✅ MVP |
| Negociación | Rondas negociación | ✅ MVP |
| Configuración | Settings pareja | ✅ MVP |
| Historial | Ver todo | ✅ MVP |
| Analytics | Gráficos (PREMIUM) | ✅ Future |
| NotFound | 404 | ✅ MVP |

---

**Próximo documento: `06_ESTRUCTURA_CODIGO.md`**

Allí verás dónde está cada parte del código y cómo está organizado.
