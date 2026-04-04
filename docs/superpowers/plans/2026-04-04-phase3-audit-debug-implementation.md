# Phase 3.4: Audit & Debug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Static code audit, live testing of all critical flows, identify and fix issues, verify auth/authz throughout.

**Architecture:** Systematic review of backend routes, frontend API client, TypeScript types, auth/authz checks, then E2E testing.

**Tech Stack:** Existing (no new tech).

---

## File Structure

No new files — audit and review existing code. Fix identified issues inline.

---

## Tasks

### Task 1: Backend Route Audit

- [ ] **Step 1:** List all backend routes

```bash
cd "/Users/edu/Web development/Claude/Matripuntos/src/backend"
grep -r "router\.post\|router\.get\|router\.put\|router\.delete" src/routes/*.ts | wc -l
```

Count: should be ~50+ endpoints

- [ ] **Step 2:** Verify all routes in apiClient.ts exist

```bash
grep -o "this\.request\|apiClient\." src/frontend/src/services/apiClient.ts | wc -l
```

Cross-reference with backend routes. Check for:
- `/auth/signup` ✅ (exists)
- `/auth/login` ✅ (exists)
- `/events` ✅ (exists)
- `/tasks` ✅ (exists)
- `/points/*` ✅ (exists)
- `/negotiations` ✅ (exists)
- `/notifications` ✅ (exists)
- etc.

List any mismatches or missing endpoints.

- [ ] **Step 3:** Verify route collision prevention

```bash
grep "router.post\|router.get" src/backend/src/routes/*.ts | grep -E "'/api/(points|events|tasks)" | sort | uniq -d
```

No duplicates expected. If found, fix by moving one to different route or merging.

- [ ] **Step 4:** Document findings

Create summary: ✅ All routes matched or ❌ List mismatches

---

### Task 2: Backend Auth/Authz Audit

- [ ] **Step 1:** Verify all protected routes have authMiddleware

```bash
grep -B5 "authMiddleware" src/backend/src/routes/*.ts | grep "router\." | wc -l
```

Expected: ~30+ protected routes

- [ ] **Step 2:** Verify coupleId checks

```bash
grep "req\.coupleId" src/backend/src/routes/*.ts | wc -l
```

Check that every query includes:

```typescript
where: { coupleId: req.coupleId, ... }
```

Find any routes that query without coupleId check → FIX by adding where clause.

- [ ] **Step 3:** Check for any `any` types in authService

```bash
grep -n "any" src/backend/src/services/authService.ts
```

Replace with proper TypeScript types.

- [ ] **Step 4:** Document findings and fixes applied

---

### Task 3: Frontend TypeScript Type Audit

- [ ] **Step 1:** Find all `any` types in frontend

```bash
grep -r "any" src/frontend/src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -20
```

For each:
- If in critical files (apiClient, useAppStore, pages), replace with proper type
- If in UI components, can leave if intent is clear

- [ ] **Step 2:** Check types/index.ts for completeness

```bash
cat src/frontend/src/types/index.ts | wc -l
```

Expected: types for User, Couple, Event, Task, Notification, etc.

Add any missing types.

- [ ] **Step 3:** Verify API responses match types

Sample check:

```typescript
// apiClient returns this:
const data = await apiClient.auth.signup(...)
// TypeScript should know it's { user, token }
// Verify no 'any' in response handling
```

- [ ] **Step 4:** Document changes

---

### Task 4: Backend Validation (Zod) Audit

- [ ] **Step 1:** Check all V2 routes have Zod validation

Routes to check:
- `/profile` (userProfile routes)
- `/family` (children, pets)
- `/categories` (custom categories)
- `/achievements` (if any new endpoints)
- `/calendar` (calendar entries)
- `/analytics` (if POST operations)

Find any missing → Add schema and apply validation

- [ ] **Step 2:** Verify error handling is consistent

All routes should:

```typescript
if (error instanceof ZodError) {
  res.status(400).json({ error: 'Validation error', details: ... })
}
```

- [ ] **Step 3:** Document validation coverage

---

### Task 5: Live Testing — Auth Flows (from Plan 3.1)

- [ ] **Step 1:** All 7 auth flows from Task 10 of auth plan

Verify:
1. Single-user signup ✅
2. Email invite ✅
3. Accept invite ✅
4. Reject invite ✅
5. Propose partner ✅
6. Accept proposal ✅
7. Reject proposal ✅

- [ ] **Step 2:** Document results: all passing or list failures

---

### Task 6: Live Testing — Critical User Flows

- [ ] **Step 1:** Event + Negotiation Flow

1. User 1: Create event (type, dates, hijos, puntos)
2. Verify points calculated
3. User 2: Propose counter → POST
4. User 1: Accept → PointsTransaction created
5. Verify balance updated

