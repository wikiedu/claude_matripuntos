# MVP 1 · Los Cimientos — Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 bugs in MVP 1 — calendar missing tasks, timezone display mismatch, and notification firing on activity creation instead of on partner response.

**Architecture:** Two backend fixes (calendarService + eventRoutes/negotiationRoutes) and one frontend fix (timezone formatting utility). No schema changes required. No new dependencies.

**Tech Stack:** Node.js + Express + Prisma (backend) · React 18 + TypeScript (frontend) · SQLite (local dev)

---

## File Map

| File | Change |
|---|---|
| `src/backend/src/services/calendarService.ts` | Add TaskLog entries to all calendar queries |
| `src/backend/src/routes/eventRoutes.ts` | Remove `notifyEventProposed` call from POST / |
| `src/backend/src/routes/negotiationRoutes.ts` | Add `notifyEventResponded` on accept/reject/counter |
| `src/frontend/src/utils/dateUtils.ts` | New: timezone-aware date formatting helpers |
| `src/frontend/src/components/CalendarMonth.tsx` | Use `formatLocalDate` helper |
| `src/frontend/src/components/CalendarDay.tsx` | Use `formatLocalDate` helper |
| `src/frontend/src/components/CalendarWeek.tsx` | Use `formatLocalDate` helper |
| `src/frontend/src/components/CalendarDashboard.tsx` | Use `formatLocalDate` helper |
| `src/frontend/src/pages/RequestActivity.tsx` | Use `formatLocalTime` helper |
| `src/frontend/src/pages/RequestInbox.tsx` | Use `formatLocalTime` helper |
| `src/frontend/src/pages/Tasks.tsx` | Use `formatLocalTime` helper |
| `src/frontend/src/pages/History.tsx` | Use `formatLocalTime` helper |

---

## Task 1: Bug 1 — Calendar shows TaskLogs

**Root cause:** `calendarService.ts` queries only `CalendarEntry` table. TaskLogs are stored in a separate `TaskLog` table and never appear in calendar views.

**Fix:** In each calendar query function, run a parallel query for `TaskLog` records in the same date range and merge them into the result as synthetic calendar entries.

**Files:**
- Modify: `src/backend/src/services/calendarService.ts`

- [ ] **Step 1: Understand the TaskLog schema**

Confirm fields in `src/backend/prisma/schema.prisma`:
```
model TaskLog {
  id          String    @id @default(cuid())
  coupleId    String
  taskId      String
  completedBy String?
  date        DateTime
  pointsBase  Decimal
  pointsFinal Decimal
  status      String    // pending / verified / disputed
  task        Task      (relation)
}
```

- [ ] **Step 2: Add `taskLogsToCalendarEntries` helper at bottom of calendarService.ts**

Open `src/backend/src/services/calendarService.ts`. Add after the `getDaysOfWeek` function (line 372):

```typescript
async function getTaskLogsInRange(coupleId: string, startDate: Date, endDate: Date) {
  const logs = await prisma.taskLog.findMany({
    where: {
      coupleId,
      date: { gte: startDate, lte: endDate },
    },
    include: { task: true },
    orderBy: { date: 'asc' },
  })

  return logs.map(log => ({
    id: `tasklog-${log.id}`,
    coupleId: log.coupleId,
    type: 'task' as const,
    title: log.task?.name ?? 'Tarea',
    date: log.date,
    description: `${log.pointsFinal} pts · ${log.status}`,
    color: '#22C55E',
    relatedEventId: null,
    relatedTaskId: log.taskId,
    couple: null,
    createdAt: log.date,
    updatedAt: log.date,
  }))
}
```

- [ ] **Step 3: Update `getMonthCalendar` to include task logs**

Find `getMonthCalendar` (starts line 31). Replace the function body:

```typescript
export async function getMonthCalendar(coupleId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startDate, lte: endDate } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startDate, endDate),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const grouped = groupByDay(allEntries)

  return {
    year,
    month,
    startDate,
    endDate,
    entries: allEntries,
    grouped,
    totalDays: getDaysInMonth(year, month),
  }
}
```

- [ ] **Step 4: Update `getWeekCalendar` to include task logs**

Find `getWeekCalendar` (starts line 73). Replace the function body:

```typescript
export async function getWeekCalendar(coupleId: string, year: number, week: number) {
  const [startDate, endDate] = getWeekDates(year, week)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startDate, lte: endDate } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startDate, endDate),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    year,
    week,
    startDate,
    endDate,
    entries: allEntries,
    daysOfWeek: getDaysOfWeek(startDate),
  }
}
```

