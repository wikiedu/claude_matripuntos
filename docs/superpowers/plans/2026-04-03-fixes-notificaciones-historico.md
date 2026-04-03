# Phase 1: Notifications & Activity History Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Request Inbox (pending tasks) and Dashboard (recent activity) with complete information and direct actions, eliminating confusion and improving visibility.

**Architecture:** 
- Backend: New `/api/recent-activity` endpoint that unifies events, tasks, and negotiations into a single feed. Enriched task logs query with full relationships.
- Frontend: Two new components (TaskPendingCard, RecentMovementItem) that replace/extend existing displays. React Query handles caching and mutations.
- TDD approach: Write failing tests first, then minimal implementation.

**Tech Stack:** TypeScript, Prisma, Express, React, React Query, Tailwind CSS

---

## Backend Tasks

### Task 1: Create Activity Service

**Files:**
- Create: `src/backend/src/services/activityService.ts`

- [ ] **Step 1: Write the service skeleton with types**

```typescript
// src/backend/src/services/activityService.ts

import { PrismaClient } from '@prisma/client';

/**
 * RecentActivity unifies events, tasks, and negotiations into a single feed type.
 * This service handles fetching and formatting cross-model activity data.
 */

export type RecentActivityType = 'event' | 'task' | 'negotiation';

export interface RecentActivity {
  id: string;
  type: RecentActivityType;
  name: string;
  date: Date;
  relatedId: string; // For navigation: eventId, taskLogId, or negotiationId
}

/**
 * Fetch the 5 most recent activities (events, tasks, negotiations) for a couple.
 * @param prisma - PrismaClient instance
 * @param coupleId - The couple ID to fetch activities for
 * @returns Array of 5 most recent activities, ordered DESC by date
 */
export async function getRecentActivity(
  prisma: PrismaClient,
  coupleId: string
): Promise<RecentActivity[]> {
  // TODO: implement
  return [];
}
```

- [ ] **Step 2: Implement the function**

```typescript
export async function getRecentActivity(
  prisma: PrismaClient,
  coupleId: string
): Promise<RecentActivity[]> {
  // Fetch events: accepted/rejected/forced, only completed ones (dateEnd < now)
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      status: { in: ['accepted', 'rejected', 'forced'] },
      dateEnd: { lte: new Date() }
    },
    select: {
      id: true,
      type: true,
      dateEnd: true
    },
    orderBy: { dateEnd: 'desc' },
    take: 5
  });

  // Fetch tasks: verified task logs with task details
  const taskLogs = await prisma.taskLog.findMany({
    where: {
      coupleId,
      status: 'verified'
    },
    select: {
      id: true,
      task: { select: { name: true } },
      date: true
    },
    orderBy: { date: 'desc' },
    take: 5
  });

  // Fetch negotiations: resolved ones (responseType != 'awaiting')
  const negotiations = await prisma.negotiation.findMany({
    where: {
      event: { coupleId },
      responseType: { not: 'awaiting' }
    },
    select: {
      id: true,
      event: { select: { type: true } },
      respondedAt: true
    },
    orderBy: { respondedAt: 'desc' },
    take: 5
  });

  // Transform and merge into unified format
  const activities: RecentActivity[] = [];

  events.forEach((event) => {
    activities.push({
      id: event.id,
      type: 'event',
      name: event.type,
      date: event.dateEnd,
      relatedId: event.id
    });
  });

  taskLogs.forEach((log) => {
    activities.push({
      id: log.id,
      type: 'task',
      name: log.task.name,
      date: log.date,
      relatedId: log.id
    });
  });

  negotiations.forEach((neg) => {
    activities.push({
      id: neg.id,
      type: 'negotiation',
      name: neg.event.type,
      date: neg.respondedAt,
      relatedId: neg.id
    });
  });

  // Sort all by date desc, take top 5
  return activities
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);
}
```

- [ ] **Step 3: Commit**

