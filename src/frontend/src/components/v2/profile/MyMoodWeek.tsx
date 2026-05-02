// v1.6 — Línea horizontal con un punto por día (últimos 7), solo del user.
// Si hay MoodLog ese día → muestra emoji del mood. Si no → punto gris vacío.
// Nunca muestra moods del partner — privacidad.

interface DayEntry {
  date: string
  moodKey: string | null
  emoji?: string
  label?: string
}

interface Props {
  history: DayEntry[]
  loading: boolean
}

export function MyMoodWeek({ history, loading }: Props) {
  if (loading) {
    return (
      <div data-testid="mood-week-loading" className="h-16 bg-white/5 rounded-xl animate-pulse" />
    )
  }

  if (history.length === 0) {
    return (
      <div data-testid="mood-week-empty" className="rounded-xl bg-white/5 p-4 text-xs text-white/40">
        Aún no has registrado moods.
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="text-xs text-white/60 mb-2">Mi mood — últimos 7 días</div>
      <div className="flex justify-between items-center gap-1">
        {history.map(d => (
          <div
            key={d.date}
            data-testid={`mood-day-${d.date}`}
            title={`${d.date}${d.label ? ' · ' + d.label : ''}`}
            className="flex flex-col items-center text-xl"
          >
            {d.emoji ?? <span className="text-white/30">·</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
