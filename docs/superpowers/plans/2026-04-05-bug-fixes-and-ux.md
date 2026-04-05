# Matripuntos Bug Fixes + UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 critical bugs (activity points logic, tasks inbox display, dashboard chart, analytics period charts) plus moderate UX improvements.

**Architecture:** Bug fixes are surgical — each one is isolated to 1-3 files. The analytics daily-breakdown adds one new service function + one new route + updates the frontend chart. No schema changes required.

**Tech Stack:** Node.js + Express + Prisma (backend) · React 18 + TypeScript + Zustand + React Query + Recharts (frontend)

**Spec:** `docs/superpowers/specs/2026-04-05-bug-fixes-and-ux-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/backend/src/routes/negotiationRoutes.ts` | Modify | Remove `event_accepted_credit` transaction |
| `src/backend/src/routes/pointsRoutes.ts` | Modify | Handle single-user chart, always return 30 days |
| `src/backend/src/routes/analytics.ts` | Modify | Add `GET /daily-breakdown` endpoint |
| `src/backend/src/services/analyticsService.ts` | Modify | Add `getDailyBreakdown` function |
| `src/frontend/src/services/apiClient.ts` | Modify | Fix `fetchPendingTaskLogs`, add `getDailyBreakdown` call |
| `src/frontend/src/pages/RequestInbox.tsx` | Modify | Fix tasks tab: real array, partner-only filter, remove "+pts" text |
| `src/frontend/src/pages/Dashboard.tsx` | Modify | Always render chart, handle no-data state, UX polish |
| `src/frontend/src/components/AnalyticsDashboard.tsx` | Modify | Use daily breakdown, dynamic period label |
| `src/frontend/src/components/AnalyticsChart.tsx` | Modify | Period-aware chart: ≤7 days = bars, >7 = line |

---

## Task 1: Remove `event_accepted_credit` — points logic fix

**Files:**
- Modify: `src/backend/src/routes/negotiationRoutes.ts`

- [ ] **Step 1: Open the file and locate the double transaction block**

  In `negotiationRoutes.ts`, find the `if (data.responseType === 'accepted')` block (around line 144).
  It currently creates TWO `prisma.pointsTransaction.create` calls.
  The second one (type `event_accepted_credit`) must be deleted entirely.

- [ ] **Step 2: Delete the second transaction**

  Replace the entire `if (data.responseType === 'accepted')` block with:

  ```typescript
  if (data.responseType === 'accepted') {
    await prisma.event.update({
      where: { id: negotiation.eventId },
      data: {
        status: 'accepted',
        pointsAgreed: negotiation.pointsProposed,
      },
    })

    const creatorId = negotiation.event.createdBy
    if (!creatorId) {
      res.status(400).json({ error: 'Event creator not found' })
      return
    }

    // Deduct points from the person who requested the activity
    await prisma.pointsTransaction.create({
      data: {
        coupleId: req.coupleId,
        userId: creatorId,
        type: 'event_accepted',
        relatedEventId: negotiation.eventId,
        amount: new Decimal(-negotiation.pointsProposed),
        description: `Actividad aceptada: ${negotiation.event.title || negotiation.event.type}`,
      },
    })

    // Trigger achievement check
    if (negotiation.proposedBy) {
      await achievementEngine.checkAchievements(
        negotiation.proposedBy,
        req.coupleId,
        { type: 'event_accepted', eventId: negotiation.eventId }
      )
    }
  }
  ```

- [ ] **Step 3: Manual verify**

  Start backend: `cd src/backend && npm run dev`
  
  1. Login as User A, create an event via `POST /api/events`, then propose via `POST /api/negotiations`.
  2. Login as User B, accept via `PUT /api/negotiations/:id/respond` with `{ "responseType": "accepted" }`.
  3. Check `GET /api/points/balance` — User A should have negative balance, User B balance unchanged.
  4. Check `GET /api/points/history` — should show exactly ONE transaction (event_accepted) with negative amount.

