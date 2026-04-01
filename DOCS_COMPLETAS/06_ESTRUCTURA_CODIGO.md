# 💻 ESTRUCTURA DEL CÓDIGO - MATRIPUNTOS

## Visión General

El proyecto está organizado en dos aplicaciones principales: **Frontend** (React) y **Backend** (Express), ambas con **TypeScript**.

```
Matripuntos/
├── src/
│   ├── frontend/          ← React + TypeScript + Vite
│   ├── backend/           ← Express + TypeScript + Prisma
│   └── shared/            ← (Futuro) Tipos compartidos
├── docs/                  ← Documentación
├── QUICKSTART.md          ← Guía rápida
├── PROJECT_STATUS.md      ← Estado del proyecto
└── README.md              ← Overview
```

---

## PARTE 1: ESTRUCTURA FRONTEND

### 1.1 Árbol de Directorios

```
src/frontend/
├── src/
│   ├── pages/                    # Componentes de página (ruteables)
│   │   ├── Login.tsx              # 📄 Signup + Signin
│   │   ├── Dashboard.tsx          # 📊 Centro de control
│   │   ├── RequestActivity.tsx    # ➕ Crear actividad
│   │   ├── RequestInbox.tsx       # 📮 Responder solicitudes
│   │   └── NotFound.tsx           # ❌ 404 page
│   │
│   ├── components/               # Componentes reutilizables
│   │   ├── Card.tsx              # Container base
│   │   ├── Button.tsx            # Botones (primary/secondary/danger)
│   │   ├── Input.tsx             # Input fields
│   │   ├── Select.tsx            # Dropdowns
│   │   ├── Modal.tsx             # Modals/Dialogs
│   │   ├── Loading.tsx           # Spinner
│   │   ├── Alert.tsx             # Notificaciones
│   │   ├── Chart.tsx             # Gráfico Recharts
│   │   └── Navigation.tsx        # Header + Sidebar
│   │
│   ├── services/                 # Lógica de API + HTTP
│   │   └── apiClient.ts          # 🌐 Cliente HTTP + JWT management
│   │
│   ├── store/                    # Estado global (Zustand)
│   │   └── useAppStore.ts        # 🏪 Auth, user, couple, UI state
│   │
│   ├── utils/                    # Funciones auxiliares
│   │   ├── pointsCalculator.ts   # 📐 Cálculo de puntos (puro)
│   │   ├── dateFormatter.ts      # 📅 Formateo de fechas
│   │   ├── validation.ts         # ✅ Validación de formularios
│   │   └── constants.ts          # 🔒 Constantes globales
│   │
│   ├── types/                    # Interfaces TypeScript
│   │   └── index.ts              # User, Couple, Event, Task, etc.
│   │
│   ├── styles/                   # CSS/Tailwind globals
│   │   ├── globals.css           # Reset + base styles
│   │   └── tailwind.config.js    # Configuración Tailwind
│   │
│   ├── App.tsx                   # Root component + Router
│   ├── main.tsx                  # Entrada React
│   └── index.css                 # Estilos base
│
├── package.json                  # Dependencias
├── tsconfig.json                 # Config TypeScript
├── vite.config.ts                # Config Vite (build, alias, etc.)
└── .env                          # Variables de entorno (gitignored)
```

### 1.2 Descripción de Archivos Clave

#### `pages/Login.tsx`
```typescript
/**
 * Pantalla de Autenticación (Sign-up + Sign-in)
 *
 * Funcionalidad:
 * - Tab de "Crear Cuenta" (ambos usuarios)
 * - Tab de "Iniciar Sesión" (un usuario)
 * - Validación en tiempo real
 * - Manejo de errores
 *
 * Flujo:
 * 1. Usuario completa form
 * 2. Envía a /api/auth/signup o /api/auth/login
 * 3. Recibe token + user data
 * 4. Guarda en Zustand + localStorage
 * 5. Redirige a /dashboard
 */
```

**Props:** None (usa Zustand)

**State:**
```typescript
const [email1, setEmail1] = useState('')
const [password1, setPassword1] = useState('')
const [name1, setName1] = useState('')
// ... email2, password2, name2
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [childrenCount, setChildrenCount] = useState(2)
const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signup')
```

**Métodos principales:**
```typescript
const handleSignup = async () => { /* ... */ }
const handleSignin = async () => { /* ... */ }
```