- [ ] **Step 5: Update `getDayCalendar` to include task logs**

Find `getDayCalendar` (starts line 109). Replace the function body:

```typescript
export async function getDayCalendar(coupleId: string, date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate())
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59)

  const [entries, taskEntries] = await Promise.all([
    prisma.calendarEntry.findMany({
      where: { coupleId, date: { gte: startOfDay, lte: endOfDay } },
      include: { couple: true },
      orderBy: { date: 'asc' },
    }),
    getTaskLogsInRange(coupleId, startOfDay, endOfDay),
  ])

  const allEntries = [...entries, ...taskEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    date: startOfDay,
    entries: allEntries,
    total: allEntries.length,
  }
}
```

- [ ] **Step 6: Verify the backend builds**

```bash
cd src/backend && npm run build
```

Expected: build completes with no errors (type warnings OK if pre-existing).

- [ ] **Step 7: Manual smoke test**

Start backend (`npm run dev`) and make a request:
```bash
curl -H "Authorization: Bearer <your_token>" \
  http://localhost:3000/api/calendar/month/2026/4
```

Expected: response includes entries with `type: "task"` if any TaskLogs exist for April 2026.

- [ ] **Step 8: Commit**

```bash
git add src/backend/src/services/calendarService.ts
git commit -m "fix: include TaskLogs in calendar month/week/day queries"
```

---

## Task 2: Bug 2 — Timezone-aware date formatting

**Root cause:** Dates arrive from the API as UTC ISO strings. Throughout the frontend they are passed directly to `new Date()` and then rendered with `.toLocaleDateString()` or `.getHours()`. This can show the correct local date for display strings, but time-only extractions (`.getHours()`, `.getMinutes()`) are correct on modern browsers. The actual bug is that some components use raw `.toISOString().split('T')[1]` or similar patterns that strip the local offset, showing UTC times instead of local.

**Fix:** Create a single `dateUtils.ts` utility with `formatLocalDate`, `formatLocalTime`, and `formatLocalDateTime` functions. Replace all ad-hoc date formatting in the frontend with these helpers.

**Files:**
- Create: `src/frontend/src/utils/dateUtils.ts`
- Modify: `src/frontend/src/components/CalendarMonth.tsx`
- Modify: `src/frontend/src/components/CalendarDay.tsx`
- Modify: `src/frontend/src/components/CalendarWeek.tsx`
- Modify: `src/frontend/src/components/CalendarDashboard.tsx`
- Modify: `src/frontend/src/pages/RequestActivity.tsx`
- Modify: `src/frontend/src/pages/RequestInbox.tsx`
- Modify: `src/frontend/src/pages/Tasks.tsx`
- Modify: `src/frontend/src/pages/History.tsx`

- [ ] **Step 1: Create `src/frontend/src/utils/dateUtils.ts`**

```typescript
/**
 * Timezone-aware date formatting utilities.
 * All functions accept ISO strings or Date objects and format in the
 * user's LOCAL timezone using the browser's Intl API.
 */

const userLocale = navigator.language || 'es-ES'

/** Returns "11 abr 2026" */
export function formatLocalDate(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(date))
}

/** Returns "17:30" */
export function formatLocalTime(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(date))
}

/** Returns "11 abr · 17:30" */
export function formatLocalDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(date))
}

/** Returns "lun 7 abr" */
export function formatLocalWeekDay(date: string | Date): string {
  return new Intl.DateTimeFormat(userLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(date))
}

/** Returns ISO date string "2026-04-11" in local timezone */
export function toLocalDateString(date: string | Date): string {
  const d = new Date(date)
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).format(d) // en-CA produces YYYY-MM-DD format
}
```

- [ ] **Step 2: Find all UTC-incorrect patterns in calendar components**

Search for raw time extraction patterns:
```bash
grep -rn "\.split('T')\|getHours()\|getMinutes()\|toISOString()" src/frontend/src/components/Calendar*.tsx src/frontend/src/pages/
```

Note each file and line number.

- [ ] **Step 3: Update CalendarMonth.tsx**

In `src/frontend/src/components/CalendarMonth.tsx`, add import at top:
```typescript
import { toLocalDateString, formatLocalTime } from '../utils/dateUtils'
```

Find any usage of `.toISOString().split('T')[0]` in the component and replace with `toLocalDateString(entry.date)`.