- [ ] **Step 4: Commit**

  ```bash
  git add src/backend/src/routes/negotiationRoutes.ts
  git commit -m "fix: activities only deduct points from requester, accepter gets nothing"
  ```

---

## Task 2: Fix tasks inbox — `fetchPendingTaskLogs` returns object not array

**Files:**
- Modify: `src/frontend/src/services/apiClient.ts` (lines 604-605)
- Modify: `src/frontend/src/pages/RequestInbox.tsx`

- [ ] **Step 1: Fix `fetchPendingTaskLogs` in apiClient.ts**

  Find lines 604-605:
  ```typescript
  export const fetchPendingTaskLogs = () =>
    apiClient.tasks.getAllLogs('pending')
  ```

  Replace with:
  ```typescript
  export const fetchPendingTaskLogs = async (): Promise<import('./types/activity').TaskPendingLog[]> => {
    const result = await apiClient.tasks.getAllLogs('pending')
    return (result.logs ?? []) as import('./types/activity').TaskPendingLog[]
  }
  ```

- [ ] **Step 2: Add partner-only filter to the useQuery in RequestInbox.tsx**

  Find the `useQuery` block for `pendingTaskLogs` (around line 91):
  ```typescript
  const { data: pendingTaskLogs = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: fetchPendingTaskLogs,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  ```

  Replace with:
  ```typescript
  const { data: pendingTaskLogs = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: fetchPendingTaskLogs,
    staleTime: 5 * 60 * 1000,
    select: (logs: TaskPendingLog[]) => logs.filter(log => log.completedBy?.id !== user?.id),
  })
  ```

- [ ] **Step 3: Remove "+pts para ti" from the activity detail view**

  In RequestInbox.tsx, find the event detail section (around line 327-329):
  ```tsx
  {!isMyEvent && (
    <div className="text-xs text-green-600 font-medium mt-1">+{pts} pts para ti</div>
  )}
  ```
  Delete those 3 lines entirely.

- [ ] **Step 4: Remove "+{pts} tuyos" from the pending activity list cards**

  Find (around line 588-589):
  ```tsx
  <div className="text-xs text-green-600">+{pts} tuyos</div>
  ```
  Delete that line entirely.

- [ ] **Step 5: Manual verify the full task flow**

  1. Start both backend and frontend.
  2. Login as User A. Go to "Tareas del Hogar". Mark a task as completed.
  3. Verify User A can see the task in their task list as "Pendiente".
  4. Login as User B. Open "Bandeja de Entrada" → pestaña "Tareas".
  5. Verify the task appears with User A's name and a "Verificar" button.
  6. Click "Verificar".
  7. Go to pestaña "Historial" — task should appear with status "verificada" in green.
  8. Login as User A. Check balance — points should have increased.
  9. Verify that User B's OWN tasks do NOT appear in the "Tareas" tab (only partner's tasks).

- [ ] **Step 6: Commit**

  ```bash
  git add src/frontend/src/services/apiClient.ts src/frontend/src/pages/RequestInbox.tsx
  git commit -m "fix: tasks inbox now shows partner tasks correctly, remove points-for-accepter UI"
  ```

---

## Task 3: Fix dashboard chart — always render, handle single user

