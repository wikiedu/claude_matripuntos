# Flujos de Usuario (UX) - Matripuntos

## Flujo 1: Solicitar una Actividad (Actividad Puntual)

### Escenario
**María quiere ir a una cena con amigas el viernes a las 19:30 hasta las 23:30. Tiene 1 hijo.**

### Pasos

1. **Maria abre app → Dashboard → "Solicitar Actividad"**

2. **Form: Solicitar Actividad**
   ```
   Tipo de actividad:     [Dropdown: Cena ▼]
   Fecha inicio:          [Viernes 31 Marzo]
   Hora inicio:           [19:30]
   Hora fin:              [23:30]
   ¿Con hijos?            [Sí / No] → Sí (1 hijo)
   Tipo actividad:        [Ocio social ▼]
   Justificación:         "Hace meses que no salgo con mis amigas"
   Compensación:          [Opcional] "Mañana yo me levanto"
   ```

3. **App calcula en tiempo REAL**
   ```
   Base (tabla: cena 4-6h) = 8 pts
   × Factor tipo (ocio)     = ×1.0
   × Factor franja (noche)  = ×1.2
   × Factor duración (4h)   = ×1.0
   × Factor hijos (1)       = ×1.4
   ──────────────────────────────────
   = 13.4 → 13.5 pts (redondeado 0.5)

   [Preview en rojo/naranja]
   "⚠️ Esta solicitud te costará 13.5 MATRIPUNTOS"

   Si hay compensación: "Yo me levanto mañana (-20%)"
   → 13.5 × 0.8 = 10.8 → 11 pts
   [Preview actualizado]
   "✓ Con compensación: 11 MATRIPUNTOS"
   ```

4. **María envía solicitud**
   ```
   [Botón] "Enviar solicitud"

   Status cambia a: "ESPERANDO RESPUESTA"
   Notificación a Juan: "María solicita ir a cena viernes
                          (11 matripuntos). ¿Aceptas?"
   ```

---

## Flujo 2: Responder a una Solicitud (Negociación)

### Escenario A: Aceptar Tal Cual
**Juan ve la notificación y dice que está bien.**

```
Bandeja → "María solicita cena viernes (11 pts)"
[Botón] "Aceptar"
[Botón] "Ajustar puntos"
[Botón] "Proponer otra franja"
[Botón] "Rechazar"

Juan: [Click "Aceptar"]

→ CONFIRMACIÓN
  "✓ Aceptado. María irá a cena viernes."
  "Tu saldo: 50 pts → 39 pts (restaron 11)"
  "Saldo María: 30 pts → 41 pts (sumaron 11)"

→ Notificación a María
  "✓ Juan aceptó tu solicitud. ¡Que lo disfrutes!"
```

### Escenario B: Ajustar Puntos (Negociación Ronda 1)
**Juan piensa que 11 pts es muy poco porque él se queda con 1 hijo toda la noche.**

```
Juan: [Click "Ajustar puntos"]

→ Form
  [Campo] Puntos propuestos: [11 ▼ → 14]
  [Campo] Comentario:        "Creo que es poco, cuidar niño
                              de noche es complicado, sube a 14 pts"
  [Botón] "Contrapropuesta"

→ Notificación a María
  "Juan contraoferta: 14 pts en lugar de 11"
  "Comentario: 'Creo que es poco, cuidar niño de noche
               es complicado, sube a 14 pts'"
  [Botón] "Ver detalles"
  [Botón] "Aceptar contraoferta"
  [Botón] "Hacer nueva contrapropuesta"
  [Botón] "Rechazar"
```

### Escenario C: Negociación Ronda 2
**María ve la contraoferta de Juan (14 pts) y decide responder.**

```
María: "Bueno, 14 es mucho para mí, pero entiendo.
         ¿Qué te parece 12.5 pts? Así nos encontramos en medio."
         [Botón] "Nueva contrapropuesta"

→ Juan recibe
  "María contraoferta: 12.5 pts"
  [Botón] "Aceptar"
  [Botón] "Hacer nueva contrapropuesta"
  [Botón] "Rechazar"

Juan: [Click "Aceptar"]

→ ✓ CERRADO
  "Acuerdo alcanzado: 12.5 MATRIPUNTOS"
  Saldos actualizados.
```

