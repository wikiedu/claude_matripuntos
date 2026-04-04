# Phase 3.3: Notifications & Activity History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich UI with task verification context and recent activity feed showing last 5 movements.

**Architecture:** Backend endpoint `/api/recent-activity` returns typed movements. Frontend components display task cards with full context and clickable activity items.

**Tech Stack:** TypeScript backend (existing), React + React Query frontend (existing).

---

## File Structure

**Backend Files to Create/Modify:**
- Modify: `src/backend/src/routes/taskRoutes.ts` — enhance `/tasks/logs` to include relations

**Frontend Files to Create:**
- Create: `src/frontend/src/components/TaskPendingCard.tsx`
- Create: `src/frontend/src/components/RecentMovementItem.tsx`

**Frontend Files to Modify:**
- Modify: `src/frontend/src/pages/RequestInbox.tsx` — use TaskPendingCard
- Modify: `src/frontend/src/pages/Dashboard.tsx` — add activity feed
- Modify: `src/frontend/src/services/apiClient.ts` — add recent-activity method

---

## Tasks (Condensed)

### Task 1: Backend — Enhance TaskLog Endpoint

- [ ] **Step 1:** Modify `src/backend/src/routes/taskRoutes.ts`, find `GET /tasks/logs` handler
- [ ] **Step 2:** Update to include relations:

```typescript
const logs = await prisma.taskLog.findMany({
  where: { coupleId: req.coupleId, status: 'pending' },
  include: {
    task: true,
    completedBy: { select: { id: true, name: true } },
  },
  orderBy: { date: 'desc' },
})
```

- [ ] **Step 3:** Return enriched response with task, completedBy
- [ ] **Step 4:** Test with curl, verify relations are populated
- [ ] **Step 5:** Commit: `feat: enhance task logs endpoint with task and user relations`

---

### Task 2: Backend — Create Recent Activity Endpoint

- [ ] **Step 1:** Add new endpoint `GET /api/recent-activity` in `taskRoutes.ts` or new `activityRoutes.ts`

```typescript
router.get('/recent-activity', authMiddleware, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { coupleId: req.coupleId, status: { in: ['accepted', 'rejected', 'forced'] } },
    select: { id: true, type: true, dateEnd: true },
    orderBy: { dateEnd: 'desc' },
    take: 5,
  })

  const tasks = await prisma.taskLog.findMany({
    where: { coupleId: req.coupleId, status: 'verified' },
    include: { task: true },
    orderBy: { date: 'desc' },
    take: 5,
  })

  const combined = [
    ...events.map(e => ({ type: 'event', id: e.id, name: e.type, date: e.dateEnd })),
    ...tasks.map(t => ({ type: 'task', id: t.id, name: t.task.name, date: t.date })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  res.json({ movements: combined })
})
```

- [ ] **Step 2:** Register route in `server.ts` if new file
- [ ] **Step 3:** Test endpoint with curl
- [ ] **Step 4:** Commit: `feat: add recent-activity endpoint`

---

### Task 3: Frontend — Create TaskPendingCard Component

- [ ] **Step 1:** Create `src/frontend/src/components/TaskPendingCard.tsx`

