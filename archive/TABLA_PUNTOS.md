# Tabla de Puntos - Matripuntos

## 1. Tareas Recurrentes (Diarias)

### Valores Base
```
Cocina (desayuno/comida/cena)       = 2.0 pts
Baños + poner a dormir niños        = 1.5 pts
Limpiar/orden diaria                = 1.5 pts
Compra/gestiones                    = 1.0 pts
Logística escolar/deberes           = 1.0 pts
Cuidado directo (juego, actividades)= 1.5 pts
────────────────────────────────────────────
TOTAL PROMEDIO POR DÍA              = 8.5 pts (si una persona hace todo)
```

### Modificadores por Circunstancia (Aditivos a valor base)
```
Cocina:
  - Normal (2-3 personas)           = 0 pts (base)
  - Para visita (5+ personas)       = +0.5 pts
  - Con dietas especiales (alergias)= +0.25 pts

Limpieza:
  - Diaria (lo normal)              = 0 pts (base)
  - Profunda (fondo, cristales)     = +1.0 pts
  - Post-fiesta/evento              = +1.5 pts

Baños:
  - Normal (1-2 niños)              = 0 pts (base)
  - Con 3+ niños o niño enfermo     = +0.5 pts
  - Rabieta/noche muy complicada    = +1.0 pts (requiere validación del otro)

Cuidado:
  - Estándar (juego, parque)        = 0 pts (base)
  - Actividad programada fuera      = +0.5 pts (ir a clase, piscina, etc.)
```

---

## 2. Actividades Puntuales (Ausencias)

### Tabla Base (sin multiplicadores)
```
Tipo de Actividad              Duración    Hijos=No  Hijos=1  Hijos=2  Hijos=3+
──────────────────────────────────────────────────────────────────────────────
Cena + copas                   4-6h        6-10      8-14     12-18    16-22
Desayuno/brunch social         2-3h        2-3       3-4      4-6      6-8
Viaje de fin de semana         24-36h      20-30     28-42    40-56    56-72
Despedida de soltero           12-24h      15-25     20-35    30-50    42-70
Maratón/evento deportivo       4-8h        6-12      8-16     12-24    16-32
Viaje de trabajo               24-48h+     30-50     42-70    60-100   84-140

Deporte/yoga/gym               1-2h        2-3       3-4      4-6      6-8
Cita médica/trámite            1-3h        1-2       2-3      3-4      4-6
Compra/recados importantes     2-4h        2-4       3-6      4-8      6-10
Cena familiar (con pareja)     3-4h        0         0        0        0  (sin puntos)
```

### Factores de Ajuste por Tipo de Actividad (Multiplicador)
```
Necesaria (médico, trabajo obligatorio)    = ×0.7  (-30%)
Salud (deporte, terapia, descanso)        = ×0.85 (-15%)
Ocio social (cena, fiesta, casual)        = ×1.0  (base)
Alto impacto (despedida, viaje con resaca)= ×1.2  (+20%)
```

### Franjas Horarias (Multiplicador)
```
07:00 - 09:30  (mañana rutina)             = ×1.4
09:30 - 17:30  (día normal)                = ×1.0
17:30 - 21:30  (tarde/cenas)               = ×1.5
21:30 - 01:00  (noche)                     = ×1.2
01:00 - 07:00  (madrugada)                 = ×1.6
```

### Duración (Multiplicador)
```
0 - 3 horas                                = ×1.0
3 - 8 horas                                = ×1.1
8 - 24 horas                               = ×1.25
24+ horas                                  = ×1.35
```

### Contexto Familiar (Multiplicador)
```
Sin hijos                                  = ×1.0
1 hijo                                     = ×1.4
2 hijos                                    = ×1.8
3+ hijos                                   = ×2.2
```

---

## 3. Fórmula de Cálculo

### Para Actividades Puntuales

```
Puntos Finales = Puntos_Base
                 × Factor_Tipo
                 × Factor_Franja
                 × Factor_Duracion
                 × Factor_Hijos
```

### Ejemplo 1: Cena + copas viernes noche (sin hijos)
```
Puntos_Base (tabla)       = 8 pts (4-6h)
Factor_Tipo (ocio)        = ×1.0
Factor_Franja (noche)     = ×1.2
Factor_Duracion (4h)      = ×1.0
Factor_Hijos (0)          = ×1.0

Puntos = 8 × 1.0 × 1.2 × 1.0 × 1.0 = 9.6 → 10 pts (redondeado 0.5)
```

