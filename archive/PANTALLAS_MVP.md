# Pantallas MVP - Matripuntos

## Arquitectura de Navegación

```
Auth Flow:
  ├── Login
  ├── Signup
  └── Invite (código pareja)

App Flow (después de auth):
  ├── Dashboard (principal)
  ├── Solicitar Actividad
  ├── Registrar Tarea
  ├── Bandeja de Solicitudes
  ├── Historial
  ├── Configuración
  └── Perfil
```

---

## 1. Pantalla: LOGIN

### Desktop (1200px+)
```
┌─────────────────────────────────────────────────────────────┐
│                      MATRIPUNTOS                           │
│                                                             │
│    Gamifica la equidad en tu pareja                         │
│                                                             │
│    ┌─────────────────────────────────────────┐            │
│    │                                          │            │
│    │  Email                                   │            │
│    │  [__________________________]            │            │
│    │                                          │            │
│    │  Contraseña                              │            │
│    │  [__________________________]            │            │
│    │                                          │            │
│    │  [ ] Recuérdame                          │            │
│    │                                          │            │
│    │  [    ENTRAR     ]                       │            │
│    │                                          │            │
│    │  ¿No tienes cuenta? [Regístrate]        │            │
│    │                                          │            │
│    └─────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (375px)
```
┌──────────────────────┐
│   MATRIPUNTOS        │
│                      │
│ Gamifica la equidad  │
│    en tu pareja      │
│                      │
│ Email                │
│ [_______________]    │
│                      │
│ Contraseña           │
│ [_______________]    │
│                      │
│ ☐ Recuérdame         │
│                      │
│ [ ENTRAR ]           │
│                      │
│ ¿No tienes cuenta?   │
│ [Regístrate]         │
└──────────────────────┘
```

### Especificaciones
- Email validation (RFC 5322)
- Password mínimo 8 caracteres
- Links a "¿Olvidaste?" y "Regístrate"
- Notificación de error si credenciales inválidas
- Loading spinner durante validación

---

## 2. Pantalla: SIGNUP

### Flujo
```
Página 1: Datos básicos
  - Nombre
  - Email
  - Contraseña
  - Confirmar contraseña
  → [Siguiente]

Página 2: Pareja (opcional)
  - ¿Tienes pareja? [Sí / No]
    Si Sí:
      - Código de pareja (si la pareja ya está registrada)
      Si No:
      - Tu pareja puede unirse después con tu código

Página 3: Configuración inicial
  - ¿Cuántos hijos? [0 / 1 / 2 / 3+]
  - Idioma [Español / English]
  → [Crear Cuenta]