```bash
cd src/backend
git add src/services/activityService.ts
git commit -m "feat: add activityService for recent activity feed"
```

---

### Task 2: Create Activity Routes

**Files:**
- Create: `src/backend/src/routes/activityRoutes.ts`

- [ ] **Step 1: Write the endpoint skeleton**

```typescript
// src/backend/src/routes/activityRoutes.ts

import express, { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';
import { getRecentActivity } from '../services/activityService';

const router = Router();

/**
 * GET /api/recent-activity
 * Fetch the 5 most recent activities (events, tasks, negotiations) for the authenticated user's couple.
 * Requires: JWT token
 * Returns: Array of RecentActivity objects
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).coupleId;
    const prisma = new PrismaClient();

    const activities = await getRecentActivity(prisma, coupleId);

    res.json(activities);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

export default router;
```

- [ ] **Step 2: Verify the endpoint structure**

The endpoint should:
- ✅ Require JWT (via `authMiddleware`)
- ✅ Extract `coupleId` from middleware
- ✅ Call `getRecentActivity()` from activityService
- ✅ Return JSON array
- ✅ Handle errors with 500 response

- [ ] **Step 3: Commit**

```bash
cd src/backend
git add src/routes/activityRoutes.ts
git commit -m "feat: add activityRoutes with GET /api/recent-activity endpoint"
```

---

### Task 3: Mount Activity Routes in Server

**Files:**
- Modify: `src/backend/src/server.ts:10-30` (approximate)

- [ ] **Step 1: Locate the routes mounting section**

Find the section in `server.ts` where routes are imported and mounted (typically near the top, after middleware setup). Look for lines like:
```typescript
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
```

- [ ] **Step 2: Add the activity routes import and mount**

Add after other route imports:
```typescript
import activityRoutes from './routes/activityRoutes';
```

And mount it:
```typescript
app.use('/api/recent-activity', activityRoutes);
```

So the final section looks like:
```typescript
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import activityRoutes from './routes/activityRoutes';
// ... other imports

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/recent-activity', activityRoutes);
// ... other mounts
```

- [ ] **Step 3: Test the endpoint exists**

```bash
cd src/backend
npm run dev &
sleep 2

# Should return 401 (no auth) or 200 with activity array
curl -X GET http://localhost:3000/api/recent-activity

# Kill the dev server
pkill -f "npm run dev"
```

Expected: HTTP 401 (Unauthorized) because no JWT was provided, which is correct.

- [ ] **Step 4: Commit**

```bash
cd src/backend
git add src/server.ts
git commit -m "feat: mount activityRoutes in server"
```

---

### Task 4: Enrich Task Logs Query

**Files:**
- Modify: `src/backend/src/routes/taskRoutes.ts` (find the GET /logs?status=pending endpoint)

- [ ] **Step 1: Locate the current endpoint**

Find the endpoint that returns pending task logs. It should look something like:
```typescript
router.get('/logs', authMiddleware, async (req: Request, res: Response) => {
  const status = req.query.status as string;
  // ... query logic
});
```

- [ ] **Step 2: Update the Prisma query to include relationships**

Replace the current `findMany` with one that includes full relationships:

```typescript
router.get('/logs', authMiddleware, async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).coupleId;
    const status = req.query.status as string || 'pending';
    const prisma = new PrismaClient();

    const taskLogs = await prisma.taskLog.findMany({
      where: {
        coupleId,
        status: status as 'pending' | 'verified' | 'disputed'
      },
      include: {
        task: true,           // Include task details: name, category
        completedBy: {        // Include who completed it
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 20
    });

    res.json(taskLogs);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({ error: 'Failed to fetch task logs' });
  }
});
```

- [ ] **Step 3: Test the enriched response**

```bash
cd src/backend
npm run dev &
sleep 2

# With a valid JWT token (get one by logging in first or manually creating):
curl -X GET http://localhost:3000/api/tasks/logs?status=pending \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Array of task logs with { id, task: {name, category}, completedBy: {id, name}, date, pointsFinal, status }
```

