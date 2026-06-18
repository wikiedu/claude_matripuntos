// Sección "Hoy" de la página Tareas (extraída de pages/Tasks.tsx en T2):
// header con day stamp + count amber + AllDoneCard, y la lista de tareas de hoy
// (o el empty state con CTA al catálogo).

import { ListChecks, Plus, Sparkles } from 'lucide-react'
import { Button } from '../primitives/Button'
import { AllDoneCard } from './AllDoneCard'
import { TaskItemLarge } from './TaskItemLarge'
import type { Task, TaskLog } from './taskTypes'

export function TodaySection({
  todayTasks, filteredTasksCount, cat, myTodayLogs, myTodayLogsByTask,
  pendingThisWeek, onLog, onDelete, onOpenCatalog,
}: {
  todayTasks: Task[]
  filteredTasksCount: number
  cat: string
  myTodayLogs: TaskLog[]
  myTodayLogsByTask: Map<string, TaskLog>
  pendingThisWeek: number
  onLog: (task: Task) => void
  onDelete: (task: Task) => void
  onOpenCatalog: () => void
}) {
  const dayLabel = new Date().toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).replace('.', '')
  const allDoneToday = todayTasks.length > 0 && myTodayLogs.length >= todayTasks.length
  const totalMpToday = myTodayLogs.reduce((s, l) => s + Number(l.pointsFinal || 0), 0)

  return (
    <>
      {/* Section: Hoy — header refinado canvas 15 (con day stamp + count amber) */}
      <section>
        <div className="flex items-baseline justify-between px-1 pt-3.5 pb-2">
          <h3 className="m-0 text-[13px] font-extrabold text-text-primary tracking-tight">
            🔥 Hoy
            <span className="ml-2 text-xs font-semibold text-text-tertiary">· {dayLabel}</span>
          </h3>
          <span className="text-[11px] font-bold text-text-tertiary tabular-nums tracking-wide">
            <b className="text-brand-amber font-extrabold">{myTodayLogs.length}</b>/{todayTasks.length}
          </span>
        </div>
        {allDoneToday && (
          <AllDoneCard totalMpToday={totalMpToday} pendingThisWeek={pendingThisWeek} />
        )}
      </section>

      {/* Section: Hoy (contenido original mantenido) */}
      <section>
        {todayTasks.length === 0 ? (
          <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
            {filteredTasksCount === 0 ? (
              <ListChecks className="w-9 h-9 mx-auto text-text-tertiary mb-2" />
            ) : (
              <Sparkles className="w-9 h-9 mx-auto text-brand-purple mb-2" />
            )}
            <p className="text-sm font-semibold text-text-primary mb-1">
              {filteredTasksCount === 0
                ? (cat === 'all' ? 'Sin tareas en tu lista' : 'Sin tareas en esta categoría')
                : 'Todo al día'}
            </p>
            <p className="text-xs text-text-secondary mb-3 max-w-xs mx-auto">
              {filteredTasksCount === 0
                ? (cat === 'all'
                  ? 'Empieza añadiendo una tarea del catálogo o crea la tuya — se repartirán los puntos según quien la haga.'
                  : 'Revisa el catálogo más abajo o crea una tarea en esta categoría.')
                : 'Las tareas de hoy están completadas o esperando a que tu pareja las verifique.'}
            </p>
            {filteredTasksCount === 0 && cat === 'all' && (
              <Button size="sm" onClick={onOpenCatalog}>
                <span className="inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Añadir del catálogo
                </span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => {
              const myLog = myTodayLogsByTask.get(task.id)
              const doneToday = !!myLog
              return (
                <div key={task.id} className="relative group">
                  <TaskItemLarge
                    task={{
                      id: task.id,
                      name: task.name,
                      category: task.category,
                      pointsBase: task.pointsBase,
                      isRecurring: task.isRecurring,
                      scheduledFor: task.scheduledFor,
                    }}
                    doneToday={doneToday}
                    status={myLog?.status}
                    onMark={() => !doneToday && onLog(task)}
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    aria-label={`Borrar ${task.name}`}
                    className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-surface-card border border-brd-subtle text-text-tertiary hover:text-danger hover:border-danger/40 text-sm leading-none flex items-center justify-center shadow-sm"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