```

### Especificaciones
- Validaciones en tiempo real
- Contraseñas deben coincidir
- Email único check
- Pantalla de éxito con "ir a dashboard"

---

## 3. Pantalla: DASHBOARD (Principal)

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MATRIPUNTOS - Dashboard                                   │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐ │
│  │ TÚ (Juan García)        │  │ ÉL/ELLA (María López)   │ │
│  │ ━━━━━━━━━━━━━━━━━━      │  │ ━━━━━━━━━━━━━━━━━━     │ │
│  │ Saldo:                  │  │ Saldo:                  │ │
│  │ 35.5 MATRIPUNTOS 📈     │  │ -12.0 MATRIPUNTOS 📉    │ │
│  │                         │  │                         │ │
│  │ Cambio (30 días):       │  │ Cambio (30 días):       │ │
│  │ ↗️ +15.5 pts            │  │ ↘️ -5.0 pts             │ │
│  └─────────────────────────┘  └─────────────────────────┘ │
│                                                             │
│  GRÁFICO (Últimos 30 días)                                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │  40 │         ╭────────                                ││
│  │  30 │  ╭─╮    │                                         ││
│  │  20 │  │ │  ╭─┤                                         ││
│  │  10 │╭─┘ └──┘ │ ╰──╮                                    ││
│  │   0 ├─────────────┬──────────────────────────────────┬─││
│  │ -10 │             │ Juan                             │ ││
│  │     ├─────────────┼────────────────────────────────┬─┤ ││
│  │     │ María       │                                │ │ ││
│  │     └─────────────┴────────────────────────────────┴─┘ ││
│  │  1  5  10  15  20  25  30 (días)                       ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ÚLTIMAS ACTIVIDADES / TAREAS                               │
│  ┌────────────────────────────────────────────────────────┐│
│  │ ✓ 31 Mar  Cena viernes (María)      +11.5 pts ✓ Cerrado│
│  │ ✓ 30 Mar  Cocina (María)            +2.0 pts  ✓ Verif.│
│  │ ✓ 30 Mar  Limpieza profunda (Juan)  +3.0 pts  ✓ Verif.│
│  │ ⏳ 29 Mar Deporte (Juan)            -2.5 pts  ⏳ Pend. │
│  │                                                         │
│  │ [Ver todo...]                                           │
│  └────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │ [+ Solicitar Actividad]  │  │ [+ Registrar Tarea Hoy] ││
│  └──────────────────────────┘  └──────────────────────────┘│
│  ┌──────────────────────────┐  ┌──────────────────────────┐│
│  │ [📋 Bandeja: 2 Pend.]    │  │ [⚙️ Configuración]       ││
│  └──────────────────────────┘  └──────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (375px)
```
┌──────────────────────┐
│ Logo  [≡] [👤] [⚙️] │
├──────────────────────┤
│ DASHBOARD            │
│                      │
│ TÚ (Juan)            │
│ 35.5 MATRIPUNTOS 📈  │
│                      │
│ ÉL/ELLA (María)      │
│ -12.0 MATRIPUNTOS 📉 │
│                      │
│ [Mini Gráfico 30d]   │
│                      │
│ ÚLTIMAS              │
│ ✓ Cena (María) +11   │
│ ✓ Cocina (María) +2  │
│ ✓ Limpieza (Juan) +3 │
│ [Ver todo...]        │
│                      │
│ [+ Solicitar Act.]   │
│ [+ Registrar Tarea]  │
│ [📋 Bandeja: 2]      │
│                      │
└──────────────────────┘
```

### Componentes
- **Cards de saldo**: Número grande (36px bold), color rojo (negativo) / verde (positivo)
- **Gráfico**: Recharts (línea simple)
- **Lista de actividades**: Scroll horizontal si es necesario
- **Botones**: Dos en fila desktop, fullwidth mobile

---

## 4. Pantalla: SOLICITAR ACTIVIDAD

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← NUEVA SOLICITUD DE ACTIVIDAD                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  DETALLES DE LA SOLICITUD                               ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━                               ││
│  │                                                          ││
│  │  1. Tipo de Actividad                                   ││
│  │     [Cena       ▼]                                      ││
│  │     (necesaria / salud / ocio / alto impacto)          ││
│  │                                                          ││
│  │  2. Fecha y Hora                                        ││
│  │     Inicio: [31 Marzo] [19:30 ▼]                      ││
│  │     Fin:    [31 Marzo] [23:30 ▼]                      ││
│  │     Duración: 4 horas                                   ││
│  │                                                          ││
│  │  3. Contexto                                            ││
│  │     ¿Con hijos?  [○ Sí  ● No]                          ││
│  │     Número: [0 ▼]                                      ││
│  │                                                          ││
│  │  4. Justificación                                       ││
│  │     [Hace meses que no salgo con mis amigas...]        ││
│  │                                                          ││
│  │  5. Compensación (Opcional)                             ││
│  │     [○ Ninguna ● Cocina hecha ○ Yo me levanto]        ││
│  │     Descuento estimado: -10%                            ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  CÁLCULO EN TIEMPO REAL                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  Base (tabla)                    = 8.0 pts             ││
│  │  × Factor tipo (ocio)            = ×1.0                ││
│  │  × Factor franja (noche)         = ×1.2                ││
│  │  × Factor duración (4h)          = ×1.0                ││
│  │  × Factor hijos (ninguno)        = ×1.0                ││
│  │  ────────────────────────────────────────             ││
│  │  SUBTOTAL                        = 9.6 pts            ││
│  │                                                          ││
│  │  Compensación: Cocina (-10%)     = -1.0 pts           ││
│  │  ────────────────────────────────────────             ││
│  │  ⚠️ TOTAL: 8.6 → 9 MATRIPUNTOS (redondeado)           ││
│  │                                                          ││
│  │  ℹ️ Esto te costará 9 matripuntos.                     ││
│  │     Tendrás: 35.5 - 9 = 26.5 matripuntos              ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [← Cancelar]                    [Enviar Solicitud →]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────┐
│ ← NUEVA SOLICITUD    │
├──────────────────────┤
│ DETALLES             │
│                      │
│ Tipo                 │
│ [Cena       ▼]       │
│                      │
│ Fecha/Hora           │
│ [31 Marzo] [19:30]   │
│ [31 Marzo] [23:30]   │
│ 4 horas              │
│                      │
│ ¿Hijos?              │
│ ○ Sí   ● No          │
│                      │
│ Justificación        │
│ [_______________]    │
│                      │
│ Compensación         │
│ ○ Ninguna            │
│ ● Cocina hecha -10%  │
│ ○ Levantarme +20%    │
│                      │
│ CÁLCULO              │
│ Base (cena) = 8 pts  │
│ × noche 1.2 = 9.6    │
│ - Comp 10% = 8.6     │
│                      │
│ 💰 9 MATRIPUNTOS     │
│ (26.5 después)       │
│                      │
│ [Cancelar]           │
│ [Enviar Solicitud]   │
└──────────────────────┘
```