### Escenario D: No Acuerdan en 2 Rondas → Mediación
**Después de ronda 2, siguen sin acuerdo.**

```
Sistema detecta: "Máximo 2 rondas alcanzadas, mediación activa"

[Botón] "Mediación"

Opciones:
1. "Dividir actividad"
   → Reducir horas (ej: 4h en lugar de 4.5h) o hacer otro día

2. "Añadir compensación"
   → Juan asume una tarea extra (ej: lavar ropa mañana)
   → Eso resta puntos de la cena

3. "Convertir en donación"
   → María regala X pts a Juan como "buenas noches"
   → "Te doy 5 pts de regalo, así llegamos a acuerdo"

Si siguen sin acuerdo en mediación:
→ Se bloquea la solicitud
→ "No se pudo alcanzar acuerdo. Intenta otra fecha."
```

### Escenario E: Forzar con Matripuntos Acumulados
**Juan tiene 50 pts acumulados, decide forzar.**

```
Después de 2 rondas sin acuerdo, Juan ve:

[Botón] "Usar matripuntos acumulados"
        "Tienes 50 pts acumulados. ¿Forzar esta solicitud?"

Juan: [Click "Forzar"]

→ Diálogo
  "Acción irreversible:"
  "Gastarás 12.5 pts (contraoferta actual de María)"
  "Tu saldo: 50 → 37.5 pts"
  [Botón] "Aceptar" [Botón] "Cancelar"

Juan: [Click "Aceptar"]

→ ✓ CERRADO POR FUERZA
  "✓ Solicitud FORZADA. Usaste 12.5 pts acumulados."
  "Tu saldo: 50 → 37.5 pts"
  "María irá a cena. (Aprobado por fuerza)"

  Notificación a María:
  "Juan forzó la aprobación usando sus matripuntos acumulados.
   Tu saldo se actualiza a +12.5 pts."
```

---

## Flujo 3: Registrar una Tarea Diaria

### Escenario
**María cocinó hoy. Quiere registrarlo.**

### Pasos

1. **Dashboard → "+ Registrar Tarea Hoy"**

2. **Form: Registrar Tarea**
   ```
   Tipo de tarea:     [Dropdown: Cocina ▼]
   Modificador:       [Ninguno / Normal / Para visita / Dieta especial]
   Comentario opt:    "Hice desayuno, comida y cena"
   [Botón] "Registrar"
   ```

3. **App calcula**
   ```
   Cocina (base)      = 2.0 pts
   Modificador        = 0 (normal)
   ──────────────────────────
   = 2.0 pts

   [Confirmación]
   "✓ Tarea registrada: Cocina (2.0 pts)"
   "Saldo actual María: 30 → 32 pts"
   ```

4. **Juan verifica (opcional)**
   ```
   Notificación a Juan:
   "María registró: Cocina hoy (2.0 pts)
    ¿Verificas? (si no verificas en 24h, se aprueba automáticamente)"

   [Botón] "Verificar"
   [Botón] "Disputar"

   Si Juan verifica:
   → "✓ Verificado. María: 32 pts"

   Si Juan disputa:
   → Form: "Comentario: 'Desayuno fue poco completo, fue más como 1.5 pts'"
      [Botón] "Ajustar a 1.5 pts"

      Notificación a María:
      "Juan disputó tu tarea. Propone 1.5 pts en lugar de 2.0"
      [Botón] "Aceptar" [Botón] "Discutir"

   Si no verifica en 24h:
   → ✓ Aprobado automáticamente (con etiqueta: "Auto-aceptado 24h")
   ```

5. **Etiqueta de Auto-aceptación**
   ```
   En historial:
   "Cocina - 2.0 pts [Auto-aceptado después de 24h]"

   Visual: Icono gris o "⏱️ Auto-aceptado"
   ```

---

## Flujo 4: Planificación Semanal (Híbrido)

### Escenario
**Pareja planifica la semana el domingo.**

### Pasos

1. **Dashboard → "Planificación Semanal"**

2. **Vista de Semana**
   ```
   Lunes:
     María: Cocina (2.0)
     Juan:  Limpia (1.5)

   Martes:
     Juan:  Cocina (2.0)
     María: Limpia (1.5)

   Miércoles:
     María: Cocina (2.0)
     Juan:  Limpia (1.5)

   ... etc

   [Botón] "Cambiar" (para ajustar día a día)
   [Botón] "Repetir patrón siguiente semana"
   ```

