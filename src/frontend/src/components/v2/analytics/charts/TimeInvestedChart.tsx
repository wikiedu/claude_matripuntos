import { Card } from '../../primitives/Card'

interface Side { name: string; hours: number }
interface Props { you: Side; partner: Side }

export function TimeInvestedChart({ you, partner }: Props) {
  const total = you.hours + partner.hours
  if (total === 0) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          ⏱️ Aún no hay actividad registrada esta semana.
        </Card>
      </div>
    )
  }
  const youPct = (you.hours / total) * 100
  const diff = Math.abs(you.hours - partner.hours)
  const balanced = diff < 1

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">⏱️ Tiempo invertido</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Estimado esta semana</div>
      </div>
      <Card>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-[10px] text-text-secondary">{you.name}</div>
            <div className="text-xl font-extrabold text-brand-purple tabular-nums">{you.hours.toFixed(1)}h</div>
          </div>
          <div className="text-lg text-text-tertiary">vs</div>
          <div className="text-right">
            <div className="text-[10px] text-text-secondary">{partner.name}</div>
            <div className="text-xl font-extrabold text-brand-amber tabular-nums">{partner.hours.toFixed(1)}h</div>
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(245,158,11,0.25)' }}>
          <div className="bg-gradient-to-r from-brand-purple to-brand-purple-dark" style={{ width: `${youPct}%` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-brand-purple font-bold tabular-nums">{Math.round(youPct)}%</span>
          <span className="text-[10px] text-brand-amber font-bold tabular-nums">{Math.round(100 - youPct)}%</span>
        </div>
        <div className="mt-2.5 text-[11px] text-text-secondary">
          {balanced ? `⚖️ Reparto equilibrado — diferencia de solo ${diff.toFixed(1)}h` : `⚡ Diferencia de ${diff.toFixed(1)}h`}
        </div>
      </Card>
    </div>
  )
}
