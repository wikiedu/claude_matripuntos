# 📊 SISTEMA DE PUNTOS COMPLETO - MATRIPUNTOS

## Introducción

El **corazón de Matripuntos** es su sistema de puntos. Este documento explica cómo se calculan, qué factores influyen, y cómo usarlos en la práctica.

---

## PARTE 1: CONCEPTOS FUNDAMENTALES

### ¿Qué es un Matripunto?

Un **Matripunto** es la unidad de medida de "deuda de responsabilidad" en la relación. No es dinero real, es un acuerdo entre pareja sobre "a quién le toca qué".

**Ejemplos conceptuales:**
```
"Te debo 15 Matripuntos" = "Tú hiciste algo por mí que vale 15 puntos"
"Mi saldo es -10 puntos" = "Le debo a mi pareja 10 puntos en responsabilidades"
"Mi saldo es +25 puntos" = "Mi pareja me debe 25 puntos en responsabilidades"
```

### Dos Tipos de Actividades

**1. Tareas Recurrentes (Diarias)**
- Se repiten periódicamente (cada día, cada semana, etc.)
- Ejemplos: cocina, limpieza, cuidado de niños
- Puntos **fijos** (base establecida)
- Se registran día a día

**2. Actividades Puntuales (Ausencias/Eventos)**
- Suceden de forma excepcional
- Ejemplos: cena fuera, viaje de trabajo, despedida de soltero
- Puntos **calculados** dinámicamente según circunstancias
- Se negocian antes

---

## PARTE 2: TAREAS RECURRENTES

### Tabla Base de Tareas Diarias

| Tarea | Duración Típica | Puntos Base | Notas |
|-------|-----------------|-------------|-------|
| **Cocina** | 1-2h | 2.0 pts | Comida completa. ≈2.5 si para visita |
| **Limpieza común** | 1h | 1.5 pts | Cocina, salón, baños básicos |
| **Limpieza profunda** | 2-3h | 2.5 pts | Cristales, suelos a fondo, etc. |
| **Compra/Supermercado** | 1.5-2h | 1.5 pts | Incluye transporte |
| **Logística escolar** | 1-2h | 1.5 pts | Llevar/recoger, tareas, eventos |
| **Cuidado directo (3h)** | 3h | 2.5 pts | Atención exclusiva a niños |
| **Cuidado directo (4h+)** | 4h+ | 3.5 pts | Mañana/tarde completa |
| **Gestiones/Trámites** | 1-2h | 1.0 pt | Médico, escuela, admin |
| **Lavandería** | 1.5h | 1.0 pt | Lavar, tender, planchar |
| **Baños/Higiene** | 1h | 1.0 pt | Limpiar baños, cambiar toallas |

### Modificadores para Tareas

#### Por Circunstancia

```
AUMENTO:
- Cocina para visita/fiesta: +0.5 pts
- Limpieza profunda vs. diaria: +1.0 pts
- Cuidado con enfermedad: +1.0 pts
- Gestión urgente/burocrática compleja: +0.5 pts

DISMINUCIÓN:
- Compra solo "essentials" (sin elección): -0.2 pts
- Limpieza superficial: -0.5 pts
- Gestión online (no presencial): -0.3 pts
```

#### Por Número de Hijos

Multiplicador aplicado a todas las tareas:

```
Sin hijos: ×1.0
1 hijo: ×1.4
2 hijos: ×1.8
3+ hijos: ×2.2
```

**Ejemplo:**
- Cocina normal = 2.0 pts
- Con 2 hijos: 2.0 × 1.8 = 3.6 pts → 3.5 pts (redondeo)

### Flujo Diario de Tareas