#### `pages/Dashboard.tsx`
```typescript
/**
 * Centro de Control
 *
 * Muestra:
 * - Saldo actual (TÚ vs PAREJA)
 * - Gráfico 30 días
 * - Solicitudes pendientes
 * - Tareas de hoy
 * - Próximos eventos
 *
 * Carga datos de:
 * - GET /api/events → eventos
 * - GET /api/tasks → tareas
 * - GET /api/auth/couple → datos pareja
 */
```

**State:**
```typescript
const [events, setEvents] = useState<Event[]>([])
const [tasks, setTasks] = useState<Task[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const { user, couple } = useAppStore()
```

**Computed:**
```typescript
const pendingCount = events.filter(e => e.status === 'pending').length
const todaysTasks = tasks.filter(t => isToday(t.nextDueDate))
const balance = /* computed from transactions */
```

#### `pages/RequestActivity.tsx`
```typescript
/**
 * Crear Nueva Solicitud de Actividad
 *
 * Campos:
 * - Tipo (dropdown)
 * - Fecha/Hora inicio-fin
 * - Descripción
 * - ¿Hijos?
 * - Compensación (opcional)
 *
 * Cálculo en tiempo real:
 * → Actualiza puntos mientras escribes
 *
 * Envía a:
 * POST /api/events → Crea Event
 * POST /api/negotiations → Crea Negotiation propuesta
 */
```

**State:**
```typescript
const [type, setType] = useState('dinner')
const [startDate, setStartDate] = useState('')
const [startTime, setStartTime] = useState('')
const [endTime, setEndTime] = useState('')
const [description, setDescription] = useState('')
const [hasChildren, setHasChildren] = useState(true)
const [compensation, setCompensation] = useState('')
const [loading, setLoading] = useState(false)
```

**Computed:**
```typescript
const calculatedPoints = useMemo(() =>
  pointsCalculator.calculate({
    type, duration, hasChildren, compensation
  }), [type, duration, hasChildren, compensation]
)
```

#### `pages/RequestInbox.tsx`
```typescript
/**
 * Ver y Responder Solicitudes Pendientes
 *
 * Funcionalidad:
 * - Lista eventos pendientes
 * - Ver detalles de cada uno
 * - Opción: Aceptar/Rechazar/Ajustar
 * - Si ajusta: entra en negociación
 * - Historial de rondas visible
 */
```

**State:**
```typescript
const [events, setEvents] = useState<Event[]>([])
const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
const [negotiationRound, setNegotiationRound] = useState(1)
const [proposedPoints, setProposedPoints] = useState('')
const [loading, setLoading] = useState(false)
```

#### `services/apiClient.ts`
```typescript
/**
 * Cliente HTTP con Gestión Automática de JWT
 *
 * Características:
 * - Auto-inyecta Authorization header
 * - Maneja errores (401 → logout, otros → toast)
 * - Retry automático en 5xx (3 intentos)
 * - Timeout de 30s
 * - JSON parsing automático
 */

const apiClient = {
  get: async <T>(url: string, options?: RequestInit): Promise<T> => {
    const token = localStorage.getItem('matripuntos_token')
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    // ... manejo de errores, parsing
    return response.json()
  },

  post: async <T>(url: string, body: any, options?: RequestInit): Promise<T> => {
    // ... similar a get, pero con JSON.stringify(body)
  },

  put: async <T>(url: string, body: any, options?: RequestInit): Promise<T> => {
    // ... similar a post
  },

  delete: async <T>(url: string, options?: RequestInit): Promise<T> => {
    // ... similar a get, pero método DELETE
  },
}
```

#### `store/useAppStore.ts`
```typescript
/**
 * Estado Global (Zustand)
 *
 * Almacena:
 * - Autenticación (token, userId)
 * - User actual
 * - Couple data
 * - UI state (loading, error, etc.)
 *
 * Acciones:
 * - setUser(user)
 * - setCouple(couple)
 * - setToken(token)
 * - logout()
 * - loadCurrentUser()
 */

interface AppState {
  // Auth
  token: string | null
  userId: string | null

  // Data
  user: User | null
  couple: Couple | null

  // UI
  loading: boolean
  error: string | null

  // Actions
  setToken: (token: string) => void
  setUser: (user: User) => void
  setCouple: (couple: Couple) => void
  logout: () => void
  loadCurrentUser: () => Promise<void>
  // ...
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  token: localStorage.getItem('matripuntos_token'),
  userId: null,
  user: null,
  couple: null,
  loading: false,
  error: null,

  // Actions
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setCouple: (couple) => set({ couple }),

  logout: () => {
    localStorage.removeItem('matripuntos_token')
    set({ token: null, user: null, couple: null })
  },

  loadCurrentUser: async () => {
    try {
      const user = await apiClient.get<User>('/api/auth/me')
      const couple = await apiClient.get<Couple>('/api/auth/couple')
      set({ user, couple, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  },
  // ...
}))
```