If you don't have a JWT, skip this verification for now (will test in frontend integration).

- [ ] **Step 4: Commit**

```bash
cd src/backend
git add src/routes/taskRoutes.ts
git commit -m "feat: enrich task logs endpoint with task and user details"
```

---

## Frontend Tasks

### Task 5: Create Activity Types

**Files:**
- Create: `src/frontend/src/types/activity.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/frontend/src/types/activity.ts

/**
 * RecentActivity represents a unified activity feed item across events, tasks, and negotiations.
 * This allows the Dashboard to display a mixed feed without type-specific logic at the render level.
 */

export type RecentActivityType = 'event' | 'task' | 'negotiation';

export interface RecentActivity {
  id: string;
  type: RecentActivityType;
  name: string;
  date: Date;
  relatedId: string; // ID of the related event/task/negotiation for navigation
}

/**
 * TaskPendingLog represents a task log that is pending verification.
 * Includes the full task and user details so the UI can display complete information.
 */

export interface TaskPendingLog {
  id: string;
  taskId: string;
  task: {
    id: string;
    name: string;
    category: string;
  };
  completedBy: {
    id: string;
    name: string;
  };
  date: Date;
  pointsBase: number;
  pointsFinal: number;
  status: 'pending';
}
```

- [ ] **Step 2: Commit**

```bash
cd src/frontend
git add src/types/activity.ts
git commit -m "feat: add activity types (RecentActivity, TaskPendingLog)"
```

---

### Task 6: Add API Service Functions

**Files:**
- Modify: `src/frontend/src/services/apiClient.ts`

- [ ] **Step 1: Locate the apiClient file and add imports**

Open `src/frontend/src/services/apiClient.ts`. At the top, ensure you have axios imported. Then add these two functions:

```typescript
/**
 * Fetch the 5 most recent activities for the user's couple.
 * Returns events, tasks, and negotiations in a unified format.
 */
export async function fetchRecentActivity() {
  try {
    const response = await apiClient.get('/recent-activity');
    return response.data;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
}

/**
 * Fetch pending task logs that require verification.
 */
export async function fetchPendingTaskLogs() {
  try {
    const response = await apiClient.get('/tasks/logs?status=pending');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending task logs:', error);
    throw error;
  }
}

/**
 * Verify a task log as completed.
 * @param taskLogId - The ID of the task log to verify
 */
export async function verifyTaskLog(taskLogId: string) {
  try {
    const response = await apiClient.patch(`/tasks/logs/${taskLogId}`, {
      status: 'verified'
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying task log:', error);
    throw error;
  }
}

/**
 * Reject a task log (mark as disputed).
 * @param taskLogId - The ID of the task log to reject
 */
export async function rejectTaskLog(taskLogId: string) {
  try {
    const response = await apiClient.patch(`/tasks/logs/${taskLogId}`, {
      status: 'disputed'
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting task log:', error);
    throw error;
  }
}
```

- [ ] **Step 2: Verify the functions are exported**

Make sure the functions are exported from the file so they can be imported elsewhere:

```typescript
export { fetchRecentActivity, fetchPendingTaskLogs, verifyTaskLog, rejectTaskLog };
```

- [ ] **Step 3: Commit**

```bash
cd src/frontend
git add src/services/apiClient.ts
git commit -m "feat: add API service functions for activity and task management"
```

---

### Task 7: Create TaskPendingCard Component