### Especificaciones
- Validaciones en tiempo real
- Dropdown smooth (sin recargar)
- Preview del cálculo se actualiza instantáneamente
- Colores: Rojo si es caro (>20), verde si es barato (<5), naranja si es medio
- Descripción clara del desglose matemático
- Botón de envío deshabilitado si faltan campos

---

## 5. Pantalla: BANDEJA DE SOLICITUDES (Negociación)

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← BANDEJA DE SOLICITUDES (2 Pendientes)                   │
│                                                             │
│  Filtro: [Todas ▼] [Pendientes ▼]                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  📌 SOLICITUD 1: Cena Viernes                           ││
│  │     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             ││
│  │                                                          ││
│  │  De: María García                                       ││
│  │  Fecha: 31 Marzo, 19:30 - 23:30 (4h)                  ││
│  │  Tipo: Ocio social                                      ││
│  │                                                          ││
│  │  Justificación:                                         ││
│  │  "Hace meses que no salgo con mis amigas. Es mi        ││
│  │   momento para relajarme un poco."                      ││
│  │                                                          ││
│  │  COSTE ACTUAL:                                          ││
│  │  ┌─────────────────────────────────────────────────┐  ││
│  │  │ Base                    = 8.0 pts              │  ││
│  │  │ × noche (1.2)           = 9.6 pts              │  ││
│  │  │ - Cocina hecha (-10%)   = 8.6 pts              │  ││
│  │  │ TOTAL → 9 MATRIPUNTOS                          │  ││
│  │  │ Compensación: "Yo hago cena el jueves"         │  ││
│  │  └─────────────────────────────────────────────────┘  ││
│  │                                                          ││
│  │  OPCIONES:                                              ││
│  │  ┌──────────────────┐  ┌──────────────────────────┐   ││
│  │  │ [✓ Aceptar]      │  │ [↔ Ajustar: 11 pts]      │   ││
│  │  └──────────────────┘  └──────────────────────────┘   ││
│  │  ┌──────────────────┐  ┌──────────────────────────┐   ││
│  │  │ [📅 Otra fecha]  │  │ [✗ Rechazar]             │   ││
│  │  └──────────────────┘  └──────────────────────────┘   ││
│  │                                                          ││
│  │  HISTORIAL DE NEGOCIACIÓN:                              ││
│  │  ├─ Ronda 1: María propone 9 pts                        ││
│  │  │  Mensaje: "Con compensación de cocina"              ││
│  │  │  Estado: Esperando respuesta                        ││
│  │  │  Hace 2 horas                                        ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  📌 SOLICITUD 2: Deporte Sábado                         ││
│  │     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                ││
│  │  De: Juan García                                        ││
│  │  Fecha: 1 Abril, 08:00 - 10:00 (2h)                   ││
│  │  Coste: 3 MATRIPUNTOS                                   ││
│  │                                                          ││
│  │  [✓ Aceptar] [↔ Ajustar] [📅 Otra] [✗ Rechazar]       ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────┐
│ ← BANDEJA (2)        │
├──────────────────────┤
│ 📌 Cena Viernes      │
│ De: María            │
│ 31 Marzo 19:30-23:30│
│ Ocio social          │
│                      │
│ "Hace meses que..." │
│                      │
│ 💰 9 MATRIPUNTOS     │
│ Comp: Cocina         │
│                      │
│ [✓ Aceptar]          │
│ [↔ Ajustar a 11]     │
│ [📅 Otra fecha]      │
│ [✗ Rechazar]         │
│                      │
│ Historial:           │
│ R1: María 9 pts      │
│    "Con compensación"│
│    2h atrás          │
│                      │
│ ─────────────────────│
│ 📌 Deporte Sábado    │
│ De: Juan             │
│ 1 Abril 08:00-10:00 │
│ 3 MATRIPUNTOS        │
│                      │
│ [✓] [↔] [📅] [✗]    │
│                      │
└──────────────────────┘
```

### Interacción: Ajustar Puntos
```
[Click "Ajustar: 11 pts"]

