import { Card } from '../../primitives/Card'

interface Day { label: string; you: number; partner: number }
interface Props { days: Day[]; youName: string; partnerName: string }

export function WeeklyBarsChart({ days, youName, partnerName }: Props) {
  const max = Math.max(1, ...days.flatMap(d => [d.you, d.partner]))
  const youTotal     = days.reduce((s, d) => s + d.you,     0)
  const partnerTotal = days.reduce((s, d) => s + d.partner, 0)

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
        <div className="flex gap-1.5 h-[140px] mb-2">
          {days.map(d => (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center gap-1 cursor-default"
              title={`${d.label} · ${youName}: ${d.you} MP · ${partnerName}: ${d.partner} MP`}
            >
              <div className="flex-1 flex items-end gap-0.5 w-full min-h-0">
                <div
                  className="flex-1 rounded-t-sm bg-gradient-to-b from-brand-purple to-brand-purple-dark transition-opacity hover:opacity-80"
                  style={{ height: `${(d.you / max) * 100}%`, minHeight: d.you > 0 ? 4 : 0 }}
                />
                <div
                  className="flex-1 rounded-t-sm bg-gradient-to-b from-[#fbbf24] to-brand-amber-dark transition-opacity hover:opacity-80"
                  style={{ height: `${(d.partner / max) * 100}%`, minHeight: d.partner > 0 ? 4 : 0 }}
                />
              </div>
              <div className="text-[10px] font-semibold text-text-secondary">{d.label}</div>
            </div>
          ))}
        </div>
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
