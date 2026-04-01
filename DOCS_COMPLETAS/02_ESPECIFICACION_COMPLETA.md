# 🔧 ESPECIFICACIÓN TÉCNICA COMPLETA

## STACK TECNOLÓGICO

### Frontend
```
┌─────────────────────────────────────────┐
│ React 18.2 + TypeScript                 │
│ ├─ Build: Vite (fast rebuilds)          │
│ ├─ State: Zustand (simple store)        │
│ ├─ Styling: Tailwind CSS                │
│ ├─ Icons: Lucide React                  │
│ ├─ Charts: Recharts (data viz)          │
│ ├─ Routing: React Router v6             │
│ ├─ HTTP: Fetch API (nativo)             │
│ └─ Validation: Zod (runtime checks)     │
└─────────────────────────────────────────┘

Port: 5173 (desarrollo)
Build output: dist/ (producción)
```

### Backend
```
┌─────────────────────────────────────────┐
│ Node.js + Express.js                    │
│ ├─ Language: TypeScript                 │
│ ├─ ORM: Prisma (database abstraction)   │
│ ├─ Auth: JWT + bcryptjs                 │
│ ├─ Validation: Zod (request validation) │
│ ├─ Cors: enabled for frontend           │
│ └─ Error handling: centralized          │
└─────────────────────────────────────────┘

Port: 3000 (desarrollo)
Node version: 18+
```

### Database
```
┌─────────────────────────────────────────┐
│ LOCAL DEVELOPMENT:                      │
│ └─ SQLite (prisma/dev.db)               │
│                                         │
│ PRODUCTION:                             │
│ └─ PostgreSQL (Supabase)                │
│    ├─ Host: db.xxxxx.supabase.co        │
│    ├─ Port: 5432                        │
│    ├─ SSL: enabled                      │
│    └─ Auto-backups: daily               │
└─────────────────────────────────────────┘
```

### DevOps
```
┌─────────────────────────────────────────┐
│ Frontend: Vercel                        │
│ └─ Auto-deploy on git push              │
│                                         │
│ Backend: Railway                        │
│ └─ Auto-deploy on git push              │
│                                         │
│ Database: Supabase                      │
│ └─ PostgreSQL managed service           │
│                                         │
│ Version Control: GitHub                 │
│ └─ Repo: wikiedu/claude_matripuntos     │
└─────────────────────────────────────────┘
```

---

## ARQUITECTURA GENERAL

### Flujo de Datos
```
┌─────────────────────┐
│   USER (Browser)    │
│  http://5173        │
└──────────┬──────────┘
           │ HTTP + JWT Token
           ↓
┌─────────────────────────────────────────┐
│     FRONTEND (React App)                │
│  ├─ Login page (signin)                 │
│  ├─ Dashboard (view balance)            │
│  ├─ RequestActivity (create event)      │
│  ├─ RequestInbox (respond to proposals) │
│  └─ Store (Zustand - global state)      │
└──────────┬──────────────────────────────┘
           │ REST API calls
           │ /api/auth, /api/events, etc.
           ↓
┌─────────────────────────────────────────┐
│     BACKEND (Express API)               │
│  ├─ Routes (authentication, events)     │
│  ├─ Middleware (auth, validation)       │
│  ├─ Services (business logic)           │
│  ├─ Database (Prisma ORM)               │
│  └─ Error handling                      │
└──────────┬──────────────────────────────┘
           │ SQL queries
           ↓
┌─────────────────────────────────────────┐
│     DATABASE                            │
│  ├─ Couple (pareja)                     │
│  ├─ User (usuarios)                     │
│  ├─ Event (actividades)                 │
│  ├─ Negotiation (negociaciones)         │
│  ├─ Task (tareas recurrentes)           │
│  ├─ TaskLog (registro de tareas)        │
│  ├─ PointsTransaction (historial)       │
│  ├─ Compensation (compensaciones)       │
│  ├─ Notification (notificaciones)       │
│  ├─ Configuration (configuración)       │
│  └─ Subscription (suscripciones)        │
└─────────────────────────────────────────┘
```

---

## BASES DE DATOS - SCHEMA COMPLETO

### 11 Tablas Principales

#### 1. **Couple** (La pareja)
```sql
Couple {
  id: String (CUID)
  secretKey: String (para compartir código?)
  numChildren: Int (0-3)
  language: String (ej: "es", "en")
  notificationsEnabled: Boolean
  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Tiene muchos Users
└─ Tiene muchos Events
└─ Tiene muchos Tasks
└─ Tiene una Configuration
└─ Tiene una Subscription
```

