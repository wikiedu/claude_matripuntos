// RequestInbox page — task-verification only (tabs Actividades/Historial removed in v1.5).
// Only renders the "Tareas (verificar)" content; route /request-inbox redirects to /home/activities.

import { useState } from 'react'
import {
  ChevronLeft, X, Loader,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, fetchPendingTaskLogs } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { TaskPendingCard } from '../components/TaskPendingCard'
import { TaskPendingLog } from '../types/activity'
import { Pill } from '../components/v2/primitives/Pill'
import { Card } from '../components/v2/primitives/Card'

// ─── Main component ───────────────────────────────────────────────────────────
export default function RequestInbox({ onBack }: { onBack?: () => void }) {
  const navigate = useNavigate()
  const { user } = useAppStore()
  const queryClient = useQueryClient()

  // Tasks: React Query hooks for pending task logs
  const { data: pendingTaskLogs = [], isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ['taskLogs', 'pending'],
    queryFn: fetchPendingTaskLogs,
    staleTime: 5 * 60 * 1000,
    select: (logs: TaskPendingLog[]) => logs.filter((log) => log.completedBy?.id !== user?.id),
  })

  const verifyMutation = useMutation({
    mutationFn: async ({ taskLogId, taskId }: { taskLogId: string; taskId: string }) =>
      apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/verify`, { method: 'PUT' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['achievements', 'map'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSuccess('Tarea verificada. Puntos actualizados.')
      setTimeout(() => setSuccess(null), 5000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al verificar la tarea')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ taskLogId, taskId }: { taskLogId: string; taskId: string }) =>
      apiClient.request(`/tasks/${taskId}/logs/${taskLogId}/dispute`, {
        method: 'PUT',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSuccess('Tarea rechazada / disputada.')
      setTimeout(() => setSuccess(null), 5000)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Error al rechazar la tarea')
    },
  })

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const goHome = onBack || (() => navigate('/dashboard'))

  const pendingCount = pendingTaskLogs.length

  return (
    <main className="px-4 pt-3 pb-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goHome}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm font-semibold"
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
          <span>Bandeja de entrada</span>
        </button>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Pill tone="amber">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</Pill>}
        </div>
      </div>
      <p className="text-sm text-text-tertiary mb-4">
        {pendingCount > 0
          ? `${pendingCount} elemento${pendingCount !== 1 ? 's' : ''} requiere${pendingCount !== 1 ? 'n' : ''} tu atención`
          : 'Todo al día.'}
      </p>

      {/* Inline banners */}
      {error && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm flex items-start justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 rounded-md bg-success/10 border border-success/30 text-success text-sm">
          {success}
        </div>
      )}

      {/* ─── TASKS CONTENT ─── */}
      <div className="space-y-3">
        {tasksLoading && (
          <Card className="text-center py-12">
            <Loader className="w-6 h-6 animate-spin text-brand-purple mx-auto mb-3" />
            <p className="text-text-secondary">Cargando tareas…</p>
          </Card>
        )}

        {tasksError && (
          <Card className="text-center py-12">
            <div className="text-5xl mb-3">⚠️</div>
            <p className="font-semibold text-danger mb-1">Error al cargar tareas</p>
            <p className="text-sm text-text-secondary">
              {tasksError instanceof Error ? tasksError.message : 'Intenta recargar la página.'}
            </p>
          </Card>
        )}

        {!tasksLoading && !tasksError && pendingTaskLogs.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-5xl mb-3">🏠</div>
            <p className="font-semibold text-text-primary mb-1">Sin tareas pendientes de verificar</p>
            <p className="text-sm text-text-secondary">
              Cuando tu pareja registre tareas, aparecerán aquí para verificar.
            </p>
          </Card>
        )}

        {!tasksLoading && !tasksError && (pendingTaskLogs as TaskPendingLog[]).length > 0 && (
          <>
            <p className="text-xs text-text-tertiary pb-1">
              Tareas completadas por tu pareja que esperan tu verificación.
            </p>
            {(pendingTaskLogs as TaskPendingLog[]).map((taskLog) => (
              <TaskPendingCard
                key={taskLog.id}
                taskLog={taskLog}
                onVerify={(taskLogId) => verifyMutation.mutateAsync({ taskLogId, taskId: taskLog.taskId })}
                onReject={(taskLogId) => rejectMutation.mutateAsync({ taskLogId, taskId: taskLog.taskId })}
              />
            ))}
          </>
        )}
      </div>

    </main>
  )
}
