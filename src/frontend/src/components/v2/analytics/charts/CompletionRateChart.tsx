import { Card } from '../../primitives/Card'

interface Row { who: string; pct: number; color: string }
interface Props { rows: Row[] }

export function CompletionRateChart({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          🎯 Aún no hay tareas asignadas suficientes.
        </Card>
      </div>
    )
  }
  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🎯 Tasa de cumplimiento</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Tareas asignadas completadas</div>
      </div>
      <Card>
        <div className="flex flex-col gap-2.5">
          {rows.map(r => (
            <div key={r.who}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-primary font-semibold">{r.who}</span>
                <span className="font-bold tabular-nums" style={{ color: r.color }}>{r.pct}%</span>
              </div>
              <div className="h-2 rounded bg-white/5 overflow-hidden">
                <div className="h-full rounded" style={{ width: `${Math.min(100, Math.max(0, r.pct))}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