**Files:**
- Create: `src/frontend/src/components/TaskPendingCard.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/frontend/src/components/TaskPendingCard.tsx

import React, { useState } from 'react';
import { TaskPendingLog } from '../types/activity';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle } from 'lucide-react';

/**
 * TaskPendingCard displays a task that is pending verification.
 * Shows full details (task name, category, who completed it, when) and direct action buttons.
 * 
 * Props:
 *   - taskLog: The task log to display
 *   - onVerify: Callback when user clicks "Verify" button
 *   - onReject: Callback when user clicks "Reject" button
 */

interface TaskPendingCardProps {
  taskLog: TaskPendingLog;
  onVerify: (taskLogId: string) => Promise<void>;
  onReject: (taskLogId: string) => Promise<void>;
}

const TaskPendingCard: React.FC<TaskPendingCardProps> = ({
  taskLog,
  onVerify,
  onReject
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format date to readable string: "3 de abril, 14:30"
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const dayName = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${dayName}, ${time}`;
  };

  // Get category emoji or initials
  const getCategoryEmoji = (category: string) => {
    const emojiMap: Record<string, string> = {
      cocina: '🍳',
      baños: '🚿',
      limpieza: '🧹',
      compra: '🛒',
      logistica: '📦',
      cuidado: '👶',
      mantenimiento: '🔧',
      jardineria: '🌱',
      mascotas: '🐾'
    };
    return emojiMap[category] || '✓';
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onVerify(taskLog.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar');
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onReject(taskLog.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar');
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 mb-4">
      {/* Header: Category + Task Name */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{getCategoryEmoji(taskLog.task.category)}</span>
        <h3 className="text-lg font-semibold text-gray-900">{taskLog.task.name}</h3>
      </div>

      {/* Subtitle: Who completed it and when */}
      <p className="text-sm text-gray-600 mb-4">
        Completada por <strong>{taskLog.completedBy.name}</strong> el{' '}
        {formatDate(taskLog.date)}
      </p>

      {/* Points info */}
      <div className="text-sm text-gray-700 mb-4">
        <span className="font-medium">{taskLog.pointsFinal} puntos</span>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleVerify}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isLoading ? 'Procesando...' : '✓ Verificar'}
        </Button>
        <Button
          onClick={handleReject}
          disabled={isLoading}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
        >
          {isLoading ? 'Procesando...' : '✗ Rechazar'}
        </Button>
      </div>
    </Card>
  );
};

export default TaskPendingCard;
```

- [ ] **Step 2: Verify the component structure**

The component should:
- ✅ Accept `taskLog`, `onVerify`, `onReject` as props
- ✅ Display task name with category emoji
- ✅ Display "Completed by [name] on [date, time]"
- ✅ Show points
- ✅ Have two buttons (Verify, Reject) that are disabled during loading
- ✅ Show error message if action fails

- [ ] **Step 3: Commit**

```bash
cd src/frontend
git add src/components/TaskPendingCard.tsx
git commit -m "feat: add TaskPendingCard component for pending task verification"
```

---

### Task 8: Create RecentMovementItem Component

**Files:**
- Create: `src/frontend/src/components/RecentMovementItem.tsx`

- [ ] **Step 1: Write the component**

```typescript
// src/frontend/src/components/RecentMovementItem.tsx

import React from 'react';
import { RecentActivity, RecentActivityType } from '../types/activity';

/**
 * RecentMovementItem displays a single activity from the recent activity feed.
 * Shows icon, type label, activity name, and date.
 * Clickable to navigate to the activity detail.
 * 
 * Props:
 *   - movement: The activity to display
 *   - onClick: Callback when the item is clicked
 */

interface RecentMovementItemProps {
  movement: RecentActivity;
  onClick: () => void;
}

const RecentMovementItem: React.FC<RecentMovementItemProps> = ({
  movement,
  onClick
}) => {
  // Get icon and label based on type
  const getTypeDisplay = (type: RecentActivityType) => {
    const typeMap: Record<RecentActivityType, { icon: string; label: string }> = {
      event: { icon: '🎉', label: 'Evento' },
      task: { icon: '✅', label: 'Tarea' },
      negotiation: { icon: '💬', label: 'Negociación' }
    };
    return typeMap[type];
  };

  // Format date: "3 de abril"
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  };

  const typeDisplay = getTypeDisplay(movement.type);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition"
    >
      {/* Icon */}
      <span className="text-xl">{typeDisplay.icon}</span>

      {/* Type label + Name + Date */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase">
            {typeDisplay.label}
          </span>
          <span className="text-sm text-gray-900">{movement.name}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{formatDate(movement.date)}</p>
      </div>

      {/* Right arrow indicator */}
      <span className="text-gray-400">→</span>
    </div>
  );
};