```typescript
import { Loader } from 'lucide-react'

interface TaskPendingCardProps {
  taskLog: any
  onVerify: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
}

export default function TaskPendingCard({ taskLog, onVerify, onReject }: TaskPendingCardProps) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900">{taskLog.task.name}</h3>
          <p className="text-sm text-gray-600">
            Completed by {taskLog.completedBy.name} on{' '}
            {new Date(taskLog.date).toLocaleDateString()} at{' '}
            {new Date(taskLog.date).toLocaleTimeString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{taskLog.task.category}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-indigo-600">{taskLog.pointsFinal}pts</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => { setLoading(true); onVerify(taskLog.id).finally(() => setLoading(false)) }}
          disabled={loading}
          className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '✓ Verify'}
        </button>
        <button
          onClick={() => { setLoading(true); onReject(taskLog.id).finally(() => setLoading(false)) }}
          disabled={loading}
          className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : '✗ Reject'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2:** Commit: `feat: create TaskPendingCard component`

---

### Task 4: Frontend — Create RecentMovementItem Component

- [ ] **Step 1:** Create `src/frontend/src/components/RecentMovementItem.tsx`

```typescript
export default function RecentMovementItem({ movement, onClick }: any) {
  const icons: Record<string, string> = {
    event: '🎉',
    task: '✅',
    negotiation: '💬',
  }

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition"
    >
      <span className="text-xl">{icons[movement.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{movement.name}</p>
        <p className="text-xs text-gray-500">
          {new Date(movement.date).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2:** Commit: `feat: create RecentMovementItem component`

---

### Task 5: Frontend — Update RequestInbox

- [ ] **Step 1:** Modify `src/frontend/src/pages/RequestInbox.tsx`

Replace old task display with:

```typescript
import TaskPendingCard from '../components/TaskPendingCard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

export default function RequestInbox() {
  const queryClient = useQueryClient()

  const { data: taskLogs, isLoading } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: () => apiClient.request('/tasks/logs', { params: { status: 'pending' } }),
  })

  const verifyMutation = useMutation({
    mutationFn: (logId: string) =>
      apiClient.request(`/tasks/logs/${logId}`, {
        method: 'PUT',
        data: { status: 'verified' },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] }),
  })

  return (
    <div className="space-y-4">
      {isLoading ? <p>Loading...</p> : taskLogs?.length === 0 ? <p>No pending tasks</p> : (
        taskLogs?.map((log: any) => (
          <TaskPendingCard
            key={log.id}
            taskLog={log}
            onVerify={(id) => verifyMutation.mutateAsync(id)}
            onReject={(id) => verifyMutation.mutateAsync(id)}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Commit: `feat: integrate TaskPendingCard into RequestInbox`

---

### Task 6: Frontend — Add Activity Feed to Dashboard

- [ ] **Step 1:** Modify `src/frontend/src/pages/Dashboard.tsx`

Add after existing content:

```typescript
import RecentMovementItem from '../components/RecentMovementItem'
import { useNavigate } from 'react-router-dom'

// In component:
const { data: activity } = useQuery({
  queryKey: ['recentActivity'],
  queryFn: () => apiClient.request('/recent-activity'),
})
const navigate = useNavigate()

// In JSX:
<section className="mt-8">
  <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
  {activity?.movements?.length === 0 ? (
    <p className="text-gray-600">No recent activity</p>
  ) : (
    <div className="space-y-2">
      {activity?.movements?.map((m: any) => (
        <RecentMovementItem
          key={`${m.type}-${m.id}`}
          movement={m}
          onClick={() => {
            if (m.type === 'event') navigate(`/events/${m.id}`)
            else if (m.type === 'task') navigate(`/tasks`)
          }}
        />
      ))}
    </div>
  )}
</section>
```

- [ ] **Step 2:** Commit: `feat: add recent activity feed to Dashboard`

---

### Task 7: Frontend API Client

- [ ] **Step 1:** Add to `src/frontend/src/services/apiClient.ts`

```typescript
recentActivity: () =>
  this.request('/recent-activity', { method: 'GET' }),
```

- [ ] **Step 2:** Commit: `feat: add recentActivity to apiClient`

---

### Task 8: Manual Testing

- [ ] **Step 1:** Create event, task → log → verify from inbox
- [ ] **Step 2:** Check dashboard shows recent activity
- [ ] **Step 3:** Click activity items, verify navigation
- [ ] **Step 4:** No console errors, responsive on mobile

---

## Success Criteria

✅ Task verification cards show full context (task name, category, date, who completed, points)
✅ Verify/reject buttons work directly from card
✅ Activity feed shows last 5 movements, clickable for navigation
✅ All dates formatted clearly (dd/mm/yyyy HH:MM)
✅ Responsive design on mobile
✅ React Query properly invalidates on changes