3. **Si Necesitan Cambiar un Día**
   ```
   Juan: "El miércoles no puedo limpiar, tengo dentista"

   Click en Miércoles:
   [Form] "Cambiar responsable"
   "Juan" → [Cambiar a María]
   [Botón] "Actualizar"

   → Notificación a María:
      "La planificación cambió: miércoles limpias TÚ
       (Juan tiene dentista)"
   ```

4. **Check-in Diario**
   ```
   Cada mañana (o cuando lo hagan):
   Notificación: "¿Completaste tu tarea de hoy?"

   [Botón] "Sí, la hice"
   [Botón] "No la hice (explicar)"
   [Botón] "La hizo el otro"

   Si "Sí la hice":
   → Registra automáticamente (puntos) + pendiente de verificación
   ```

---

## Flujo 5: Compensaciones

### Escenario
**María va a solicitar una cena (11 pts), pero planea cocinar la noche anterior para compensar.**

### Pasos

1. **Form: Solicitar Actividad**
   ```
   [Llena datos de cena...]

   Compensación: [+]
   - [Opción] Cocina hecha mañana (desayuno/comida/cena)
     → Proporciona: -10% (de 11 → 9.9 → 10 pts)

   - [Opción] Cuidaré niño todo sábado
     → Proporciona: -15% (de 11 → 9.35 → 9.5 pts)

   - [Opción] Contrataré canguro
     → Necesita: monto en euros o puntos equivalentes
        [Campo] "Canguro 3h = X pts" → resta esos pts

   - [Opción] Yo me levanto mañana
     → Proporciona: -20% (de 11 → 8.8 → 9 pts)

   María: Selecciona "Yo me levanto mañana"

   [Preview]
   "Con compensación: 9 MATRIPUNTOS"
   ```

2. **Envía solicitud con compensación**
   ```
   Notificación a Juan:
   "María solicita cena (9 pts) + compensación: 'Yo me levanto mañana'"

   Juan puede:
   a) Aceptar la compensación tal cual
   b) "La compensación no vale esos puntos, es solo 10% de descuento"
      → Negocia el descuento también
   c) Rechazar la compensación: "No confío en que te levantes"
      → Vuelve a cena sin compensación (11 pts)
   ```

3. **Confirmación de Compensación**
   ```
   Si se acepta:
   - Queda registrada como "Tarea futura pendiente"
   - Mañana, María debe marcar como completada
   - Si no la completa en X días → notificación a Juan
     "Compensación pendiente: 'Levantarse mañana'"
   ```

---

## Flujo 6: Dashboard - Vista Principal

### Estado Inicial (Sin Hijos)
```
┌─────────────────────────────────────┐
│    MATRIPUNTOS                      │
├─────────────────────────────────────┤
│                                     │
│  TÚ (María)                         │
│  ━━━━━━━━━━━━                       │
│  Saldo:  35.5 MATRIPUNTOS 📈        │
│                                     │
│  ÉL (Juan)                          │
│  ━━━━━━━                            │
│  Saldo: -12.0 MATRIPUNTOS 📉        │
│                                     │
│  [Gráfico: Últimos 30 días]         │
│   ├─ María: tendencia ↗️  +15 pts   │
│   └─ Juan:  tendencia ↘️  -12 pts   │
│                                     │
│  ÚLTIMAS ACTIVIDADES               │
│  ━━━━━━━━━━━━━━━━━━━━━             │
│  ✓ Cena viernes (María) +11 pts     │
│  ✓ Cocina hoy (María) +2 pts        │
│  ✓ Limpieza profunda (Juan) +2 pts  │
│                                     │
├─────────────────────────────────────┤
│  [+ Solicitar Actividad]            │
│  [+ Registrar Tarea Hoy]            │
│  [📋 Bandeja: 2 pendientes]         │
│  [⚙️ Configuración]                 │
└─────────────────────────────────────┘
```

### Estado con Hijos
```
[Layout similar, pero con]
- "Contexto: 2 hijos"
- Multiplicador aplicado visible: "×1.8"
- Notificaciones: "Niño enfermo + 1 pt extra reclamado"
```