export default RecentMovementItem;
```

- [ ] **Step 2: Verify the component structure**

The component should:
- ✅ Accept `movement` and `onClick` as props
- ✅ Display icon based on type (🎉 event, ✅ task, 💬 negotiation)
- ✅ Display type label, activity name, and formatted date
- ✅ Be clickable (cursor pointer, hover effect)
- ✅ Call `onClick()` when clicked

- [ ] **Step 3: Commit**

```bash
cd src/frontend
git add src/components/RecentMovementItem.tsx
git commit -m "feat: add RecentMovementItem component for activity feed"
```

---

### Task 9: Update RequestInbox Component

**Files:**
- Modify: `src/frontend/src/pages/RequestInbox.tsx` (the entire file or the relevant section)

- [ ] **Step 1: Locate the current RequestInbox component**

Find `src/frontend/src/pages/RequestInbox.tsx`. Look for the section that displays pending tasks. It likely has something like:
```typescript
const RequestInbox: React.FC = () => {
  // ... state, hooks
  return (
    <div>
      {/* Task section */}
      {/* Currently showing minimal info or a simple tick */}
    </div>
  );
};
```

- [ ] **Step 2: Replace the entire component with the updated version**

```typescript
// src/frontend/src/pages/RequestInbox.tsx

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TaskPendingCard from '../components/TaskPendingCard';
import { TaskPendingLog } from '../types/activity';
import { fetchPendingTaskLogs, verifyTaskLog, rejectTaskLog } from '../services/apiClient';
import { useAuthStore } from '../store/useAppStore';

/**
 * RequestInbox displays pending items that require the user's attention.
 * Currently shows pending task verifications with full details and direct action buttons.
 */

const RequestInbox: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch pending task logs
  const {
    data: pendingTasks = [],
    isLoading: tasksLoading,
    error: tasksError
  } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: fetchPendingTaskLogs,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Mutation: Verify task
  const verifyMutation = useMutation({
    mutationFn: verifyTaskLog,
    onSuccess: () => {
      // Invalidate the pending tasks cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] });
    }
  });

  // Mutation: Reject task
  const rejectMutation = useMutation({
    mutationFn: rejectTaskLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] });
    }
  });

  if (tasksLoading) {
    return <div className="p-4 text-center">Cargando tareas pendientes...</div>;
  }

  if (tasksError) {
    return <div className="p-4 text-red-600">Error al cargar tareas</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Bandeja de Entrada</h1>

      {/* Tasks Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Tareas Pendientes de Verificar</h2>

        {pendingTasks.length === 0 ? (
          <p className="text-gray-600">No hay tareas pendientes de verificar. ¡Bien hecho!</p>
        ) : (
          <div>
            {pendingTasks.map((taskLog: TaskPendingLog) => (
              <TaskPendingCard
                key={taskLog.id}
                taskLog={taskLog}
                onVerify={verifyMutation.mutateAsync}
                onReject={rejectMutation.mutateAsync}
              />
            ))}
          </div>
        )}
      </section>

      {/* Future: Other sections (events, negotiations) can be added here */}
    </div>
  );
};

export default RequestInbox;
```

- [ ] **Step 3: Verify imports and structure**

Check that:
- ✅ All imports are correct (React Query, components, types, services, store)
- ✅ Uses `useQuery` for pending tasks
- ✅ Uses `useMutation` for verify/reject actions
- ✅ Invalidates cache on success to refresh the list
- ✅ Shows loading and error states
- ✅ Maps pending tasks to `TaskPendingCard` components

- [ ] **Step 4: Commit**

```bash
cd src/frontend
git add src/pages/RequestInbox.tsx
git commit -m "feat: update RequestInbox to use TaskPendingCard with full task info"
```

---

### Task 10: Update Dashboard Component

**Files:**
- Modify: `src/frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Locate the Dashboard component**

