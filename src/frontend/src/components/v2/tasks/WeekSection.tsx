// Sección "Esta semana" de la página Tareas (extraída de pages/Tasks.tsx en T2).

import { TaskItemMedium } from './TaskItemMedium'
import type { Task } from './taskTypes'

export function WeekSection({
  tasks, doneCount, myWeekLogsByTaskId, onLog, onDelete,
}: {
  tasks: Task[]
  doneCount: number
  myWeekLogsByTaskId: Set<string>
  onLog: (task: Task) => void
  onDelete: (task: Task) => void
}) {
  if (tasks.length === 0) return null
  return (
    <section>
      <div className="flex items-baseline justify-between px-1 pt-3.5 pb-2">
        <h3 className="m-0 text-[13px] font-extrabold text-text-primary tracking-tight">📅 Esta semana</h3>
        <span className="text-[11px] font-bold text-text-tertiary tabular-nums tracking-wide">
          <b className="text-brand-amber font-extrabold">{doneCount}</b>/{tasks.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => {
          const doneThisWeek = myWeekLogsByTaskId.has(task.id)
          return (
          <div key={task.id} className="relative group">
            <TaskItemMedium
              task={{
                id: task.id,
                name: task.name,
                category: task.category,
                pointsBase: task.pointsBase,
                isRecurring: task.isRecurring,
                scheduledFor: task.scheduledFor,
              }}
              doneToday={doneThisWeek}
              onMark={() => !doneThisWeek && onLog(task)}
            />
            <button
              type="button"
              onClick={() => onDelete(task)}
              aria-label={`Borrar ${task.name}`}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-surface-card border border-brd-subtle text-text-tertiary hover:text-danger hover:border-danger/40 text-xs flex items-center justify-center shadow-sm"
            >
              ×
            </button>
          </div>
          )
        })}
      </div>
    </section>
  )
}