---

## Flujo 7: Configuración

### Pantalla de Configuración
```
⚙️ CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━

📊 MI PAREJA
  [Conectado a: Juan García]
  [Botón] "Desconectar"
  [Botón] "Invitar nuevo"

🎯 TAREAS BASE
  Cocina              [2.0 ▼]
  Baños + dormir      [1.5 ▼]
  Limpieza            [1.5 ▼]
  Compra/gestiones    [1.0 ▼]
  Logística           [1.0 ▼]
  Cuidado directo     [1.5 ▼]
  [+ Añadir tarea personalizada]

📈 MULTIPLICADORES
  Hijos:
    0: ×1.0
    1: ×1.4 ▼
    2: ×1.8 ▼
    3+: ×2.2 ▼

  Franjas (editable):
    Mañana (7-9:30)     = ×1.4 ▼
    Tarde (17:30-21:30) = ×1.5 ▼
    Noche (21:30-1:00)  = ×1.2 ▼
    Madrugada (1-7)     = ×1.6 ▼

🎭 TIPOS DE ACTIVIDAD
  Necesaria = -30% ▼
  Salud     = -15% ▼
  Ocio      = ±0% ▼
  Alto imp  = +20% ▼

🔔 NOTIFICACIONES
  ✓ Solicitud de actividad
  ✓ Respuesta/ajuste
  ✗ Cambios de saldo
  [Máximo 1-2/día]

💳 SUSCRIPCIÓN
  Plan: GRATIS
  [Botón] "Upgrade a Premium"
  "Desbloquea: más rondas negociación, analytics, integraciones"
```

---

## Flujo 8: Premium - Más Rondas de Negociación

### Escenario
**Después de 2 rondas, desacuerdo. Usuario quiere más rondas.**

```
Después de ronda 2 sin acuerdo:

[Botón] "Comprar más rondas (€0.99)"
o
[Botón] "Upgrade Premium (€2.99/mes)"

Si compra:
→ Desbloquea hasta 4 rondas totales (3 + 1 bonus)
→ Notificación a Juan:
   "María compró una ronda extra. ¿Continuamos negociando?"
```

---

## Flujo 9: Historial y Analytics (V1.1)

### Pantalla de Historial
```
📊 HISTORIAL
━━━━━━━━━━━━━━

🔄 Filtros:
[Últimos 7 días] [30 días] [90 días] [Personalizado]
[Tipo: Todas] [Actividades] [Tareas] [Donaciones]

ÚLTIMAS 10 TRANSACCIONES:
────────────────────────────────────────
Viernes 31 Mar  Cena con amigas          +11.5 pts ✓ CERRADO
Jueves 30 Mar   Cocina diaria            +2.0 pts ✓ AUTO-ACEPTADO
Jueves 30 Mar   Limpieza profunda        +3.0 pts ✓ VERIFICADO
Miérc 29 Mar    Deporte mañana           -2.5 pts ✓ CERRADO
Miérc 29 Mar    Cena familia (sin pts)   ±0.0 pts ✓ CERRADO
...

📈 GRÁFICO (últimos 30 días)
     pts
     40│         ╭─────────
     30│  ╭─╮   ╭┤
     20│  │ │   │ │
     10│ ╭┘ ╰───╯ ╰──
      0├─────────────
     -10│
        └──────────────→ días

María: ↗️ +15 pts (tendencia positiva)
Juan:  ↘️  -5 pts (tendencia negativa)

⚖️ EQUIDAD (últimos 30 días)
  María: 127 pts acumulados
  Juan:  95 pts acumulados
  Diferencia: María +32 pts

  ⚠️ "Desbalance detectado. Sugerencia: Juan debería
      solicitar actividades o tareas para equilibrar."
```

---

## Notas Generales de UX

1. **Transparencia**: Todos los cálculos muestran desglose
2. **Feedback visual**: Colores rojo/naranja para alto costo, verde para bajo
3. **Notificaciones**: Smart (máx 1-2/día), no abrumar
4. **Auto-aceptación**: 24h para verificar, etiqueta clara si no se verifica
5. **Mobile-first**: Diseño responsive, funciona en móvil igual que desktop
6. **Undo limitado**: Si se aprobó hace < 1h, opción de "deshacer" solicitud