#### `utils/pointsCalculator.ts`
```typescript
/**
 * Motor de Cálculo de Puntos (Lógica Pura, Sin Dependencias)
 *
 * Interfaz:
 * - calculate(params) → puntos
 *
 * Parámetros:
 * - type: 'dinner' | 'travel' | etc.
 * - duration: minutos
 * - hasChildren: boolean
 * - childrenCount: number (sobrescribe hasChildren)
 * - compensation: 'sleep_more' | 'dinner' | etc.
 * - compensationValue: porcentaje (0-30)
 *
 * Retorna:
 * - totalPoints: number (redondeado a 0.5)
 * - breakdown: { base, factorType, factorSlot, factorDuration, factorChildren, ... }
 */

export const pointsCalculator = {
  BASE_POINTS: {
    dinner: 8,
    travel_day: 20,
    travel_weekend: 40,
    // ...
  },

  FACTOR_TYPE: {
    pure_leisure: 1.0,
    work_leisure: 1.1,
    family_obligation: 0.9,
    health_wellness: 0.85,
    urgency_need: 0.8,
  },

  FACTOR_TIME_SLOT: {
    morning: 1.0,
    afternoon: 1.2,
    night: 1.5,
    early_morning: 1.8,
  },

  calculate: function(params) {
    const base = this.BASE_POINTS[params.type]
    const typeMultiplier = this.FACTOR_TYPE[params.typeCategory]
    const slotMultiplier = this.FACTOR_TIME_SLOT[params.timeSlot]
    const durationMultiplier = this.calculateDurationMultiplier(params.duration)
    const childrenMultiplier = this.calculateChildrenMultiplier(params.childrenCount)
    const compensationDiscount = params.compensation ? (1 - params.compensationValue/100) : 1

    const total = base * typeMultiplier * slotMultiplier * durationMultiplier * childrenMultiplier * compensationDiscount

    return {
      totalPoints: this.roundToHalf(total),
      breakdown: {
        base,
        typeMultiplier,
        slotMultiplier,
        durationMultiplier,
        childrenMultiplier,
        compensationDiscount,
      }
    }
  },

  roundToHalf: (num) => Math.round(num * 2) / 2,

  calculateDurationMultiplier: (minutes) => {
    const hours = minutes / 60
    if (hours <= 2) return 1.0
    if (hours <= 4) return 1.05
    if (hours <= 8) return 1.15
    if (hours <= 24) return 1.25
    if (hours <= 48) return 1.30
    return 1.35
  },

  calculateChildrenMultiplier: (count) => {
    const multipliers = { 0: 1.0, 1: 1.4, 2: 1.8, 3: 2.2 }
    return multipliers[Math.min(count, 3)]
  },
}
```

#### `types/index.ts`
```typescript
/**
 * Interfases TypeScript Compartidas
 *
 * Definen estructura de datos:
 * - User
 * - Couple
 * - Event (Actividad puntual)
 * - Task (Tarea recurrente)
 * - TaskLog
 * - Negotiation
 * - PointsTransaction
 * - Configuration
 */

export interface User {
  id: string
  email: string
  name: string
  coupleId: string
  createdAt: Date
  updatedAt: Date
}

export interface Couple {
  id: string
  name: string
  users: User[]
  childrenCount: number
  createdAt: Date
  updatedAt: Date
}

export interface Event {
  id: string
  coupleId: string
  type: 'dinner' | 'travel' | 'sport' | 'urgent' | 'other'
  startDate: Date
  endDate: Date
  description: string
  hasChildren: boolean
  status: 'pending' | 'accepted' | 'rejected' | 'forced'
  createdBy: string
  createdAt: Date
}

export interface Negotiation {
  id: string
  eventId: string
  proposerId: string
  responderId: string
  status: 'pending' | 'accepted' | 'rejected' | 'forced'
  proposedPoints: number
  agreedPoints: number | null
  currentRound: number
  maxRounds: number
  rounds: NegotiationRound[]
  createdAt: Date
}

// ... más interfaces
```