```
PLANIFICACIÓN (Semana):
Lunes: Cocina A (2.0) | Limpia B (1.5)
Martes: Cocina B (2.0) | Limpia A (1.5)
Miércoles: Cocina A (2.0) | Compra B (1.5)
...

EJECUCIÓN (Cada día):
1. Usuario A hace cocina → Marca "yo cociné hoy" ✓
2. Usuario B ve notificación "A dice que cociné, ¿confirmas?"
3. Usuario B elige:
   ✅ Aceptar (2.0 pts → A +2.0, B -2.0)
   ❌ Disputar ("No fue comida completa, máx 1.5") → Negocia
   ❌ Disputar ("Yo ayudé, deberían ser 1.5 cada uno") → Negocia

DISPUTA:
Si no se acuerdan:
- Pueden proponer rondas de negociación (máx 2 gratis)
- O registrar lo que pasó ("compramos delivery", "hizo A pero B ayudó")
- Se aplica mitad de puntos si es colaborativo
```

---

## PARTE 3: ACTIVIDADES PUNTUALES (AUSENCIAS/EVENTOS)

### Tabla Base de Actividades

| Actividad | Duración | Puntos Base | Descripción |
|-----------|----------|-------------|-------------|
| **Cena/Copas** | 3-5h | 8 pts | Noche saliendo |
| **Cena+Discoteca** | 5-7h | 12 pts | Noche larga |
| **Comida de trabajo** | 1-2h | 3 pts | Almuerzo fuera |
| **Partido/Evento deportivo** | 2-3h | 5 pts | Ver partido, concierto |
| **Viaje de día** | 8h | 20 pts | Excursión, visita familia |
| **Viaje fin de semana** | 24-48h | 40 pts | Sábado/domingo fuera |
| **Viaje de trabajo** (3 días) | 72h | 60 pts | Desplazamiento profesional |
| **Despedida/Boda** | 8-12h | 25 pts | Evento familiar/social |
| **Hobby/Deporte personal** | 1-2h | 2 pts | Yoga, gym, carrera |
| **Médico/Urgencia** | 1-2h | 2 pts | Consulta médica, farmacia |
| **Trámite administrativo** | 1-3h | 1.5 pts | Gestoría, banco, admin |

### Fórmula de Cálculo (Actividades Puntuales)

```
PUNTOS = Base × Factor_Tipo × Factor_Franja × Factor_Duración × Factor_Hijos × (1 - Descuento_Compensación)
```

### Factor por Tipo de Actividad

Ajuste según la "importancia" relativa de la actividad para la pareja:

```
Ocio puro: ×1.0 (cena, discoteca, partido)
Ocio+Trabajo: ×1.1 (comida de trabajo, networking)
Obligación familiar: ×0.9 (visita obligada a familia)
Salud/Bienestar: ×0.85 (yoga, terapia, correo)
Urgencia/Necesidad: ×0.8 (médico, urgencia, trámite)
```

**Ejemplo:**
```
Cena (8 pts) × 1.0 (ocio puro) = 8 pts
Viaje médico (20 pts) × 0.8 (urgencia) = 16 pts
```

### Factor por Franja Horaria

Basado en "inconveniente" para quien se queda:

```
Mañana (9-14h): ×1.0
Tarde (14-20h): ×1.2
Noche (20h-24h): ×1.5
Madrugada (00h-9h): ×1.8 (muy disruptivo)
```

**Nota:** Estos valores deben personalizarse según rutina (si trabajo de madrugada, etc.)

**Ejemplo:**
```
Cena 19:30-23:30 (tarde/noche) = promedio entre 1.2 y 1.5 = ×1.35
Cena 20:30-23:30 (noche) = ×1.5
```

### Factor por Duración de la Ausencia

```
0-2h: ×1.0 (salida breve)
2-4h: ×1.05
4-8h: ×1.15
8-24h: ×1.25
24h-48h: ×1.30
48h+: ×1.35
```

**Nota:** No es solo tiempo fuera, es cuánto trabajo extra cae en la otra persona.

**Ejemplo:**
```
Cena 4h = ×1.05
Viaje 48h = ×1.30
```

### Factor por Número de Hijos

Mismo que tareas recurrentes:

```
Sin hijos: ×1.0
1 hijo: ×1.4
2 hijos: ×1.8
3+ hijos: ×2.2
```

**Ejemplo:**
```
Cena (8 pts) con 2 hijos = ×1.8 → 14.4 pts
```

### Factor Logística (Adicional para viajes largos)

Para viajes donde hay gestiones extra (comida, actividades, dormir fuera):

