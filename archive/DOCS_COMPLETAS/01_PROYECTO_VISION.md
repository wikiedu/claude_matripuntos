# 🎯 MATRIPUNTOS - VISIÓN Y CONTEXTO DEL PROYECTO

## ¿QUÉ ES MATRIPUNTOS?

**Matripuntos** es una **aplicación web gamificada** que ayuda a parejas (matrimonios, parejas estables, o compañeros) a:

1. **Gestionar responsabilidades del hogar** de forma equitativa
2. **Negociar quién hace qué** usando un sistema de puntos
3. **Evitar conflictos** sobre tareas domésticas y ausencias
4. **Mantener balance** en la relación

---

## EL PROBLEMA QUE RESUELVE

### Situación Típica:
```
Una pareja tiene un conflicto:

Juan: "¿Por qué siempre tengo que cocinar cuando salgo?"
María: "¿Y yo limpio, compro, cuido a los niños y además me levanto?"
Juan: "Pero yo trabajo más horas..."
María: "¿Y eso qué tiene que ver con el trabajo de casa?"

❌ Sin solución clara
❌ Sin registro de quién hizo qué
❌ Sin forma de negociar
```

### La Solución de Matripuntos:
```
Sistema de PUNTOS (Matripuntos):

Cuando Juan se ausenta para trabajar/viajar/salir:
- María le da "Matripuntos" por gestionar la casa
- Valor ajustado por: cantidad de hijos, hora del día, duración, tipo de actividad
- Se negocia: "¿Cuántos puntos crees que vale?"
- Se registra en la app para nunca discutir "no me acuerdo"
- Cuando Juan se ausenta, recibe puntos equivalentes

✅ Sistema justo
✅ Transparente
✅ Negociable
✅ Con histórico
```

---

## OBJETIVO PRINCIPAL

> **Crear un sistema gamificado donde parejas puedan gestionar responsabilidades del hogar de forma equitativa, transparente y sin conflictos.**

---

## CASOS DE USO PRINCIPALES

### Caso 1: Salida Social
```
Juan quiere salir el viernes a cenar con amigos (7 horas, noche).
María tendría que cuidar a los niños sola, cocinar, limpiar, etc.

ANTES (sin app):
- Juan simplemente se va
- María se molesta (sin registro de "favores")

CON MATRIPUNTOS:
- Juan: "Voy a salir el viernes, ¿cuántos puntos te cuesta?"
- App calcula: Base 8 pts × 1.2 (noche) × 1.4 (hijos) = 13.4 pts
- María: "Está bien, 13 puntos"
- Se registra en el sistema
- María puede usarlos después para sus propias ausencias
```

### Caso 2: Viaje de Trabajo
```
Juan tiene que viajar a Madrid 3 días (72 horas).
María hace TODO sola: cocina, niños, limpieza, compras.

Base: 10 pts/día × 3 días × 1.8 (dos hijos) × 1.1 (logística) = ~59 puntos
Juan le "debe" 59 matripuntos.

Cuando María viaje a su congreso de trabajo, usa esos puntos.
O Juan cocina especial ese día, vale 15 pts. Con unos arreglos, equilibran.
```

### Caso 3: Cena Familiar Sorpresa
```
María quiere hacer cena especial para aniversario (5 horas, noche).
Juan cuida niños y prepara todo.

Base: 8 pts (cena) × 1.2 (noche) × 1.4 (hijos) = 13.4 → 13.5 pts

Juan: "Espera, eso es mucho"
María: "¿Contra-oferta?"
Juan: "12 puntos si pido helado"
María: "Hecho!"

Se negocia, se acuerda, se registra.
```

### Caso 4: Tareas Diarias
```
Lavar platos: 1.0 pt
Limpiar cocina profunda: 3.0 pts
Compra del supermercado: 1.5 pts
Cuidado exclusivo de niños (4 horas): 6 pts
Viaje + gestión (médico, escuela, etc.): 2.5 pts

Sistema registra quién hizo qué cada día.
Al final del mes: "Tú hiciste 45 pts, yo 42 pts - bastante equilibrado"
```

---

## CARACTERÍSTICAS PRINCIPALES

### 1. Solicitud de Actividades
- Usuario solicita permiso/dinero para una ausencia
- App calcula automáticamente los puntos
- Pareja puede:
  - ✅ Aceptar
  - ❌ Rechazar
  - 🔄 Contra-proponer ("es mucho, 12 en vez de 13")

### 2. Negociación
- Sistema de rondas de negociación
- Free tier: 2 rondas gratis
- Premium: Rondas ilimitadas
- Si no se acuerdan: Uno puede "forzar" gastando sus propios puntos

### 3. Tareas Diarias
- Registrar quién hizo qué cada día
- Cocina, limpieza, compra, cuidado de niños, etc.
- Sistema de verificación (ambos deben confirmar)
- Disputa si no están de acuerdo

### 4. Dashboard
- Ver saldo actual de matripuntos
- Gráfico últimos 30 días
- Últimas actividades
- Próximas actividades pendientes

### 5. Histórico
- Registro completo de todas las transacciones
- "¿Cuándo fue la última vez que..."
- Datos para resolver discusiones

---

## ESTRUCTURA DE DATOS MENTAL

### Usuario/Pareja
```
Pareja: Juan + María
├── Juan
│   ├── Email: juan@example.com
│   ├── Saldo: +15 puntos (a su favor)
│   └── Últimas 7 días: cocina (2 pts), viaje (45 pts)
└── María
    ├── Email: maria@example.com
    ├── Saldo: -15 puntos (en contra)
    └── Últimas 7 días: cuidado de niños (30 pts), limpiar (10 pts)
```