### 1.3 Rutas (React Router)

```typescript
// App.tsx
export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/request-activity" element={
          <ProtectedRoute>
            <RequestActivity />
          </ProtectedRoute>
        } />
        <Route path="/request-inbox" element={
          <ProtectedRoute>
            <RequestInbox />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

// ProtectedRoute.tsx
const ProtectedRoute = ({ children }) => {
  const { token } = useAppStore()
  if (!token) return <Navigate to="/login" />
  return children
}
```

### 1.4 Estilos (Tailwind CSS)

```typescript
// Configuración en vite.config.ts
import tailwindcss from 'tailwindcss'

export default {
  css: {
    postcss: {
      plugins: [tailwindcss],
    }
  }
}

// Clases utilizadas:
// - flex, grid, gap, padding, margin → spacing
// - text-lg, text-center → tipografía
// - bg-blue-600, text-red-500 → colores
// - rounded-lg, shadow-md → bordes/sombras
// - hover:bg-blue-700, focus:outline → estados
// - md:flex, lg:grid → responsive
```

---

## PARTE 2: ESTRUCTURA BACKEND

### 2.1 Árbol de Directorios

```
src/backend/
├── src/
│   ├── server.ts                 # 🚀 Express app + setup
│   ├── middleware/
│   │   ├── authMiddleware.ts     # 🔐 Verifica JWT
│   │   ├── errorHandler.ts       # ⚠️ Manejo global de errores
│   │   └── cors.ts               # 🌐 CORS config
│   │
│   ├── routes/
│   │   ├── authRoutes.ts         # POST /signup, /login, GET /me, /couple
│   │   ├── eventRoutes.ts        # CRUD /events
│   │   ├── taskRoutes.ts         # CRUD /tasks + logging
│   │   └── negotiationRoutes.ts  # POST /propose, PUT /respond, /force
│   │
│   ├── services/
│   │   ├── authService.ts        # signup, login, password hash
│   │   ├── eventService.ts       # Event logic
│   │   ├── taskService.ts        # Task logic
│   │   ├── negotiationService.ts # Negotiation logic
│   │   ├── pointsService.ts      # Cálculo + transacciones
│   │   └── notificationService.ts # (Futuro) Notificaciones
│   │
│   ├── schemas/
│   │   ├── authSchemas.ts        # Zod schemas para auth
│   │   ├── eventSchemas.ts       # Zod schemas para events
│   │   ├── taskSchemas.ts        # Zod schemas para tasks
│   │   └── negotiationSchemas.ts # Zod schemas para negotiations
│   │
│   ├── utils/
│   │   ├── jwt.ts                # sign/verify JWT
│   │   ├── passwordHash.ts       # bcrypt hash/compare
│   │   └── errorTypes.ts         # Custom errors
│   │
│   └── types/
│       └── index.ts              # Request/Response types
│
├── prisma/
│   ├── schema.prisma             # 📊 Esquema BD (Prisma ORM)
│   ├── migrations/               # 🔄 Historial de cambios BD
│   └── dev.db                    # 💾 SQLite local (no commitear)
│
├── package.json                  # Dependencias
├── tsconfig.json                 # Config TypeScript
├── .env                          # Variables de entorno
└── dist/                         # Código compilado (generado)
```

### 2.2 Descripción de Archivos Clave

#### `server.ts`
```typescript
/**
 * Configuración Principal de Express
 *
 * Inicia:
 * 1. Express app
 * 2. Middleware (CORS, JSON parser, auth)
 * 3. Rutas (auth, events, tasks, negotiations)
 * 4. Error handler
 * 5. Listener en puerto 3000
 */

import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import eventRoutes from './routes/eventRoutes'
import taskRoutes from './routes/taskRoutes'
import negotiationRoutes from './routes/negotiationRoutes'

const app = express()

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Rutas
app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/negotiations', negotiationRoutes)

// Error handler global
app.use(errorHandler)

// Iniciar
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Matripuntos backend running on http://localhost:${PORT}`)
})

export default app
```

#### `middleware/authMiddleware.ts`
```typescript
/**
 * Verifica JWT en cada request protegido
 *
 * Extrae token del header Authorization: Bearer <token>
 * Verifica firma y expiración
 * Si válido: agrega user al request
 * Si inválido: retorna 401
 */

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    coupleId: string
    email: string
  }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded as any
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

