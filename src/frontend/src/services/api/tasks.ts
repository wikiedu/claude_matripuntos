// Dominio tareas: CRUD, logs, verificación/disputa, recurrentes y helpers
// sueltos de task-logs que históricamente vivían como funciones exportadas.
import type { TaskSchedule, Task } from '../../types/index'
import { http } from './http'

// Task endpoints
export const tasks = {
  create: (data: {
    name: string
    description?: string
    category: string
    pointsBase?: number
    isDefault?: boolean
    defaultAssigneeId?: string | null
  }) =>
    http.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: () => http.request('/tasks'),

  logCompletion: (taskId: string, data: {
    date: string
    pointsBase: number
    modifier?: 'none' | 'extra' | 'partial' | 'profunda' | 'complicada' | 'visita'
    notes?: string
  }) =>
    http.request(`/tasks/${taskId}/log`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        // Backend expects YYYY-MM-DD (z.string().min(1))
        date: data.date.includes('T') ? data.date.split('T')[0] : data.date,
      }),
    }),

  getLogs: (taskId: string, startDate?: string, endDate?: string) => {
    const query = startDate && endDate
      ? `?startDate=${startDate}&endDate=${endDate}`
      : ''
    return http.request(`/tasks/${taskId}/logs${query}`)
  },

  getAllLogs: (status?: string) => {
    const query = status ? `?status=${status}` : ''
    return http.request(`/tasks/all-logs${query}`)
  },

  verifyLog: (taskId: string, logId: string) =>
    http.request(`/tasks/${taskId}/logs/${logId}/verify`, {
      method: 'PUT',
    }),

  disputeLog: (taskId: string, logId: string, data: {
    status?: string
    verifiedBy?: string
    disputeReason?: string
    pointsDisputed?: number
  }) =>
    http.request(`/tasks/${taskId}/logs/${logId}/dispute`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  schedule: (id: string, data: TaskSchedule): Promise<Task> =>
    http.request(`/tasks/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) }),

  getWeeklyLogs: (from: string, to: string): Promise<any[]> =>
    http.request(`/tasks/logs?view=week&from=${from}&to=${to}`),

  delete: (id: string) => http.request(`/tasks/${id}`, { method: 'DELETE' }),

  // Módulo Recurrentes (Paso 2 Módulo Tareas 2.0)
  getRecurring: () => http.request('/tasks/recurring'),
  pause: (id: string) => http.request(`/tasks/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => http.request(`/tasks/${id}/resume`, { method: 'POST' }),
}

/**
 * Fetch all pending task logs for the user's couple.
 * @returns {Promise<TaskPendingLog[]>} API response with logs array and taskId included
 * @throws {Error} If the request fails
 */
export const fetchPendingTaskLogs = async (): Promise<import('../../types/activity').TaskPendingLog[]> => {
  const result = await tasks.getAllLogs('pending')
  return (result.logs ?? []) as import('../../types/activity').TaskPendingLog[]
}

/**
 * Verify a task log by ID.
 * @param {string} taskLogId - The ID of the task log to verify
 * @param {string} taskId - The ID of the task (parent entity)
 * @returns {Promise<any>} The verified task log data
 * @throws {Error} If the request fails
 */
export const verifyTaskLog = (taskLogId: string, taskId?: string) => {
  // If taskId is provided, use it directly
  if (taskId) {
    return http.request(`/tasks/${taskId}/logs/${taskLogId}/verify`, {
      method: 'PUT',
    })
  }
  // Otherwise, we'll need to fetch it - this is handled in the component
  throw new Error('taskId is required for verifyTaskLog')
}

/**
 * Reject/dispute a task log by ID.
 * @param {string} taskLogId - The ID of the task log to reject
 * @param {string} taskId - The ID of the task (parent entity)
 * @returns {Promise<any>} The disputed task log data
 * @throws {Error} If the request fails
 */
export const rejectTaskLog = (taskLogId: string, taskId?: string) => {
  // If taskId is provided, use it directly
  if (taskId) {
    return http.request(`/tasks/${taskId}/logs/${taskLogId}/dispute`, {
      method: 'PUT',
      body: JSON.stringify({}),
    })
  }
  // Otherwise, we'll need to fetch it - this is handled in the component
  throw new Error('taskId is required for rejectTaskLog')
}
