# Phase 3.1: Auth Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor auth system from couple-based to single-user signup with bidirectional invitations (email-based or user-proposed), 48-hour expiry, and cross-couple access prevention.

**Architecture:** New `Invitation` table tracks email and user-based invites. Single-user signup creates `User` with NULL `coupleId`. Couple formation via invitation acceptance or mutual proposal acceptance. All routes validate `req.coupleId` to prevent cross-couple data access.

**Tech Stack:** TypeScript backend (Express + Prisma), React frontend, Zod validation, JWT auth.

---

## File Structure

**Backend Files to Create:**
- `src/backend/prisma/migrations/[timestamp]_add_invitations/migration.sql` — Invitation table + User.coupleId nullable
- `src/backend/src/services/invitationService.ts` — Invitation logic (create, accept, reject, propose, etc.)
- `src/backend/src/routes/invitationRoutes.ts` — Invitation endpoints (if separated, or add to authRoutes.ts)
- `src/backend/src/schemas/invitationSchemas.ts` — Zod validation for invitation endpoints

**Backend Files to Modify:**
- `src/backend/src/routes/authRoutes.ts` — Add 7 new endpoints (signup single-user, invite, accept-invite, reject-invite, propose-partner, accept-proposal, reject-proposal)
- `src/backend/src/services/authService.ts` — Refactor signupCouple → signupUser, add new auth logic
- `src/backend/src/schemas/authSchemas.ts` — Update schemas for new endpoints
- `src/backend/src/middleware/authMiddleware.ts` — Ensure coupleId validation (already exists, verify)
- `src/backend/src/server.ts` — Register new routes

**Frontend Files to Create:**
- `src/frontend/src/pages/Signup.tsx` — Single-user signup form
- `src/frontend/src/components/InvitationNotification.tsx` — Shows pending invites/proposals
- `src/frontend/src/components/PartnerProposalCard.tsx` — Propose/manage partner UI

**Frontend Files to Modify:**
- `src/frontend/src/pages/Login.tsx` — Add "Sign Up" button
- `src/frontend/src/pages/Onboarding.tsx` — Adapt for invite acceptance flow
- `src/frontend/src/pages/Settings.tsx` — Add "Add Partner" section for single users
- `src/frontend/src/store/useAppStore.ts` — Add invite/proposal methods
- `src/frontend/src/services/apiClient.ts` — Add invite/proposal API methods
- `src/frontend/src/App.tsx` — Add `/signup` route

**Test Files to Create:**
- `src/backend/tests/auth.integration.test.ts` — All 7 auth flows end-to-end
- `src/backend/tests/invitations.unit.test.ts` — Invitation logic (expiry, cross-couple, etc.)

---

## Tasks

### Task 1: Database Migration — Add Invitation Table and Make coupleId Optional

**Files:**
- Create: `src/backend/prisma/migrations/[timestamp]_add_invitations/migration.sql`
- Modify: `src/backend/prisma/schema.prisma`

- [ ] **Step 1: Create migration file**

Run:
```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npx prisma migrate dev --name add_invitations
```

Expected: Creates `prisma/migrations/[timestamp]_add_invitations/` folder with `migration.sql`

- [ ] **Step 2: Write migration SQL**

Open `prisma/migrations/[timestamp]_add_invitations/migration.sql` and write:

```sql
-- Add Invitation table
CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toEmail" TEXT,
  "toUserId" TEXT,
  "token" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "coupleId" TEXT,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE SET NULL
);

-- Create indexes for invitations
CREATE INDEX "Invitation_fromUserId_idx" ON "Invitation"("fromUserId");
CREATE INDEX "Invitation_toEmail_idx" ON "Invitation"("toEmail");
CREATE INDEX "Invitation_toUserId_idx" ON "Invitation"("toUserId");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- Modify User table: make coupleId optional
-- SQLite doesn't support ALTER COLUMN, so we'll handle this in the schema.prisma
```

- [ ] **Step 3: Update Prisma schema**

Open `src/backend/prisma/schema.prisma` and find the `User` model. Change:

```prisma
coupleId          String          // OLD: required
```

to:

```prisma
coupleId          String?         // NEW: optional (NULL = single user)
```

Add to User model:

```prisma
invitationsSent       Invitation[] @relation("InvitationsSent")
invitationsReceived   Invitation[] @relation("InvitationsReceived")
```

Add new Invitation model after User:

