# Phase 3: Auth Refactor + Notifications + Documentation + Audit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable single-user signup with bidirectional invitations, fix notification UX, restructure documentation, and audit authentication/authorization across the app.

**Architecture:** Refactor auth system from couple-based to single-user with flexible coupling via invitations (email-based or user-proposed). Parallel workstreams: auth refactor + docs restructure → notifications + audit.

**Tech Stack:** TypeScript backend (Express + Prisma), React frontend (React Query + Zustand), SQLite local.

---

## System Overview

### Core Philosophy

**Auth System:**
- Single-user signup first, couple formation is flexible and optional
- Bidirectional invitations: User A invites User B by email, OR User B proposes User A as partner from different email
- 48-hour invitation expiry with reject/accept/ignore options
- Cross-couple access prevention throughout app

**Notifications & Activity:**
- Rich task verification cards with full context (task name, category, date, who completed, direct verify/reject buttons)
- Recent activity feed showing last 5 significant movements (events, tasks, negotiations) with dates and clickable navigation

**Documentation:**
- Centralized CLAUDE.md for Claude's session context (~200 lines)
- 4 reference docs in /docs/ for deep dives (PUNTOS, API, FLUJOS, DATOS)
- Archive all historical files (/archive/)

**Audit & Debug:**
- Static code audit (routes, types, security, API client mapping)
- Live testing of all critical flows
- Fix identified issues (route collisions, missing validations, type safety)

---

## Phase 3a: Auth Refactor (Single-User Signup + Bidirectional Invitations)

### Data Model

**New Tables:**

```prisma
model Invitation {
  id              String    @id @default(cuid())
  fromUserId      String    @db.String
  fromUser        User      @relation("InvitationsSent", fields: [fromUserId], references: [id])
  toEmail         String?   // For email-based invites
  toUserId        String?   @db.String // For user-proposed invites
  toUser          User?     @relation("InvitationsReceived", fields: [toUserId], references: [id])
  token           String    @unique
  type            String    // "email_invite" | "user_proposal"
  status          String    // "pending" | "accepted" | "rejected"
  coupleId        String?   @db.String // Couple that will be formed if accepted
  expiresAt       DateTime
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Modified Tables:**

```prisma
// User: coupleId becomes optional (NULL = single user not yet paired)
model User {
  // ...existing fields...
  coupleId        String?   @db.String // NULL if single user
  couple          Couple?   @relation(fields: [coupleId], references: [id])
  
  invitationsSent       Invitation[] @relation("InvitationsSent")
  invitationsReceived   Invitation[] @relation("InvitationsReceived")
}

// Couple: remains 2 users, but created dynamically on couple acceptance
model Couple {
  // ...existing fields...
  // No changes, but createdAt logic changes
}
```

---

### Auth Flows

#### Flow 1: Single-User Signup

```
POST /auth/signup
{
  "email": "alice@example.com",
  "password": "SecurePass123",
  "name": "Alice",
  "language": "es"
}

Response:
{
  "message": "Account created successfully",
  "user": {
    "id": "user_123",
    "email": "alice@example.com",
    "name": "Alice",
    "coupleId": null,  // Single user
    "token": "jwt..."
  }
}
```

#### Flow 2: Send Email Invitation

```
POST /auth/invite
Authorization: Bearer <token>
{
  "toEmail": "bob@example.com",
  "message": "Join me in Matripuntos to manage our household together!"
}

Response:
{
  "message": "Invitation sent",
  "token": "inv_abc123xyz",
  "expiresAt": "2026-04-06T14:30:00Z",
  "inviteLink": "http://localhost:5173/onboarding/join?token=inv_abc123xyz&email=bob@example.com"
}

Backend:
- Creates Invitation: fromUserId=alice_id, toEmail="bob@example.com", type="email_invite", status="pending", expiresAt=now+48h
- Generates unique token
- (Optional: sends email via sendgrid/mailgun)
```

#### Flow 3: Accept Email Invitation

```
GET /onboarding/join?token=inv_abc123xyz&email=bob@example.com
Frontend: Shows signup form pre-filled with email