```
Viaje local: ×1.0
Viaje con preparación: ×1.1 (preparar maletas, documentos)
```

---

## PARTE 4: EJEMPLO PRÁCTICO COMPLETO

### Escenario: Viaje de Juan a Madrid

**Situación:**
- Juan viaje a Madrid por trabajo 3 días (viernes 18h - lunes 10h)
- María: 2 hijos en casa, sola todo el fin de semana
- Es viaje de trabajo (obligatorio)

**Cálculo:**

```
Base: Viaje 3 días = 60 pts
Factor_Tipo: Viaje trabajo = 1.1 (mix obligación+ocio)
Factor_Franja: Fin de semana = 1.3 (noche + madrugada)
Factor_Duración: 72h = 1.35
Factor_Hijos: 2 = 1.8
Logística: Preparar equipaje, documentos = 1.1

TOTAL = 60 × 1.1 × 1.3 × 1.35 × 1.8 × 1.1
      = 60 × 1.1 × 1.3 × 1.35 × 1.8 × 1.1
      = ~187 pts

PERO María propone: "Bueno, es viaje de trabajo (obligatorio para tu carrera)"
Aplicamos descuento por "necesidad": -20%

TOTAL FINAL = 187 × (1 - 0.2) = 150 pts

Juan "debe" 150 matripuntos a María.
```

### Escenario: Cena de Juan

**Situación:**
- Juan quiere salir viernes 21h-23h a cena con amigos
- 2 hijos en casa
- Es ocio puro

**Cálculo:**

```
Base: Cena = 8 pts
Factor_Tipo: Ocio puro = 1.0
Factor_Franja: 21h-23h (noche) = 1.5
Factor_Duración: 2h = 1.0
Factor_Hijos: 2 = 1.8

TOTAL = 8 × 1.0 × 1.5 × 1.0 × 1.8
      = 21.6 pts → 21.5 pts (redondeo a 0.5)

María: "Pero Juan, sábado dormirás hasta las 10 (tu compensación)"
Descuento: -10%

TOTAL FINAL = 21.5 × (1 - 0.1) = 19.35 → 19.5 pts
```

---

## PARTE 5: COMPENSACIONES

### ¿Qué es una Compensación?

Es un **descuento sobre los puntos** porque la otra persona hace algo que mitiga el coste de la ausencia.

**Tipos de Compensación:**

```
1. COMPENSACIÓN DE TIEMPO:
   "Mañana me levanto temprano con los niños" → -10% a -15%
   "Duermo más el sábado (tú descansas)" → -10%
   "Te dejo mañana con los niños, yo cuido todo" → -20%

2. COMPENSACIÓN DE TAREA:
   "Contrataré canguro 3h" → resta puntos equivalentes (ej: 6 pts)
   "Compré cena preparada para mañana" → -10% (mitiga cocina)

3. COMPENSACIÓN DE DINERO:
   "Pago cena fuera mañana" → -15%
   "Pago servicio limpieza esta semana" → -20%

4. COMPENSACIÓN DE FAVORES:
   "Vosotros elegís actividad juntos este mes" → -10%
   "Te doy 10 matripuntos" (donación) → -20% (aproximadamente)

5. COMPENSACIÓN DE JUSTIFICACIÓN:
   "Urgencia médica" → -20% a -30%
   "Viaje de trabajo obligatorio" → -20% a -30%
   "Cumpleaños/Aniversario" → -10% a -15%
```

### Límites de Compensación

```
Máximo descuento por actividad: -30%
Máximo descuento por "grupo": -50% si acumulas muchas
(ej: no puedes tener -20% + -20% + -20% = -60%, se capped a -30%)

Mínimo puntos por actividad: 1 pt
(aunque tengas -99% descuento, mínimo 1 pt)
```

### Negociación de Compensación

```
FLUJO:
1. Juan: "Salgo viernes, cena son 21.5 pts"
2. María: "Uffff, mucho. ¿Y si haces cena mañana?" (-10% = 19.35)
3. Juan: "Bueno, pero es sábado, yo duermo más" (-10% extra = 17.4)
4. María: "Vale, 18 pts y punto."
5. Juan: "Hecho!"

RESULTADO: Acuerdo en 18 pts con 2 compensaciones (cena sábado + dormir más)
```