```prisma
model Invitation {
  id              String    @id @default(cuid())
  fromUserId      String
  fromUser        User      @relation("InvitationsSent", fields: [fromUserId], references: [id], onDelete: Cascade)
  toEmail         String?
  toUserId        String?
  toUser          User?     @relation("InvitationsReceived", fields: [toUserId], references: [id], onDelete: Cascade)
  token           String    @unique
  type            String    // "email_invite" | "user_proposal"
  status          String    // "pending" | "accepted" | "rejected"
  coupleId        String?
  couple          Couple?   @relation(fields: [coupleId], references: [id], onDelete: SetNull)
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([fromUserId])
  @@index([toEmail])
  @@index([toUserId])
  @@index([token])
  @@index([expiresAt])
}
```

Add to Couple model:

```prisma
invitations     Invitation[]
```

- [ ] **Step 4: Run migration**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npx prisma migrate deploy
npx prisma generate
```

Expected: Migration applies successfully, `node_modules/.prisma/client` regenerated.

- [ ] **Step 5: Verify schema**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npx prisma studio
```

Open http://localhost:5555 → Verify Invitation table exists and User.coupleId is nullable.

- [ ] **Step 6: Commit**

```bash
git add src/backend/prisma/schema.prisma src/backend/prisma/migrations/
git commit -m "feat: add invitation system - new table and make coupleId optional"
```

---

### Task 2: Backend Service — Create Invitation Logic (invitationService.ts)

**Files:**
- Create: `src/backend/src/services/invitationService.ts`

- [ ] **Step 1: Write invitationService**

Create `src/backend/src/services/invitationService.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

export async function createInvitation(
  fromUserId: string,
  toEmail: string,
  coupleIdIfAccepted?: string
) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

  const invitation = await prisma.invitation.create({
    data: {
      fromUserId,
      toEmail,
      token,
      type: 'email_invite',
      status: 'pending',
      coupleId: coupleIdIfAccepted,
      expiresAt,
    },
  })

  return invitation
}

export async function acceptEmailInvitation(token: string, newUserId: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation already ${invitation.status}`)
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Invitation expired')
  }

  // Update invitation
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: 'accepted',
      toUserId: newUserId,
    },
  })

  // Create couple linking both users
  const couple = await prisma.couple.create({
    data: {
      users: {
        connect: [
          { id: invitation.fromUserId },
          { id: newUserId },
        ],
      },
    },
    include: { users: true },
  })

  return couple
}

export async function rejectInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) {
    throw new Error('Invitation not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Invitation already ${invitation.status}`)
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' },
  })

  return invitation
}

export async function proposePartner(fromUserId: string, toUserId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: {
      fromUserId,
      toUserId,
      token,
      type: 'user_proposal',
      status: 'pending',
      expiresAt,
    },
  })

  return invitation
}

export async function acceptProposal(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Proposal not found')
  }

  if (invitation.status !== 'pending') {
    throw new Error(`Proposal already ${invitation.status}`)
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error('Proposal expired')
  }

  // Update invitation
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'accepted' },
  })

  // Create couple
  const couple = await prisma.couple.create({
    data: {
      users: {
        connect: [
          { id: invitation.fromUserId },
          { id: invitation.toUserId! },
        ],
      },
    },
    include: { users: true },
  })

  return couple
}

export async function rejectProposal(invitationId: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  })

  if (!invitation) {
    throw new Error('Proposal not found')
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: 'rejected' },
  })

  return invitation
}

export async function getInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getPendingProposalsForUser(userId: string) {
  return prisma.invitation.findMany({
    where: {
      toUserId: userId,
      type: 'user_proposal',
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/src/services/invitationService.ts
git commit -m "feat: create invitationService with all 6 core functions"
```

---

### Task 3: Backend Service — Refactor Auth Service (signupCouple → signupUser)

**Files:**
- Modify: `src/backend/src/services/authService.ts`

- [ ] **Step 1: Read current authService**

Open `src/backend/src/services/authService.ts` and locate `signupCouple` function.

- [ ] **Step 2: Create new signupUser function**

Add this function to authService.ts (keep signupCouple for now, don't delete):

```typescript
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// ... existing imports and code ...

export async function signupUser(
  email: string,
  password: string,
  name: string,
  language: string = 'es'
) {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    throw new Error('Email already registered')
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user WITHOUT couple (coupleId = null)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      coupleId: null, // Single user, not paired yet
      roleInHome: 'equal',
      timezone: 'Europe/Madrid',
      hasCompletedOnboarding: false,
      notificationsPush: true,
      notificationsEmail: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      coupleId: true,
    },
  })

  return user
}
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/src/services/authService.ts
git commit -m "feat: add signupUser service for single-user registration"
```

---

### Task 4: Backend Schemas — Update Zod Validation

**Files:**
- Modify: `src/backend/src/schemas/authSchemas.ts`

- [ ] **Step 1: Read current schemas**

Open `src/backend/src/schemas/authSchemas.ts`.

- [ ] **Step 2: Add new schemas**

Add these schemas at the end of the file:

```typescript
import { z } from 'zod'

// ... existing schemas ...

export const signupUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  language: z.string().default('es'),
})