- [ ] **Step 2:** Task Flow

1. Create task
2. Log task completion
3. Partner verify
4. Points added
5. Check points balance

- [ ] **Step 3:** Notifications Flow

1. Accept event → notification sent
2. View notifications
3. Mark read
4. Check badge count

- [ ] **Step 4:** Achievements Flow

1. Accept event → achievement check triggered
2. Manual `/achievements/check` call
3. Verify unlock
4. Check widget/page

- [ ] **Step 5:** Document results

All flows working or list issues found.

---

### Task 7: Cross-Couple Access Prevention Test

- [ ] **Step 1:** Create 2 couples in database

```bash
# Via test endpoint or manual DB insert
curl -X POST http://localhost:3000/api/auth/signup ...  # Couple A
curl -X POST http://localhost:3000/api/auth/signup ...  # Couple B
```

- [ ] **Step 2:** Attempt cross-couple access

Token from Couple A User 1, try to:

```bash
# Get Couple B's data (should fail or return empty)
curl -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer COUPLE_A_TOKEN"
```

Expected: Only Couple A's events returned, never Couple B's

- [ ] **Step 3:** Verify all endpoints respect coupleId

Check 5-10 critical endpoints. None should leak cross-couple data.

- [ ] **Step 4:** Document findings

---

### Task 8: Performance Spot Check

- [ ] **Step 1:** Dashboard load time

Open http://localhost:5173/dashboard, check Network tab (DevTools).

Expected: < 2s to load all data

- [ ] **Step 2:** Points calculation

Create 5 events, verify calculation is instant (< 100ms)

- [ ] **Step 3:** Query count

No N+1 queries (e.g., loading 5 events shouldn't query DB 10 times)

Check: include relations in single query, not loop-per-item

- [ ] **Step 4:** Document findings

---

### Task 9: Fix All Issues Found

- [ ] **Step 1:** Create issue list from Tasks 1-8

Example issues:
- Missing validation in /profile endpoint
- `any` type in TaskPendingCard props
- Cross-couple access in /notifications
- etc.

- [ ] **Step 2:** Fix each issue

For each:
1. Modify file
2. Test (if code)
3. Commit with message like: `fix: add cross-couple validation to /notifications`

- [ ] **Step 3:** Verify fix

Re-test to ensure issue is resolved.

---

### Task 10: Final Integration Test

- [ ] **Step 1:** Run through complete user journey

1. Sign up User A
2. Invite User B
3. User B accepts → couple formed
4. Create event → negotiate → accept
5. Create task → log → verify
6. Check achievements, notifications, dashboard
7. Check analytics
8. Edit settings
9. Logout and login

All without errors, all data persists correctly.

- [ ] **Step 2:** Test on mobile viewport

Open DevTools → Device mode → iPhone 12

Verify responsive, no layout breaks, buttons clickable.

- [ ] **Step 3:** Document results: PASS or list issues

---

### Task 11: Create Audit Report

- [ ] **Step 1:** Summarize findings

Create summary document:

```
# Phase 3 Audit Report

## Backend
- [ ] Routes: All 50+ endpoints verified
- [ ] Auth/Authz: All 30+ protected routes checked
- [ ] Validation: Zod schemas on X% of routes
- [ ] Types: No critical `any` types

## Frontend
- [ ] API client: All Y methods mapped to backend
- [ ] TypeScript: Z% coverage (no critical `any`)
- [ ] State: React Query invalidations working

## Tests
- [ ] Auth flows: 7/7 passing
- [ ] User flows: Events, Tasks, Notifications all working
- [ ] Cross-couple: No data leakage detected
- [ ] Performance: < 2s dashboard load

## Issues Found & Fixed
- X issues identified
- X issues fixed
- Y issues deferred to future phases

## Go/No-Go: ✅ PASS
All critical systems verified working. Ready for deployment.
```

- [ ] **Step 2:** Commit report

```bash
git add audit-report.md
git commit -m "docs: phase 3 audit report - all systems verified"
```

---

## Success Criteria

✅ All backend routes verified against frontend apiClient
✅ Auth/authz checks on all protected routes
✅ No cross-couple data leakage possible
✅ All 7 auth flows tested and working
✅ All critical user flows (events, tasks, notifications, achievements) working
✅ TypeScript types on critical code
✅ Validation on all V2 routes
✅ Mobile responsive verified
✅ All identified issues fixed or tracked for future

---

## Notes

- This phase is quality gate before deployment
- Any critical issues found → fix before Phase 3 complete
- Non-critical issues (performance tweaks, nice-to-have types) → backlog for Phase 4
