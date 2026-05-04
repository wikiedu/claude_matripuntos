import { useWeeklyTasks } from '../hooks/useWeeklyTasks'

interface Props {
  weekStart: Date  // Monday of the week to display
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const STATUS_COLORS: Record<string, string> = {
  verified: '#22c55e',
  pending: '#f59e0b',
  disputed: '#ef4444',
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
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--matri-text-3)', fontSize: 12 }}>
        Cargando semana...
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', gap: 6, minWidth: 700 }}>
        {days.map((day, i) => {
          const isToday = day.toDateString() === new Date().toDateString()
          const dayLogs = logsForDay(day)
          const iso = day.toISOString().slice(0, 10)
          return (
            <div key={i} id={`day-${iso}`} data-day-iso={iso} style={{ scrollMarginLeft: 16 }}>
              {/* Day header */}
              <div style={{
                textAlign: 'center', marginBottom: 6,
                padding: '4px 0',
              }}>
                <p style={{ fontSize: 9, color: 'var(--matri-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {DAY_LABELS[i]}
                </p>
                <p style={{
                  fontSize: 14, fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'var(--matri-amber)' : 'var(--matri-text)',
                }}>
                  {day.getDate()}
                </p>
              </div>
              {/* Logs */}
              {dayLogs.length === 0 && (
                <div style={{
                  height: 40, borderRadius: 8,
                  border: '1px dashed rgba(255,255,255,0.08)',
                }} />
              )}
              {dayLogs.map((log: any) => (
                <div key={log.id} style={{
                  background: 'var(--matri-card-bg)',
                  border: `1px solid ${STATUS_COLORS[log.status] ?? 'var(--matri-card-border)'}33`,
                  borderRadius: 8, padding: '6px 8px', marginBottom: 4,
                }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--matri-text)', marginBottom: 2 }}>
                    {log.task?.name ?? '—'}
                  </p>
                  {log.scheduledFor && (
                    <p style={{ fontSize: 9, color: 'var(--matri-text-3)' }}>
                      {new Date(log.scheduledFor).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <p style={{ fontSize: 9, color: STATUS_COLORS[log.status] ?? 'var(--matri-text-3)', marginTop: 2 }}>
                    {log.pointsFinal ?? log.pointsBase} pts
                  </p>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