#### `routes/authRoutes.ts`
```typescript
/**
 * POST /api/auth/signup - Crear pareja
 * POST /api/auth/login - Login usuario
 * GET /api/auth/me - Obtener usuario actual
 * GET /api/auth/couple - Obtener datos pareja
 */

import express from 'express'
import { authService } from '../services/authService'
import { authMiddleware } from '../middleware/authMiddleware'
import { signupSchema, loginSchema } from '../schemas/authSchemas'

const router = express.Router()

router.post('/signup', async (req, res) => {
  try {
    // Validar con Zod
    const data = signupSchema.parse(req.body)

    // Crear pareja
    const result = await authService.signup(data)

    res.status(201).json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)
    const result = await authService.login(data)
    res.json(result)
  } catch (error) {
    // ...
  }
})

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { couple: { include: { users: true } } },
    })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/couple', authMiddleware, async (req, res) => {
  try {
    const couple = await prisma.couple.findUnique({
      where: { id: req.user!.coupleId },
      include: { users: true, configuration: true },
    })
    res.json(couple)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
```

#### `routes/eventRoutes.ts`
```typescript
/**
 * POST /api/events - Crear evento + negociación
 * GET /api/events - Listar eventos
 * GET /api/events/:id - Obtener detalle
 * PUT /api/events/:id - Actualizar (solo owner)
 * DELETE /api/events/:id - Eliminar draft
 */

router.post('/', authMiddleware, async (req, res) => {
  try {
    const eventData = createEventSchema.parse(req.body)

    // Crear Event
    const event = await prisma.event.create({
      data: {
        coupleId: req.user!.coupleId,
        createdBy: req.user!.userId,
        type: eventData.type,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        description: eventData.description,
        hasChildren: eventData.hasChildren,
        status: 'pending',
      },
    })

    // Crear Negotiation (propuesta inicial)
    const negotiation = await prisma.negotiation.create({
      data: {
        eventId: event.id,
        proposerId: req.user!.userId,
        responderId: req.user!.coupleId === req.user!.userId
          ? /* get partner */
          : /* ... */,
        proposedPoints: eventData.proposedPoints,
        currentRound: 1,
        maxRounds: 2, // FREE_TIER
      },
    })

    res.status(201).json({ event, negotiation })
  } catch (error) {
    // ...
  }
})

router.get('/', authMiddleware, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { coupleId: req.user!.coupleId },
      include: { negotiations: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(events)
  } catch (error) {
    // ...
  }
})

// ... más endpoints GET /:id, PUT, DELETE
```

#### `routes/negotiationRoutes.ts`
```typescript
/**
 * POST /api/negotiations - Proponer (iniciar negociación)
 * PUT /api/negotiations/:id/respond - Responder (aceptar/rechazar/contra)
 * GET /api/negotiations/event/:eventId - Historial
 * POST /api/negotiations/:id/force - Fuerza con matripuntos
 */

router.post('/', authMiddleware, async (req, res) => {
  // Crear propuesta inicial de negociación
})

router.put('/:id/respond', authMiddleware, async (req, res) => {
  // Responder: aceptar, rechazar, o contra-proponer
  const { action, proposedPoints, comment } = req.body

  const negotiation = await prisma.negotiation.findUnique({
    where: { id: req.params.id },
  })

  if (action === 'accept') {
    // Aceptar → crear transaction, marcar event como accepted
  } else if (action === 'counter') {
    // Contra-proponer → crear round, incrementar currentRound
    // Si currentRound > maxRounds → premium check
  } else if (action === 'reject') {
    // Rechazar → marcar negotiation como rejected
  }
})

router.post('/:id/force', authMiddleware, async (req, res) => {
  // Fuerza usando matripuntos acumulados
  const negotiation = await prisma.negotiation.findUnique({
    where: { id: req.params.id },
  })

  // Verificar saldo del usuario
  const balance = await pointsService.calculateBalance(req.user!.userId)

  if (balance >= negotiation.proposedPoints) {
    // Crear transaction negativa, marcar como forced
    // Usuario pierde sus puntos acumulados
  } else {
    return res.status(400).json({ error: 'Insufficient matripuntos' })
  }
})
```

