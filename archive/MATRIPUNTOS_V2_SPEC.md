# 🚀 MATRIPUNTOS V2 — ESPECIFICACIÓN COMPLETA

**Versión:** 2.0.0
**Fecha:** Abril 2026
**Estado:** Especificación Completa — En Desarrollo

---

## 📑 ÍNDICE

1. [Visión General](#visión-general)
2. [Onboarding & Registro](#onboarding--registro)
3. [Perfiles de Usuario](#perfiles-de-usuario)
4. [Perfil del Hogar](#perfil-del-hogar)
5. [Categorías & Taxonomía](#categorías--taxonomía)
6. [Sistema de Puntos V2](#sistema-de-puntos-v2)
7. [Negociación Mejorada](#negociación-mejorada)
8. [Gamificación](#gamificación)
9. [Calendario](#calendario)
10. [Modelo Premium](#modelo-premium)
11. [Cambios de Base de Datos](#cambios-de-base-de-datos)
12. [Endpoints API Nuevos](#endpoints-api-nuevos)
13. [Roadmap de Implementación](#roadmap-de-implementación)

---

## VISIÓN GENERAL

**Matripuntos V2** transforma la app de una simple gamificación de responsabilidades en un **sistema integral de gestión de relaciones de pareja**, con:

- ✅ Onboarding robusto con invitación de pareja
- ✅ Perfiles detallados (personal + hogar)
- ✅ Sistema de puntos dinámico con múltiples multiplicadores
- ✅ Negociación con 2 rondas máximo
- ✅ Gamificación profunda (logros, score de pareja, resúmenes)
- ✅ Calendario funcional (preparado para Google Calendar sync)
- ✅ Modelo de monetización escalonado

---

## ONBOARDING & REGISTRO

### Flujo 1: Registro Solo → Invita Pareja

```
1. Registro usuario A (email + contraseña)
   ↓
2. Completa perfil personal (datos básicos)
   ↓
3. Selecciona "Crear nuevo hogar"
   ↓
4. Completa perfil hogar
   ↓
5. Genera link/código de invitación
   ↓
6. Usuario B accede con link/código
   ↓
7. Usuario B completa su perfil personal
   ↓
8. Ambos en hogar, relación activa
```

### Flujo 2: Registro Simultáneo (Mejorado)

```
1. Usuario A se registra
   ↓
2. En lugar de crear hogar, selecciona "Invitar pareja"
   ↓
3. Introduce email de pareja
   ↓
4. Si existe: se envía invitación
   Si no existe: se envia link para que se registre
   ↓
5. Usuario B acepta/registra
   ↓
6. Ambos completan perfiles simultáneamente
   ↓
7. Ambos ven hogar
```

### Flujo 3: Acceso por Link/Email

```
Usuario B recibe email → Clica link
   ↓
Si no tiene cuenta:
   - Registro rápido (email pre-llenado)
   - Completa solo datos esenciales
   - Auto-unido a hogar

Si tiene cuenta:
   - Login
   - Auto-aceptada invitación
```

---

## PERFILES DE USUARIO

### Campos Nuevos en User

```typescript
interface User {
  // Existentes
  id: string
  email: string
  passwordHash: string
  name: string
  coupleId: string

  // NUEVOS V2
  surname: string
  profilePhotoUrl?: string
  dateOfBirth: Date

  // Trabajo & Tiempo
  weeklyWorkHours: number          // Ej: 40
  workMode: 'presencial' | 'teletrabajo' | 'hibrido'
  workSchedule?: {                 // Opcional: horarios detallados
    monday: { start: "09:00", end: "18:00" }
    tuesday: { start: "09:00", end: "18:00" }
    // ...
  }

  // Preferencias
  taskPreferences: {
    loves: string[]               // Ej: ["cocinar", "exterior"]
    dislikes: string[]            // Ej: ["baños", "lavar ropa"]
  }

  // Hogar
  roleInHome: 'primary_caregiver' | 'secondary' | 'equal'

  // Configuración
  notificationPreferences: {
    emailNotifications: boolean
    pushNotifications: boolean
    weeklyDigest: boolean
    monthlyDigest: boolean
  }

  timezone: string
  language: string

  createdAt: Date
  updatedAt: Date
}
```

---

## PERFIL DEL HOGAR

### Nuevos campos en Couple

```typescript
interface Couple {
  // Existentes
  id: string
  secretKey: string
  users: User[]

  // NUEVOS V2
  homeType: 'piso' | 'casa' | 'otro'
  homeSizeM2: number              // Ej: 85
  sizeCategory: '<60' | '60-100' | '100-150' | '+150'

  cohabitation: {
    alwaysTogether: boolean
    schedule?: string              // Ej: "L-V en casa, fines de semana separados"
  }

  children: Child[]
  pets: Pet[]

  externalServices: {
    hasCleaner: boolean
    cleanerDays?: string[]         // Ej: ["lunes", "viernes"]
    hasBabysitter: boolean
    babysitterSchedule?: string
    otherServices?: string[]
  }

  // Configuración
  defaultCategories: Category[]    // Base + cualquier custom
  isActive: boolean

  // Datos anuales
  yearlyReviews: {
    date: Date
    decision: 'reset_to_zero' | 'keep_balance' | 'custom'
    notes?: string
  }[]

  createdAt: Date
  updatedAt: Date
}

interface Child {
  id: string
  name: string
  dateOfBirth: Date
  age: number
  livesWithUser1: boolean
  livesWithUser2: boolean
  hasSpecialNeeds?: boolean
}

interface Pet {
  id: string
  name: string
  type: 'perro' | 'gato' | 'otro'
  quantity: number
}
```

---

## CATEGORÍAS & TAXONOMÍA

### Estructura Base (NO editable)

```typescript
interface Category {
  id: string
  coupleId: string
  name: string
  emoji: string
  type: 'event' | 'chore' | 'service'
  basePoints: number              // Ej: 15
  description: string
  subcategories: Subcategory[]
  isCustom: boolean               // false = base, true = pareja creó
  isActive: boolean
}

interface Subcategory {
  id: string
  categoryId: string
  name: string
  basePointsModifier: number      // Ej: +5, -3, ×1.2
}
```

### 🎉 EVENTOS/SALIDAS (Base)

```
🍽️ Gastronomía (15 pts base)
   ├── Cena romántica (15 pts)
   ├── Cena con amigos (12 pts)
   ├── Cena familiar (10 pts)
   ├── Copas / after (8 pts)
   ├── Brunch / vermut (8 pts)
   └── Celebración especial (20 pts)

✈️ Escapadas & Viajes (25 pts base)
   ├── Fin de semana escapada (20 pts)
   ├── Viaje largo +4 días (35 pts)
   ├── Viaje de trabajo (15 pts)
   └── Día fuera (10 pts)

🎭 Ocio & Cultura (12 pts base)
   ├── Concierto / festival (12 pts)
   ├── Teatro / ópera (10 pts)
   ├── Cine (8 pts)
   ├── Exposición / museo (8 pts)
   └── Evento deportivo (10 pts)

🏋️ Deporte & Bienestar (10 pts base)
   ├── Gym / fitness (6 pts)
   ├── Deporte en equipo (8 pts)
   ├── Running / ciclismo (7 pts)
   ├── Yoga / pilates (8 pts)
   └── Spa / masaje (12 pts)

🎮 Ocio Personal (8 pts base)
   ├── Hobby personal (6 pts)
   ├── Videojuegos / series (4 pts)
   ├── Quedada amigos (8 pts)
   └── Tiempo solo (5 pts)

👨‍👩‍👧 Familia & Social (12 pts base)
   ├── Reunión mi familia (10 pts)
   ├── Reunión familia pareja (12 pts)
   ├── Cumpleaños / celebración (15 pts)
   ├── Boda / comunión (20 pts)
   └── Despedida (18 pts)

🏢 Trabajo & Obligaciones (10 pts base)
   ├── After work / cena empresa (8 pts)
   ├── Formación / curso (12 pts)
   ├── Viaje de trabajo (15 pts)
   └── Gestión médica / burocrática (5 pts)
```

### 🏠 TAREAS DEL HOGAR (Base)

#### Por Habitación:

**🍳 Cocina**
- Cocinar (8 pts)
- Limpiar cocina (6 pts)
- Lavar platos (4 pts)
- Gestionar compra de alimentos (7 pts)

**🛁 Baños**
- Limpiar baños (8 pts)
- Cambiar toallas (3 pts)
- Gestión artículos higiene (5 pts)

**🛏️ Dormitorios**
- Cambiar sábanas (6 pts)
- Limpiar dormitorio (5 pts)
- Organizar armarios (8 pts)

**🛋️ Salón & Comunes**
- Limpiar salón (7 pts)
- Pasar aspiradora (6 pts)
- Polvo muebles (4 pts)
- Organizar/decluttering (8 pts)

**👔 Ropa & Lavandería**
- Lavar ropa (5 pts)
- Secar ropa (3 pts)
- Planchar (6 pts)
- Organizar ropa (5 pts)

**🌿 Exterior/Jardín**
- Cuidar plantas (4 pts)
- Riego jardín (5 pts)
- Limpiar terraza (6 pts)
- Mantenimiento exterior (8 pts)

**🚗 Garaje/Trastero**
- Limpiar garage (8 pts)
- Organizar trastero (10 pts)
- Mantenimiento coche (5 pts)

**🔧 Mantenimiento & Reparaciones**
- Reparación menor (10 pts)
- Pintura/mejoras (15 pts)
- Gestión técnicos (8 pts)

**📋 Gestión del Hogar**
- Pagar facturas (5 pts)
- Gestión seguros (8 pts)
- Organizar documentos (6 pts)
- Renovar suscripciones (4 pts)

**👶 Cuidado Hijos**
- Llevar al colegio (5 pts)
- Recoger del colegio (5 pts)
- Ayuda deberes (7 pts)
- Acompañar a actividades (6 pts)
- Cuidado enfermo (10 pts)

**🐕 Cuidado Mascotas**
- Pasear perro (5 pts)
- Baño mascota (7 pts)
- Cita veterinario (6 pts)
- Limpieza mascota (4 pts)

---

## SISTEMA DE PUNTOS V2

### Fórmula de Cálculo

```
Puntos Finales = Base_actividad × ∏(multiplicadores) × factor_descuento
```

### Multiplicadores Positivos

| Variable | Valor |
|----------|-------|
| Hora mañana (6-12) | ×1.0 |
| Hora tarde (12-18) | ×1.1 |
| Hora noche (18-23) | ×1.3 |
| Madrugada (23-6) | ×1.6 |
| Día laboral | ×1.0 |
| Fin de semana | ×1.2 |
| Festivo nacional | ×1.4 |
| También trabajó ese día | ×1.2 |
| **Cuidado de hijos:** | |
| 1 hijo a cargo | ×1.4 |
| 2 hijos a cargo | ×1.8 |
| 3+ hijos | ×2.2 |
| Hijo enfermo | ×1.5 (extra) |
| Vacaciones escolares | ×1.3 |
| **Situaciones especiales:** | |
| Pareja en viaje de trabajo | ×1.1 |
| Pareja con estrés certificado | ×1.15 |
| Cumpleaños pareja/hijo | ×1.2 |

### Descuentos (por categoría de actividad)

| Tipo de Actividad | Factor |
|------------------|--------|
| Necesaria (médico, impuestos) | ×0.7 (-30%) |
| Salud / bienestar (deporte, yoga) | ×0.85 (-15%) |
| Ocio social normal | ×1.0 (base) |
| Alto impacto (viaje largo, despedida) | ×1.2 (+20%) |

### Ejemplo de Cálculo

```
Evento: "Cena con amigos" (base 12 pts)
- Sábado por la noche (fin de semana ×1.2, noche ×1.3)
- Pareja trabajó ese día (×1.2)
- Tiene 1 hijo a cargo (×1.4)

Pts = 12 × 1.2 × 1.3 × 1.2 × 1.4 = 12 × 3.08 = 36.96 ≈ 37 pts
```

### Acumulación y Límites

- Puntos se acumulan indefinidamente
- Balance anual: se puede resetear a 0 o mantener
- No hay puntos negativos (pueden quedarse en 0)
- Máximo puntos por evento: 500 pts (límite de cordura)

---

## NEGOCIACIÓN MEJORADA

### Estados de un Evento

```typescript
enum EventStatus {
  DRAFT = 'draft',              // Solo creador lo ve
  PROPOSED = 'proposed',        // Enviado, esperando respuesta
  COUNTER_PROPOSAL = 'counter', // El otro propuso otros puntos
  ACCEPTED = 'accepted',        // Ambos aceptaron
  REJECTED = 'rejected',        // Se rechazó sin llegar a acuerdo
  PENDING_CONVERSATION = 'pending_conv' // "Lo hablamos en persona"
}
```

### Flujo Mejorado

```
Usuario A crea evento
   ↓
Sistema calcula puntos automáticamente (v1)
   ↓
Usuario B recibe notificación + ver detalles

   ┌─ ✅ ACEPTAR
   │  └─ Estado: ACCEPTED
   │
   ├─ ❌ RECHAZAR (con motivo OPCIONAL)
   │  └─ Estado: REJECTED
   │
   ├─ 🔄 CONTRA-PROPONER (justificación OPCIONAL)
   │  ├─ Introduce nuevos puntos
   │  └─ Estado: COUNTER_PROPOSAL → vuelve a A
   │
   └─ 💬 "LO HABLAMOS EN PERSONA"
      └─ Estado: PENDING_CONVERSATION
```

### Segunda Ronda (ÚLTIMA)

Si User B contra-propone, User A ve:

```
Original: 37 pts propuestos
Contra-propuesta: 25 pts (Usuario B: "fue más rápido de lo que pensé")

   ┌─ ✅ ACEPTAR CONTRA-PROPUESTA
   │  └─ Estado: ACCEPTED (25 pts)
   │
   ├─ ❌ RECHAZAR
   │  └─ Estado: REJECTED
   │
   └─ 💬 "LO HABLAMOS EN PERSONA"
      └─ Estado: PENDING_CONVERSATION
```

**Indicador visible:** "Esta es tu última oportunidad para proponer, después queda rechazado o lo hablamos"

### Notificaciones

- Se notifica cambio de estado
- Si queda PENDING_CONVERSATION → ambos ven recordatorio para hablar
- Resumen diario de eventos pendientes

---

## GAMIFICACIÓN

### 🏆 Logros (Achievements)

```typescript
interface Achievement {
  id: string
  coupleId: string
  userId: string
  type: 'solo' | 'couple'
  name: string
  description: string
  icon: string
  unlockedAt: Date
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}
```

#### Logros Individuales

| Logro | Condición | Rarity |
|-------|-----------|--------|
| 🍳 Chef de casa | 30 veces cocinado registrado | Common |
| 🌙 Noctámbulo solidario | 10 tareas en madrugada (23-6) | Rare |
| 💪 Mes perfecto | 30 días consecutivos con actividad | Epic |
| 🤝 Primer acuerdo | Primera negociación sin rechazos | Common |
| ⚡ Negociador exprés | 10 acuerdos en ronda 1 sin contra | Rare |
| 🧸 Super papá/mamá | 50 actividades con hijos a cargo | Epic |
| 🎯 Especialista | 50 actividades misma categoría | Rare |
| 🚀 Consistente | 100 días activos (no consecutivos) | Epic |
| 💎 Equilibrador | 7 días con diferencia <5 pts | Rare |
| 🏆 Campeón anual | Mayor score de pareja en año | Legendary |

#### Logros de Pareja

| Logro | Condición | Rarity |
|-------|-----------|--------|
| 👫 Recién casados | Primer evento negociado juntos | Common |
| 🎪 Fiesteros | 10 eventos con categoría "Ocio" | Rare |
| ✈️ Aventureros | Primer viaje de fin de semana registrado | Common |
| 🏠 Hogar limpio | 50 tareas del hogar completadas | Rare |
| 🤝 Perfecta sincronía | 10 eventos aceptados en ronda 1 | Epic |
| 💑 Aniversario de puntos | 1 año registrado sin interrupciones | Legendary |
| 🌟 Balance perfecto | Score de pareja 95+ durante mes | Epic |

### 💑 Score de Pareja (0-100)

**Cálculo semanal:**

```
Score = (40 × equilibrio) + (25 × actividad) + (20 × consenso) + (15 × constancia)

Donde:
- equilibrio = (100 - |diff_pts|) si diff < 100, else 0
- actividad = % de días con evento/tarea (0-100)
- consenso = % de acuerdos ronda 1 (0-100)
- constancia = días activos / 7 × 100
```

**Visualización:**

```
🟢 95-100: Pareja extraordinaria (en sync perfecto)
🟢 85-94:  Pareja equilibrada (muy bien)
🟡 70-84:  Pareja en buen camino (podría mejorar)
🟠 50-69:  Pareja desbalanceada (necesita atención)
🔴 <50:   Pareja en conflicto (hablar urgente)
```

### 📊 Resúmenes Automáticos

#### Semanal (cada lunes 8am)

```
📈 RESUMEN SEMANAL

Score de pareja: 82/100 (↑ +5 esta semana)

⏆ User One tuvo mejor semana (45 pts vs 38 pts)

🔥 Actividad más intensa:
- Martes: Cena con amigos (37 pts)

🎯 Logro desbloqueado:
- ⚡ Negociador exprés (acuerdos en ronda 1)

💭 Consejo de la app:
- Intentad hacer una actividad juntos pronto
```

#### Mensual (primer día del mes)

```
📊 RESUMEN MENSUAL — MARZO 2026

📈 Score promedio: 78/100

👤 Stats User One:
- Total puntos: 320
- Eventos: 12
- Tareas: 25
- Score promedio: 80

👤 Stats User Two:
- Total puntos: 285
- Eventos: 10
- Tareas: 20
- Score promedio: 76

💑 Dinámicas:
- 90% acuerdos en ronda 1
- Mejor día: 15 marzo (55 pts juntos)
- Logro desbloqueado: "Especialista Cocina"

🎯 Recomendación:
- Han sido muy activos, ¡a mantenerlo!
```

---

## CALENDARIO

### Características V2

```
Vista Mes / Semana / Día
   ├─ Eventos próximos (por negociar, aceptados, rechazados)
   ├─ Tareas recurrentes
   ├─ Servicios externos (limpiadora, niñera)
   ├─ Días con/sin hijos
   ├─ Festivos automáticos
   └─ Cumpleaños y efemérides

Filtros:
   ├─ Por tipo (evento, tarea, servicio)
   ├─ Por usuario
   └─ Por estado (pending, accepted, etc)

Acciones:
   ├─ Crear evento directo desde día
   ├─ Arrastrar para reasignar
   └─ Ver detalles con puntos calculados
```

### Preparación para Google Calendar

```
API integración (no en V2.0, pero arquitectura lista):
   ├─ OAuth2 con Google
   ├─ Sync bidireccional
   ├─ Calendario separado "Matripuntos" en Google
   └─ Notificaciones Google Calendar + push
```

---

## MODELO PREMIUM

| Característica | FREE | PREMIUM (€4.99/mes) | FAMILY (€7.99/mes) |
|----------------|------|---------------------|---------------------|
| **Eventos/mes** | 15 | Ilimitado | Ilimitado |
| **Historial** | 30 días | Completo (indefinido) | Completo |
| **Estadísticas avanzadas** | ❌ | ✅ | ✅ |
| **Resumen semanal/mensual** | ❌ | ✅ | ✅ |
| **Google Calendar sync** | ❌ | ✅ (V2.5) | ✅ (V2.5) |
| **Categorías personalizadas** | 2 | Ilimitadas | Ilimitadas |
| **Logros completos** | Básicos (10) | Todos (25+) | Todos |
| **Export datos (CSV/JSON)** | ❌ | ✅ | ✅ |
| **Miembros hogar** | 2 | 2 | Hasta 4 |
| **Perfiles hijos** | ❌ | ❌ | ✅ |
| **Tema oscuro** | ✅ | ✅ | ✅ |

### Estrategia de Monetización

- **Free:** Atrae usuarios, funcionalidad básica funciona bien
- **Premium:** Para parejas serias que quieren estadísticas/análisis
- **Family:** Para familias ampliadas, cuidadores, perfiles hijos (V3)

---

## CAMBIOS DE BASE DE DATOS

### Nuevas Tablas

```typescript
// 1. UserProfile — datos extendidos
interface UserProfile {
  id: string
  userId: string
  surname: string
  profilePhotoUrl?: string
  dateOfBirth: Date
  weeklyWorkHours: number
  workMode: 'presencial' | 'teletrabajo' | 'hibrido'
  workSchedule?: JSON
  taskPreferencesLoves: string[]
  taskPreferencesDislikes: string[]
  roleInHome: string
  timezone: string
  language: string
  createdAt: Date
  updatedAt: Date
}

// 2. CoupleProfile — datos del hogar
interface CoupleProfile {
  id: string
  coupleId: string
  homeType: string
  homeSizeM2: number
  cohabitation: JSON
  externalServices: JSON
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 3. Child — gestión de hijos
interface Child {
  id: string
  coupleId: string
  name: string
  dateOfBirth: Date
  livesWithUser1: boolean
  livesWithUser2: boolean
  hasSpecialNeeds: boolean
  createdAt: Date
  updatedAt: Date
}

// 4. Pet — gestión de mascotas
interface Pet {
  id: string
  coupleId: string
  name: string
  type: string
  quantity: number
  createdAt: Date
  updatedAt: Date
}

// 5. Category — taxonomía de eventos/tareas
interface Category {
  id: string
  coupleId: string
  name: string
  emoji: string
  type: 'event' | 'chore' | 'service'
  basePoints: number
  description: string
  isCustom: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 6. Subcategory — subcategorías
interface Subcategory {
  id: string
  categoryId: string
  name: string
  basePointsModifier: number
  createdAt: Date
  updatedAt: Date
}

// 7. Achievement — logros
interface Achievement {
  id: string
  coupleId: string
  userId: string
  type: 'solo' | 'couple'
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  condition: JSON
  createdAt: Date
}

// 8. UserAchievement — cuando desbloqueó logro
interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: Date
}

// 9. CoupleScore — snapshots de score semanal
interface CoupleScore {
  id: string
  coupleId: string
  weekStartDate: Date
  user1Score: number
  user2Score: number
  overallScore: number
  equilibrium: number
  activity: number
  consensus: number
  constancy: number
  createdAt: Date
}

// 10. CalendarEntry — eventos de calendario
interface CalendarEntry {
  id: string
  coupleId: string
  type: 'event' | 'task' | 'service' | 'birthday' | 'holiday'
  title: string
  date: Date
  relatedEventId?: string
  relatedTaskId?: string
  description?: string
  color?: string
  createdAt: Date
}

// 11. Invitation — sistema de invitaciones
interface Invitation {
  id: string
  coupleId: string
  inviterUserId: string
  inviteeEmail: string
  inviteeUserId?: string
  token: string
  status: 'pending' | 'accepted' | 'rejected'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// 12. Subscription — datos de suscripción
interface Subscription {
  id: string
  coupleId: string
  plan: 'free' | 'premium' | 'family'
  stripeSubscriptionId?: string
  billingEmail?: string
  startDate: Date
  renewalDate?: Date
  cancelledAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### Cambios en Tablas Existentes

**Event:**
```typescript
// Agregar
negotiationRounds: number         // Máximo 2
negotiationHistory: JSON          // Historial completo
currentNegotiationRound: number
lastProposedBy: string
lastProposedPoints: number
justification?: string            // De la contra-propuesta
```

**User:**
```typescript
// Cambiar
role → roleInHome

// Agregar
hasCompletedOnboarding: boolean
notificationPreferences: JSON
timezone: string
```

---

## ENDPOINTS API NUEVOS

### Auth & Onboarding

```
POST   /api/auth/register-with-invitation     // Registro por invitación
POST   /api/auth/invite-partner               // Generar link/código
POST   /api/auth/accept-invitation            // Aceptar invitación
GET    /api/auth/invitation/:token            // Validar token invitación

POST   /api/profile/user                      // Crear/completar perfil user
PUT    /api/profile/user/:userId              // Actualizar perfil
GET    /api/profile/user/:userId              // Ver perfil

POST   /api/profile/couple                    // Crear perfil hogar
PUT    /api/profile/couple                    // Actualizar perfil hogar
GET    /api/profile/couple                    // Ver perfil hogar
```

### Categorías

```
GET    /api/categories                        // Todas categorías (base + custom)
POST   /api/categories                        // Crear categoría custom
PUT    /api/categories/:categoryId             // Editar custom (no base)
DELETE /api/categories/:categoryId             // Eliminar custom

GET    /api/categories/default                // Solo categorías base
```

### Hijos & Mascotas

```
POST   /api/children                          // Agregar hijo
PUT    /api/children/:childId                 // Actualizar info hijo
DELETE /api/children/:childId                 // Eliminar hijo
GET    /api/children                          // Todos los hijos

POST   /api/pets                              // Agregar mascota
PUT    /api/pets/:petId                       // Actualizar mascota
DELETE /api/pets/:petId                       // Eliminar mascota
GET    /api/pets                              // Todas mascotas
```

### Eventos (Mejorados)

```
POST   /api/events                            // Crear evento (auto-calcula puntos)
PUT    /api/events/:eventId                   // Editar evento
GET    /api/events                            // Todos eventos (con filtros)

POST   /api/events/:eventId/respond           // Aceptar/rechazar/contra-proponer
GET    /api/events/:eventId/negotiation       // Ver historial negociación
POST   /api/events/:eventId/mark-pending      // Marcar "lo hablamos"
```

### Logros & Score

```
GET    /api/achievements                      // Mis logros desbloqueados
GET    /api/achievements/all                  // Todos logros disponibles
GET    /api/couple/score                      // Score semanal actual
GET    /api/couple/score/history              // Histórico scores
```

### Calendario

```
GET    /api/calendar/entries                  // Todos eventos calendario
GET    /api/calendar/:month/:year              // Eventos mes específico
GET    /api/calendar/week/:date                // Eventos semana
```

### Resúmenes & Analytics

```
GET    /api/summary/weekly                    // Resumen semanal
GET    /api/summary/monthly                   // Resumen mensual
GET    /api/stats/couple                      // Stats pareja (premium)
GET    /api/stats/points-breakdown            // Desglose por categoría (premium)
```

### Suscripción

```
POST   /api/subscription/upgrade              // Cambiar a premium/family
POST   /api/subscription/cancel               // Cancelar suscripción
GET    /api/subscription/current              // Ver suscripción actual
```

---

## ROADMAP DE IMPLEMENTACIÓN

### 🔵 FASE 1: Perfiles & Onboarding (Semanas 1-2)

**Sprint 1.1 — Backend Profiles:**
- [ ] Crear tablas UserProfile, CoupleProfile, Child, Pet
- [ ] Implementar endpoints CRUD para perfiles
- [ ] Validación de datos (edades, m², etc)
- [ ] Tests unitarios

**Sprint 1.2 — Invitaciones:**
- [ ] Tabla Invitation con token único
- [ ] Endpoint invite-partner (email)
- [ ] Endpoint accept-invitation
- [ ] Sistema de link/código (URL shareable)
- [ ] Email notificación invitación

**Sprint 1.3 — Frontend Onboarding:**
- [ ] Flujo registro mejorado (4 pasos)
- [ ] Formularios perfiles (user + hogar)
- [ ] Validación en vivo
- [ ] Invitación partner
- [ ] Testing e2e

### 🟡 FASE 2: Categorías & Puntos V2 (Semanas 3-4)

**Sprint 2.1 — Taxonomía:**
- [ ] Tabla Category + Subcategory
- [ ] Cargar categorías base (script SQL)
- [ ] Endpoints CRUD (custom categories)
- [ ] Validación (no editar base)

**Sprint 2.2 — Sistema de Puntos:**
- [ ] Refactor fórmula de puntos (multiplicadores)
- [ ] Auto-cálculo en base a variables
- [ ] Tests cálculo (20+ casos)
- [ ] Actualizar Event schema

### 🟠 FASE 3: Negociación Mejorada (Semanas 5-6)

**Sprint 3.1 — Flujo Negociación:**
- [ ] Nuevos estados evento (COUNTER_PROPOSAL, PENDING_CONV)
- [ ] Tabla NegotiationRound
- [ ] Endpoints respuesta (aceptar/rechazar/contra-proponer)
- [ ] Validación "última ronda"
- [ ] Tests negociación

**Sprint 3.2 — Frontend Negociación:**
- [ ] UI pantalla negociación
- [ ] Mostrar puntos propuestos vs contra-propuesta
- [ ] Indicador "última ronda"
- [ ] Estado "pendiente conversación"

### 💜 FASE 4: Gamificación (Semanas 7-8)

**Sprint 4.1 — Logros:**
- [ ] Tabla Achievement + UserAchievement
- [ ] Cargar logros base (25+)
- [ ] Sistema check automático de logros
- [ ] Notificación desbloqueo

**Sprint 4.2 — Score de Pareja:**
- [ ] Tabla CoupleScore
- [ ] Cálculo semanal automatizado
- [ ] Histórico y visualización
- [ ] Dashboard score

**Sprint 4.3 — Resúmenes:**
- [ ] Generar resumen semanal (backend)
- [ ] Generar resumen mensual (backend)
- [ ] Envío automático email
- [ ] Página ver resúmenes

### 🟢 FASE 5: Calendario (Semanas 9-10)

**Sprint 5.1 — Backend Calendario:**
- [ ] Tabla CalendarEntry
- [ ] Endpoints eventos calendario
- [ ] Sync eventos → calendario automático
- [ ] Filtros y búsqueda

**Sprint 5.2 — Frontend Calendario:**
- [ ] Componente calendario (librería)
- [ ] Vista mes / semana / día
- [ ] Crear evento desde día
- [ ] Drag & drop (opcional)
- [ ] Mostrar servicios externos

### 🟣 FASE 6: Premium & Finales (Semanas 11-12)

**Sprint 6.1 — Suscripción:**
- [ ] Tabla Subscription
- [ ] Integración Stripe (webhook)
- [ ] Endpoints upgrade/cancel
- [ ] Paywalls en app (feature gating)

**Sprint 6.2 — QA & Polish:**
- [ ] Testing completo (E2E)
- [ ] Optimización performance
- [ ] Documentación API (Swagger)
- [ ] Deploy staging

---

## NOTAS IMPORTANTES

### Decisiones Arquitectónicas

1. **Invitaciones:** Token único + expiración 7 días
2. **Puntos:** Acumulativos indefinidamente (reset anual opcional)
3. **Negociación:** Máximo 2 rondas (limite la discusión)
4. **Categorías:** Base inmutable + custom editable
5. **Premium:** Gating soft (funciona, pero con anuncios/límites)

### Pendiente para V2.5 / V3

- Google Calendar sync
- Perfiles hijos (Family plan)
- Integración Alexa/Google Home ("Cortana, registra que limpié")
- Machine learning para predicción de consenso
- Chat integrado pareja

### Métricas de Éxito

- ✅ 95%+ usuarios completen onboarding
- ✅ 70%+ acuerdos en ronda 1 (consenso bueno)
- ✅ Score promedio pareja 80+ (equilibrio)
- ✅ 40%+ conversión a premium (monetización)

---

**Documento actualizado:** 01/04/2026
**Próxima revisión:** Tras completar Fase 2