Example — if you find:
```typescript
const dateStr = entry.date.toISOString().split('T')[0]
```
Replace with:
```typescript
const dateStr = toLocalDateString(entry.date)
```

- [ ] **Step 4: Update CalendarDay.tsx**

In `src/frontend/src/components/CalendarDay.tsx`, add import:
```typescript
import { formatLocalDate, formatLocalTime, formatLocalDateTime } from '../utils/dateUtils'
```

Replace any `.toLocaleDateString()` calls that don't pass a timezone option with `formatLocalDate(date)`.
Replace any time display patterns (e.g. `date.getHours() + ':' + ...`) with `formatLocalTime(date)`.

- [ ] **Step 5: Update CalendarWeek.tsx and CalendarDashboard.tsx**

Apply the same pattern: add import from `../utils/dateUtils` and replace raw date formatting with the appropriate helper.

- [ ] **Step 6: Update page components (RequestActivity, RequestInbox, Tasks, History)**

For each file in `src/frontend/src/pages/`:

```typescript
import { formatLocalDate, formatLocalTime, formatLocalDateTime } from '../utils/dateUtils'
```

Replace patterns like:
- `new Date(x).toLocaleDateString()` → `formatLocalDate(x)`
- `new Date(x).toLocaleTimeString()` → `formatLocalTime(x)`
- `new Date(x).toLocaleString()` → `formatLocalDateTime(x)`

- [ ] **Step 7: Verify frontend builds**

```bash
cd src/frontend && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 8: Manual smoke test**

Start frontend (`npm run dev`). Navigate to Calendar, Tasks, and History pages. Verify times shown match the current system clock time, not UTC.

- [ ] **Step 9: Commit**

```bash
git add src/frontend/src/utils/dateUtils.ts \
  src/frontend/src/components/CalendarMonth.tsx \
  src/frontend/src/components/CalendarDay.tsx \
  src/frontend/src/components/CalendarWeek.tsx \
  src/frontend/src/components/CalendarDashboard.tsx \
  src/frontend/src/pages/RequestActivity.tsx \
  src/frontend/src/pages/RequestInbox.tsx \
  src/frontend/src/pages/Tasks.tsx \
  src/frontend/src/pages/History.tsx
git commit -m "fix: timezone-aware date formatting with Intl API, add dateUtils helpers"
```

---

## Task 3: Bug 3 — Notification fires on activity create, not on partner response

**Root cause:** `eventRoutes.ts` line 59 calls `notifyEventProposed()` immediately after creating the event (inside `POST /`). The notification should only fire when the *partner* responds — accepts, rejects, or counter-proposes.

`notificationService.ts` already has `notifyEventResponded()` function ready to use.

**Files:**
- Modify: `src/backend/src/routes/eventRoutes.ts` (remove notification call)
- Modify: `src/backend/src/routes/negotiationRoutes.ts` (add notification on response)

- [ ] **Step 1: Remove `notifyEventProposed` call from eventRoutes.ts**

Open `src/backend/src/routes/eventRoutes.ts`.

Find lines 58–64:
```typescript
    // Send notification to partner
    await notifyEventProposed(
      event.id,
      req.coupleId,
      req.userId,
      event.title || `${event.type} Activity`
    )
```

Delete those 7 lines entirely.

Also remove the unused import on line 4:
```typescript
import { notifyEventProposed } from '../services/notificationService.js'
```

- [ ] **Step 2: Check what `notifyEventResponded` expects**

Read `src/backend/src/services/notificationService.ts`, function `notifyEventResponded` (around line 116). Confirm its signature — expected:
```typescript
export async function notifyEventResponded(
  eventId: string,
  coupleId: string,
  respondedBy: string,
  responseType: 'accepted' | 'rejected' | 'counter_proposed',
  eventTitle: string
): Promise<void>
```

- [ ] **Step 3: Add notification import to negotiationRoutes.ts**

Open `src/backend/src/routes/negotiationRoutes.ts`. At the top, add:
```typescript
import { notifyEventResponded } from '../services/notificationService.js'
```

- [ ] **Step 4: Find the response handler in negotiationRoutes.ts**

Locate the section handling `responseType === 'accepted'`, `'rejected'`, and `'counter_proposed'` (around lines 143–231).

At the end of the main `if/else if` block, before the final `res.json(...)`, add one call that covers all three response types:

```typescript
    // Notify the event creator about the response
    try {
      await notifyEventResponded(
        negotiation.eventId,
        req.coupleId,
        req.userId,
        data.responseType as 'accepted' | 'rejected' | 'counter_proposed',
        negotiation.event?.title || negotiation.event?.type || 'Actividad'
      )
    } catch (notifError) {
      // Non-fatal: log but don't fail the request
      console.error('Failed to send response notification:', notifError)
    }