#### `services/authService.ts`
```typescript
/**
 * Lógica de Autenticación
 *
 * Métodos:
 * - signup(data) → crea pareja + usuarios
 * - login(data) → verifica credenciales + genera JWT
 * - hashPassword(pwd) → bcrypt
 * - verifyPassword(pwd, hash) → bcrypt compare
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const authService = {
  signup: async (data: SignupData) => {
    // Verificar emails únicos
    const existing1 = await prisma.user.findUnique({
      where: { email: data.email1 },
    })
    if (existing1) throw new Error('Email 1 already registered')

    const existing2 = await prisma.user.findUnique({
      where: { email: data.email2 },
    })
    if (existing2) throw new Error('Email 2 already registered')

    // Crear pareja
    const couple = await prisma.couple.create({
      data: { name: `${data.name1} & ${data.name2}` },
    })

    // Crear usuarios
    const user1 = await prisma.user.create({
      data: {
        email: data.email1,
        name: data.name1,
        passwordHash: await this.hashPassword(data.password1),
        coupleId: couple.id,
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: data.email2,
        name: data.name2,
        passwordHash: await this.hashPassword(data.password2),
        coupleId: couple.id,
      },
    })

    // Crear configuración default
    await prisma.configuration.create({
      data: {
        coupleId: couple.id,
        childrenCount: data.childrenCount || 0,
      },
    })

    // Generar token para user1
    const token = this.generateToken(user1)

    return {
      couple: { ...couple, users: [user1, user2] },
      token,
      user: user1,
    }
  },

  login: async (data: LoginData) => {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { couple: { include: { users: true } } },
    })

    if (!user) throw new Error('User not found')
    if (!await this.verifyPassword(data.password, user.passwordHash)) {
      throw new Error('Invalid password')
    }

    const token = this.generateToken(user)

    return {
      token,
      user,
      couple: user.couple,
    }
  },

  hashPassword: async (password: string) => {
    return bcrypt.hash(password, 10)
  },

  verifyPassword: async (password: string, hash: string) => {
    return bcrypt.compare(password, hash)
  },

  generateToken: (user: User) => {
    return jwt.sign(
      {
        userId: user.id,
        coupleId: user.coupleId,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
  },
}
```

#### `schemas/authSchemas.ts`
```typescript
/**
 * Validación con Zod
 *
 * Asegura que los datos enviados tienen estructura correcta
 */

import { z } from 'zod'

export const signupSchema = z.object({
  email1: z.string().email(),
  password1: z.string().min(8).regex(/[0-9!@#$%^&*]/),
  name1: z.string().min(1).max(50),
  email2: z.string().email(),
  password2: z.string().min(8).regex(/[0-9!@#$%^&*]/),
  name2: z.string().min(1).max(50),
  childrenCount: z.number().min(0).max(10).optional().default(0),
}).refine(
  (data) => data.email1 !== data.email2,
  { message: 'Emails must be different', path: ['email2'] }
)

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const createEventSchema = z.object({
  type: z.enum(['dinner', 'travel', 'sport', 'medical', 'other']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().min(5).max(200),
  hasChildren: z.boolean(),
  proposedPoints: z.number().min(1).max(200),
  compensationId: z.string().uuid().optional(),
})
```