---

## PARTE 6: NEGOCIACIÓN DE PUNTOS (Flujo Completo)

### Fase 1: Propuesta Inicial

```
Juan crea solicitud de actividad:
- Tipo: Cena viernes
- Hora: 21h-23h
- Hijos: 2
- Comentario: "Con amigos de la uni"

App calcula automáticamente:
- Base: 8 pts
- Con multiplicadores: 21.5 pts
- MUESTRA: "Esta actividad te costará 21.5 matripuntos"

Juan puede:
✅ Enviar tal cual (21.5 pts)
✅ Añadir compensación antes de enviar ("duermo más mañana")
✅ Cancelar
```

### Fase 2: Respuesta Inicial

```
María recibe notificación:
"Juan quiere salir viernes 21h-23h. Costo: 21.5 pts"

María elige:
A) ✅ "Acepto tal cual" → Fin, 21.5 pts se registran
B) 🔄 "Aceptar pero ajustar puntos" → Ronda 1 negociación
C) 🔄 "Proponer otro día" → Ronda 1 negociación
D) ❌ "Rechazar" → Fin

Si elige B o C → Entra en negociación
```

### Fase 3: Ronda 1 de Negociación (GRATIS)

```
María propone: "21.5 es mucho, más bien 19 pts"
Comenta: "Porque es viernes y luego cuidas niños el sábado"

Juan ve:
- Propuesta original: 21.5 pts
- Contra-propuesta: 19 pts
- Diferencia: -2.5 pts
- Justificación: "Porque es viernes..."

Juan elige:
A) ✅ "Acepto 19 pts" → Fin, acuerdo
B) 🔄 "Pero realmente 20?" → Ronda 2 (última gratis)
C) ❌ "Rechazo, mantengo 21.5" + usa sus pts (si tiene) → Fuerza
D) 💰 "Pago extra ronda" (PREMIUM) → Ronda 3
```

### Fase 4: Ronda 2 de Negociación (GRATIS, ÚLTIMA)

```
Juan: "Bueno, 20.5 pts? Te aumento compensación: mañana me levanto temprano"

María ve:
- Propuesta original: 21.5 pts
- Ronda 1: María propone 19 pts
- Ronda 2: Juan contra-propone 20.5 pts + compensación

María elige:
A) ✅ "Acepto 20.5" → Fin, acuerdo
B) ❌ "Mantengo 19" → Fin sin acuerdo (siguiente paso)
C) 💰 "Quiero más rondas" (PREMIUM) → Ronda 3

SI NO ACUERDAN DESPUÉS DE RONDA 2:
- Opción A: Mediación (3 subopciones)
- Opción B: Juan FUERZA (si tiene matripuntos acumulados)
- Opción C: Premium desbloquea ronda 3
```

### Fase 5A: Mediación

```
App sugiere 3 opciones:

1. DIVIDIR ACTIVIDAD:
   "Reduce a cena solo (sin copas)" → 15 pts
   "Solo 2 horas en lugar de 3" → 18 pts

2. AÑADIR COMPENSACIÓN:
   "Contratas canguro 3h mañana" → -6 pts → Total 13.5 pts
   "Regalas 5 matripuntos a María" → 16.5 pts (equivalente a -5)

3. DONACIÓN:
   "Hago cena especial para María" → regala 3 pts → 18.5 pts
   "María elige próxima salida" → regala 2 pts → 19.5 pts
```

### Fase 5B: Fuerza con Matripuntos Acumulados

```
Juan tiene saldo: +45 matripuntos acumulados (de viajes pasados, tareas)

Después de Ronda 2 sin acuerdo:
Juan puede: "OK, uso 20.5 de mis matripuntos acumulados, punto final"

María: No puede rechazar (él tiene saldo)

RESULTADO:
- Juan: +45 → -20.5 = +24.5 matripuntos
- María: -45 → +20.5 = -24.5 matripuntos
- Actividad: Aprobada
```

---

## PARTE 7: SALDO Y BALANCE