**Files:**
- Modify: `src/backend/src/routes/pointsRoutes.ts`
- Modify: `src/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Fix the backend `/chart-data` endpoint to handle single user**

  In `pointsRoutes.ts`, find the early return block (around lines 140-143):
  ```typescript
  if (!couple || !couple.users || couple.users.length < 2) {
    res.json({ chartData: [], youName: 'Yo', partnerName: 'Pareja' })
    return
  }
  ```

  Replace with:
  ```typescript
  if (!couple || !couple.users || couple.users.length === 0) {
    res.json({ chartData: [], youName: 'Yo', partnerName: null })
    return
  }

  // Works with 1 or 2 users
  const partner = couple.users.find(u => u.id !== req.userId) ?? null
  ```

  Then find the line that currently reads:
  ```typescript
  const you = couple.users.find(u => u.id === req.userId)!
  const partner = couple.users.find(u => u.id !== req.userId)!
  ```
  Replace with:
  ```typescript
  const you = couple.users.find(u => u.id === req.userId)!
  // partner may be null for single-user couples
  ```
  (The `partner` variable was already defined in the replacement above.)

  Then find the delta map population loop (around lines 170-177):
  ```typescript
  for (const t of allTx) {
    const d = new Date(t.createdAt)
    if (d < windowStart) continue
    const key = d.toISOString().split('T')[0]
    if (t.userId === you.id) youDelta[key] = (youDelta[key] || 0) + Number(t.amount)
    else if (t.userId === partner.id) partnerDelta[key] = (partnerDelta[key] || 0) + Number(t.amount)
  }
  ```
  Replace with:
  ```typescript
  for (const t of allTx) {
    const d = new Date(t.createdAt)
    if (d < windowStart) continue
    const key = d.toISOString().split('T')[0]
    if (t.userId === you.id) youDelta[key] = (youDelta[key] || 0) + Number(t.amount)
    else if (partner && t.userId === partner.id) partnerDelta[key] = (partnerDelta[key] || 0) + Number(t.amount)
  }
  ```

  Also update the pre-seed loop (around lines 161-165):
  ```typescript
  for (const t of allTx) {
    if (new Date(t.createdAt) < windowStart) {
      if (t.userId === you.id) youRunning += Number(t.amount)
      else if (t.userId === partner.id) partnerRunning += Number(t.amount)
    }
  }
  ```
  Replace with:
  ```typescript
  for (const t of allTx) {
    if (new Date(t.createdAt) < windowStart) {
      if (t.userId === you.id) youRunning += Number(t.amount)
      else if (partner && t.userId === partner.id) partnerRunning += Number(t.amount)
    }
  }
  ```

  Update the final `res.json` call (around line 196):
  ```typescript
  res.json({ chartData, youName: you.name, partnerName: partner.name })
  ```
  Replace with:
  ```typescript
  res.json({ chartData, youName: you.name, partnerName: partner?.name ?? null })
  ```

- [ ] **Step 2: Fix Dashboard.tsx — always render the chart section**

  Find the conditional wrapper (around line 301):
  ```tsx
  {chartData.length > 0 && (
    <div className="card mb-8">
  ```
  Replace with:
  ```tsx
  <div className="card mb-8">
  ```
  And find the corresponding closing `)}` at the end of the chart block and replace it with just `</div>`.

- [ ] **Step 3: Add a no-data overlay in the chart when all values are 0**

  Inside the chart `<div className="w-full h-72">` block, wrap the ResponsiveContainer like this:

  ```tsx
  {/* No-data overlay */}
  {chartData.every(p => (p[userName] as number) === 0 && (p[partnerName] as number) === 0) && (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <p className="text-sm text-gray-400 bg-white/80 px-3 py-1 rounded-full">
        Aún no hay movimientos registrados
      </p>
    </div>
  )}
  ```

  Also add `relative` to the `<div className="w-full h-72">` wrapper:
  ```tsx
  <div className="relative w-full h-72">
  ```

- [ ] **Step 4: Hide the partner line when partnerName is null**

  Find:
  ```tsx
  <Line type="monotone" dataKey={partnerName} stroke="#EC4899" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#EC4899' }} />
  ```
  Replace with:
  ```tsx
  {partnerName && (
    <Line type="monotone" dataKey={partnerName} stroke="#EC4899" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#EC4899' }} />
  )}
  ```

  Also hide the partner stats below the chart when there's no partner. Find:
  ```tsx
  <div className="flex items-center gap-3">
    {(balance?.partner.balance || 0) >= 0 ? (
  ```
  Wrap that entire `<div>` with `{balance?.partner && (` ... `)}`.

- [ ] **Step 5: Manual verify**

  1. Restart backend. Check `GET /api/points/chart-data?days=30` — should return 30 data points even with 0 transactions.
  2. Open dashboard — chart section should always be visible.
  3. If no transactions: overlay message "Aún no hay movimientos registrados" visible.
  4. Add a transaction (accept an activity). Refresh dashboard. Chart lines should update.

- [ ] **Step 6: Commit**

  ```bash
  git add src/backend/src/routes/pointsRoutes.ts src/frontend/src/pages/Dashboard.tsx
  git commit -m "fix: dashboard chart always renders, handles single-user couple"
  ```

---

## Task 4: Add `getDailyBreakdown` service function

**Files:**
- Modify: `src/backend/src/services/analyticsService.ts`

- [ ] **Step 1: Add the interface and function at the end of analyticsService.ts**

  Append to `src/backend/src/services/analyticsService.ts`:

  ```typescript
  export interface DailyBreakdownPoint {
    date: string      // ISO date "2026-04-01"
    label: string     // "lun 1"
    events: number
    points: number
    tasks: number
  }

  /**
   * Get daily activity breakdown for a date range.
   * Returns one entry per day (including days with 0 activity).
   */
  export async function getDailyBreakdown(
    coupleId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyBreakdownPoint[]> {
    const [events, taskLogs] = await Promise.all([
      prisma.event.findMany({
        where: {
          coupleId,
          dateStart: { gte: startDate, lte: endDate },
          status: { in: ['accepted', 'forced'] },
        },
      }),
      prisma.taskLog.findMany({
        where: {
          coupleId,
          date: { gte: startDate, lte: endDate },
          status: 'verified',
        },
      }),
    ])

    // Aggregate by ISO date
    const byDay: Record<string, { events: number; points: number; tasks: number }> = {}

    for (const e of events) {
      const key = e.dateStart.toISOString().split('T')[0]
      if (!byDay[key]) byDay[key] = { events: 0, points: 0, tasks: 0 }
      byDay[key].events++
      byDay[key].points += Number(e.pointsCalculated)
    }

    for (const t of taskLogs) {
      const key = t.date.toISOString().split('T')[0]
      if (!byDay[key]) byDay[key] = { events: 0, points: 0, tasks: 0 }
      byDay[key].tasks++
      byDay[key].points += Number(t.pointsFinal)
    }

    // Generate one entry per day in the range (including 0-activity days)
    const result: DailyBreakdownPoint[] = []
    const cursor = new Date(startDate)
    cursor.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    while (cursor <= end) {
      const key = cursor.toISOString().split('T')[0]
      const label = cursor.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      const data = byDay[key] ?? { events: 0, points: 0, tasks: 0 }
      result.push({ date: key, label, ...data })
      cursor.setDate(cursor.getDate() + 1)
    }

    return result
  }
  ```

- [ ] **Step 2: Write a quick test**

  Create `src/backend/tests/analyticsService.test.ts`:

  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
  import { PrismaClient } from '@prisma/client'
  import { getDailyBreakdown } from '../src/services/analyticsService'
  import { Decimal } from '@prisma/client/runtime/library'

  describe('getDailyBreakdown', () => {
    let prisma: PrismaClient
    let coupleId: string

    beforeEach(async () => {
      prisma = new PrismaClient()
      const couple = await prisma.couple.create({ data: { secretKey: `test-${Date.now()}` } })
      coupleId = couple.id
    })

    afterEach(async () => {
      await prisma.taskLog.deleteMany({ where: { coupleId } })
      await prisma.event.deleteMany({ where: { coupleId } })
      await prisma.couple.delete({ where: { id: coupleId } })
      await prisma.$disconnect()
    })

    it('returns one entry per day in range, zeros for empty days', async () => {
      const start = new Date('2026-04-01T00:00:00Z')
      const end = new Date('2026-04-03T23:59:59Z')

      const result = await getDailyBreakdown(coupleId, start, end)

      expect(result).toHaveLength(3)
      expect(result[0].date).toBe('2026-04-01')
      expect(result[0].events).toBe(0)
      expect(result[0].points).toBe(0)
    })
  })
  ```

- [ ] **Step 3: Run the test**

  ```bash
  cd src/backend && npx jest tests/analyticsService.test.ts --no-coverage
  ```
  Expected: PASS (1 test)

- [ ] **Step 4: Commit**

  ```bash
  git add src/backend/src/services/analyticsService.ts src/backend/tests/analyticsService.test.ts
  git commit -m "feat: add getDailyBreakdown analytics service function"
  ```

---

## Task 5: Add `GET /analytics/daily-breakdown` endpoint

**Files:**
- Modify: `src/backend/src/routes/analytics.ts`
- Modify: `src/frontend/src/services/apiClient.ts`

- [ ] **Step 1: Add the import in analytics.ts**

  At the top of `src/backend/src/routes/analytics.ts`, the existing import is:
  ```typescript
  import * as analyticsService from '../services/analyticsService.js'
  ```
  This already imports everything — no change needed.

- [ ] **Step 2: Add the new route in analytics.ts**

  After the last existing route in the file, add:

  ```typescript
  /**
   * GET /api/analytics/daily-breakdown
   * Get daily activity breakdown for a given date range.
   * Used by the period-aware chart in the analytics dashboard.
   */
  router.get('/daily-breakdown', async (req: Request, res: Response) => {
    try {
      const coupleId = (req as any).user.coupleId
      const { startDate, endDate } = req.query

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' })
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' })
      }

      const breakdown = await analyticsService.getDailyBreakdown(coupleId, start, end)

      res.json({
        message: 'Daily breakdown retrieved',
        data: breakdown,
        periodDays: breakdown.length,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve daily breakdown'
      res.status(500).json({ error: message })
    }
  })
  ```

- [ ] **Step 3: Add `getDailyBreakdown` to apiClient.ts**

  In `src/frontend/src/services/apiClient.ts`, find the `analytics` object (around line 562). Add after `getWeeklyTrends`:

  ```typescript
  getDailyBreakdown: (startDate: string, endDate: string) =>
    this.request(`/analytics/daily-breakdown?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  ```

- [ ] **Step 4: Manual verify the endpoint**

  Start backend. Run:
  ```bash
  curl -H "Authorization: Bearer <your_token>" \
    "http://localhost:3000/api/analytics/daily-breakdown?startDate=2026-04-01T00:00:00.000Z&endDate=2026-04-05T23:59:59.999Z"
  ```
  Expected response:
  ```json
  {
    "message": "Daily breakdown retrieved",
    "data": [
      { "date": "2026-04-01", "label": "mar 1", "events": 0, "points": 0, "tasks": 0 },
      { "date": "2026-04-02", "label": "mié 2", "events": 0, "points": 0, "tasks": 0 },
      ...
    ],
    "periodDays": 5
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/backend/src/routes/analytics.ts src/frontend/src/services/apiClient.ts
  git commit -m "feat: add /analytics/daily-breakdown endpoint and apiClient method"
  ```

---

## Task 6: Fix AnalyticsDashboard — period-aware daily chart

**Files:**
- Modify: `src/frontend/src/components/AnalyticsDashboard.tsx`
- Modify: `src/frontend/src/components/AnalyticsChart.tsx`

- [ ] **Step 1: Update the AnalyticsChart component to support the new `'period'` type**

  In `src/frontend/src/components/AnalyticsChart.tsx`, update the `type` prop and add the period chart:

  Replace the entire file content with:

  ```tsx
  import React from 'react'
  import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  } from 'recharts'

  interface AnalyticsChartProps {
    data: any[]
    type: 'weekly' | 'daily' | 'comparison' | 'period'
    periodDays?: number
  }

  export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, type, periodDays = 30 }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          No hay datos para este período
        </div>
      )
    }

    if (type === 'period') {
      // ≤7 days → bar chart (one bar per day, easy to read)
      // >7 days → line chart (continuous trend)
      const useBar = periodDays <= 7

      if (useBar) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="events" fill="#6366F1" name="Actividades" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tasks" fill="#10B981" name="Tareas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      }

      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              tick={{ fontSize: 10 }}
              angle={-30}
              textAnchor="end"
              interval={Math.floor(data.length / 8)}
            />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="events" stroke="#6366F1" strokeWidth={2} dot={false} name="Actividades" />
            <Line type="monotone" dataKey="tasks" stroke="#10B981" strokeWidth={2} dot={false} name="Tareas" />
            <Line type="monotone" dataKey="points" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="Puntos" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'weekly') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="events" stroke="#3B82F6" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 6 }} name="Eventos" />
            <Line type="monotone" dataKey="points" stroke="#EC4899" dot={{ fill: '#EC4899', r: 4 }} activeDot={{ r: 6 }} name="Puntos" />
          </LineChart>
        </ResponsiveContainer>
      )
    }

    if (type === 'daily') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="count" fill="#3B82F6" name="Eventos" />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return null
  }
  ```

- [ ] **Step 2: Update AnalyticsDashboard.tsx state and fetch**

  Find the state declarations at the top of `AnalyticsDashboard.tsx` (around lines 43-48):
  ```typescript
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  ```
  Add alongside it:
  ```typescript
  const [dailyBreakdown, setDailyBreakdown] = useState<any[]>([])
  const [periodDays, setPeriodDays] = useState(0)
  ```

- [ ] **Step 3: Update `fetchAnalytics` to call `getDailyBreakdown` instead of `getWeeklyTrends`**

  In `fetchAnalytics` (around lines 101-107), find:
  ```typescript
  const [metricsRes, usersRes, negotiationsRes, weeklyRes, categoryRes] = await Promise.all([
    apiClient.analytics.getCouple(startDate, endDate),
    apiClient.analytics.getUsers(startDate, endDate),
    apiClient.analytics.getNegotiations(startDate, endDate),
    apiClient.analytics.getWeeklyTrends(),
    apiClient.analytics.getPointsByCategory(startDate, endDate),
  ])

  setMetrics(metricsRes.data)
  setUserStats(usersRes.data)
  setNegotiationStats(negotiationsRes.data)
  setWeeklyData(weeklyRes.data)
  setPointsByCategory(categoryRes.data)
  ```

  Replace with:
  ```typescript
  const [metricsRes, usersRes, negotiationsRes, breakdownRes, categoryRes] = await Promise.all([
    apiClient.analytics.getCouple(startDate, endDate),
    apiClient.analytics.getUsers(startDate, endDate),
    apiClient.analytics.getNegotiations(startDate, endDate),
    apiClient.analytics.getDailyBreakdown(startDate, endDate),
    apiClient.analytics.getPointsByCategory(startDate, endDate),
  ])

  setMetrics(metricsRes.data)
  setUserStats(usersRes.data)
  setNegotiationStats(negotiationsRes.data)
  setDailyBreakdown(breakdownRes.data ?? [])
  setPeriodDays(breakdownRes.periodDays ?? 0)
  setPointsByCategory(categoryRes.data)
  ```

- [ ] **Step 4: Add a dynamic period label helper**

  After the `getDateRange` function (around line 92), add:

  ```typescript
  const getPeriodLabel = (): string => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${fmt(start)} — ${fmt(end)}`
  }
  ```