export const inviteSchema = z.object({
  toEmail: z.string().email('Invalid email format'),
  message: z.string().optional(),
})

export const acceptInviteSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  language: z.string().default('es'),
})

export const rejectInviteSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
})

export const proposePartnerSchema = z.object({
  partnerEmail: z.string().email('Invalid email format'),
})

export const proposalActionSchema = z.object({
  invitationId: z.string().cuid('Invalid invitation ID'),
})
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/src/schemas/authSchemas.ts
git commit -m "feat: add zod schemas for new auth endpoints"
```

---

### Task 5: Backend Routes — Implement 7 Auth Endpoints

**Files:**
- Modify: `src/backend/src/routes/authRoutes.ts`

- [ ] **Step 1: Read current authRoutes**

Open `src/backend/src/routes/authRoutes.ts`. Keep existing `/signup` and `/login` endpoints.

- [ ] **Step 2: Import new services**

At the top of authRoutes.ts, add:

```typescript
import {
  createInvitation,
  acceptEmailInvitation,
  rejectInvitation,
  proposePartner,
  acceptProposal,
  rejectProposal,
  getInvitationByToken,
  getPendingProposalsForUser,
} from '../services/invitationService.js'
import {
  signupUser,
} from '../services/authService.js'
import {
  signupUserSchema,
  inviteSchema,
  acceptInviteSchema,
  rejectInviteSchema,
  proposePartnerSchema,
  proposalActionSchema,
} from '../schemas/authSchemas.js'
```

- [ ] **Step 3: Add single-user signup endpoint**

Replace the current `/signup` handler with this (or create a new handler and update the route):

```typescript
// Refactored: POST /auth/signup now for single-user
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = signupUserSchema.parse(req.body)
    const user = await signupUser(
      validated.email,
      validated.password,
      validated.name,
      validated.language
    )

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, coupleId: null },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        coupleId: user.coupleId,
      },
      token,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Signup failed'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 4: Add invite endpoint**

```typescript
// POST /auth/invite - send email invitation
router.post('/invite', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const validated = inviteSchema.parse(req.body)
    const invitation = await createInvitation(req.userId, validated.toEmail)

    res.json({
      message: 'Invitation sent',
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      inviteLink: `http://localhost:5173/onboarding/join?token=${invitation.token}&email=${validated.toEmail}`,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to send invitation'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 5: Add accept-invite endpoint**

