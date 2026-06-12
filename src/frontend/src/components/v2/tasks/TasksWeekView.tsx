// Vista "Semana" de la página Tareas (extraída de pages/Tasks.tsx en T2):
// navegación de semana + WeekStrip de 7 días + WeeklyTaskView.
// Se renderiza con -mx-4 para anular el wrapper px-4 del contenido legacy.

import { WeeklyTaskView } from '../../WeeklyTaskView'
import { WeekStrip } from './WeekStrip'
import type { Task } from './taskTypes'

export function TasksWeekView({
  weekStart, onWeekStartChange, filteredTasks,
}: {
  weekStart: Date
  onWeekStartChange: (d: Date) => void
  filteredTasks: Task[]
}) {
  const todayIso = new Date().toISOString().slice(0, 10)
  const dayLetters = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const tasksOnDay = filteredTasks.filter((t) => {
      if (!t.scheduledFor) return false
      return new Date(t.scheduledFor).toISOString().slice(0, 10) === iso
    })
    const pip: 'amber' | 'spend' | 'both' | null =
      tasksOnDay.length > 0 ? 'amber' : null
    return {
      dn: dayLetters[i],
      dd: d.getDate(),
      iso,
      today: iso === todayIso,
      pip,
    }
  })

  return (
    <div className="-mx-4">{/* anular el wrapper px-4 para que WeekStrip ocupe todo el ancho */}
      <div className="flex items-center justify-between px-6 py-2 mb-2">
        <button
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); onWeekStartChange(d) }}
          className="text-text-secondary hover:text-text-primary px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          aria-label="Semana anterior"
        >
          ‹
        </button>
        <span className="text-xs font-bold text-text-secondary">
          {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} –{' '}
          {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
        <button
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); onWeekStartChange(d) }}
          className="text-text-secondary hover:text-text-primary px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
          aria-label="Semana siguiente"
        >
          ›
        </button>
      </div>

      {/* v2.3.3 — WeekStrip 7 días (canvas 15) */}
      <WeekStrip
        days={days}
        onDayClick={(iso) => {
          const el = document.getElementById(`day-${iso}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
        }}
      />

      <div className="px-4">
        <WeeklyTaskView weekStart={weekStart} />
      </div>
    </div>
  )
}
