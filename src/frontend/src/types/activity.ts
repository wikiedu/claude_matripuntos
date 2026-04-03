/**
 * RecentActivity represents a unified activity feed item across events, tasks, and negotiations.
 */
export type RecentActivityType = 'event' | 'task' | 'negotiation';

/**
 * RecentActivity - Unified activity feed item
 *
 * Represents an activity across the application (events, tasks, negotiations).
 * Used for the activity feed and recent activity displays.
 *
 * @property id - Unique identifier for the activity
 * @property type - Activity type: 'event', 'task', or 'negotiation'
 * @property name - Display name of the activity
 * @property date - Date when the activity occurred
 * @property relatedId - ID for navigation to the related entity
 */
export interface RecentActivity {
  id: string;
  type: RecentActivityType;
  name: string;
  date: Date;
  relatedId: string;
}

/**
 * TaskPendingLog - Pending task verification record
 *
 * Represents a task log that is awaiting verification by the partner.
 * Used for displaying pending tasks in the activity feed and task verification views.
 *
 * @property id - Unique identifier for the task log
 * @property taskId - Reference to the task definition
 * @property task - Task metadata (id, name, category)
 * @property completedBy - User who completed the task
 * @property date - Date when the task was completed
 * @property pointsBase - Base points assigned to the task
 * @property pointsFinal - Final calculated points after modifiers
 * @property status - Status is always 'pending' for this type (awaiting verification)
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
