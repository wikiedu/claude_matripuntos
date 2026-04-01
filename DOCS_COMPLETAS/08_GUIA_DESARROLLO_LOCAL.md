# 🛠️ GUÍA DE DESARROLLO LOCAL

## Introducción

Esta guía te enseña a trabajar en desarrollo local: setear el ambiente, ejecutar servidores, debuggear, y agregar nuevas features.

---

## PARTE 1: SETUP INICIAL

### 1.1 Requisitos

```bash
# Versiones recomendadas:
- Node.js 18+ (incluye npm)
- Git
- Un editor (VS Code recomendado)
- Postman o cURL (para testing de API)
```

### 1.2 Clonar Repositorio

```bash
# Clonar repo
git clone https://github.com/wikiedu/claude_matripuntos.git
cd claude_matripuntos

# Instalar dependencias (ambos frontend y backend)
npm install
# Esto ejecuta npm install en src/frontend y src/backend automáticamente
# (si tienes root package.json configurado correctamente)

# O manualmente:
cd src/frontend && npm install
cd ../backend && npm install
cd ../..
```

### 1.3 Configurar Variables de Entorno

#### Frontend
```bash
# src/frontend/.env
VITE_API_URL=http://localhost:3000
```

#### Backend
```bash
# src/backend/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret-key-change-in-production"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

---

## PARTE 2: EJECUTAR APLICACIÓN LOCALMENTE

### 2.1 Opción A: Tres Terminales (Recomendado)

```bash
# TERMINAL 1 - Backend
cd src/backend
npm run build     # Compilar TypeScript → JavaScript
npm start         # Iniciar Express en puerto 3000

# Debería mostrar:
# 🚀 Matripuntos backend running on http://localhost:3000
# 📊 Health check: http://localhost:3000/api/health

# TERMINAL 2 - Frontend
cd src/frontend
npm run dev       # Iniciar Vite dev server

# Debería mostrar:
# VITE v5.x.x  ready in 123 ms
# Local: http://localhost:5173/

# TERMINAL 3 - Testing (opcional)
# Usar para ejecutar scripts de prueba, migraciones, etc.
cd src/backend
npx prisma studio  # Ver BD en interfaz visual (http://localhost:5555)
# O:
node DEMO_SCRIPT.js  # Ejecutar script de demostración
```

### 2.2 Opción B: Concurrentemente

```bash
# Instalar concurrently (si no está)
npm install --save-dev concurrently

# En root package.json, agregar:
{
  "scripts": {
    "dev": "concurrently \"cd src/frontend && npm run dev\" \"cd src/backend && npm run build && npm start\""
  }
}

# Luego:
npm run dev
# Ambos servidores se inician en paralelo
```

### 2.3 Verificar Conexión

```bash
# En el navegador:
# 1. Ir a http://localhost:5173
# 2. Debería ver pantalla de login
# 3. Intentar signup

# En otra terminal:
# Probar health check del backend
curl http://localhost:3000/api/health

# Debería retornar:
# {"status":"ok","timestamp":"2026-04-02T10:30:00Z"}
```

---

## PARTE 3: DEBUGGEAR

### 3.1 Frontend Debugging

```bash
# DevTools del Navegador (F12 en Chrome)

# 1. Console:
#    - Ver console.log() de la app
#    - Errores en rojo
#    - Warnings en naranja

# 2. Network:
#    - Ver todas las llamadas HTTP
#    - Ver headers, body, response
#    - Filtrar por "fetch" o URL específica

# 3. Application:
#    - Ver localStorage
#    - Buscar "matripuntos_token" para verificar JWT almacenado
#    - Ver cookies (si las hay)

# 4. Elements/Inspector:
#    - Ver DOM
#    - Inspeccionar estilos Tailwind
#    - Ver props React

# 5. Zustand DevTools (si instalado):
#    - Ver state global
#    - Ver acciones
#    - Ver historial de cambios
```

### 3.2 Backend Debugging

```bash
# Logs en terminal