#### 2. **User** (Miembros de la pareja)
```sql
User {
  id: String (CUID)
  coupleId: String (FK → Couple)
  email: String (único)
  passwordHash: String (bcrypt)
  emailVerified: Boolean
  verifiedAt: DateTime?

  name: String
  role: String ("user" por defecto)
  timezone: String ("Europe/Madrid")
  notificationsPush: Boolean
  notificationsEmail: Boolean
  lastLogin: DateTime?

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Pertenece a Couple
└─ Crea Events
└─ Completa TaskLogs
└─ Verifica TaskLogs
└─ Propone Negotiations
└─ Responde Negotiations
```

#### 3. **Event** (Actividades/Ausencias)
```sql
Event {
  id: String (CUID)
  coupleId: String (FK → Couple)
  createdBy: String? (FK → User)

  type: String (ej: "cena", "viaje", "despedida")
  title: String?
  description: String?

  dateStart: DateTime
  dateEnd: DateTime

  hasChildren: Boolean
  numChildren: Int (0-3)

  pointsBase: Decimal
  pointsCalculated: Decimal
  pointsAgreed: Decimal?

  status: String ("draft", "pending", "accepted", "rejected", "forced")
  negotiationRound: Int (qué ronda van)
  maxFreeRounds: Int (2 por defecto, más con premium)

  compensation: String? (tipo de compensación)
  compensationDiscount: Decimal (multiplicador 0-1)

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Pertenece a Couple
└─ Creada por User
└─ Tiene muchas Negotiations
└─ Tiene muchas Compensations
└─ Tiene una PointsTransaction (opcional)
```

#### 4. **Task** (Tareas recurrentes diarias)
```sql
Task {
  id: String (CUID)
  coupleId: String (FK → Couple)
  name: String (ej: "Cocina")
  description: String?
  category: String (enum: cocina, baños, limpieza, compra, logistica, cuidado)

  pointsBase: Decimal (1.0-3.0)
  isDefault: Boolean (si es una tarea por defecto)

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Pertenece a Couple
└─ Tiene muchas TaskLogs
└─ Puede ser compensación
```

#### 5. **TaskLog** (Registro de tareas completadas)
```sql
TaskLog {
  id: String (CUID)
  coupleId: String
  taskId: String (FK → Task)
  completedBy: String? (FK → User)

  date: DateTime
  pointsBase: Decimal
  modifier: String? (ej: "profunda", "normal")
  modifierValue: Decimal
  pointsFinal: Decimal

  status: String ("pending", "verified", "disputed")
  verifiedBy: String? (FK → User)
  verifiedAt: DateTime?

  disputeReason: String?
  disputedAt: DateTime?
  pointsDisputed: Decimal?

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Registra Task
└─ Completada por User
└─ Verificada por User
└─ Tiene una PointsTransaction
```

#### 6. **Negotiation** (Rondas de negociación)
```sql
Negotiation {
  id: String (CUID)
  eventId: String (FK → Event)
  roundNumber: Int (1, 2, 3...)

  proposedBy: String? (FK → User)
  pointsProposed: Decimal
  message: String?

  responseType: String? ("accepted", "rejected", "counter_proposed", "awaiting", "forced")
  respondedBy: String? (FK → User)
  respondedAt: DateTime?

  createdAt: DateTime
}

Relaciones:
└─ Pertenece a Event
└─ Propuesta por User
└─ Respondida por User
```

#### 7. **PointsTransaction** (Historial de cambios de puntos)
```sql
PointsTransaction {
  id: String (CUID)
  coupleId: String
  userId: String? (FK → User)

  type: String (enum: "event_accepted", "task_completed", "donation", "forced_payment")
  relatedEventId: String? (FK → Event, unique)
  relatedTaskLogId: String? (FK → TaskLog, unique)

  amount: Decimal (positivo o negativo)
  description: String?

  createdAt: DateTime
}

Relaciones:
└─ Pertenece a Couple
└─ Causada por User
└─ Relacionada con Event (opcional)
└─ Relacionada con TaskLog (opcional)
```