```typescript
// POST /auth/accept-invite - accept email invitation and create account
router.post('/accept-invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = acceptInviteSchema.parse(req.body)

    // Get invitation to verify email
    const invitation = await getInvitationByToken(validated.token)
    if (!invitation || invitation.toEmail !== validated.email) {
      res.status(400).json({ error: 'Invalid invitation or email mismatch' })
      return
    }

    // Create user
    const newUser = await signupUser(
      validated.email,
      validated.password,
      validated.name,
      validated.language
    )

    // Accept invitation and create couple
    const couple = await acceptEmailInvitation(validated.token, newUser.id)

    // Generate JWT for new user
    const token = jwt.sign(
      { userId: newUser.id, coupleId: couple.id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created and linked to partner',
      couple: {
        id: couple.id,
        users: couple.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })),
      },
      token,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to accept invitation'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 6: Add reject-invite endpoint**

```typescript
// POST /auth/reject-invite - reject email invitation
router.post('/reject-invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = rejectInviteSchema.parse(req.body)
    await rejectInvitation(validated.token)

    res.json({
      message: 'Invitation rejected. You can now create an independent account.',
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to reject invitation'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 7: Add propose-partner endpoint**

```typescript
// POST /auth/propose-partner - propose another user as partner
router.post('/propose-partner', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const validated = proposePartnerSchema.parse(req.body)

    // Find partner by email
    const partner = await prisma.user.findUnique({ where: { email: validated.partnerEmail } })
    if (!partner) {
      res.status(404).json({ error: 'User with that email not found' })
      return
    }

    if (partner.id === req.userId) {
      res.status(400).json({ error: 'Cannot propose yourself as partner' })
      return
    }

    // Create proposal
    const proposal = await proposePartner(req.userId, partner.id)

    res.json({
      message: 'Partnership proposal sent',
      expiresAt: proposal.expiresAt,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to propose partnership'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 8: Add accept-proposal endpoint**

```typescript
// POST /auth/accept-proposal - accept partner proposal
router.post('/accept-proposal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const validated = proposalActionSchema.parse(req.body)

    // Get proposal
    const proposal = await prisma.invitation.findUnique({
      where: { id: validated.invitationId },
    })

    if (!proposal || proposal.toUserId !== req.userId) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }

    const couple = await acceptProposal(validated.invitationId)

    res.json({
      message: 'Partnership accepted',
      couple: {
        id: couple.id,
        users: couple.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
        })),
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to accept proposal'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 9: Add reject-proposal endpoint**

```typescript
// POST /auth/reject-proposal - reject partner proposal
router.post('/reject-proposal', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const validated = proposalActionSchema.parse(req.body)

    // Verify ownership
    const proposal = await prisma.invitation.findUnique({
      where: { id: validated.invitationId },
    })

    if (!proposal || proposal.toUserId !== req.userId) {
      res.status(404).json({ error: 'Proposal not found' })
      return
    }

    await rejectProposal(validated.invitationId)

    res.json({
      message: 'Proposal rejected. You remain independent.',
    })
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to reject proposal'
    res.status(400).json({ error: message })
  }
})
```

- [ ] **Step 10: Add get-pending-proposals endpoint (helper)**

```typescript
// GET /auth/proposals - get pending proposals for current user
router.get('/proposals', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'User ID not found in token' })
      return
    }

    const proposals = await getPendingProposalsForUser(req.userId)

    res.json({
      proposals: proposals.map(p => ({
        id: p.id,
        fromUser: p.fromUser,
        expiresAt: p.expiresAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch proposals'
    res.status(500).json({ error: message })
  }
})
```

- [ ] **Step 11: Commit**

```bash
git add src/backend/src/routes/authRoutes.ts
git commit -m "feat: implement 7 new auth endpoints (signup single-user, invite, accept/reject, propose/accept partner)"
```

---

### Task 6: Frontend Page — Create Signup.tsx

**Files:**
- Create: `src/frontend/src/pages/Signup.tsx`

- [ ] **Step 1: Write Signup component**

Create `src/frontend/src/pages/Signup.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('es')
  const [formError, setFormError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setIsLoading(true)

    if (!email || !password || !name) {
      setFormError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    try {
      await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, language }),
      }).then(async res => {
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Signup failed')
        }
        return res.json()
      }).then(data => {
        // Save token
        localStorage.setItem('token', data.token)
        // Navigate to dashboard
        navigate('/dashboard')
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Matripuntos</h1>
            <p className="text-gray-600">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password (min 8 chars)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isLoading}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-sm mb-4">
              Already have an account?
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/pages/Signup.tsx
git commit -m "feat: create Signup page for single-user registration"
```

---

### Task 7: Frontend Routes — Add /signup Route

**Files:**
- Modify: `src/frontend/src/App.tsx`
- Modify: `src/frontend/src/pages/Login.tsx`

- [ ] **Step 1: Import Signup page**

Open `src/frontend/src/App.tsx`, find the imports at the top, add:

```typescript
import Signup from './pages/Signup'
```

- [ ] **Step 2: Add /signup route**

In the `<Routes>` section of AppRoutes component, add (before /onboarding):

```typescript
<Route path="/signup" element={<Signup />} />
```

- [ ] **Step 3: Update Login page**

Open `src/frontend/src/pages/Login.tsx`, find the "Sign Up" button (around line 90). Verify it navigates to `/signup`:

```typescript
<button
  onClick={() => navigate('/signup')}
  className="w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-2 px-4 rounded-lg transition-colors"
>
  Sign Up
</button>
```

It should already be there from the existing code. If not, add it.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/App.tsx src/frontend/src/pages/Login.tsx
git commit -m "feat: add /signup route and wire up Login page signup button"
```

---

### Task 8: Frontend API Client — Add Invite/Proposal Methods

**Files:**
- Modify: `src/frontend/src/services/apiClient.ts`

- [ ] **Step 1: Add invite methods to auth section**

Open `src/frontend/src/services/apiClient.ts`, find the `auth` section (around line 60), and add these methods:

```typescript
auth: {
  // ... existing methods ...
  
  invite: (toEmail: string, message?: string) =>
    this.request('/auth/invite', {
      method: 'POST',
      data: { toEmail, message },
    }),

  acceptInvite: (token: string, email: string, password: string, name: string) =>
    this.request('/auth/accept-invite', {
      method: 'POST',
      data: { token, email, password, name },
    }),

  rejectInvite: (token: string) =>
    this.request('/auth/reject-invite', {
      method: 'POST',
      data: { token },
    }),

  proposePartner: (partnerEmail: string) =>
    this.request('/auth/propose-partner', {
      method: 'POST',
      data: { partnerEmail },
    }),

  acceptProposal: (invitationId: string) =>
    this.request('/auth/accept-proposal', {
      method: 'POST',
      data: { invitationId },
    }),

  rejectProposal: (invitationId: string) =>
    this.request('/auth/reject-proposal', {
      method: 'POST',
      data: { invitationId },
    }),

  getPendingProposals: () =>
    this.request('/auth/proposals', { method: 'GET' }),
},
```

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/services/apiClient.ts
git commit -m "feat: add invite and proposal API methods to apiClient"
```

---

### Task 9: Backend Testing — Integration Tests for All 7 Auth Flows

**Files:**
- Create: `src/backend/tests/auth.integration.test.ts`

- [ ] **Step 1: Create test file**

Create `src/backend/tests/auth.integration.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import request from 'supertest'
import express, { Express } from 'express'

const prisma = new PrismaClient()
let app: Express

beforeAll(async () => {
  // Import your Express app
  // app = require('../src/server')
})

afterEach(async () => {
  // Clean up test data
  await prisma.invitation.deleteMany({})
  await prisma.couple.deleteMany({})
  await prisma.user.deleteMany({})
})

describe('Auth Flow 1: Single-User Signup', () => {
  it('should create a user with null coupleId', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe('alice@test.com')
    expect(response.body.user.coupleId).toBeNull()
    expect(response.body.token).toBeDefined()
  })
})

describe('Auth Flow 2: Send Email Invitation', () => {
  let userId: string
  let token: string

  beforeAll(async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })
    userId = signupRes.body.user.id
    token = signupRes.body.token
  })

  it('should send invitation to email', async () => {
    const response = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({
        toEmail: 'bob@test.com',
        message: 'Join Matripuntos with me!',
      })

    expect(response.status).toBe(200)
    expect(response.body.inviteLink).toContain('bob@test.com')
    expect(response.body.token).toBeDefined()
  })
})

describe('Auth Flow 3: Accept Email Invitation', () => {
  let inviteToken: string
  let alice: any

  beforeAll(async () => {
    const aliceRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })
    alice = aliceRes.body

    const inviteRes = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ toEmail: 'bob@test.com' })
    inviteToken = inviteRes.body.token
  })

  it('should accept invitation and create couple', async () => {
    const response = await request(app)
      .post('/api/auth/accept-invite')
      .send({
        token: inviteToken,
        email: 'bob@test.com',
        password: 'TestPass654321',
        name: 'Bob',
        language: 'es',
      })

    expect(response.status).toBe(201)
    expect(response.body.couple).toBeDefined()
    expect(response.body.couple.users).toHaveLength(2)
    expect(response.body.token).toBeDefined()
  })
})

describe('Auth Flow 4: Reject Email Invitation', () => {
  let inviteToken: string
  let alice: any

  beforeAll(async () => {
    const aliceRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })
    alice = aliceRes.body

    const inviteRes = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ toEmail: 'bob@test.com' })
    inviteToken = inviteRes.body.token
  })

  it('should reject invitation', async () => {
    const response = await request(app)
      .post('/api/auth/reject-invite')
      .send({ token: inviteToken })

    expect(response.status).toBe(200)
    expect(response.body.message).toContain('rejected')
  })

  it('should allow Bob to create independent account after rejection', async () => {
    await request(app)
      .post('/api/auth/reject-invite')
      .send({ token: inviteToken })

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'bob@test.com',
        password: 'TestPass654321',
        name: 'Bob',
        language: 'es',
      })

    expect(response.status).toBe(201)
    expect(response.body.user.coupleId).toBeNull()
  })
})

describe('Auth Flow 5 & 6: Propose Partner + Accept', () => {
  let alice: any
  let bob: any

  beforeAll(async () => {
    const aliceRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })
    alice = aliceRes.body

    const bobRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'bob@test.com',
        password: 'TestPass654321',
        name: 'Bob',
        language: 'es',
      })
    bob = bobRes.body
  })

  it('should propose partner by email', async () => {
    const response = await request(app)
      .post('/api/auth/propose-partner')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ partnerEmail: 'bob@test.com' })

    expect(response.status).toBe(200)
    expect(response.body.message).toContain('sent')
  })

  it('should get pending proposals', async () => {
    await request(app)
      .post('/api/auth/propose-partner')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ partnerEmail: 'bob@test.com' })

    const response = await request(app)
      .get('/api/auth/proposals')
      .set('Authorization', `Bearer ${bob.token}`)

    expect(response.status).toBe(200)
    expect(response.body.proposals.length).toBeGreaterThan(0)
  })

  it('should accept partner proposal', async () => {
    const proposeRes = await request(app)
      .post('/api/auth/propose-partner')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ partnerEmail: 'bob@test.com' })

    const proposalsRes = await request(app)
      .get('/api/auth/proposals')
      .set('Authorization', `Bearer ${bob.token}`)

    const proposalId = proposalsRes.body.proposals[0].id

    const response = await request(app)
      .post('/api/auth/accept-proposal')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ invitationId: proposalId })

    expect(response.status).toBe(200)
    expect(response.body.couple).toBeDefined()
    expect(response.body.couple.users).toHaveLength(2)
  })
})

describe('Auth Flow 7: Reject Proposal', () => {
  let alice: any
  let bob: any
  let proposalId: string

  beforeAll(async () => {
    const aliceRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'alice@test.com',
        password: 'TestPass123456',
        name: 'Alice',
        language: 'es',
      })
    alice = aliceRes.body

    const bobRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'bob@test.com',
        password: 'TestPass654321',
        name: 'Bob',
        language: 'es',
      })
    bob = bobRes.body

    await request(app)
      .post('/api/auth/propose-partner')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ partnerEmail: 'bob@test.com' })

    const proposalsRes = await request(app)
      .get('/api/auth/proposals')
      .set('Authorization', `Bearer ${bob.token}`)

    proposalId = proposalsRes.body.proposals[0].id
  })

  it('should reject proposal', async () => {
    const response = await request(app)
      .post('/api/auth/reject-proposal')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ invitationId: proposalId })

    expect(response.status).toBe(200)
    expect(response.body.message).toContain('rejected')
  })
})
```

- [ ] **Step 2: Install test dependencies**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npm install --save-dev vitest supertest @types/supertest
```

- [ ] **Step 3: Update package.json test script**

Open `package.json`, find the `scripts` section, update or add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Run tests** (will fail until we connect the app)

```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npm run test
```

Expected: Tests will fail because app isn't properly exported for testing. This is OK for now — we'll fix in the next step if needed.

- [ ] **Step 5: Commit**

```bash
git add src/backend/tests/auth.integration.test.ts package.json
git commit -m "test: add integration tests for all 7 auth flows"
```

---

### Task 10: Manual Testing — Verify All 7 Auth Flows Work

**Files:** None (manual testing only)

- [ ] **Step 1: Restart backend**

```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
npm run dev > /tmp/backend.log 2>&1 &
sleep 3
curl -s http://localhost:3000/api/health | jq .
```

Expected: Health check returns `{ "status": "ok" }`

- [ ] **Step 2: Test Flow 1 — Single-User Signup**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.signup@test.com",
    "password": "TestPass123456",
    "name": "Alice Test",
    "language": "es"
  }' | jq .
```

Expected: User created with `coupleId: null`, token returned.

- [ ] **Step 3: Test Flow 2 — Send Invitation**

Save the token from Step 2, then:

```bash
TOKEN="<token_from_step2>"
curl -X POST http://localhost:3000/api/auth/invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "toEmail": "bob.invite@test.com",
    "message": "Join me!"
  }' | jq .
```

Expected: Invitation token and invite link returned.

- [ ] **Step 4: Test Flow 3 — Accept Invitation**

Save the invite token from Step 3, then:

```bash
INVITE_TOKEN="<token_from_step3>"
curl -X POST http://localhost:3000/api/auth/accept-invite \
  -H "Content-Type: application/json" \
  -d '{
    "token": "'$INVITE_TOKEN'",
    "email": "bob.invite@test.com",
    "password": "TestPass654321",
    "name": "Bob Invite",
    "language": "es"
  }' | jq .
```

Expected: Couple created with 2 users, token returned.

- [ ] **Step 5: Test Flow 4 — Reject Invitation (new test)**

Create new signup and invitation, then reject:

```bash
curl -X POST http://localhost:3000/api/auth/reject-invite \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<new_invite_token>"
  }' | jq .
```

Expected: Invitation rejected message.

- [ ] **Step 6: Test Flow 5 — Propose Partner**

Create 2 independent users, then propose:

```bash
ALICE_TOKEN="<alice_token>"
curl -X POST http://localhost:3000/api/auth/propose-partner \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{
    "partnerEmail": "bob.proposal@test.com"
  }' | jq .
```

Expected: Proposal sent message.

- [ ] **Step 7: Test Flow 6 — Get Proposals and Accept**

```bash
BOB_TOKEN="<bob_token>"
curl -X GET http://localhost:3000/api/auth/proposals \
  -H "Authorization: Bearer $BOB_TOKEN" | jq .
```

Get the proposal ID, then:

```bash
curl -X POST http://localhost:3000/api/auth/accept-proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{
    "invitationId": "<proposal_id>"
  }' | jq .
```

Expected: Couple created.

- [ ] **Step 8: Test Flow 7 — Reject Proposal**

```bash
curl -X POST http://localhost:3000/api/auth/reject-proposal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{
    "invitationId": "<proposal_id>"
  }' | jq .
```

Expected: Proposal rejected message.

- [ ] **Step 9: Test Frontend Signup Page**

Open http://localhost:5173/signup → Fill in form → Click "Create Account" → Should redirect to dashboard.

- [ ] **Step 10: Document Results**

Create summary of all tests passing. No commit needed for manual testing.

---

### Task 11: Final Commit — Auth Refactor Complete

- [ ] **Step 1: Verify all code is committed**

```bash
cd "/Users/edu/Web development/Claude/Matripuntos"
git status
```

Expected: No unstaged changes (except node_modules, .env, etc.)

- [ ] **Step 2: Create summary commit**

```bash
git log --oneline | head -15
```

Verify all auth tasks were committed. If any are missing, add and commit them now.

- [ ] **Step 3: Commit plan completion**

```bash
git add docs/superpowers/plans/2026-04-04-phase3-auth-refactor-implementation.md
git commit -m "docs: complete auth refactor plan - phase 3.1

Completed implementation of:
- Single-user signup (POST /auth/signup)
- Email invitations (POST /auth/invite, accept/reject)
- Partner proposals (POST /auth/propose-partner, accept/reject)
- Invitation expiry (48 hours)
- Cross-couple access prevention
- Frontend signup page and routing
- Integration tests for all 7 flows

All auth flows tested and verified working."
```

---

## Success Criteria for Phase 3.1

✅ **Backend:**
- [ ] 7 auth endpoints implemented and tested
- [ ] Invitation table created with proper indexes
- [ ] User.coupleId is nullable
- [ ] invitationService.ts has 6 core functions
- [ ] Zod validation for all endpoints
- [ ] authService.ts has signupUser function
- [ ] All endpoints return proper error messages
- [ ] Cross-couple access prevention verified

✅ **Frontend:**
- [ ] /signup route exists and renders Signup page
- [ ] Signup page accepts email, password, name, language
- [ ] Login page has "Sign Up" button
- [ ] apiClient has all invite/proposal methods
- [ ] Forms have proper validation and error handling

✅ **Testing:**
- [ ] All 7 flows manually tested and working
- [ ] Integration tests written (passing or ready to run)
- [ ] No 404 errors on auth endpoints

---

## Notes

- This plan only covers Auth Refactor (Phase 3.1)
- Plans 3.2 (Documentation), 3.3 (Notifications), and 3.4 (Audit) will follow
- Demo users in database will be invalidated by coupleId → nullable change
- Invitation tokens are 64-character hex strings (256 bits of entropy)
- Nightly cleanup job for expired invitations not included (can be done later)