### Cálculo del Saldo

```
SALDO = Suma de todos los eventos - Suma de todas las tareas

Si POSITIVO: Alguien debe a la pareja
Si NEGATIVO: Pareja debe a alguien

Ejemplo:
Eventos (ausencias):
- Viaje Juan (72h, 2 hijos): +150 pts a favor de María
- Cena Juan (2h, 2 hijos): +20 pts a favor de María
Total eventos: -170 pts para Juan

Tareas (lo que cada uno hizo):
- Juan: Cocina (20 días × 2.5 pts) = +50 pts
- María: Cuidado niños (40 pts), limpieza (20 pts) = +60 pts
Total tareas: Juan +50, María +60

SALDO FINAL:
Juan: +50 (tareas) - 170 (eventos) = -120 pts
María: +60 (tareas) + 170 (eventos) = +230 pts

INTERPRETACIÓN: Juan le debe 120 pts a María (María tiene 120 pts extra)
```

### Balance Mensual

```
Mes 1:
- Saldo inicial: 0
- Eventos: Juan -50, María -30
- Tareas: Juan +40, María +50
- Saldo final: Juan: -10 pts, María: +10 pts

Mes 2:
- Saldo inicial: Juan -10, María +10
- Eventos: Juan -60, María -20
- Tareas: Juan +60, María +40
- Saldo final: Juan: -70, María: +70

TENDENCIA: Si es muy desbalanceado, app sugiere:
"Han pasado 2 meses, Juan tiene -70 pts. Sugiero:
 - María elige próxima salida larga
 - O Juan hace 'reset' donando tiempo especial"
```

---

## PARTE 8: ESCENARIOS COMPLEJOS

### Escenario 1: Viaje Dual (Ambos Salen)

```
SITUACIÓN:
- Viernes-domingo: Juan y María salen ambos
- Viernes 18-23h: Juan a cena (2h, 20 pts), María a yoga (1h, 2 pts)
- Sábado 9-17h: María a congreso (8h, 30 pts), Juan cuida niños
- Domingo: Día familia juntos

CÁLCULO:
Viernes:
- Juan: 20 pts (ausencia)
- María: 2 pts (ausencia)
- Neto: Juan debe 18 pts a María

Sábado:
- María: 30 pts (ausencia)
- Juan: Cuidado niños (8h, 3 × 1.8 = 5.4 pts de tarea)
- Neto: María debe a Juan (30 - 5.4 = 24.6 pts)

TOTAL SEMANA:
- Juan: -20 + 5.4 = -14.6 pts
- María: +2 + 30 = +32 pts
- Resultado: Juan debe ~12 pts a María (después de compensaciones)

NEGOCIACIÓN:
María: "Bueno, viajé más (30 vs 20), pero tú cuidaste niños"
Juan: "Si hubiera sido yo solo cuidando, serían más puntos"
María: "OK, vamos a 15 pts flat, y hacemos cena especial juntos"
Juan: "Hecho"
```

### Escenario 2: Cambio de Planes Último Minuto

```
SITUACIÓN:
- Juan acordó cena viernes (20 pts)
- Miércoles: María enferma, solicita ayuda
- Juan cancela cena para cuidar a María

FLUJO:
1. Juan: "Cancelo cena, María enferma"
2. App: "Estás cancelando evento de 20 pts. ¿Quieres que María lo sepa?"
3. Juan: "Sí, envío mensaje"
4. María: Recibe mensaje "Juan canceló porque estoy enferma"
5. María: "Ay, qué dulce. Valóralo como 5 pts de cuidado (descuento)"
6. Resultado: Juan +5 pts (por cuidado a María enferma)

NUEVO SALDO: +5 en lugar de -20 = Cambio de +25 pts para Juan
```

### Escenario 3: Compensación Compleja con Terceros

```
SITUACIÓN:
- Juan viaja 3 días (150 pts)
- María no puede cuidar niños sola (enferma)
- Contratan abuela para 2 días

FLUJO:
1. Juan: Viaje 150 pts
2. María: "Necesito ayuda, abuela viene 2 días"
3. App: "Cuidado abuela = reducción de carga María"
4. Cálculo: Abuela cuida 2 días (16h, ~40 pts de reducción)
5. Compensación: 150 - 40 = 110 pts final

RESULTADO: Juan debe 110 pts (en lugar de 150)
```