# Ejecutar con NODE_DEBUG (ver detalles internos)
NODE_DEBUG=* npm start
# Muy verbose, solo para debugging profundo

# Mejor: agregar console.log() en el código
export const authService = {
  signup: async (data) => {
    console.log('📝 Signup attempt:', { email1: data.email1, email2: data.email2 })
    try {
      const couple = await prisma.couple.create(...)
      console.log('✅ Couple created:', couple.id)
      return result
    } catch (error) {
      console.error('❌ Signup error:', error.message)
      throw error
    }
  }
}

# Luego en la terminal del backend verás los logs en tiempo real
```

### 3.3 Database Debugging

```bash
# Opción A: Prisma Studio (Visual)
cd src/backend
npx prisma studio
# Abre http://localhost:5555
# Puedes ver, crear, editar, eliminar registros visualmente

# Opción B: CLI directo
npx prisma db execute --stdin
# Luego escribir SQL:
# SELECT * FROM "User";
# SELECT * FROM "Event" WHERE couple_id = 'xyz';

# Opción C: Ver el archivo SQLite
sqlite3 src/backend/prisma/dev.db
# sqlite> .tables (listar tablas)
# sqlite> SELECT * FROM User;
# sqlite> .exit (salir)
```

### 3.4 TypeScript Type Checking

```bash
# Verificar que no hay errores de tipos
cd src/frontend
npm run type-check

cd ../backend
npm run type-check

# Si hay errores, mostrarán:
# src/pages/Dashboard.tsx:45:23
# Property 'balance' does not exist on type 'Event'
```

---

## PARTE 4: ACTUALIZAR BASE DE DATOS

### 4.1 Crear Nueva Tabla

```typescript
// src/backend/prisma/schema.prisma

// Agregar nuevo modelo
model AuditLog {
  id        String   @id @default(cuid())
  coupleId  String
  couple    Couple   @relation(fields: [coupleId], references: [id])

  action    String   // 'event_created', 'task_completed', etc.
  details   String   @db.Json  // Datos del evento
  userId    String

  createdAt DateTime @default(now())

  @@index([coupleId])
  @@index([createdAt])
}

// En Couple model, agregar:
model Couple {
  // ... fields existentes
  auditLogs AuditLog[]
}
```

### 4.2 Crear Migración

```bash
cd src/backend

# Generar migración
npx prisma migrate dev --name add_audit_logs
# Prisma detecta cambios en schema.prisma
# Crea archivo en prisma/migrations/
# Auto-ejecuta migración en dev.db

# Si hay conflicto, resolver y reintentar
npx prisma migrate resolve --rolled-back add_audit_logs
npx prisma migrate dev --name add_audit_logs
```

### 4.3 Revertir Cambios

```bash
# Si cometes error, hay 3 opciones:

# Opción 1: Limpiar BD (borrar todo)
rm src/backend/prisma/dev.db
npx prisma migrate dev --name init
# Esto reinicia la BD desde cero

# Opción 2: Reset + seed
npx prisma migrate reset
# Pregunta confirmación, luego borra y recrea todo

# Opción 3: Manualmente
# Ver prisma/migrations/ y entender qué se hizo
# Crear nueva migración que invierta los cambios
```

---

## PARTE 5: AGREGAR NUEVA FEATURE

### Ejemplo: Agregar "Comentarios en Negociaciones"

### 5.1 Actualizar Esquema (BD)

```typescript
// src/backend/prisma/schema.prisma

model Negotiation {
  // ... campos existentes

  // Agregar:
  notes       String?         // Notas generales
  comments    NegotiationComment[]
}

// Nuevo modelo
model NegotiationComment {
  id            String   @id @default(cuid())
  negotiationId String
  negotiation   Negotiation @relation(fields: [negotiationId], references: [id], onDelete: Cascade)

  authorId      String
  author        User     @relation(fields: [authorId], references: [id])

  content       String   @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([negotiationId])
  @@index([authorId])
}