- [ ] **Step 5: Update the chart section in the JSX**

  Find the "Weekly Trends" card in the JSX (around line 204):
  ```tsx
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
      <TrendingUp size={20} />
      Tendencia Semanal
    </h2>
    <AnalyticsChart data={weeklyData} type="weekly" />
  </div>
  ```

  Replace with:
  ```tsx
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
      <TrendingUp size={20} />
      Actividad diaria
    </h2>
    <p className="text-sm text-gray-500 mb-4">{getPeriodLabel()}</p>
    <AnalyticsChart data={dailyBreakdown} type="period" periodDays={periodDays} />
  </div>
  ```

- [ ] **Step 6: Add the dynamic subtitle under the page title**

  Find the period selector buttons block (around lines 148-167). Just before it, after the `<div className="mb-8 flex items-center gap-4">` block closes, the period selector begins. Add a subtitle under the H1:

  Find:
  ```tsx
  <h1 className="text-4xl font-bold text-gray-900">Analytics Avanzado</h1>
  <p className="text-gray-600">Análisis detallado de tu relación en números</p>
  ```
  Replace with:
  ```tsx
  <h1 className="text-4xl font-bold text-gray-900">Analytics Avanzado</h1>
  <p className="text-gray-600">
    Análisis detallado de tu relación en números
    <span className="ml-2 text-sm text-gray-400">· {getPeriodLabel()}</span>
  </p>
  ```