---

## PARTE 9: REDONDEO Y PRECISIÓN

### Regla de Redondeo

```
Los puntos SIEMPRE se redondean a 0.5:

8.1 → 8.0
8.3 → 8.5
8.6 → 8.5
8.8 → 9.0
8.25 → 8.0 o 8.5 (decidir: si <0.375 → 0, si ≥0.375 → 0.5)
```

**Implementación técnica:**
```javascript
const roundToHalf = (num) => Math.round(num * 2) / 2;

roundToHalf(8.1) // 8.0
roundToHalf(8.3) // 8.5
roundToHalf(8.6) // 8.5
```

---

## PARTE 10: LÍMITES Y RESTRICCIONES

### Límite de Matripuntos por Actividad

```
Máximo puntos por actividad: 200 pts
(Para evitar actividades completamente irracionales)

Mínimo puntos por actividad: 1 pt
(Incluso con máximas compensaciones)

Máximo saldo negativo: -500 pts
(Para evitar "deudas infinitas" sin renegociar)
```

### Premium Desbloqueado

```
FREE TIER:
- 2 rondas de negociación gratis por evento
- Sin mediación, solo fuerza o mediación básica
- Sin analytics avanzados

PREMIUM (€2.99/mes):
- Rondas ilimitadas de negociación
- Acceso a todas las opciones de mediación
- Analytics: historial de saldos, gráficos
- Exportar reportes

PRO (€5.99/mes):
- Todo PREMIUM +
- Integraciones (Google Calendar, Slack)
- Custom multipliers (adaptar fórmulas)
- Estadísticas avanzadas (quién hace más tareas, equidad score)
```

---

## PARTE 11: FÓRMULA RESUMIDA

```
Para TAREAS RECURRENTES:
Puntos = Base_Tarea × Factor_Hijos

Para ACTIVIDADES PUNTUALES:
Puntos = Base_Actividad × Factor_Tipo × Factor_Franja × Factor_Duración × Factor_Hijos × (1 - Descuento_Compensación)

Siempre redondear a 0.5 (1.0, 1.5, 2.0, etc.)
Mínimo 1 pt, máximo 200 pts por actividad
Máximo descuento: -30% por actividad
```

---

## PARTE 12: TABLA DE REFERENCIA RÁPIDA

### Multiplicadores Comunes

```
SIN HIJOS: ×1.0
1 HIJO: ×1.4
2 HIJOS: ×1.8
3+ HIJOS: ×2.2

MAÑANA: ×1.0 | TARDE: ×1.2 | NOCHE: ×1.5 | MADRUGADA: ×1.8

0-2h: ×1.0 | 2-4h: ×1.05 | 4-8h: ×1.15 | 8-24h: ×1.25 | 24h+: ×1.35

COMPENSACIÓN TÍPICA: -10% a -20% (máx -30%)
```

### Puntos Típicos (2 hijos)

```
Cocina diaria: 3.5 pts
Limpieza diaria: 2.7 pts
Cuidado niños (3h): 4.5 pts
Cena noche: 19-22 pts
Viaje fin de semana: 50-60 pts
Viaje 3 días: 120-150 pts
```

---

## RESUMEN

El sistema de puntos en Matripuntos es **justo, transparente y negociable**:

1. **Base clara**: Cada actividad tiene un cálculo lógico
2. **Flexible**: Se pueden ajustar multiplicadores y compensaciones
3. **Previene conflictos**: Todo está registrado y visible
4. **Escalable**: Funciona con 0 hijos o 5, con parejas jóvenes o jubiladas
5. **Gamificado**: Los puntos son divertidos, no punitivos

**El objetivo final**: Que ambos se sientan equitativamente valorados en sus responsabilidades.

---

**Próximo documento: `04_FUNCIONALIDADES_DETALLADAS.md`**

Allí aprenderás exactamente cómo cada funcionalidad se ve y funciona en la aplicación.