// En User model, agregar:
model User {
  // ... existing
  comments NegotiationComment[]
}
```

### 5.2 Migrar BD

```bash
cd src/backend
npx prisma migrate dev --name add_negotiation_comments
```

### 5.3 Crear API Endpoint

```typescript
// src/backend/src/routes/negotiationRoutes.ts

// Agregar:
router.post('/:negotiationId/comments', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' })
    }

    const comment = await prisma.negotiationComment.create({
      data: {
        negotiationId: req.params.negotiationId,
        authorId: req.user!.userId,
        content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    res.status(201).json(comment)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' })
  }
})

router.get('/:negotiationId/comments', authMiddleware, async (req, res) => {
  try {
    const comments = await prisma.negotiationComment.findMany({
      where: { negotiationId: req.params.negotiationId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(comments)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})
```

### 5.4 Crear Zod Schema

```typescript
// src/backend/src/schemas/negotiationSchemas.ts

export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment too long')
})
```

### 5.5 Actualizar Frontend

```typescript
// src/frontend/src/types/index.ts

export interface NegotiationComment {
  id: string
  negotiationId: string
  authorId: string
  author: { id: string; name: string }
  content: string
  createdAt: Date
}

// En Negotiation interface, agregar:
export interface Negotiation {
  // ... existing
  comments?: NegotiationComment[]
}
```

### 5.6 Crear Componente React

```typescript
// src/frontend/src/components/NegotiationComments.tsx

export const NegotiationComments = ({ negotiationId }: { negotiationId: string }) => {
  const [comments, setComments] = useState<NegotiationComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAppStore()

  useEffect(() => {
    fetchComments()
  }, [negotiationId])

  const fetchComments = async () => {
    try {
      const data = await apiClient.get<NegotiationComment[]>(
        `/api/negotiations/${negotiationId}/comments`
      )
      setComments(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const comment = await apiClient.post<NegotiationComment>(
        `/api/negotiations/${negotiationId}/comments`,
        { content: newComment }
      )
      setComments([...comments, comment])
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Comentarios</h3

      {comments.map(comment => (
        <div key={comment.id} className="bg-gray-50 p-3 rounded">
          <p className="text-sm font-medium">{comment.author.name}</p>
          <p className="text-sm text-gray-600">{comment.content}</p>
          <p className="text-xs text-gray-400 mt-1">{new Date(comment.createdAt).toLocaleString()}</p>
        </div>
      ))}

      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Agregar comentario..."
          className="flex-1 p-2 border rounded"
          rows={3}
        />
        <button
          onClick={handleAddComment}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
```

### 5.7 Integrar en Página

```typescript
// src/frontend/src/pages/RequestInbox.tsx

// En el componente, donde mostramos la negociación:
<div>
  {/* ... detalles de evento y negociación ... */}

  <NegotiationComments negotiationId={negotiation.id} />

  {/* ... botones de respuesta ... */}
</div>
```

### 5.8 Testear

```bash
# Terminal 1 - Backend
cd src/backend
npm run build && npm start

# Terminal 2 - Frontend
cd src/frontend
npm run dev

# Terminal 3 - Navegador
# 1. Ir a http://localhost:5173
# 2. Login
# 3. Navegar a negociación
# 4. Ver sección de comentarios
# 5. Agregar comentario
# 6. Verificar que aparece en Prisma Studio (http://localhost:5555)
```

---

## PARTE 6: GIT WORKFLOW

### 6.1 Crear Rama para Feature

```bash
# Crear y cambiar a rama nueva
git checkout -b feature/negotiation-comments

# O (git modern):
git switch -c feature/negotiation-comments
```

### 6.2 Hacer Cambios y Commits

```bash
# Ver cambios
git status

# Stage cambios específicos
git add src/backend/src/routes/negotiationRoutes.ts
git add src/frontend/src/components/NegotiationComments.tsx
git add src/backend/prisma/schema.prisma

# O todos
git add .

# Commit con mensaje descriptivo
git commit -m "feat: Add comments to negotiations

- Create NegotiationComment model in Prisma
- Add POST/GET endpoints for comments
- Create React component for displaying comments
- Update types and schemas"

# Otro commit (si necesario)
git commit -m "fix: Validate comment length before submission"
```

### 6.3 Push y Pull Request

```bash
# Push a GitHub
git push origin feature/negotiation-comments

# Ir a GitHub
# Click "Create Pull Request"
# Escribir descripción:
# "## Feature
# Adds ability to comment on negotiations
#
# ## Changes
# - Negotiation model extended with comments
# - New endpoints: POST/GET /negotiation/:id/comments
# - React component for display and input
#
# ## Testing
# - Tested locally with Prisma Studio
# - Verified API endpoints with cURL"

# Esperar review (o self-merge si trabajas solo)
git merge --squash feature/negotiation-comments
git checkout main
git merge feature/negotiation-comments
```

---

## PARTE 7: TESTING

### 7.1 Unit Testing Backend

```bash
# Instalar Jest (si no está)
npm install --save-dev jest @types/jest ts-jest

# src/backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
}

# src/backend/src/__tests__/authService.test.ts
describe('authService', () => {
  test('signup creates couple and users', async () => {
    const result = await authService.signup({
      email1: 'test1@example.com',
      password1: 'SecurePass123!',
      name1: 'Alice',
      email2: 'test2@example.com',
      password2: 'SecurePass123!',
      name2: 'Bob',
    })

    expect(result.couple).toBeDefined()
    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('test1@example.com')
  })
})

# Ejecutar
npm test
```

### 7.2 Testing API Endpoint (cURL)

```bash
# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email1": "alice@test.com",
    "password1": "SecurePass123!",
    "name1": "Alice",
    "email2": "bob@test.com",
    "password2": "SecurePass123!",
    "name2": "Bob",
    "childrenCount": 2
  }'

# Debería retornar token
# Copiar el token y usarlo en próximos requests

TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Test protected endpoint
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## PARTE 8: PERFORMANCE

### 8.1 Frontend

```bash
# Audit de performance
npm run build
npx lighthouse http://localhost:5173

# Debería mostrar puntuaciones de:
# - Performance: >90
# - Accessibility: >90
# - Best Practices: >90
# - SEO: >90
```

### 8.2 Backend

```bash
# Medir tiempo de respuesta
time curl http://localhost:3000/api/events
# Debería ser <200ms

# Si lento, analizar:
# 1. Ver logs del backend (qué queries toman tiempo)
# 2. Agregar índices en BD:
#    CREATE INDEX idx_events_couple_created ON events(couple_id, created_at DESC);
# 3. Implementar caching en endpoints frecuentes
```

---

## RESUMEN DE COMANDOS ÚTILES

```bash
# Desarrollo
npm install                    # Instalar dependencias
npm run dev                    # Iniciar ambos servidores
npm run build                  # Compilar TS → JS
npm start                      # Iniciar servidor compilado

# Database
npx prisma studio            # Editor visual de BD
npx prisma migrate dev        # Crear y ejecutar migración
npx prisma migrate reset      # Limpiar BD y rehacer

# Testing
npm test                       # Ejecutar tests
npm run test:watch            # Modo watch
npx lighthouse <url>          # Audit performance

# Git
git status                     # Ver cambios
git add <file>                # Stage archivo
git commit -m "msg"           # Crear commit
git push origin <branch>      # Push a GitHub
git pull origin main          # Traer cambios remotos

# Debugging
npm run type-check            # Verificar tipos TS
curl http://localhost:3000    # Probar endpoint
NODE_DEBUG=* npm start        # Debug verbose
```

---

**Próximo documento: `09_REFERENCIA_API.md`**

Allí encontrarás todos los endpoints con ejemplos.
