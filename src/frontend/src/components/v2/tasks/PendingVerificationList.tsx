// Bloque "Mis tareas pendientes de verificación" (extraído de pages/Tasks.tsx en T2).

import { Clock } from 'lucide-react'
import { formatLocalDate } from '../../../utils/dateUtils'
import { CATEGORY_EMOJI } from './CategoryFilterStrip'
import { TaskProofUploader } from '../proof/TaskProofUploader'
import type { TaskLog } from './taskTypes'

export function PendingVerificationList({ logs }: { logs: TaskLog[] }) {
  if (logs.length === 0) return null
  return (
    <div className="p-3 rounded-md bg-warn/10 border border-warn/30">
      <p className="text-sm font-semibold text-warn mb-2 inline-flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Mis tareas pendientes de verificación ({logs.length})
      </p>
      <div className="space-y-1.5">
        {logs.map((log) => (
          <div key={log.id} className="bg-surface-card rounded-md px-3 py-2 border border-brd-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{CATEGORY_EMOJI[log.taskCategory?.toLowerCase()] || '✅'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{log.taskName}</p>
                  <p className="text-xs text-text-tertiary">{formatLocalDate(log.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm font-bold text-warn tabular-nums">+{log.pointsFinal} pts</span>
              </div>
            </div>
            <TaskProofUploader logId={log.id} canEdit={true} compact />
          </div>
        ))}
      </div>
    </div>
  )
}