Find `src/frontend/src/pages/Dashboard.tsx`. Note where you want to add the recent activity section (typically at the bottom or as a new section).

- [ ] **Step 2: Add imports at the top of the file**

```typescript
import { useQuery } from '@tanstack/react-query';
import RecentMovementItem from '../components/RecentMovementItem';
import { RecentActivity } from '../types/activity';
import { fetchRecentActivity } from '../services/apiClient';
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 3: Add the recent activity section inside the Dashboard component**

Find a good place in the return/render section (typically towards the end of the Dashboard). Add:

```typescript
// Inside the Dashboard component, after existing sections:

// Fetch recent activity
const {
  data: recentActivities = [],
  isLoading: activitiesLoading,
  error: activitiesError
} = useQuery({
  queryKey: ['recentActivity'],
  queryFn: fetchRecentActivity,
  staleTime: 1000 * 60 * 5 // 5 minutes
});

const navigate = useNavigate();

// In the JSX return, add this section:
<section className="mt-8 p-4 bg-white rounded-lg shadow">
  <h2 className="text-2xl font-semibold mb-4">Últimos Movimientos</h2>

  {activitiesLoading ? (
    <p className="text-gray-600">Cargando movimientos...</p>
  ) : activitiesError ? (
    <p className="text-red-600">Error al cargar movimientos</p>
  ) : recentActivities.length === 0 ? (
    <p className="text-gray-600">No hay actividad reciente</p>
  ) : (
    <div className="space-y-2">
      {recentActivities.map((activity: RecentActivity) => (
        <RecentMovementItem
          key={`${activity.type}-${activity.id}`}
          movement={activity}
          onClick={() => {
            // Navigate to the appropriate detail page based on type
            if (activity.type === 'event') {
              navigate(`/events/${activity.relatedId}`);
            } else if (activity.type === 'task') {
              navigate(`/tasks/${activity.relatedId}`);
            } else if (activity.type === 'negotiation') {
              navigate(`/events/${activity.relatedId}`); // Negotiations are part of events
            }
          }}
        />
      ))}
    </div>
  )}
</section>
```

- [ ] **Step 4: Verify the integration**

Check that:
- ✅ Query loads recent activities with React Query
- ✅ Loading, error, and empty states are handled
- ✅ Each `RecentMovementItem` has proper `onClick` handler
- ✅ Navigation works correctly based on activity type
- ✅ No TypeScript errors

- [ ] **Step 5: Commit**

```bash
cd src/frontend
git add src/pages/Dashboard.tsx
git commit -m "feat: add recent activity feed to Dashboard"
```

---

## Integration & Testing Tasks

### Task 11: Manual Testing - Backend Endpoints

**Files:**
- Test files: none (manual testing)

- [ ] **Step 1: Start the backend server**

```bash
cd src/backend
npm run dev
```

Let it run in a separate terminal.

- [ ] **Step 2: Register two test users and create a couple**

Use Postman or curl to:
1. Register User A: `POST /api/auth/register { email: "user.a@test.com", password: "test123", name: "User A" }`
2. Note the couple secret key from the response
3. Register User B: `POST /api/auth/register { email: "user.b@test.com", password: "test123", name: "User B", coupleSecretKey: "xxx" }`
4. Login both users and save their JWT tokens

- [ ] **Step 3: Create some test data**

Create a few events and tasks, mark some as completed:
```bash
# Create an event
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer USER_A_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "type": "Cena", "dateStart": "2026-04-03T19:00:00Z", "dateEnd": "2026-04-03T21:00:00Z", "pointsBase": 5 }'

