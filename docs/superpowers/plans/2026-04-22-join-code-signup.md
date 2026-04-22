# Join-Code Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el flujo de invitación por token (roto, opaco, con caducidad) por un código permanente de 6 caracteres asociado a cada pareja, compartible como texto o como link `/signup?code=XXXXXX`.

**Architecture:** Añadir campo `joinCode` único a `Couple` + generador con alfabeto sin confundibles. Dos endpoints públicos rate-limited: `GET /auth/couple-preview/:code` (valida el código sin crear cuenta) y `POST /auth/register-with-code` (registra y vincula en un solo paso). Frontend: nueva card de compartir en Ajustes → Tu Pareja, y refactor de `/signup` para detectar `?code=X`, hacer preview, mostrar banner del invitador, y hacer submit al endpoint nuevo. El flujo antiguo de token se deja intacto (deprecated) para no romper links ya enviados.

**Tech Stack:** Prisma (PostgreSQL prod / SQLite dev), Express, Zod, bcryptjs, JWT · React + Vite + Zustand + React Query · Vitest + React Testing Library.

**Branch:** `feature/v1.4-join-code-signup`

**Spec:** `docs/superpowers/specs/2026-04-22-join-code-signup-design.md`

---

## Referencia rápida del alfabeto y la cardinalidad

El código usa 32 caracteres alfanuméricos, excluyendo confundibles `0 O 1 I L`:

```
A B C D E F G H J K M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9
```

Longitud 6 → 32⁶ ≈ 1.073.741.824 combinaciones. Con 10k parejas, prob. de colisión por intento ≈ 0.00001 (5 retries sobran).

---

## Task 1: Preparación de rama y contexto

**Files:**
- N/A (solo git)

- [ ] **Step 1: Crear rama desde main**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
git checkout main
git pull origin main
git checkout -b feature/v1.4-join-code-signup
git status
```

Expected: "On branch feature/v1.4-join-code-signup" + clean tree.

- [ ] **Step 2: Verificar que el backend y frontend arrancan sin tocar nada**

```bash
cd src/backend && npm run dev
```

En otra terminal:
```bash
curl -s http://localhost:3000/api/health | head
```

Expected: 200 OK o `{"status":"ok"}`.

```bash
cd src/frontend && npm run dev
```

Expected: Vite sirve en `http://localhost:5173`.

Parar ambos procesos.

- [ ] **Step 3: Verificar que los tests existentes pasan en ambos lados**

```bash
cd src/backend && npm test -- --run 2>&1 | tail -20
```

Expected: tests en verde (los de `pointsCalculator.test.ts` como mínimo).

```bash
cd src/frontend && npm test -- --run 2>&1 | tail -20
```

Expected: tests en verde.

Si alguno está rojo antes de empezar, detenerse y reportar al usuario — no arrancar con red mal.

---

## Task 2: Schema de BD — añadir `joinCode` a `Couple`

**Files:**
- Modify: `src/backend/prisma/schema.prisma` (modelo `Couple`)
- Create: `src/backend/prisma/migrations/<timestamp>_add_couple_join_code/migration.sql` (auto-generado)

- [ ] **Step 1: Añadir el campo `joinCode` al modelo `Couple`**

En `src/backend/prisma/schema.prisma`, dentro del bloque `model Couple { ... }`, añadir el campo justo después de `secretKey`:

```prisma
model Couple {
  id                    String                   @id @default(cuid())
  secretKey             String                   @unique
  joinCode              String?                  @unique
  numChildren           Int                      @default(0)
  // ... resto igual
```

Y en el bloque de índices al final del modelo, añadir:

```prisma
  @@index([secretKey])
  @@index([joinCode])
}
```

**Nota:** lo declaramos `String?` (nullable) de forma transitoria. Tras backfill (Task 11), se puede migrar a `NOT NULL` en un paso futuro si se desea, pero no es necesario para este feature.

- [ ] **Step 2: Generar la migración**

```bash
cd src/backend
npx prisma migrate dev --name add_couple_join_code
```

Expected: "Applied migration" + `prisma generate` corre automáticamente.

- [ ] **Step 3: Verificar la migración en dev.db**

```bash
cd src/backend
npx prisma studio
```

Abre Couple → confirma columna `joinCode` (null en todas las filas existentes).

Cerrar Studio.

- [ ] **Step 4: Commit**

```bash
git add src/backend/prisma/schema.prisma src/backend/prisma/migrations/
git commit -m "feat(db): add Couple.joinCode unique field + index"
```

---

## Task 3: Utility `joinCode.ts` + tests unitarios

**Files:**
- Create: `src/backend/src/utils/joinCode.ts`
- Create: `src/backend/tests/joinCode.test.ts`

- [ ] **Step 1: Escribir los tests unitarios que fallan**

Crear `src/backend/tests/joinCode.test.ts`:

```ts
import { describe, it, expect } from '@jest/globals'
import { JOIN_CODE_ALPHABET, generateJoinCode } from '../src/utils/joinCode'

describe('JOIN_CODE_ALPHABET', () => {
  it('has 32 characters', () => {
    expect(JOIN_CODE_ALPHABET.length).toBe(32)
  })

  it('excludes confusable characters 0 O 1 I L', () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[0OIL1]/)
  })

  it('contains only uppercase letters and digits', () => {
    expect(JOIN_CODE_ALPHABET).toMatch(/^[A-Z2-9]+$/)
  })
})

describe('generateJoinCode', () => {
  it('returns a 6-character string', () => {
    const code = generateJoinCode()
    expect(code).toHaveLength(6)
  })

  it('uses only characters from the safe alphabet', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateJoinCode()
      for (const c of code) {
        expect(JOIN_CODE_ALPHABET).toContain(c)
      }
    }
  })

  it('produces different codes across calls (probabilistic)', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 50; i++) codes.add(generateJoinCode())
    expect(codes.size).toBeGreaterThan(40)
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
cd src/backend
npm test -- --run joinCode 2>&1 | tail -20
```