#### 8. **Compensation** (Compensaciones/descuentos)
```sql
Compensation {
  id: String (CUID)
  eventId: String (FK → Event)
  coupleId: String

  type: String (ej: "cocina_hecha", "levantarse_mañana", "canguro_2h")
  description: String?

  discountAmount: Decimal
  discountPercent: Decimal?

  status: String ("pending", "completed", "skipped")
  linkedTaskId: String? (tarea futura como compensación)
  dueDate: DateTime?
  completedAt: DateTime?

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Pertenece a Event
└─ Pertenece a Couple
└─ Puede ser Task (futura)
```

#### 9. **Configuration** (Configuración por pareja)
```sql
Configuration {
  id: String (CUID)
  coupleId: String (UNIQUE FK → Couple)

  tasksConfig: String (JSON como texto)
  {
    "cocina": 2.0,
    "baños": 1.5,
    "limpieza": 1.5,
    "compra": 1.0,
    "logistica": 1.0,
    "cuidado": 1.5
  }

  multipliersConfig: String (JSON)
  {
    "activityTypes": { "cena": 1.0, "viaje": 1.2, ... },
    "franja": { "mañana": 1.4, "dia": 1.0, ... },
    "duracion": { "corta": 1.0, "media": 1.1, ... },
    "hijos": { "0": 1.0, "1": 1.4, "2": 1.8, "3": 2.2 }
  }

  activityTypes: String (JSON)
  {
    "cena": { "base": 8, "label": "Cena + copas" },
    ...
  }

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Única por Couple
```

#### 10. **Notification** (Notificaciones en-app)
```sql
Notification {
  id: String (CUID)
  coupleId: String
  userId: String (FK → User)

  type: String (ej: "event_proposed", "negotiation_responded")
  title: String
  message: String
  relatedEventId: String?
  relatedTaskLogId: String?

  isRead: Boolean
  readAt: DateTime?

  createdAt: DateTime
}
```

#### 11. **Subscription** (Planes de pago)
```sql
Subscription {
  id: String (CUID)
  coupleId: String (UNIQUE FK → Couple)

  plan: String ("free", "premium", "pro")

  startedAt: DateTime
  endsAt: DateTime?

  stripeId: String? (para Stripe webhooks)

  createdAt: DateTime
  updatedAt: DateTime
}

Relaciones:
└─ Una por Couple
```

---

## API ENDPOINTS (15+ Endpoints)

### Authentication (`/api/auth`)

```
POST /api/auth/signup
├─ Request:
│  ├─ email1: string
│  ├─ password1: string
│  ├─ name1: string
│  ├─ email2: string
│  ├─ password2: string
│  ├─ name2: string
│  └─ language?: string
├─ Response:
│  ├─ message: "Couple registered successfully"
│  ├─ coupleId: string
│  └─ users: User[]
└─ Status: 201

POST /api/auth/login
├─ Request:
│  ├─ email: string
│  └─ password: string
├─ Response:
│  ├─ token: string (JWT)
│  └─ user: User
└─ Status: 200

GET /api/auth/me
├─ Auth: Required (JWT)
├─ Response: { user: User }
└─ Status: 200

GET /api/auth/couple
├─ Auth: Required
├─ Response: { couple: Couple with users }
└─ Status: 200
```

### Events (`/api/events`)

```
POST /api/events
├─ Auth: Required
├─ Request:
│  ├─ type: string
│  ├─ title?: string
│  ├─ description?: string
│  ├─ dateStart: ISO string
│  ├─ dateEnd: ISO string
│  ├─ hasChildren?: boolean
│  ├─ numChildren?: number
│  ├─ pointsBase: number
│  ├─ compensation?: string
│  └─ compensationDiscount?: number
└─ Response: { message, event }

GET /api/events?status=pending
├─ Auth: Required
├─ Query params:
│  └─ status?: "draft" | "pending" | "accepted" | "rejected"
├─ Response: { events: Event[] }
└─ Status: 200

GET /api/events/:id
├─ Auth: Required
└─ Response: { event: Event with negotiations }

PUT /api/events/:id
├─ Auth: Required (must be creator)
└─ Request: partial Event

DELETE /api/events/:id
├─ Auth: Required (must be creator, draft only)
└─ Status: 200
```

### Tasks (`/api/tasks`)