```

Place this block **after** the if/else if chain and **before** `res.json(...)`.

- [ ] **Step 5: Verify `negotiation.event` is included in the Prisma query**

Search in `negotiationRoutes.ts` for the `prisma.negotiation.findFirst` or `findUnique` call that fetches the negotiation before processing. Confirm it includes `event`:

```typescript
include: {
  event: true,
  // ... other includes
}
```

If `event` is not included, add it:
```typescript
const negotiation = await prisma.negotiation.findFirst({
  where: { ... },
  include: {
    event: true,
    // keep any existing includes
  },
})
```

- [ ] **Step 6: Verify backend builds**

```bash
cd src/backend && npm run build
```

Expected: no new errors.

- [ ] **Step 7: Manual smoke test**

1. Create an activity as User A — confirm User B does NOT receive a notification yet.
2. Have User B accept/reject/counter the activity — confirm User B's action triggers a notification to User A.

Check notifications via:
```bash
curl -H "Authorization: Bearer <user_a_token>" \
  http://localhost:3000/api/notifications
```

Expected: notification appears after response, not after creation.

- [ ] **Step 8: Commit**

```bash
git add src/backend/src/routes/eventRoutes.ts \
  src/backend/src/routes/negotiationRoutes.ts
git commit -m "fix: move activity notification from creation to partner response"
```

---

## Task 4: Deploy MVP 1 to production

**Goal:** Push MVP 1 (Los Cimientos) to production with all 3 bug fixes.

**Files:**
- No file changes — deployment steps only.

- [ ] **Step 1: Ensure all local tests pass**

```bash
cd src/backend && npm run build
cd ../frontend && npm run build
```

Expected: both build successfully.

- [ ] **Step 2: Push to main branch**

```bash
git checkout main
git merge --no-ff feature/matripuntos-mvp -m "feat: merge MVP 1 Los Cimientos"
git push origin main
```

- [ ] **Step 3: Tag the release**

```bash
git tag -a "mvp1" -m "MVP 1 · Los Cimientos — base completa + 3 bug fixes"
git push origin mvp1
```

- [ ] **Step 4: Deploy backend to Railway/Render**

If using Railway:
```bash
railway up
```

If using Render, push to main triggers auto-deploy. Monitor deploy logs in the Render dashboard.

- [ ] **Step 5: Run database migrations in production**

```bash
# Via Railway CLI or Render SSH
npx prisma migrate deploy
```

Expected: all migrations applied, no errors.

- [ ] **Step 6: Deploy frontend to Vercel**

Push to main triggers auto-deploy on Vercel. Monitor in Vercel dashboard.

Alternatively:
```bash
cd src/frontend && npx vercel --prod
```

- [ ] **Step 7: Smoke test production**

1. Open production URL
2. Register a new user + create a couple
3. Create an activity → verify NO notification fires immediately
4. Have partner respond → verify notification appears for creator
5. Open Calendar → verify TaskLogs appear alongside events
6. Check that times match local timezone

- [ ] **Step 8: Update CLAUDE.md version status**

In `CLAUDE.md`, update the Estado Actual section to reflect MVP 1 is complete:

```markdown
## 9. ESTADO ACTUAL

**MVP 1 · Los Cimientos — COMPLETO ✓ (branch: main)**
```

- [ ] **Step 9: Commit CLAUDE.md update**

```bash
git add CLAUDE.md
git commit -m "docs: mark MVP 1 Los Cimientos as complete"
git push origin main
```

---

## Self-Review Notes

- Task 1: `getTaskLogsInRange` uses `prisma.taskLog` — confirm this matches the Prisma model name (it is `TaskLog` → client accessor is `prisma.taskLog`). ✓
- Task 2: `toLocalDateString` uses `en-CA` locale which produces `YYYY-MM-DD` — this is intentional and locale-independent. ✓
- Task 3: The notification call is wrapped in try/catch to prevent notification failures from breaking the accept/reject flow. ✓
- Task 4: Deploy steps assume Railway + Vercel setup per CLAUDE.md. Adjust CLI commands if using Render for backend. ✓