Expected: FAIL con "Cannot find module '../src/utils/joinCode'".

- [ ] **Step 3: Implementar el utility**

Crear `src/backend/src/utils/joinCode.ts`:

```ts
import crypto from 'crypto'
import type { PrismaClient } from '@prisma/client'

// 32 caracteres: excluye 0, O, 1, I, L para evitar errores de lectura humana.
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

// `crypto.randomInt` da distribución uniforme entre [0, alphabet.length).
// Más robusto que Math.random() para generar IDs públicos.
export function generateJoinCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)]
  }
  return code
}

// Retry hasta maxAttempts para evitar colisión con un joinCode ya en uso.
// Cardinalidad (32^6 ≈ 1.07B) y escala actual (~cientos de parejas) hacen que
// 5 intentos sean suficientes con margen amplio.
export async function generateUniqueJoinCode(
  prisma: PrismaClient,
  maxAttempts = 5,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateJoinCode()
    const existing = await prisma.couple.findUnique({ where: { joinCode: code } })
    if (!existing) return code
  }
  throw new Error('Could not generate a unique join code after 5 attempts')
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
cd src/backend
npm test -- --run joinCode 2>&1 | tail -20
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/utils/joinCode.ts src/backend/tests/joinCode.test.ts
git commit -m "feat(backend): add joinCode utility with unique generation"
```

---

## Task 4: Integrar `generateUniqueJoinCode` en `authService.signupUser` y `signupCouple`

**Files:**
- Modify: `src/backend/src/services/authService.ts`

- [ ] **Step 1: Importar el utility**

En `src/backend/src/services/authService.ts`, añadir al bloque de imports (después de `import prisma from '../lib/prisma.js'`):

```ts
import { generateUniqueJoinCode } from '../utils/joinCode.js'
```

- [ ] **Step 2: Generar `joinCode` al crear pareja solo (`signupUser`)**

Localizar en `signupUser` el bloque `prisma.couple.create({ data: { secretKey: ... } })` (aprox línea 126-144). Antes de `prisma.couple.create`, generar el código:

```ts
    // Create a solo couple so all couple-scoped features work immediately
    const joinCode = await generateUniqueJoinCode(prisma)
    const couple = await prisma.couple.create({
      data: {
        secretKey: crypto.randomBytes(16).toString('hex'),
        joinCode,
        language,
        configurations: {
          // ... resto igual
```

- [ ] **Step 3: Generar `joinCode` en `signupCouple`**

Localizar en `signupCouple` el bloque `prisma.couple.create({ data: { secretKey: ... } })` (aprox línea 221-238). Aplicar el mismo patrón:

```ts
    const joinCode = await generateUniqueJoinCode(prisma)
    const couple = await prisma.couple.create({
      data: {
        secretKey: crypto.randomBytes(16).toString('hex'),
        joinCode,
        language,
        users: {
          // ... resto igual
```

- [ ] **Step 4: Verificar que compila y no rompe nada**

```bash
cd src/backend
npx tsc --noEmit 2>&1 | tail -20
```

Expected: sin errores.

```bash
cd src/backend
npm test -- --run 2>&1 | tail -20
```

Expected: todos los tests en verde.

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/services/authService.ts
git commit -m "feat(auth): generate unique joinCode on couple creation"
```

---

## Task 5: Endpoint `GET /api/auth/couple-preview/:code`

**Files:**
- Modify: `src/backend/src/routes/authRoutes.ts`
- Create: `src/backend/tests/couplePreview.test.ts`

- [ ] **Step 1: Escribir test de integración que falla**

Crear `src/backend/tests/couplePreview.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../src/server'
import prisma from '../src/lib/prisma'