### Ejemplo 2: Despedida de soltero 24h (con 2 hijos)
```
Puntos_Base (tabla)       = 20 pts (12-24h)
Factor_Tipo (alto impacto)= ×1.2
Factor_Franja (mixto)     = ×1.2 (promedio)
Factor_Duracion (24h)     = ×1.25
Factor_Hijos (2)          = ×1.8

Puntos = 20 × 1.2 × 1.2 × 1.25 × 1.8 = 64.8 → 65 pts
```

### Ejemplo 3: Médico rutina (1h, con 1 hijo)
```
Puntos_Base (tabla)       = 1 pt (1-3h)
Factor_Tipo (necesario)   = ×0.7
Factor_Franja (día normal)= ×1.0
Factor_Duracion (1h)      = ×1.0
Factor_Hijos (1)          = ×1.4

Puntos = 1 × 0.7 × 1.0 × 1.0 × 1.4 = 0.98 → 1.0 pt
```

---

## 4. Compensaciones (Reducen Puntos)

### Actividades que Mitigan Costo
```
Cocina hecha el día anterior         → -10%
Limpieza/orden antes de irte         → -10%
Contratar canguro X horas            → resta puntos equivalentes
"Yo me levanto mañana"               → -20%
Tarea futura asumida (planchado)     → -5% a -15% según tarea
```

---

## 5. Donaciones (Transferencia de Puntos)

```
Límite: 30 puntos/mes
Razón: cumpleaños, semana muy dura, evento especial
Requiere: aceptación de la otra persona
```

---

## 6. Rondas de Negociación

```
Rondas GRATIS:         2
Ronda 3+ PREMIUM:      Desbloquear con suscripción
                       o pagar €0.99 por ronda extra
```

---

## 7. Uso Forzado de Matripuntos

### Mecánica
```
Escenario: Negocias una actividad (30 pts) pero no acuerdan en 2 rondas

Opción A: Mediar (3 subopciones)
  - Dividir actividad (menos horas)
  - Añadir compensación
  - Convertir parte en donación

Opción B: Forzar (si tienes saldo positivo)
  "Uso mis 50 pts acumulados para esta actividad de 30 pts"
  → Saldo se reduce: 50 - 30 = 20 pts
  → La actividad se ACEPTA automáticamente
  → El otro NO puede rechazar

Opción C: Premium negotiation (pagar por más rondas)
```

---

## 8. Tabla de Referencia Rápida

### Actividades Típicas (SIN HIJOS, Valores Finales)
```
"Cena y copas (viernes 19:30-23:30)"           → 10 pts
"Deporte (mañana 08:00-10:00)"                 → 3 pts
"Médico (miércoles 14:00-15:00)"               → 1 pt
"Viaje fin de semana (24h)"                    → 38 pts
"Cita con amigos (sábado 20:00-23:30)"         → 10 pts
"Concierto/teatro (noche 4h)"                  → 10 pts
```

### Actividades Típicas (CON 2 HIJOS, Valores Finales)
```
"Cena y copas (viernes 19:30-23:30)"           → 18 pts
"Deporte (mañana 08:00-10:00)"                 → 5 pts
"Médico (miércoles 14:00-15:00)"               → 2.5 → 2 pts
"Viaje fin de semana (24h)"                    → 68 pts
"Cita con amigos (sábado 20:00-23:30)"         → 18 pts
"Despedida de soltero (24h)"                   → 65 pts
```

---

## 9. Validación y Ajustes

- Todos los cálculos se **redondean a 0.5** (1.0, 1.5, 2.0, 2.5, etc.)
- Tabla es **editable por pareja** en Configuración
- Se pueden crear **tareas personalizadas** además de las estándar
- MVP inicia con estas tablas, se refina según feedback real

---

## 10. Cambios de Configuración (Próximas Versiones)

- [ ] Franjas horarias personalizadas (según rutina pareja)
- [ ] Multiplicadores ajustables
- [ ] Plantillas de actividades personalizadas
- [ ] Límites máximos/mínimos de puntos por evento
