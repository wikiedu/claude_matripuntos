import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Check, AlertTriangle, Loader } from 'lucide-react'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'
import type { TaskLog } from '../../../types/index'
import { CATEGORY_EMOJI } from '../tasks/CategoryFilterStrip'

interface Props {
  logs: TaskLog[]
}

const MAX_VISIBLE = 2

// Dashboard widget: surfaces the partner's pending-verification task logs so
// the user can verify them in one tap without going to /home/tasks. Mirrors
// the richer verification section in Tasks.tsx but compact and capped.
export function VerifyTasksBanner({ logs }: Props) {
  const nav = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAppStore()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const partnerPending = useMemo(
    () => logs.filter((l) => l.status === 'pending' && l.completedBy?.id !== user?.id),
    [logs, user?.id],
  )

  if (partnerPending.length === 0) return null

  const visible = partnerPending.slice(0, MAX_VISIBLE)
  const overflow = Math.max(0, partnerPending.length - MAX_VISIBLE)

  async function handleVerify(log: TaskLog) {
    setBusyId(log.id)
    setError(null)
    try {
      await apiClient.tasks.verifyLog(log.taskId, log.id)
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al verificar')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-4 mt-2 mb-3 rounded-xl bg-success/10 border border-success/30 p-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-success mb-2">
        ✅ Verificar de tu pareja ({partnerPending.length})
      </h4>
      <div className="flex flex-col gap-2">
        {visible.map((log) => {
          const emoji = CATEGORY_EMOJI[log.task?.category?.toLowerCase() ?? ''] ?? '✅'
          return (
            <div
              key={log.id}
              className="bg-surface-elevated border border-brd-subtle rounded-lg p-2.5 flex items-center gap-2"
            >
              <span className="text-xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">
                  {log.task?.name ?? 'Tarea'}
                </div>
                <div className="text-[11px] text-text-secondary">
                  {log.completedBy?.name ?? 'Tu pareja'} · +{log.pointsFinal} MP
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleVerify(log)}
                disabled={busyId === log.id}
                aria-label="Verificar"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-success text-white disabled:opacity-50"
              >
                {busyId === log.id ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => nav('/home/tasks')}
                aria-label="Disputar"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-warn/15 text-warn border border-warn/30"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
      {overflow > 0 && (
        <button
          type="button"
          onClick={() => nav('/home/tasks')}
          className="block mt-2 text-xs font-bold text-success"
        >
          …y {overflow} más · Ver todas →
        </button>
      )}
      {error && (
        <p className="mt-2 text-[11px] text-danger">{error}</p>
      )}
    </div>
  )
}