### Actividades
```
Cena viernes (sin hijos):
- Base: 8 pts
- Franja (noche): ×1.2
- Sin hijos: ×1.0
- Total: 9.6 → 10 pts

Viaje Madrid (72h, 2 hijos):
- Base: 10 pts/día
- Multiplicador niños: ×1.8
- Multiplicador logística: ×1.1
- Total: 10 × 3 × 1.8 × 1.1 ≈ 59 pts
```

### Negociación
```
Ronda 1:
- Juan propone: 13.5 pts
- María ve: "¿Quizás 12?"

Ronda 2:
- María contra-propone: 12 pts
- Juan ve: "Ok, acepto"

Resultado: Acuerdo en 12 pts
Registro: Ambos tienen constancia
```

---

## MODELO DE NEGOCIO

### Free Tier
- ✅ Crear cuenta pareja
- ✅ 2 rondas de negociación gratis por evento
- ✅ Dashboard básico
- ❌ Rondas de negociación ilimitadas
- ❌ Analytics avanzados
- ❌ Exportar datos

### Premium (€2.99/mes)
- ✅ Rondas ilimitadas
- ✅ Analytics completos
- ✅ Exportar reportes
- ✅ Sin límite de eventos
- ✅ Soporte prioritario

### Pro (€5.99/mes)
- ✅ Todo Premium +
- ✅ Integraciones (Google Calendar, Slack)
- ✅ Custom rules
- ✅ Estadísticas avanzadas

---

## ARQUETIPOS DE USUARIOS

### 1. La Pareja Conflictiva
- **Problema**: Discuten constantemente sobre quién hace qué
- **Solución**: Matripuntos les da un sistema neutral para resolver
- **Valor**: Reduce conflictos, aumenta confianza

### 2. La Pareja Progresista
- **Problema**: Quieren ser justos pero es complejo
- **Solución**: App automatiza el cálculo y negociación
- **Valor**: Transparencia, equidad garantizada

### 3. La Pareja Ocupada
- **Problema**: Con niños/trabajo, olvidan quién hizo qué
- **Solución**: App registra automáticamente
- **Valor**: No tienen que recordar, la app lo hace

### 4. La Pareja con Hijos
- **Problema**: Gestionar niños es exponencialmente más difícil
- **Solución**: Sistema de multiplicadores por número de hijos
- **Valor**: Reconoce el esfuerzo extra

---

## DIFERENCIACIÓN VS COMPETIDORES

| Característica | Matripuntos | Google Docs | Apps Tareas | Excel |
|---|---|---|---|---|
| **Cálculo automático de puntos** | ✅ | ❌ | ❌ | ❌ |
| **Negociación integrada** | ✅ | ❌ | ❌ | ❌ |
| **Multiplicadores dinámicos** | ✅ | ❌ | ❌ | ❌ |
| **Fácil de usar** | ✅ | ✅ | ✅ | ❌ |
| **Histórico completo** | ✅ | ✅ | ✅ | ✅ |
| **Dashboard visual** | ✅ | ❌ | Parcial | ❌ |
| **Móvil optimizado** | ✅ (future) | ✅ | ✅ | ❌ |

---

## FILOSOFÍA DEL PROYECTO

### Principios Core
1. **Equidad**: El sistema debe ser justo para ambos
2. **Transparencia**: Todo registrado, nada es secreto
3. **Negociabilidad**: No hay sistema perfecto, se puede ajustar
4. **Gamificación**: Puntos = sistema divertido, no castigo
5. **Simplicidad**: Debe ser fácil de usar, no añadir estrés

### NO es:
- ❌ Sistema de castigo
- ❌ Para parejas muy conflictivas (necesitan terapia)
- ❌ Para reemplazar comunicación
- ❌ Complicado

### SÍ es:
- ✅ Sistema de comunicación
- ✅ Para parejas que quieren ser justas
- ✅ Para simplificar negociaciones
- ✅ Para evitar "no me acuerdo de eso"

---

## MÉTRICAS DE ÉXITO

### Para el Usuario
- ✅ Menos discusiones sobre tareas
- ✅ Sensación de equidad
- ✅ Mayor comunicación
- ✅ Menos estrés sobre "quién debe qué"

### Para el Negocio
- ✅ Conversión a Premium > 15%
- ✅ Retención > 80%
- ✅ Users activos crece 20% mensual
- ✅ NPS > 50

---

## VISIÓN A FUTURO (V2.0+)

### Corto Plazo (3 meses)
- ✅ Refinar sistema de puntos
- ✅ Mejorar UX
- ✅ Agregar tareas diarias

### Medio Plazo (6 meses)
- 📱 App móvil (React Native)
- 🔔 Notificaciones push
- 📊 Analytics avanzado
- 🗓️ Integración Google Calendar

### Largo Plazo (12+ meses)
- 👥 Grupos (familias amplias)
- 🏠 Compartir piso (roommates)
- 💰 Integración con pagos
- 🌍 Expansión internacional

---

## RESUMIENDO

**Matripuntos es:**
- Una app para parejas
- Que necesitan gestionar responsabilidades equitativamente
- Usando un sistema de puntos gamificado
- Que evita conflictos y aumenta transparencia
- Simple de usar, profundo en funcionalidad

**El nombre:**
- "Matrimonio" (pareja) + "Puntos"
- Los puntos que cuentan en el matrimonio

**El valor:**
- Menos peleas
- Más confianza
- Relación más justa
- Paz mental

---

**Próximo documento: `02_ESPECIFICACION_COMPLETA.md`**

Allí aprenderás cómo está construida la aplicación técnicamente.