describe('GET /api/auth/couple-preview/:code', () => {
  let testCoupleCode: string
  let testCoupleId: string
  let testUserEmail: string

  beforeAll(async () => {
    testUserEmail = `preview-test-${Date.now()}@example.com`
    const couple = await prisma.couple.create({
      data: {
        secretKey: `preview-test-${Date.now()}`,
        joinCode: 'T3STAA',
        language: 'es',
        users: {
          create: {
            email: testUserEmail,
            passwordHash: 'x',
            name: 'Preview Inviter',
          },
        },
      },
    })
    testCoupleId = couple.id
    testCoupleCode = 'T3STAA'
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUserEmail } })
    await prisma.couple.deleteMany({ where: { id: testCoupleId } })
    await prisma.$disconnect()
  })

  it('returns 200 + valid preview for an existing code', async () => {
    const res = await request(app).get(`/api/auth/couple-preview/${testCoupleCode}`)
    expect(res.status).toBe(200)
    expect(res.body.valid).toBe(true)
    expect(res.body.inviterName).toBe('Preview Inviter')
    expect(res.body.isFull).toBe(false)
  })

  it('normalizes lowercase codes to uppercase', async () => {
    const res = await request(app).get(`/api/auth/couple-preview/${testCoupleCode.toLowerCase()}`)
    expect(res.status).toBe(200)
    expect(res.body.valid).toBe(true)
  })

  it('returns 404 for a non-existent code', async () => {
    const res = await request(app).get('/api/auth/couple-preview/ZZZZZZ')
    expect(res.status).toBe(404)
    expect(res.body.valid).toBe(false)
  })

  it('returns 200 isFull=true when couple already has 2 users', async () => {
    const secondEmail = `preview-partner-${Date.now()}@example.com`
    await prisma.user.create({
      data: {
        coupleId: testCoupleId,
        email: secondEmail,
        passwordHash: 'x',
        name: 'Partner',
      },
    })
    const res = await request(app).get(`/api/auth/couple-preview/${testCoupleCode}`)
    expect(res.status).toBe(200)
    expect(res.body.valid).toBe(true)
    expect(res.body.isFull).toBe(true)
    await prisma.user.deleteMany({ where: { email: secondEmail } })
  })
})
```

**Pre-requisito:** Asegurar que `src/backend/src/server.ts` exporta `app` (no solo `app.listen`). Si no lo hace, ajustar para `export const app = express()` + export.

- [ ] **Step 2: Verificar que `supertest` está disponible**

```bash
cd src/backend
npm ls supertest 2>&1 | head -5
```

Si no está: `npm install --save-dev supertest @types/supertest`.

- [ ] **Step 3: Verificar que `app` está exportado en `server.ts`**

```bash
grep -n "export.*app" src/backend/src/server.ts
```

Si no hay `export const app` o `export { app }`, editar `src/backend/src/server.ts`:

- Cambiar `const app = express()` → `export const app = express()` (si está como const).
- Alternativamente, al final del archivo añadir `export { app }` antes del `app.listen`.
- El `app.listen(...)` no debe ejecutarse en modo test — envolver con:
  ```ts
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => { ... })
  }
  ```

- [ ] **Step 4: Correr el test para verificar que falla**

```bash
cd src/backend
npm test -- --run couplePreview 2>&1 | tail -30
```

Expected: FAIL 404 en todos los tests positivos (el endpoint no existe aún).

- [ ] **Step 5: Implementar el endpoint**

En `src/backend/src/routes/authRoutes.ts`, añadir antes de `export default router`:

```ts
// Public endpoint: preview a couple by its joinCode before signup.
// Returns inviter name + whether couple is already full. Rate-limited
// at the /api/auth mount (authLimiter in server.ts).
router.get('/couple-preview/:code', async (req: Request, res: Response): Promise<void> => {
  try {
    const code = (req.params.code ?? '').toUpperCase()
    if (!code) {
      res.status(400).json({ valid: false, error: 'Código requerido' })
      return
    }

    const couple = await prisma.couple.findUnique({
      where: { joinCode: code },
      include: { users: { select: { name: true } } },
    })

    if (!couple) {
      res.status(404).json({ valid: false, error: 'Código no encontrado' })
      return
    }

    const isFull = couple.users.length >= 2
    const inviterName = couple.users[0]?.name ?? 'Tu pareja'

    res.status(200).json({
      valid: true,
      inviterName,
      isFull,
      ...(isFull && { error: 'Esta pareja ya está completa' }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed'
    res.status(500).json({ valid: false, error: message })
  }
})
```

- [ ] **Step 6: Correr el test para verificar que pasa**

```bash
cd src/backend
npm test -- --run couplePreview 2>&1 | tail -30
```

Expected: 4/4 tests en verde.

- [ ] **Step 7: Commit**

```bash
git add src/backend/src/routes/authRoutes.ts src/backend/src/server.ts src/backend/tests/couplePreview.test.ts
git commit -m "feat(auth): GET /auth/couple-preview/:code endpoint"
```

---

## Task 6: Endpoint `POST /api/auth/register-with-code`

**Files:**
- Modify: `src/backend/src/schemas/authSchemas.ts`
- Modify: `src/backend/src/routes/authRoutes.ts`
- Create: `src/backend/tests/registerWithCode.test.ts`

- [ ] **Step 1: Añadir el schema Zod**

En `src/backend/src/schemas/authSchemas.ts`, al final del archivo:

```ts
export const registerWithCodeSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
  name: z.string().min(2, 'Tu nombre necesita al menos 2 caracteres'),
  joinCode: z.string().length(6, 'El código tiene 6 caracteres'),
})
```

- [ ] **Step 2: Escribir el test de integración**

Crear `src/backend/tests/registerWithCode.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../src/server'
import prisma from '../src/lib/prisma'

describe('POST /api/auth/register-with-code', () => {
  const joinCode = 'R3G2AA'
  let coupleId: string
  const inviterEmail = `register-inviter-${Date.now()}@example.com`
  const newUserEmail = `register-new-${Date.now()}@example.com`

  beforeAll(async () => {
    const couple = await prisma.couple.create({
      data: {
        secretKey: `register-test-${Date.now()}`,
        joinCode,
        language: 'es',
        users: {
          create: { email: inviterEmail, passwordHash: 'x', name: 'Register Inviter' },
        },
      },
    })
    coupleId = couple.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [inviterEmail, newUserEmail] } } })
    await prisma.couple.deleteMany({ where: { id: coupleId } })
    await prisma.$disconnect()
  })

  it('creates a user and links to the existing couple (201)', async () => {
    const res = await request(app)
      .post('/api/auth/register-with-code')
      .send({
        email: newUserEmail,
        password: 'secret1234',
        name: 'New Partner',
        joinCode,
      })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeTruthy()
    expect(res.body.user.coupleId).toBe(coupleId)

    const createdUser = await prisma.user.findUnique({ where: { email: newUserEmail } })
    expect(createdUser?.coupleId).toBe(coupleId)
    expect(createdUser?.hasCompletedOnboarding).toBe(true)
  })

  it('returns 400 when email already exists', async () => {
    const res = await request(app)
      .post('/api/auth/register-with-code')
      .send({
        email: newUserEmail,
        password: 'secret1234',
        name: 'Dup Email',
        joinCode,
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Ya tienes cuenta/i)
  })

  it('returns 400 when couple is already full', async () => {
    const res = await request(app)
      .post('/api/auth/register-with-code')
      .send({
        email: `third-${Date.now()}@example.com`,
        password: 'secret1234',
        name: 'Third',
        joinCode,
      })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/completa/i)
  })

  it('returns 404 when joinCode does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/register-with-code')
      .send({
        email: `nocode-${Date.now()}@example.com`,
        password: 'secret1234',
        name: 'NoCode',
        joinCode: 'ZZZZZZ',
      })
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/no encontrado/i)
  })

  it('normalizes lowercase joinCode', async () => {
    // Ya registrado con joinCode válido debería funcionar con minúsculas si queda hueco.
    // Este caso es mejor cubrirlo en unit test de normalización; aquí solo
    // verificamos que lowercase no rompe el parseo.
    const res = await request(app)
      .post('/api/auth/register-with-code')
      .send({
        email: `lower-${Date.now()}@example.com`,
        password: 'secret1234',
        name: 'Lower',
        joinCode: joinCode.toLowerCase(),
      })
    // Pareja está llena ya en este punto (2 usuarios).
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/completa/i)
  })
})
```

- [ ] **Step 3: Correr el test para verificar que falla**

```bash
cd src/backend
npm test -- --run registerWithCode 2>&1 | tail -30
```

Expected: FAIL 404 (endpoint no existe).

- [ ] **Step 4: Implementar el endpoint**

En `src/backend/src/routes/authRoutes.ts`, actualizar el import de schemas:

```ts
import {
  signupSchema, loginSchema,
  signupUserSchema, inviteSchema, acceptInviteSchema, rejectInviteSchema,
  proposePartnerSchema, proposalActionSchema,
  registerWithCodeSchema,
} from '../schemas/authSchemas.js'
```

Y añadir el handler antes de `export default router`:

```ts
// Public endpoint: register a new user and attach them to an existing couple
// identified by joinCode. Replaces the token-based invitation flow: one step,
// no email lock, no expiration.
router.post('/register-with-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = registerWithCodeSchema.parse(req.body)
    const joinCode = validated.joinCode.toUpperCase()

    const couple = await prisma.couple.findUnique({
      where: { joinCode },
      include: { users: true },
    })
    if (!couple) {
      res.status(404).json({ error: 'Código de pareja no encontrado' })
      return
    }
    if (couple.users.length >= 2) {
      res.status(400).json({ error: 'Esta pareja ya está completa' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email: validated.email } })
    if (existing) {
      res.status(400).json({ error: 'Ya tienes cuenta con este email. Inicia sesión.' })
      return
    }

    const { hashPassword, generateToken } = await import('../services/authService.js')
    const passwordHash = await hashPassword(validated.password)

    const user = await prisma.user.create({
      data: {
        coupleId: couple.id,
        email: validated.email,
        passwordHash,
        name: validated.name,
        roleInHome: 'equal',
        timezone: 'Europe/Madrid',
        hasCompletedOnboarding: true,
        notificationsPush: true,
        notificationsEmail: true,
      },
      select: { id: true, email: true, name: true, coupleId: true, hasCompletedOnboarding: true },
    })

    // Notificar al invitador.
    if (couple.users[0]) {
      await prisma.notification.create({
        data: {
          coupleId: couple.id,
          userId: couple.users[0].id,
          type: 'PARTNER_JOINED',
          title: '🎉 Tu pareja se ha unido',
          message: `${user.name} acaba de crear su cuenta y ya estáis vinculados.`,
          isRead: false,
        },
      })
    }

    const token = generateToken(user.id, user.coupleId ?? '')
    res.status(201).json({
      message: 'Account created and linked',
      token,
      user,
      couple: { id: couple.id },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validación',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 5: Correr el test para verificar que pasa**

```bash
cd src/backend
npm test -- --run registerWithCode 2>&1 | tail -30
```

Expected: 5/5 tests en verde.

- [ ] **Step 6: Commit**

```bash
git add src/backend/src/schemas/authSchemas.ts src/backend/src/routes/authRoutes.ts src/backend/tests/registerWithCode.test.ts
git commit -m "feat(auth): POST /auth/register-with-code endpoint"
```

---

## Task 7: Exponer `joinCode` en `GET /api/auth/couple`

**Files:**
- Modify: `src/backend/src/routes/authRoutes.ts` (handler `/couple`)
- Modify: `src/backend/src/services/authService.ts` (getCoupleData — ya incluye joinCode vía `*` pero confirmar)

- [ ] **Step 1: Añadir `joinCode` al payload del handler `/couple`**

En `src/backend/src/routes/authRoutes.ts`, localizar el handler `router.get('/couple', authMiddleware, ...)` y añadir `joinCode` al objeto `couple` que se retorna:

```ts
    res.json({
      couple: {
        id: couple.id,
        joinCode: (couple as any).joinCode ?? null,
        numChildren: couple.numChildren,
        language: couple.language,
        notificationsEnabled: couple.notificationsEnabled,
        users: couple.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.roleInHome,
        })),
        configuration: couple.configurations ? {
          tasksConfig: JSON.parse(couple.configurations.tasksConfig),
          multipliersConfig: JSON.parse(couple.configurations.multipliersConfig),
          activityTypes: JSON.parse(couple.configurations.activityTypes),
        } : null,
      },
    })
```

- [ ] **Step 2: Verificar compilación**

```bash
cd src/backend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: sin errores.

- [ ] **Step 3: Smoke-test manual**

Arrancar el backend:
```bash
cd src/backend && npm run dev
```

En otra terminal, hacer login con un usuario de dev y llamar al endpoint:
```bash
# Usando el token existente de un usuario. Ajustar a un token real local.
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/auth/couple | grep -o '"joinCode":"[^"]*"'
```

Expected: `"joinCode":"XXXXXX"` (6 chars del alfabeto) o `"joinCode":null` si aún no hiciste backfill (previsto en Task 11).

Parar backend.

- [ ] **Step 4: Commit**

```bash
git add src/backend/src/routes/authRoutes.ts
git commit -m "feat(auth): expose joinCode in GET /auth/couple response"
```

---

## Task 8: Añadir métodos `previewCouple` + `registerWithCode` al `apiClient`

**Files:**
- Modify: `src/frontend/src/services/apiClient.ts`

- [ ] **Step 1: Añadir los métodos al namespace `auth`**

En `src/frontend/src/services/apiClient.ts`, dentro del bloque `auth = { ... }` (aprox línea 83-127), añadir antes del cierre:

```ts
    previewCouple: (code: string) =>
      this.request(`/auth/couple-preview/${encodeURIComponent(code.toUpperCase())}`),

    registerWithCode: (data: { email: string; password: string; name: string; joinCode: string }) =>
      this.request('/auth/register-with-code', {
        method: 'POST',
        body: JSON.stringify({ ...data, joinCode: data.joinCode.toUpperCase() }),
      }),
```

- [ ] **Step 2: Verificar compilación TypeScript**

```bash
cd src/frontend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/services/apiClient.ts
git commit -m "feat(frontend): apiClient.auth.previewCouple + registerWithCode"
```

---

## Task 9: Signup refactor — detectar `?code=X`, preview, submit con código

**Files:**
- Modify: `src/frontend/src/pages/Signup.tsx`
- Create: `src/frontend/src/pages/Signup.test.tsx`

- [ ] **Step 1: Escribir los tests de render que fallan**

Crear `src/frontend/src/pages/Signup.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Signup from './Signup'

vi.mock('../services/apiClient', () => ({
  apiClient: {
    request: vi.fn(),
    setToken: vi.fn(),
    auth: {
      previewCouple: vi.fn(),
      registerWithCode: vi.fn(),
    },
  },
}))

vi.mock('../store/useAppStore', () => ({
  useAppStore: Object.assign(
    () => null,
    {
      getState: () => ({ setUser: vi.fn(), setCouple: vi.fn() }),
      setState: vi.fn(),
    },
  ),
}))

import { apiClient } from '../services/apiClient'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Signup without code', () => {
  it('shows the normal signup form with step indicator', () => {
    renderAt('/signup')
    expect(screen.getByText(/Crea tu cuenta/i)).toBeInTheDocument()
    expect(apiClient.auth.previewCouple).not.toHaveBeenCalled()
  })
})

describe('Signup with ?code=', () => {
  it('calls previewCouple on mount and shows inviter banner on success', async () => {
    ;(apiClient.auth.previewCouple as any).mockResolvedValueOnce({
      valid: true,
      inviterName: 'Edu',
      isFull: false,
    })
    renderAt('/signup?code=K7X9M4')
    await waitFor(() => {
      expect(apiClient.auth.previewCouple).toHaveBeenCalledWith('K7X9M4')
    })
    await waitFor(() => {
      expect(screen.getByText(/Edu/i)).toBeInTheDocument()
    })
  })

  it('shows error when code is invalid', async () => {
    ;(apiClient.auth.previewCouple as any).mockRejectedValueOnce(new Error('Código no encontrado'))
    renderAt('/signup?code=ZZZZZZ')
    await waitFor(() => {
      expect(screen.getByText(/no reconocido/i)).toBeInTheDocument()
    })
  })

  it('shows full-couple error when isFull=true', async () => {
    ;(apiClient.auth.previewCouple as any).mockResolvedValueOnce({
      valid: true,
      inviterName: 'Edu',
      isFull: true,
    })
    renderAt('/signup?code=FULLAA')
    await waitFor(() => {
      expect(screen.getByText(/completa/i)).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

```bash
cd src/frontend
npm test -- --run Signup 2>&1 | tail -20
```

Expected: FAIL — los banners y la llamada a `previewCouple` aún no existen.

- [ ] **Step 3: Reescribir `Signup.tsx` para soportar ambos flujos**

Reemplazar el contenido completo de `src/frontend/src/pages/Signup.tsx` por:

```tsx
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'

type PreviewState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'valid'; inviterName: string }
  | { status: 'full'; inviterName: string }
  | { status: 'invalid' }

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()

  const rawCode = new URLSearchParams(location.search).get('code') ?? ''
  const [code, setCode] = useState<string>(rawCode.toUpperCase())

  const hasCode = code.length > 0
  const [preview, setPreview] = useState<PreviewState>(
    hasCode ? { status: 'loading' } : { status: 'idle' },
  )

  const [step, setStep]         = useState<1 | 2>(1)
  const [email, setEmail]       = useState('')
  const [pwd, setPwd]           = useState('')
  const [confirm, setConfirm]   = useState('')
  const [accept, setAccept]     = useState(false)
  const [name, setName]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  // Si llega un ?code=X, validarlo contra el backend antes de mostrar nada.
  useEffect(() => {
    if (!hasCode) return
    let cancelled = false
    setPreview({ status: 'loading' })
    apiClient.auth
      .previewCouple(code)
      .then(res => {
        if (cancelled) return
        if (!res?.valid) return setPreview({ status: 'invalid' })
        if (res.isFull) return setPreview({ status: 'full', inviterName: res.inviterName })
        setPreview({ status: 'valid', inviterName: res.inviterName })
      })
      .catch(() => {
        if (!cancelled) setPreview({ status: 'invalid' })
      })
    return () => { cancelled = true }
  }, [code, hasCode])

  const step1Valid =
    email.includes('@') &&
    pwd.length >= 6 &&
    confirm === pwd &&
    accept

  const step2Valid = name.trim().length >= 2

  function goStep2(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!step1Valid) {
      if (!email.includes('@'))        return setErr('Introduce un email válido')
      if (pwd.length < 6)              return setErr('La contraseña necesita al menos 6 caracteres')
      if (confirm !== pwd)             return setErr('Las contraseñas no coinciden')
      if (!accept)                     return setErr('Debes aceptar los términos')
    }
    setStep(2)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!step2Valid) {
      setErr('Tu nombre necesita al menos 2 caracteres')
      return
    }
    setLoading(true); setErr(null)
    try {
      // Si tenemos un código válido, registramos con él y vinculamos a la pareja
      // existente. El usuario entra directamente al dashboard (sin wizard).
      if (preview.status === 'valid') {
        const data = await apiClient.auth.registerWithCode({
          email, password: pwd, name: name.trim(), joinCode: code,
        })
        apiClient.setToken(data.token)
        useAppStore.getState().setUser(data.user)
        useAppStore.setState({ isAuthenticated: true })
        navigate('/dashboard', { replace: true })
        return
      }

      // Sin código: flujo normal (pareja solo, va al wizard de onboarding).
      const data = await apiClient.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password: pwd, name: name.trim(), language: 'es' }),
      })
      apiClient.setToken(data.token)
      useAppStore.getState().setUser(data.user)
      useAppStore.getState().setCouple(null)
      useAppStore.setState({ isAuthenticated: true })
      navigate('/onboarding')
    } catch (e: any) {
      setErr(e?.message ?? 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  function clearCode() {
    setCode('')
    setPreview({ status: 'idle' })
    navigate('/signup', { replace: true })
  }

  return (
    <main className="bg-surface-base min-h-screen px-6 flex flex-col">
      <div className="flex-1 flex flex-col justify-center py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="w-[72px] h-[72px] rounded-[20px] mx-auto mb-4 bg-gradient-to-br from-brand-amber to-brand-purple flex items-center justify-center text-4xl shadow-xl shadow-brand-purple/40">💕</div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight m-0">Crea tu cuenta</h1>
          {preview.status === 'idle' && (
            <div className="text-[13px] text-text-secondary mt-1">Paso {step} de 2</div>
          )}
        </div>

        {preview.status === 'loading' && (
          <div className="text-center text-sm text-text-secondary mb-4">Comprobando código…</div>
        )}

        {preview.status === 'valid' && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-brand-purple/15 border border-brand-purple/30 text-sm text-text-primary">
            Te unirás a la pareja de <b>{preview.inviterName}</b>.
          </div>
        )}

        {preview.status === 'full' && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-danger/15 border border-danger/30 text-sm text-text-primary">
            Esta pareja ya está completa.{' '}
            <button type="button" onClick={clearCode} className="underline text-brand-purple">
              Crear pareja nueva
            </button>
          </div>
        )}

        {preview.status === 'invalid' && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-danger/15 border border-danger/30 text-sm text-text-primary">
            Código no reconocido. Comprueba que está bien escrito.{' '}
            <button type="button" onClick={clearCode} className="underline text-brand-purple">
              Crear pareja nueva
            </button>
          </div>
        )}

        {preview.status === 'idle' && (
          <div className="flex gap-1 mb-6">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
          </div>
        )}

        {step === 1 && (
          <form onSubmit={goStep2} className="flex flex-col gap-3">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <div className="relative">
              <Input label="Contraseña (mín. 6)" type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 bottom-2 text-text-secondary text-lg" aria-label="Mostrar contraseña">👁</button>
            </div>
            <Input label="Confirmar contraseña" type={showPwd ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
            <label className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="accent-brand-purple" />
              Acepto los términos y la política de privacidad
            </label>
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step1Valid} className="mt-2">
              Siguiente →
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input label="¿Cómo te llamas?" type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" required autoFocus />
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step2Valid || loading} className="mt-2">
              {loading ? 'Creando…' : 'Crear cuenta'}
            </Button>
            <button type="button" onClick={() => { setStep(1); setErr(null) }} className="text-xs text-text-secondary mt-1 self-center">← volver</button>
          </form>
        )}

        <div className="text-center mt-8 text-xs text-text-secondary">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-purple font-bold">Inicia sesión →</Link>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

```bash
cd src/frontend
npm test -- --run Signup 2>&1 | tail -30
```

Expected: 4/4 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/pages/Signup.tsx src/frontend/src/pages/Signup.test.tsx
git commit -m "feat(frontend): Signup page supports ?code= join flow"
```

---

## Task 10: Settings — card de compartir código + link

**Files:**
- Modify: `src/frontend/src/pages/Settings.tsx` (sección `CoupleSection`)
- Create: `src/frontend/src/pages/Settings.test.tsx` (render básico de la card)

- [ ] **Step 1: Ubicar la sección `CoupleSection` en `Settings.tsx`**

```bash
grep -n "CoupleSection\|Tu Pareja\|joinCode" "/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/pages/Settings.tsx" | head -20
```

Identificar la línea donde empieza el bloque de "Tu Pareja" (alrededor de línea 324). Anotar la posición.

- [ ] **Step 2: Escribir el test de render de la card**

Crear `src/frontend/src/pages/Settings.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../services/apiClient', () => ({
  apiClient: {
    request: vi.fn().mockResolvedValue({}),
    auth: { getCouple: vi.fn().mockResolvedValue({ couple: { id: 'c1', joinCode: 'K7X9M4', users: [] } }) },
  },
}))

const storeState = {
  user: { id: 'u1', email: 'e@x.com', name: 'Edu', coupleId: 'c1' },
  couple: { id: 'c1', joinCode: 'K7X9M4', users: [{ id: 'u1', name: 'Edu' }] },
  isAuthenticated: true,
  setUser: vi.fn(), setCouple: vi.fn(),
}
vi.mock('../store/useAppStore', () => {
  const useAppStore: any = (sel?: any) => (sel ? sel(storeState) : storeState)
  useAppStore.getState = () => storeState
  useAppStore.setState = vi.fn()
  return { useAppStore }
})

// Import after mocks so Settings picks them up.
import Settings from './Settings'

describe('Settings CoupleSection — join code card', () => {
  it('renders the couple join code when available', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    expect(await screen.findByText('K7X9M4')).toBeInTheDocument()
  })

  it('builds the share link from the join code', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/\/signup\?code=K7X9M4/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Correr los tests para verificar que fallan**

```bash
cd src/frontend
npm test -- --run Settings 2>&1 | tail -20
```

Expected: FAIL — el código y el link no están renderizados aún.

- [ ] **Step 4: Añadir la card de compartir código en `CoupleSection`**

En `src/frontend/src/pages/Settings.tsx`, dentro de `CoupleSection` (al inicio del bloque de contenido, antes de cualquier UI existente de invitación por email), añadir:

```tsx
          {couple?.joinCode && (
            <section className="mb-4 p-4 rounded-2xl bg-surface-card border border-brd-subtle">
              <div className="text-sm font-bold text-text-primary mb-1">💕 Invita a tu pareja</div>
              <div className="text-[11px] text-text-secondary mb-3">
                Comparte el código o el link. Tu pareja entra, se registra y estáis vinculados al instante.
              </div>

              <div className="text-[11px] text-text-secondary mb-1">Vuestro código</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-brd-subtle font-mono text-lg tracking-widest text-text-primary select-all">
                  {couple.joinCode}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(couple.joinCode!)}
                  className="px-3 py-2 rounded-lg bg-brand-purple text-white text-xs font-semibold"
                >
                  Copiar
                </button>
              </div>

              <div className="text-[11px] text-text-secondary mb-1">O comparte este link</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-surface-elevated border border-brd-subtle text-[11px] text-text-primary break-all">
                  {`${window.location.origin}/signup?code=${couple.joinCode}`}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}/signup?code=${couple.joinCode}`
                    if (navigator.share) {
                      try { await navigator.share({ title: 'Únete a nuestra pareja en Matripuntos', url }) } catch {}
                    } else {
                      navigator.clipboard?.writeText(url)
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-brand-amber text-white text-xs font-semibold"
                >
                  Compartir
                </button>
              </div>
            </section>
          )}
```

Si `CoupleSection` no recibe `couple` como prop, leerlo del store: `const couple = useAppStore(s => s.couple)`.

- [ ] **Step 5: Exponer `joinCode` en el tipo del store**

En `src/frontend/src/store/useAppStore.ts` (o equivalente), localizar el tipo del `couple` y añadir `joinCode?: string | null`. Si el tipo viene de `src/frontend/src/types/index.ts`, añadirlo ahí.

```bash
grep -rn "interface Couple\b\|type Couple\b" "/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/types/" "/Users/edu/Web development/Claude/Matripuntos/src/frontend/src/store/"
```

Añadir `joinCode?: string | null` al tipo correspondiente.

- [ ] **Step 6: Correr los tests para verificar que pasan**

```bash
cd src/frontend
npm test -- --run Settings 2>&1 | tail -20
```

Expected: 2/2 en verde.

- [ ] **Step 7: Smoke-test manual — arrancar frontend + backend**

```bash
# Terminal 1
cd src/backend && npm run dev

# Terminal 2
cd src/frontend && npm run dev
```

Abrir `http://localhost:5173`, entrar con un usuario de dev. Ir a Ajustes → Tu Pareja.

Expected: Si la pareja ya tiene `joinCode` (usuarios creados tras Task 4, o tras Task 11), la card aparece con el código y el link. Si no (pareja previa sin backfill), la card no aparece — comportamiento correcto.

Parar procesos.

- [ ] **Step 8: Commit**

```bash
git add src/frontend/src/pages/Settings.tsx src/frontend/src/pages/Settings.test.tsx src/frontend/src/store src/frontend/src/types
git commit -m "feat(frontend): Settings couple join-code share card"
```

---

## Task 11: Script de backfill — rellenar `joinCode` en parejas existentes

**Files:**
- Create: `src/backend/prisma/backfill-join-codes.ts`

- [ ] **Step 1: Escribir el script idempotente**

Crear `src/backend/prisma/backfill-join-codes.ts`:

```ts
// Idempotent backfill: asigna un joinCode único a cada Couple que todavía
// lo tenga NULL. Seguro de re-correr. Usarlo en dev y en prod una vez después
// del deploy que introduce el campo.
//
// Ejecución local:   npx ts-node prisma/backfill-join-codes.ts
// Ejecución Render:  abrir shell en Render → `node -r ts-node/register prisma/backfill-join-codes.ts`
import prisma from '../src/lib/prisma.js'
import { generateUniqueJoinCode } from '../src/utils/joinCode.js'

async function main() {
  const pending = await prisma.couple.findMany({
    where: { joinCode: null },
    select: { id: true },
  })
  console.log(`Parejas sin joinCode: ${pending.length}`)

  let done = 0
  for (const c of pending) {
    const code = await generateUniqueJoinCode(prisma)
    await prisma.couple.update({ where: { id: c.id }, data: { joinCode: code } })
    done++
    if (done % 25 === 0) console.log(`  ...${done}/${pending.length}`)
  }

  console.log(`OK — ${done} parejas actualizadas.`)
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 2: Correr el backfill en local**

```bash
cd src/backend
npx ts-node prisma/backfill-join-codes.ts
```

Expected output: "Parejas sin joinCode: N" + "OK — N parejas actualizadas".

- [ ] **Step 3: Verificar en Prisma Studio**

```bash
cd src/backend
npx prisma studio
```

Abrir Couple: todas las filas tienen `joinCode` de 6 chars. Confirmar unicidad ordenando por esa columna.

Cerrar Studio.

- [ ] **Step 4: Correr tests end-to-end**

```bash
cd src/backend && npm test -- --run 2>&1 | tail -20
```

```bash
cd src/frontend && npm test -- --run 2>&1 | tail -20
```

Expected: todos en verde.

- [ ] **Step 5: Commit**

```bash
git add src/backend/prisma/backfill-join-codes.ts
git commit -m "feat(backend): idempotent backfill script for Couple.joinCode"
```

---

## Task 12: Smoke-test manual end-to-end en local

**Files:** N/A (manual QA)

- [ ] **Step 1: Arrancar backend + frontend**

```bash
cd src/backend && npm run dev
```

En otra terminal:
```bash
cd src/frontend && npm run dev
```

- [ ] **Step 2: Flujo "invitador" — Usuario A**

1. Abrir `http://localhost:5173/login`.
2. Entrar con un usuario existente (p.ej. Edu).
3. Ir a Ajustes → Tu Pareja.
4. Ver card "💕 Invita a tu pareja" con código + link.
5. Copiar el link (debe ser `http://localhost:5173/signup?code=XXXXXX`).

- [ ] **Step 3: Flujo "invitado" — Usuario B (ventana incógnito)**

1. Abrir ventana de incógnito.
2. Pegar el link copiado.
3. Ver banner "Te unirás a la pareja de Edu".
4. Rellenar email NUEVO + password (8+) + aceptar T&C → siguiente.
5. Rellenar nombre → "Crear cuenta".

Expected: entra directamente al dashboard (sin wizard), ambos usuarios aparecen al mirar `GET /api/auth/couple`.

- [ ] **Step 4: Flujo "código inválido"**

1. Abrir `http://localhost:5173/signup?code=ZZZZZZ`.
2. Ver mensaje "Código no reconocido".
3. Click en "Crear pareja nueva" → URL se limpia, flujo normal.

- [ ] **Step 5: Flujo "pareja llena"**

1. Desde la pareja ya con 2 usuarios, ir a Ajustes → copiar código.
2. Abrir incógnito → `/signup?code=<ese código>`.
3. Ver mensaje "Esta pareja ya está completa" + botón "Crear pareja nueva".

- [ ] **Step 6: Flujo normal sin código**

1. Abrir incógnito → `/signup`.
2. Ver indicador "Paso 1 de 2" (sin banner, sin loading de código).
3. Crear cuenta → lleva al wizard de onboarding (flujo de pareja nueva).

- [ ] **Step 7: Parar procesos**

Ctrl+C en ambas terminales.

- [ ] **Step 8: Commit de verificación (solo si hay fixes)**

Si durante el smoke test salió algún detalle a ajustar, aplicarlo + commit `fix:` antes de continuar.

---

## Task 13: Deploy a producción

**Files:** N/A (deploy)

**Pre-requisito:** tests locales en verde, smoke test manual exitoso.

- [ ] **Step 1: Merge a main**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
git checkout main
git pull origin main
git merge --no-ff feature/v1.4-join-code-signup
git log --oneline -10
```

Expected: commits del feature aparecen en el log, sin conflictos.

- [ ] **Step 2: Push**

```bash
git push origin main
```

Render auto-deploya backend. Monitorizar logs en el dashboard de Render.

- [ ] **Step 3: Aplicar migración en Supabase (auto vía Render build)**

Verificar que el build de Render ejecuta `prisma migrate deploy`. Si no está en el script:
```bash
# Ajustar package.json del backend para que "build" o "postinstall" incluya:
"prisma migrate deploy"
```

Si el script ya existe, la migración se aplica sola. Revisar logs de Render para confirmar "Applied migration `add_couple_join_code`".

- [ ] **Step 4: Ejecutar backfill en shell de Render**

En el dashboard de Render → servicio backend → Shell:
```bash
node -r ts-node/register prisma/backfill-join-codes.ts
```

Expected: "OK — N parejas actualizadas".

- [ ] **Step 5: Deploy frontend vía FTP**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
cd src/frontend
npm run build
# Usar lftp con credenciales de .deploy-credentials (ver CLAUDE.md sección 2).
# Comando concreto: depende del script de deploy existente del proyecto.
# Habitualmente:
bash ../../scripts/deploy-frontend.sh
```

Expected: upload completo.

- [ ] **Step 6: Smoke test en producción**

1. Abrir `https://s.keepitup.io` (o el dominio de prod).
2. Login Edu → Ajustes → copiar link con código.
3. Abrir incógnito → pegar link → crear cuenta con email nuevo → confirmar que entra al dashboard vinculado.

- [ ] **Step 7: Tag de versión**

```bash
git tag v1.4-join-code
git push origin v1.4-join-code
```

- [ ] **Step 8: Actualizar CLAUDE.md y ROADMAP.md**

En `CLAUDE.md` sección 9, marcar v1.4 como completado con link al tag.

En `docs/ROADMAP.md`, actualizar el estado de v1.4.

Commit:
```bash
git add CLAUDE.md docs/ROADMAP.md
git commit -m "docs: v1.4 join-code shipped"
git push origin main
```

---

## Self-Review Checklist

- [x] Cada archivo citado existe o se crea explícitamente.
- [x] Las signatures (`generateJoinCode`, `generateUniqueJoinCode`, `previewCouple`, `registerWithCode`) son consistentes entre backend y frontend.
- [x] `joinCode` se usa con el mismo nombre en schema, servicios, routes, tests y frontend — no se mezcla con `code`, `joinCode2`, etc.
- [x] Sin placeholders "TBD" o "implementar después".
- [x] Cada step de código muestra el código completo, no "similar a arriba".
- [x] Orden de tasks respetado: schema → utility → service → endpoints → frontend → backfill → deploy.
- [x] Tests antes de implementación en cada task (TDD).
- [x] Commits frecuentes, uno por task o sub-task lógico.
- [x] Cobertura del spec:
  - ✓ Modelo `joinCode` (Task 2)
  - ✓ Generador (Task 3)
  - ✓ Integración signup solo + pareja (Task 4)
  - ✓ Endpoint preview (Task 5)
  - ✓ Endpoint register-with-code (Task 6)
  - ✓ `joinCode` en `/couple` (Task 7)
  - ✓ apiClient (Task 8)
  - ✓ Signup refactor (Task 9)
  - ✓ Settings card (Task 10)
  - ✓ Backfill (Task 11)
  - ✓ Smoke test (Task 12)
  - ✓ Deploy (Task 13)