Modal:
┌──────────────────────────┐
│ Hacer Contrapropuesta    │
├──────────────────────────┤
│                          │
│ Puntos propuestos:       │
│ [9 ▲ 11 ▼]              │
│                          │
│ Comentario:              │
│ [Está muy justificado    │
│  pero 11 me parece poco  │
│  considerando que cuido  │
│  a nuestra hija]         │
│                          │
│ [Cancelar] [Enviar]      │
│                          │
└──────────────────────────┘
```

---

## 6. Pantalla: REGISTRAR TAREA HOY

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← REGISTRAR TAREA HOY                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │  Tipo de Tarea                                          ││
│  │  [Cocina        ▼]                                      ││
│  │  (cocina / limpieza / baños / compra / logística /cuidado)││
│  │                                                          ││
│  │  Modificador (opcional)                                 ││
│  │  ○ Normal (2.0 pts)                                    ││
│  │  ○ Para visita (+0.5 pts)                              ││
│  │  ○ Profunda (+1.0 pts)                                 ││
│  │  ○ Otro (especificar)                                  ││
│  │                                                          ││
│  │  Comentario (opcional)                                  ││
│  │  [Hice desayuno, comida y cena completa...]           ││
│  │                                                          ││
│  │  PUNTOS:                                                ││
│  │  Base (Cocina) = 2.0 pts                                ││
│  │  Modificador   = +0.0 pts                               ││
│  │  TOTAL         = 2.0 MATRIPUNTOS                        ││
│  │                                                          ││
│  │  ℹ️ Notificación: María verificará en las próximas 24h ││
│  │     Si no verifica, se aprueba automáticamente.         ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [← Cancelar]                           [✓ Registrar →]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────┐
│ ← REGISTRAR TAREA    │
├──────────────────────┤
│ Tipo                 │
│ [Cocina        ▼]    │
│                      │
│ Modificador          │
│ ○ Normal (2.0)       │
│ ○ Visita (+0.5)      │
│ ○ Profunda (+1.0)    │
│ ○ Otro               │
│                      │
│ Comentario           │
│ [Desayuno, comida...]│
│                      │
│ PUNTOS = 2.0 pts     │
│                      │
│ ℹ️ María verificará  │
│    en 24h            │
│                      │
│ [Cancelar]           │
│ [✓ Registrar]        │
│                      │
└──────────────────────┘
```

---

## 7. Pantalla: CONFIGURACIÓN

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← CONFIGURACIÓN                                           │
│                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────┐│
│  │ MI PAREJA                  │  │ TAREAS BASE            ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━   │  │ ━━━━━━━━━━━━━━━━━━━   ││
│  │                            │  │                        ││
│  │ Conectado a:               │  │ Cocina     [2.0 ▼]    ││
│  │ María García               │  │ Baños      [1.5 ▼]    ││
│  │ (maria@example.com)        │  │ Limpieza   [1.5 ▼]    ││
│  │                            │  │ Compra     [1.0 ▼]    ││
│  │ [Desconectar]              │  │ Logística  [1.0 ▼]    ││
│  │ [Invitar nuevo]            │  │ Cuidado    [1.5 ▼]    ││
│  │                            │  │                        ││
│  │ Idioma                     │  │ [+ Añadir tarea]       ││
│  │ [Español ▼]                │  │                        ││
│  │                            │  └────────────────────────┘│
│  └────────────────────────────┘                            │
│                                                             │
│  ┌────────────────────────────┐  ┌────────────────────────┐│
│  │ MULTIPLICADORES            │  │ TIPOS DE ACTIVIDAD     ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━   │  │ ━━━━━━━━━━━━━━━━━━━   ││
│  │                            │  │                        ││
│  │ Hijos:                     │  │ Necesaria   [-30% ▼]  ││
│  │ 0: ×1.0  1: ×1.4  2: ×1.8 │  │ Salud       [-15% ▼]  ││
│  │ 3+: ×2.2                  │  │ Ocio        [±0%  ▼]  ││
│  │                            │  │ Alto impacto[+20% ▼]  ││
│  │ Franjas:                   │  │                        ││
│  │ Mañana (7-9:30)   [×1.4▼] │  │ [+ Añadir tipo]        ││
│  │ Tarde (17:30-21:30)[×1.5▼]│  │                        ││
│  │ Noche (21:30-1:00)[×1.2▼] │  │                        ││
│  │ Madrugada (1-7)   [×1.6▼] │  │                        ││
│  │                            │  │                        ││
│  └────────────────────────────┘  └────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ NOTIFICACIONES                                           ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ││
│  │ ✓ Solicitud de actividad                                ││
│  │ ✓ Respuesta/ajuste                                      ││
│  │ ✗ Cambios de saldo                                      ││
│  │                                                          ││
│  │ Máximo: [2/día ▼]                                       ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ SUSCRIPCIÓN                                              ││
│  │ ━━━━━━━━━━━━━━━━━━━━━                                   ││
│  │ Plan Actual: GRATIS                                      ││
│  │                                                          ││
│  │ Desbloquea Premium:                                     ││
│  │ • Más rondas de negociación (hasta 4)                   ││
│  │ • Analytics avanzadas                                   ││
│  │ • Integraciones (Google Calendar)                       ││
│  │ • Soporte prioritario                                   ││
│  │                                                          ││
│  │ [Upgrade a Premium (€2.99/mes)]                        ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Guardar cambios]                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Pantalla: HISTORIAL (V1.1)