POST /auth/accept-invite
{
  "token": "inv_abc123xyz",
  "password": "SecurePass456",
  "name": "Bob",
  "language": "es"
}

Response:
{
  "message": "Account created and linked to Alice",
  "couple": {
    "id": "couple_123",
    "users": [
      { "id": "alice_id", "name": "Alice", "email": "alice@example.com" },
      { "id": "bob_id", "name": "Bob", "email": "bob@example.com" }
    ]
  },
  "token": "jwt..."
}

Backend:
1. Validate token exists, not expired, status="pending"
2. Check email matches toEmail
3. Create User with Bob's data
4. Update Invitation: status="accepted", toUserId=bob_id
5. Create Couple linking both users
6. Return JWT for Bob
```

#### Flow 4: Reject Email Invitation

```
POST /auth/reject-invite
{
  "token": "inv_abc123xyz"
}

Response:
{
  "message": "Invitation rejected",
  "note": "You can now create an independent account or invite someone else"
}

Backend:
1. Validate token exists, status="pending"
2. Update Invitation: status="rejected"
3. Do NOT create couple
4. User is still free to sign up independently or propose to others
```

#### Flow 5: Signup with Different Email + Propose Partner

```
Scenario: Alice invited bob@example.com, but Bob didn't see invite and signed up with bob.smith@example.com

POST /auth/signup
{
  "email": "bob.smith@example.com",
  "password": "SecurePass456",
  "name": "Bob Smith",
  "language": "es"
}
// Creates independent account

Later, Bob goes to Settings and sees "Add Partner":

POST /auth/propose-partner
Authorization: Bearer <bob_token>
{
  "partnerEmail": "alice@example.com"
}

Response:
{
  "message": "Partnership proposal sent to alice@example.com",
  "expiresAt": "2026-04-06T14:30:00Z"
}

Backend:
1. Find User with email="alice@example.com"
2. Create Invitation: fromUserId=bob_id, toUserId=alice_id, type="user_proposal", status="pending", expiresAt=now+48h
3. Create notification for Alice: "Bob Smith wants to be your partner"
```

#### Flow 6: Accept Partner Proposal

```
Alice receives notification about Bob's proposal

POST /auth/accept-proposal
Authorization: Bearer <alice_token>
{
  "invitationId": "inv_proposal_123"
}

Response:
{
  "message": "Partnership accepted",
  "couple": {
    "id": "couple_456",
    "users": [
      { "id": "alice_id", "name": "Alice", "email": "alice@example.com" },
      { "id": "bob_id", "name": "Bob Smith", "email": "bob.smith@example.com" }
    ]
  }
}

Backend:
1. Validate invitation exists, type="user_proposal", status="pending", not expired
2. Update Invitation: status="accepted"
3. Create Couple linking both users
4. Create notification for Bob: "Alice accepted your partnership proposal"
5. Return couple data
```

#### Flow 7: Reject Partner Proposal

```
POST /auth/reject-proposal
Authorization: Bearer <alice_token>
{
  "invitationId": "inv_proposal_123"
}

Response:
{
  "message": "Proposal rejected. You remain independent."
}