#### `prisma/schema.prisma`
```prisma
// Esquema de la base de datos
// Define todas las tablas, relaciones, índices

datasource db {
  provider = "sqlite"  // o postgresql en producción
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String
  coupleId      String
  couple        Couple   @relation(fields: [coupleId], references: [id])

  eventsCreated Event[]  @relation("createdBy")
  negotiations  Negotiation[] @relation("proposer")
  taskLogs      TaskLog[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([coupleId])
}

model Couple {
  id            String   @id @default(cuid())
  name          String
  users         User[]
  events        Event[]
  tasks         Task[]
  negotiations  Negotiation[]
  configuration Configuration?
  subscriptions Subscription?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Event {
  id            String   @id @default(cuid())
  coupleId      String
  couple        Couple   @relation(fields: [coupleId], references: [id])

  type          String   // 'dinner', 'travel', etc.
  startDate     DateTime
  endDate       DateTime
  description   String   @db.Text
  hasChildren   Boolean
  status        String   @default("pending") // pending, accepted, rejected, forced

  createdBy     String
  creator       User     @relation("createdBy", fields: [createdBy], references: [id])

  negotiations  Negotiation[]
  transactions  PointsTransaction[]
  compensations Compensation[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([coupleId])
  @@index([createdBy])
}

model Negotiation {
  id            String   @id @default(cuid())
  eventId       String
  event         Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)

  proposerId    String
  proposer      User     @relation("proposer", fields: [proposerId], references: [id])

  responderId   String
  responder     User     @relation("responder", fields: [responderId], references: [id])

  status        String   @default("pending") // pending, accepted, rejected, forced
  proposedPoints Float
  agreedPoints  Float?
  currentRound  Int      @default(1)
  maxRounds     Int      @default(2)

  rounds        NegotiationRound[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([eventId])
  @@index([proposerId])
  @@index([responderId])
}

model Task {
  id            String   @id @default(cuid())
  coupleId      String
  couple        Couple   @relation(fields: [coupleId], references: [id])

  name          String
  type          String   // 'cooking', 'cleaning', etc.
  basePoints    Float
  assignedTo    String
  frequency     String   // 'daily', 'weekly', etc.
  status        String   @default("active")

  logs          TaskLog[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([coupleId])
}

model TaskLog {
  id            String   @id @default(cuid())
  taskId        String
  task          Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)

  date          DateTime
  completedBy   String
  user          User     @relation(fields: [completedBy], references: [id])

  status        String   @default("pending_verification")
  pointsAwarded Float?

  createdAt     DateTime @default(now())

  @@unique([taskId, date, completedBy])
  @@index([taskId])
  @@index([completedBy])
}

model PointsTransaction {
  id            String   @id @default(cuid())
  coupleId      String

  fromUserId    String
  toUserId      String
  points        Float

  reason        String   // 'event_accepted', 'task_completed', 'force_used', etc.
  eventId       String?
  event         Event?   @relation(fields: [eventId], references: [id])

  createdAt     DateTime @default(now())

  @@index([fromUserId])
  @@index([toUserId])
  @@index([coupleId])
}

// ... más modelos (Compensation, Configuration, Subscription, etc.)
```

---

## PARTE 3: FLUJOS DE DATOS

### 3.1 Flujo: Crear Actividad

```
FRONTEND (React):
1. Usuario en RequestActivity.tsx completa formulario
2. onClick → handleSubmit()
3. apiClient.post('/api/events', eventData)
4. Token auto-injected en header

BACKEND (Express):
1. POST /api/events recibido
2. authMiddleware verifica JWT → req.user poblado
3. Zod valida schema → error si inválido
4. eventService.create(data) crea Event en BD
5. negotiationService.createProposal() crea Negotiation
6. Retorna 201 {event, negotiation}

FRONTEND:
1. Recibe respuesta
2. useAppStore.setEvents([...])
3. Toast "Solicitud enviada"
4. Redirige a /dashboard
```

### 3.2 Flujo: Responder Solicitud

```
FRONTEND (RequestInbox):
1. Usuario ve Event pendiente
2. Click "AJUSTAR PUNTOS"
3. Propone nuevos puntos
4. apiClient.put('/api/negotiations/:id/respond', {action: 'counter', proposedPoints: 17.5})

BACKEND:
1. PUT /api/negotiations/:id/respond
2. authMiddleware verifica
3. negotiationService.respond()
4. Crea NegotiationRound
5. Incrementa currentRound
6. Si currentRound > maxRounds → retorna indicación de premium/mediación
7. Retorna 200 {negotiation, nextRound}

FRONTEND:
1. Recibe respuesta
2. Muestra historial actualizado
3. Si nextRound > maxRounds → muestra opciones (mediación/premium/fuerza)
```

---

## RESUMEN DE PATRONES

| Patrón | Implementación | Ubicación |
|--------|----------------|-----------|
| Estado Global | Zustand | `store/useAppStore.ts` |
| HTTP Client | Fetch + JWT | `services/apiClient.ts` |
| Routing | React Router v6 | `App.tsx` |
| Validación | Zod | `schemas/*` |
| ORM | Prisma | `prisma/schema.prisma` |
| Autenticación | JWT | `middleware/authMiddleware.ts` |
| Estilos | Tailwind CSS | `styles/globals.css` |
| Lógica Pura | Calculator functions | `utils/pointsCalculator.ts` |
| API REST | Express Router | `routes/*` |
| Tipos | TypeScript interfaces | `types/index.ts` |

---

**Próximo documento: `07_GUIA_DESPLIEGUE_PRODUCCION.md`**

Allí aprenderás a llevar la app a producción.
