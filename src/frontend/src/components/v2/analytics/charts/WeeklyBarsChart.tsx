import { Card } from '../../primitives/Card'

interface Day { label: string; you: number; partner: number }
interface Props { days: Day[]; youName: string; partnerName: string }

// Round the axis cap to a "nice" tick value so gridlines land on whole numbers
// instead of things like 12.5/25/37.5. Mirrors what Recharts does internally.
function niceCeil(value: number): number {
  if (value <= 5) return 5
  if (value <= 10) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const nice = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
}

export function WeeklyBarsChart({ days, youName, partnerName }: Props) {
  const rawMax = Math.max(...days.flatMap(d => [d.you, d.partner]), 0)
  const axisMax = rawMax > 0 ? niceCeil(rawMax) : 10
  const hasData = rawMax > 0
  const youTotal     = days.reduce((s, d) => s + d.you,     0)
  const partnerTotal = days.reduce((s, d) => s + d.partner, 0)

  // Three gridlines: max, mid, 0. Keeps the chart readable at a glance without
  // cluttering the frame; replaces the previous "flat bars" look where no axis
  // context was shown at all.
  const ticks = [axisMax, axisMax / 2, 0]

  return (
    <div className="mx-4 mb-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <div className="text-sm font-bold text-text-primary">📊 Puntos por día</div>
          <div className="text-[11px] text-text-secondary mt-0.5">{youName} vs {partnerName} · esta semana</div>
        </div>
        <div className="flex gap-2.5 text-[10px]">
          <span className="text-brand-purple font-semibold">● {youName}</span>
          <span className="text-brand-amber  font-semibold">● {partnerName}</span>
        </div>
      </div>
      <Card>
        <div className="flex gap-2 h-[150px] mb-2">
          {/* Y axis labels — fixed width so bars align regardless of label length. */}
          <div className="flex flex-col justify-between w-6 text-[9px] text-text-tertiary tabular-nums text-right pr-1 pb-[14px]">
            {ticks.map((t, i) => (
              <span key={i} className="leading-none">{Math.round(t)}</span>
            ))}
          </div>

          <div className="flex-1 relative">
            {/* Horizontal gridlines at each tick. Positioned in the plot area
                above the day labels, so 0% = bottom of bars, 100% = top. */}
            <div className="absolute inset-x-0 top-0 bottom-[14px] pointer-events-none">
              {ticks.map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-brd-subtle/50"
                  style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
                />
              ))}
            </div>

            <div className="flex gap-1.5 h-full">
              {days.map(d => (
                <div
                  key={d.label}
                  className="flex-1 flex flex-col items-center gap-1 cursor-default relative"
                  title={`${d.label} · ${youName}: ${d.you} MP · ${partnerName}: ${d.partner} MP`}
                >
                  <div className="flex-1 flex items-end gap-0.5 w-full min-h-0">
                    <div
                      className="flex-1 rounded-t-sm bg-gradient-to-b from-brand-purple to-brand-purple-dark transition-opacity hover:opacity-80"
                      style={{ height: `${(d.you / axisMax) * 100}%`, minHeight: d.you > 0 ? 4 : 0 }}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-gradient-to-b from-[#fbbf24] to-brand-amber-dark transition-opacity hover:opacity-80"
                      style={{ height: `${(d.partner / axisMax) * 100}%`, minHeight: d.partner > 0 ? 4 : 0 }}
                    />
                  </div>
                  <div className="text-[10px] font-semibold text-text-secondary">{d.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!hasData && (
          <div className="text-center text-[11px] text-text-secondary pb-1 -mt-1">
            Aún no hay puntos registrados esta semana.
          </div>
        )}

        <div className="flex justify-between pt-2.5 border-t border-brd-subtle">
          <div>
            <div className="text-[10px] text-text-secondary">{youName} · total</div>
            <div className="text-lg font-extrabold text-brand-purple tabular-nums">{youTotal} MP</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-text-secondary">{partnerName} · total</div>
            <div className="text-lg font-extrabold text-brand-amber tabular-nums">{partnerTotal} MP</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