Backend:
1. Validate invitation exists, status="pending"
2. Update Invitation: status="rejected"
3. Create notification for Bob: "Alice declined your partnership proposal"
4. Both users remain independent
```

---

### API Endpoints (Auth Refactor)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/signup` | POST | No | Single-user signup |
| `/api/auth/login` | POST | No | Login (existing, no change) |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/auth/couple` | GET | Yes | Get couple data (if paired) |
| `/api/auth/invite` | POST | Yes | Send email invitation |
| `/api/auth/accept-invite` | POST | No | Accept email invite (includes signup) |
| `/api/auth/reject-invite` | POST | No | Reject email invite |
| `/api/auth/propose-partner` | POST | Yes | Propose partner by email |
| `/api/auth/accept-proposal` | POST | Yes | Accept partner proposal |
| `/api/auth/reject-proposal` | POST | Yes | Reject partner proposal |

---

### Frontend Changes (Auth Refactor)

**New Pages:**
- `src/frontend/src/pages/Signup.tsx` — Single-user signup form
- `src/frontend/src/pages/OnboardingJoin.tsx` — Accept invite + signup flow

**Modified Pages:**
- `src/frontend/src/pages/Login.tsx` — Add "Sign Up" button linking to `/signup`
- `src/frontend/src/pages/Settings.tsx` — Add "Add Partner" section (if single user)

**New Store (Zustand):**
- `useAuthStore.authInvite()`, `acceptInvite()`, `proposePartner()`, `acceptProposal()`

**New Components:**
- `InvitationNotification.tsx` — Shows pending invitations/proposals in header
- `PartnerProposalCard.tsx` — Dialog for proposing/accepting partners

---

## Phase 3b: Notifications & Activity History (Spec 1)

### Changes

**Backend Endpoints:**

```
GET /api/recent-activity
- Returns last 5 movements (events, tasks, negotiations)
- Ordered DESC by date
- Response: [{ id, type: 'event'|'task'|'negotiation', name, date, relatedId }]