### Desktop
```
┌─────────────────────────────────────────────────────────────┐
│ Logo         [≡ Menu]              [👤 Juan] [⚙️] [↙️]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ← HISTORIAL Y ANALYTICS                                   │
│                                                             │
│  Filtros: [Últimos 30 días ▼] [Tipo: Todas ▼]             │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ GRÁFICO (Últimos 30 días)                               ││
│  │ ┌───────────────────────────────────────────────────┐  ││
│  │ │  50 │         ╭────────────                       │  ││
│  │ │  40 │  ╭─╮   ╭┤                                   │  ││
│  │ │  30 │  │ │   │ │                                   │  ││
│  │ │  20 │ ╭┘ ╰───╯ ╰───╮                              │  ││
│  │ │  10 │ │               ╰─╮                          │  ││
│  │ │   0 ├─┼──────────────────┼──────────────────      │  ││
│  │ │ -10 │ │      Juan        │    María               │  ││
│  │ └───────────────────────────────────────────────────┘  ││
│  │                                                          ││
│  │ Juan:   -5 pts (↘️ negativo)                            ││
│  │ María:  +35 pts (↗️ positivo)                           ││
│  │ Diferencia: 40 pts                                      ││
│  │                                                          ││
│  │ ⚠️ Desbalance detectado. Sugerencia:                   ││
│  │    "Juan debería solicitar actividades o tareas        ││
│  │     para equilibrar el saldo."                          ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ÚLTIMAS 10 TRANSACCIONES                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 31 Mar   Cena viernes (María)        +11.5 pts ✓       ││
│  │ 30 Mar   Cocina (María)               +2.0 pts ✓       ││
│  │ 30 Mar   Limpieza profunda (Juan)     +3.0 pts ✓       ││
│  │ 29 Mar   Deporte (Juan)              -2.5 pts ✓       ││
│  │ 29 Mar   Cena familia (ambos)        ±0.0 pts ✓       ││
│  │ 28 Mar   Donación María a Juan        -5.0 pts ✓       ││
│  │ 27 Mar   Limpieza (María)             +1.5 pts ✓       ││
│  │ 27 Mar   Cocina (Juan)                +2.0 pts ✓       ││
│  │ 26 Mar   Compra (María)               +1.0 pts ✓       ││
│  │ 25 Mar   Viaje fin de semana (Juan)  -30.0 pts ✓       ││
│  │                                                          ││
│  │ [Ver más...]                                            ││
│  │                                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  RESUMEN                                                    │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Actividades  │ Tareas       │ Donaciones   │            │
│  │ 12 eventos   │ 45 tareas    │ 2 donaciones │            │
│  │ ±0 pendientes│ ±0 pendientes│              │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Paleta de Colores (Propuesta)

```
Primario:      #6366F1 (Indigo - botones, links)
Secundario:    #EC4899 (Pink - acentos)
Success:       #10B981 (Green - saldos positivos)
Warning:       #F59E0B (Orange - costos medios)
Danger:        #EF4444 (Red - saldos negativos)
Neutral:       #6B7280 (Gray - texto secundario)
Background:    #FFFFFF (white)
Border:        #E5E7EB (light gray)
```

---

## Responsive Breakpoints

```
Mobile:        < 640px
Tablet:        640px - 1024px
Desktop:       > 1024px

Layouts:
- Mobile: single column, fullwidth buttons
- Tablet: 2 columns, adjusted spacing
- Desktop: 3 columns, side panels
```

---

## Interactividad y Feedback

- **Loading**: Spinner centered, desactiva botones
- **Errores**: Toast rojo arriba, con botón close
- **Success**: Toast verde, auto-desaparece 3s
- **Confirmaciones**: Modal con 2 botones (confirmar / cancelar)
- **Animaciones**: Transiciones suaves (0.3s), fade-in para modales
