// v2.3.3 — WeekStrip de 7 días (Claude Design canvas 15 S03).
// Cabeza de la vista Semana: 7 columnas con día letra + número + pip de color
// (amber=tarea, purple=actividad, both=ambos). Tap a un día → scroll al
// DayBlock correspondiente.

interface DayDot {
  dn: string         // 'L'
  dd: number         // 4
  iso: string        // '2026-05-04'
  today: boolean
  pip: 'amber' | 'spend' | 'both' | null
}

interface Props {
  days: DayDot[]
  onDayClick?: (iso: string) => void
}

export function WeekStrip({ days, onDayClick }: Props) {
  return (
    <div className="grid grid-cols-7 gap-1 px-4 pb-3">
      {days.map((d) => (
        <button
          key={d.iso}
          type="button"
          onClick={() => onDayClick?.(d.iso)}
          className={`px-1 py-2 rounded-[10px] text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber transition ${
            d.today
              ? 'bg-brand-amber/10 border border-brand-amber/40'
              : 'bg-surface-card border border-brd-subtle'
          }`}
        >
          <div className={`text-[9px] font-bold uppercase tracking-wide ${d.today ? 'text-brand-amber' : 'text-text-tertiary'}`}>
            {d.dn}
          </div>
          <div className="text-sm font-extrabold text-text-primary tabular-nums mt-0.5">{d.dd}</div>
          <div className="flex justify-center mt-1">
            <span
              aria-hidden
              className="block w-1 h-1 rounded-full"
              style={{
                visibility: d.pip ? 'visible' : 'hidden',
                background:
                  d.pip === 'spend' ? 'var(--brand-purple)' :
                  d.pip === 'both'  ? 'linear-gradient(90deg, var(--brand-amber), var(--brand-purple))' :
                  'var(--brand-amber)',
              }}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

export default WeekStrip