- [ ] **Step 7: Manual verify**

  1. Open Analytics Avanzado. Default period "Este mes".
  2. Verify chart shows only April 1–today (4 days if today is April 4). Each day one bar/point.
  3. Click "Semana anterior". Chart switches to show Mon–Sun of previous week (7 bars).
  4. Click "Mes anterior". Chart shows all of March (31 days as a line chart).
  5. Click "Esta semana". Chart shows Mon to today.
  6. Verify the subtitle "(1 abr 2026 — 4 abr 2026)" updates with each period change.

- [ ] **Step 8: Commit**

  ```bash
  git add src/frontend/src/components/AnalyticsChart.tsx src/frontend/src/components/AnalyticsDashboard.tsx
  git commit -m "feat: analytics chart shows daily breakdown for selected period"
  ```

---

## Task 7: UX polish — Dashboard chart + Inbox improvements

**Files:**
- Modify: `src/frontend/src/pages/Dashboard.tsx`
- Modify: `src/frontend/src/components/TaskPendingCard.tsx`

- [ ] **Step 1: Improve the Dashboard balance card**

  In `Dashboard.tsx`, find the balance section `<div className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 ...">`.
  
  Add a visual indicator (checkmark or arrow) showing who has more points. After the `isBalanced` conditional, add a visual equity bar:

  ```tsx
  {/* Equity bar */}
  {balance && !balance.isBalanced && (
    <div className="mt-3">
      {(() => {
        const total = Math.abs(balance.you.balance) + Math.abs(balance.partner.balance)
        const youPct = total === 0 ? 50 : Math.round((Math.max(0, balance.you.balance) / Math.max(total, 0.1)) * 100)
        return (
          <div className="w-full h-2 bg-indigo-400/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(youPct, 5), 95)}%` }}
            />
          </div>
        )
      })()}
      <div className="flex justify-between text-xs text-indigo-200 mt-1">
        <span>{balance.you.name}</span>
        <span>{balance.partner.name}</span>
      </div>
    </div>
  )}
  ```

- [ ] **Step 2: Improve TaskPendingCard to show category color badge**

  In `src/frontend/src/components/TaskPendingCard.tsx`, add a color mapping for categories and show a colored badge.

  After the `categoryEmojiMap` object, add:
  ```tsx
  const categoryColorMap: Record<string, string> = {
    cocina: 'bg-orange-100 text-orange-700',
    baños: 'bg-blue-100 text-blue-700',
    limpieza: 'bg-green-100 text-green-700',
    compra: 'bg-yellow-100 text-yellow-700',
    logistica: 'bg-purple-100 text-purple-700',
    cuidado: 'bg-pink-100 text-pink-700',
    mantenimiento: 'bg-gray-100 text-gray-700',
    jardineria: 'bg-emerald-100 text-emerald-700',
    mascotas: 'bg-amber-100 text-amber-700',
  }
  const categoryColor = categoryColorMap[taskLog.task.category] || 'bg-gray-100 text-gray-600'
  ```

  Then update the card header to show the category badge. Find:
  ```tsx
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="text-3xl">{categoryEmoji}</span>
      <CardTitle className="m-0">{taskLog.task.name}</CardTitle>
    </div>
  </div>
  ```
  Replace with:
  ```tsx
  <div className="flex items-start justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="text-3xl">{categoryEmoji}</span>
      <div>
        <CardTitle className="m-0">{taskLog.task.name}</CardTitle>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${categoryColor}`}>
          {taskLog.task.category}
        </span>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 3: Make the history task log items visually distinct**

  In `RequestInbox.tsx`, find the history tab section for task logs. It renders `historyTaskLogs`. Find the map rendering (look for `historyTaskLogs.map`).
  
  For each task log item in history, update the status badge logic to use color:
  ```tsx
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    l.status === 'verified' ? 'bg-green-100 text-green-700' :
    l.status === 'disputed' ? 'bg-orange-100 text-orange-700' :
    'bg-gray-100 text-gray-600'
  }`}>
    {l.status === 'verified' ? '✅ Verificada' : l.status === 'disputed' ? '⚠️ Disputada' : l.status}
  </span>
  ```