# Create and complete a task log
curl -X POST http://localhost:3000/api/tasks/logs \
  -H "Authorization: Bearer USER_A_JWT" \
  -H "Content-Type: application/json" \
  -d '{ "taskId": "xxx", "date": "2026-04-03T10:00:00Z", "pointsFinal": 2 }'
```

- [ ] **Step 4: Test the `/api/recent-activity` endpoint**

```bash
curl -X GET http://localhost:3000/api/recent-activity \
  -H "Authorization: Bearer USER_A_JWT"
```

Expected response:
```json
[
  {
    "id": "...",
    "type": "task",
    "name": "Cocina",
    "date": "2026-04-03T10:00:00Z",
    "relatedId": "..."
  },
  // ... more activities
]
```

- [ ] **Step 5: Test the enriched task logs endpoint**

```bash
curl -X GET http://localhost:3000/api/tasks/logs?status=pending \
  -H "Authorization: Bearer USER_A_JWT"
```

Expected response includes full task and user details:
```json
[
  {
    "id": "...",
    "task": { "name": "Cocina", "category": "cocina" },
    "completedBy": { "id": "...", "name": "User A" },
    "date": "2026-04-03T10:00:00Z",
    "pointsFinal": 2,
    "status": "pending"
  }
]
```

- [ ] **Step 6: Stop the server**

```bash
pkill -f "npm run dev"
```

---

### Task 12: Manual Testing - Frontend Components

**Files:**
- Test files: none (manual testing)

- [ ] **Step 1: Start both backend and frontend**

```bash
# Terminal 1: Backend
cd src/backend && npm run dev

# Terminal 2: Frontend
cd src/frontend && npm run dev
```

- [ ] **Step 2: Login to the app**

Go to `http://localhost:5173`, login with the test user created in Task 11.

- [ ] **Step 3: Navigate to RequestInbox**

Click on "Bandeja de Entrada" or go to `/request-inbox`.

Verify:
- ✅ Pending tasks load without errors
- ✅ Each task shows: task name, category emoji, who completed it, date/time
- ✅ Points are displayed
- ✅ "Verificar" and "Rechazar" buttons are clickable
- ✅ After clicking verify, the task disappears from the list

- [ ] **Step 4: Navigate to Dashboard**

Go to `/dashboard` or the home page.

Verify:
- ✅ "Últimos Movimientos" section is visible
- ✅ Shows up to 5 recent activities
- ✅ Each activity displays: icon, type, name, date
- ✅ Clicking an activity navigates to its detail page
- ✅ Activities are sorted by date (newest first)

- [ ] **Step 5: Stop the servers**

```bash
pkill -f "npm run dev"
```

---

### Task 13: Final Cleanup and Commit

**Files:**
- Review: all modified files

- [ ] **Step 1: Review all changes**

Ensure no console errors, all components render properly, TypeScript compiles without warnings.

- [ ] **Step 2: Final commit**

```bash
cd /Users/edu/Web\ development/Claude/Matripuntos
git status
# Should show a clean state after all previous commits

# Create a final summary commit if needed:
git log --oneline -15
# Verify all our commits are there
```

---

## Testing Strategy

All components use React Query for state management, which handles:
- Loading states
- Error handling
- Cache invalidation on mutations

The backend endpoints are simple and testable via curl/Postman.

Manual testing (Task 11-12) covers:
- ✅ Backend endpoint responses
- ✅ Frontend component rendering
- ✅ User interactions (verify/reject)
- ✅ Navigation

---

## Success Criteria

- ✅ Bandeja de Entrada shows complete task information with direct action buttons
- ✅ Dashboard displays recent activity feed (events, tasks, negotiations)
- ✅ Clicking an activity navigates to its detail page
- ✅ Backend endpoints return enriched data with all necessary relationships
- ✅ Frontend components handle loading, error, and empty states
- ✅ No console errors or TypeScript warnings
- ✅ All commits are descriptive and focused