PUT /api/tasks/logs/:logId
- Enhanced: include task + completedBy relations
- Response includes full task context
```

**Frontend Pages:**

- `src/frontend/src/pages/RequestInbox.tsx` — Updated with TaskPendingCard
- `src/frontend/src/pages/Dashboard.tsx` — Add RecentMovementItem section

**Frontend Components:**

- `src/frontend/src/components/TaskPendingCard.tsx` — Task verification card with full context
- `src/frontend/src/components/RecentMovementItem.tsx` — Activity feed item

---

## Phase 3c: Documentation Restructure (Spec 2)

### Changes

**Create:**
- `CLAUDE.md` (205 lines) — Claude's session context
  - Sections: Proyecto, Stack, Estructura, Cómo Arrancar, BD, API, Puntos, Negocios, Estado, Convenciones
- `docs/PUNTOS.md` — Expanded points system reference
- `docs/API.md` — All endpoints reference
- `docs/FLUJOS.md` — UX flow diagrams
- `docs/DATOS.md` — Prisma schema reference

**Archive:**
- Move all historical files to `archive/` (PHASE1_COMPLETE.md, PHASE2_COMPLETE.md, etc., testing guides, setup scripts, progress reports)

**Delete:**
- README.md (becomes reference only)

---

## Phase 3d: Audit & Debug (Spec 3)

### Static Code Audit

**Backend:**
- [ ] Route audit: verify all apiClient calls have corresponding backend routes
- [ ] Auth/Authz: confirm all protected routes use authMiddleware
- [ ] Cross-couple access: verify req.coupleId is checked before queries
- [ ] Zod validation: confirm all V2 routes have validation schemas
- [ ] Decimal usage: verify Prisma Decimal used consistently for points
- [ ] Type safety: check for `any` types in critical services

**Frontend:**
- [ ] API client audit: every method mapped to actual backend route
- [ ] TypeScript: locate and type all `any` types
- [ ] State management: Zustand updates reflected in UI
- [ ] React Query: mutations invalidate related queries
- [ ] Navigation: all App.tsx routes have corresponding pages

**Issues Found & Fixes:**
- [ ] Fix missing route collisions (pointsV2 vs points)
- [ ] Fix signup flow (this phase)
- [ ] Add missing validations
- [ ] Resolve type mismatches

### Live Testing

**Test Suite:**
- [ ] Flow 1: Single-user signup
- [ ] Flow 2-3: Email invitation + accept
- [ ] Flow 4: Email invitation + reject
- [ ] Flow 5-6: Partner proposal + accept
- [ ] Events: create, negotiate, accept
- [ ] Tasks: create, log, verify, dispute
- [ ] Notifications: appear, mark read
- [ ] Achievements: unlock, view
- [ ] Analytics: load data
- [ ] Settings: edit multipliers

**Deliverables:**
- [ ] Screenshots of each page
- [ ] Bug/issue log
- [ ] Performance notes

---

## Implementation Sequence

### Phase 3a: Auth Refactor (Days 1-2)
1. Database migration: add Invitation table, make coupleId optional
2. Backend auth endpoints: all 7 flows
3. Zod schemas for each endpoint
4. Frontend signup page
5. Frontend invite/proposal components
6. Update Zustand auth store
7. Integration test all flows

### Phase 3b: Notifications & Activity (Days 3-4)
1. Backend: recent-activity endpoint
2. Backend: enrich task logs with relations
3. Frontend: TaskPendingCard component
4. Frontend: RecentMovementItem component
5. Frontend: integrate into Dashboard and Inbox
6. React Query hooks
7. Live testing

### Phase 3c: Documentation (Days 5)
1. Write CLAUDE.md
2. Write 4 reference docs (PUNTOS, API, FLUJOS, DATOS)
3. Move historical files to archive/
4. Update README.md
5. Commit all docs

### Phase 3d: Audit & Debug (Days 6-7)
1. Static audit: backend routes, auth/authz, types
2. Static audit: frontend API client, TypeScript, state
3. Fix identified issues
4. Live testing of all critical flows
5. Fix bugs found during testing
6. Performance review

---

## Success Criteria

✅ Auth:
- New users can sign up individually
- Email invitations work (send, accept, reject)
- Partner proposals work (propose, accept, reject)
- All 7 auth flows tested end-to-end
- No cross-couple data leakage

✅ Notifications & Activity:
- Task cards show full context (task name, category, date, who completed)
- Verify/reject buttons work directly from card
- Recent activity feed shows last 5 movements with correct dates
- All items clickable for navigation

✅ Documentation:
- CLAUDE.md is concise (~200 lines), complete, and in session context
- 4 reference docs exist and are comprehensive
- All historical files archived
- No redundancy between CLAUDE.md and reference docs

✅ Audit & Debug:
- All auth/authz checks in place
- No cross-couple access possible
- TypeScript types are complete (no `any` in critical code)
- All API client methods mapped to backend
- All critical flows tested and passing
- No 404 errors or missing endpoints

---

## Error Handling

**Auth Errors:**
- Invalid/expired token → 401 Unauthorized
- Email already registered → 400 Bad Request
- Invitation expired → 400 Bad Request with "expired" reason
- Email mismatch → 400 Bad Request

**Notifications/Activity Errors:**
- Unauthorized access → 401
- Resource not found → 404

---

## Testing Strategy

**Unit Tests:**
- Invitation expiry logic
- Cross-couple access prevention
- Auth middleware validation

**Integration Tests:**
- Full auth flows (all 7)
- Event/task/notification flows with new auth
- Activity feed data population

**Live Testing:**
- Browser: complete user journeys
- Mobile: responsive design
- Error states: all error paths

---

## Rollout Plan

**Phase 3a (Auth):** Backend + Frontend + Testing (2 days)
**Phase 3b (Notifications):** Frontend components + Backend endpoints (2 days)
**Phase 3c (Documentation):** Write + Archive (1 day)
**Phase 3d (Audit & Debug):** Code audit + Testing + Fixes (2 days)

**Total: 7 days to Phase 3 complete**

---

## Notes for Implementation

- Auth refactor is **breaking change** from current demo-based system — all demo users will be invalidated
- Couple formation is now **flexible** — users can be independent or coupled
- Invitations are **48-hour limited** — will need nightly cleanup job
- Cross-couple access **must be verified** at every query — no exceptions
- Frontend routing changes: `/signup`, `/onboarding/join/:token` are new