- [ ] **Step 4: Manual verify**

  1. Dashboard: balance card shows the equity bar when users have different balances.
  2. Inbox → Tareas: each `TaskPendingCard` shows category color badge.
  3. Inbox → Historial: verified tasks show green badge, disputed show orange.

- [ ] **Step 5: Commit**

  ```bash
  git add src/frontend/src/pages/Dashboard.tsx \
          src/frontend/src/components/TaskPendingCard.tsx \
          src/frontend/src/pages/RequestInbox.tsx
  git commit -m "ux: improve balance card, task cards, and history status badges"
  ```

---

## Self-Review Checklist

- [x] **Bug 1** (event_accepted_credit removed) → Task 1 ✓
- [x] **Bug 2** (fetchPendingTaskLogs returns object) → Task 2, Steps 1-2 ✓
- [x] **Bug 2** (full task flow verified) → Task 2, Step 5 ✓
- [x] **Bug 2** ("+pts para ti" text removed) → Task 2, Steps 3-4 ✓
- [x] **Bug 3** (chart single-user) → Task 3, Step 1 ✓
- [x] **Bug 3** (chart always rendered) → Task 3, Steps 2-4 ✓
- [x] **Bug 4** (daily-breakdown service) → Task 4 ✓
- [x] **Bug 4** (daily-breakdown endpoint) → Task 5 ✓
- [x] **Bug 4** (AnalyticsDashboard uses period data) → Task 6 ✓
- [x] **Bug 4** (≤7 days = bars, >7 = line) → Task 6, Step 1 ✓
- [x] **Bug 4** (dynamic period label) → Task 6, Steps 4-6 ✓
- [x] **UX** (dashboard equity bar) → Task 7, Step 1 ✓
- [x] **UX** (task card category badge) → Task 7, Step 2 ✓
- [x] **UX** (history status colors) → Task 7, Step 3 ✓
- [x] Type consistency: `DailyBreakdownPoint` defined in Task 4, used in Task 5 route and Task 6 frontend ✓
- [x] `periodDays` passed through: Task 5 endpoint → Task 6 state → `<AnalyticsChart periodDays={...} />` ✓
- [x] `partner` null-safety in pointsRoutes.ts: all `.id` accesses guarded with `partner &&` ✓