```
POST /api/tasks
├─ Auth: Required
├─ Request:
│  ├─ name: string
│  ├─ description?: string
│  ├─ category: enum
│  ├─ pointsBase?: number
│  └─ isDefault?: boolean
└─ Response: { message, task }

GET /api/tasks
├─ Auth: Required
└─ Response: { tasks: Task[] }

POST /api/tasks/:taskId/log
├─ Auth: Required
├─ Request:
│  ├─ date: ISO string
│  ├─ pointsBase: number
│  ├─ pointsFinal: number
│  ├─ modifier?: string
│  └─ modifierValue?: number
└─ Response: { message, taskLog }

GET /api/tasks/:taskId/logs?startDate=&endDate=
├─ Auth: Required
└─ Response: { logs: TaskLog[] }

PUT /api/tasks/:taskId/logs/:logId/verify
├─ Auth: Required
└─ Response: verified log

PUT /api/tasks/:taskId/logs/:logId/dispute
├─ Auth: Required
├─ Request:
│  ├─ disputeReason: string
│  └─ pointsDisputed?: number
└─ Response: disputed log
```

### Negotiations (`/api/negotiations`)

```
POST /api/negotiations
├─ Auth: Required
├─ Request:
│  ├─ eventId: string
│  ├─ pointsProposed: number
│  └─ message?: string
└─ Response: { message, negotiation }

PUT /api/negotiations/:id/respond
├─ Auth: Required
├─ Request:
│  ├─ responseType: "accepted" | "rejected" | "counter_proposed"
│  ├─ pointsProposed?: number (if counter)
│  └─ message?: string
└─ Response: updated negotiation

GET /api/negotiations/event/:eventId
├─ Auth: Required
└─ Response: { negotiations: Negotiation[] }

POST /api/negotiations/:id/force
├─ Auth: Required
├─ Description: Use matripuntos to force agreement
└─ Response: { message, event }
```

---

## AUTENTICACIÓN

### Flujo JWT
```
1. Usuario hace login
   POST /api/auth/login
   ↓
2. Backend genera JWT token
   token = sign({ userId, coupleId }, SECRET, { expiresIn: "7d" })
   ↓
3. Frontend almacena en localStorage
   localStorage.setItem("auth_token", token)
   ↓
4. Cada petición incluye token
   Headers: { Authorization: "Bearer <token>" }
   ↓
5. Backend verifica token
   verify(token, SECRET)
   ↓
6. Token caduca después de 7 días
   Usuario debe hacer login de nuevo
```

### Password Security
```
1. Signup: password → bcryptjs.hash(password, 10)
2. Login: password → bcryptjs.compare(password, hash)
3. Nunca se almacena password plain
4. Se usa bcryptjs (no bcrypt puro, más compatible)
```

---

## VALIDACIÓN DE DATOS

### Request Validation (Zod)
```typescript
// Todos los requests se validan con Zod
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const createEventSchema = z.object({
  type: z.string().min(1),
  dateStart: z.string().datetime(),
  dateEnd: z.string().datetime(),
  pointsBase: z.number().positive(),
  numChildren: z.number().optional().default(0)
})

// Si validación falla:
// → Error 400 con detalles
```

---

## CONFIGURACIÓN GLOBAL

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=MiSecret123!
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://matripuntos.vercel.app
```

#### Frontend (.env)
```
VITE_API_URL=https://matripuntos-production-xxxx.up.railway.app
```

---

## PATRONES DE CÓDIGO

### Backend Services
```typescript
// Lógica de negocio sin dependencias de BD
export const authService = {
  signup: async (email, password, name) => {
    // Validar
    // Hash password
    // Crear usuario
    // Retornar token
  },

  login: async (email, password) => {
    // Buscar usuario
    // Verificar password
    // Generar token
    // Retornar user + token
  }
}
```

### Frontend Store (Zustand)
```typescript
export const useAppStore = create((set) => ({
  user: null,
  couple: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await apiClient.auth.login(email, password)
    set({ user: response.user, isAuthenticated: true })
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  }
}))
```

---

## DESPLIEGUE

### CI/CD Pipeline
```
git push → GitHub
  ↓
Vercel (frontend)
├─ Build: npm run build
├─ Deploy: auto
└─ URL: matripuntos.vercel.app

Railway (backend)
├─ Build: npm run build
├─ Deploy: auto
└─ URL: matripuntos-production-xxx.up.railway.app

Supabase (database)
├─ Auto-backup: daily
├─ SSL: enabled
└─ Monitoring: included
```

---

**Próximo documento: `03_SISTEMA_PUNTOS_COMPLETO.md`**

Allí aprenderás exactamente cómo se calculan los matripuntos.
