// v2.7.6 audit 06 S2-2 / 09 S2-U-1 — reescritura con Tailwind v2 tokens.
// Antes: inline styles + minWidth 700 forzaba scroll horizontal en móvil
// y referencias a `var(--matri-*)` legacy. Ahora responsivo (vertical en
// móvil, grid en sm+) con tokens v2.

import { useWeeklyTasks } from '../hooks/useWeeklyTasks'

interface Props {
  weekStart: Date  // Monday of the week to display
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS_COLOR_CLS: Record<string, string> = {
  verified: 'text-success border-success/30',
  pending:  'text-brand-amber border-brand-amber/30',
  disputed: 'text-danger border-danger/30',
}

export function WeeklyTaskView({ weekStart }: Props) {
  const from = weekStart.toISOString().split('T')[0]
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const to = weekEnd.toISOString().split('T')[0]

  const { data: logs = [], isLoading } = useWeeklyTasks(from, to)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const logsForDay = (day: Date) =>
    logs.filter((log: any) => {
      if (!log.scheduledFor) return false
      const logDate = new Date(log.scheduledFor)
      return logDate.toDateString() === day.toDateString()
    })

  if (isLoading) {
    return (
      <div className="text-center py-6 text-text-tertiary text-xs">
        Cargando semana...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5 sm:min-w-[700px]">
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString()
          const dayLogs = logsForDay(day)
          const iso = day.toISOString().slice(0, 10)
          return (
            <div
              key={i}
              id={`day-${iso}`}
              data-day-iso={iso}
              className="scroll-ml-4"
            >
              <div className="text-center mb-1.5 py-1">
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">
                  {DAY_LABELS[i]}
                </p>
                <p
                  className={`text-sm ${
                    isToday ? 'font-bold text-brand-amber' : 'font-normal text-text-primary'
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
              {dayLogs.length === 0 && (
                <div className="h-10 rounded-md border border-dashed border-brd-subtle" />
              )}
              {dayLogs.map((log: any) => {
                const statusCls = STATUS_COLOR_CLS[log.status] ?? 'text-text-tertiary border-brd-subtle'
                return (
                  <div
                    key={log.id}
                    className={`bg-surface-card border rounded-md px-2 py-1.5 mb-1 ${statusCls.split(' ')[1]}`}
                  >
                    <p className="text-[10px] font-semibold text-text-primary mb-0.5">
                      {log.task?.name ?? '—'}
                    </p>
                    {log.scheduledFor && (
                      <p className="text-[9px] text-text-tertiary">
                        {new Date(log.scheduledFor).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    <p className={`text-[9px] mt-0.5 ${statusCls.split(' ')[0]}`}>
                      {log.pointsFinal ?? log.pointsBase} pts
                    </p>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
