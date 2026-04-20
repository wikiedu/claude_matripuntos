import { Card } from '../../primitives/Card'
import { Fragment } from 'react'

interface GridCell { dow: number; bucket: number; norm: number }
interface Props { grid: GridCell[]; buckets: number[]; hint?: string }

const DAYS = ['L','M','X','J','V','S','D']
const COLORS = ['rgba(168,85,247,0.08)','rgba(168,85,247,0.3)','rgba(168,85,247,0.5)','rgba(168,85,247,0.75)','rgba(168,85,247,1)']

export function HeatmapChart({ grid, buckets, hint }: Props) {
  function cell(dow: number, bucket: number) {
    return grid.find(g => g.dow === dow && g.bucket === bucket)?.norm ?? 0
  }
  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🗓️ Heatmap de actividad</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Cuándo completáis más tareas</div>
      </div>
      <Card>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `20px repeat(${buckets.length}, 1fr)` }}>
          <div />
          {buckets.map(h => <div key={h} className="text-[9px] text-text-tertiary text-center">{h}h</div>)}
          {DAYS.map((d, di) => (
            <Fragment key={d}>
              <div className="text-[9px] text-text-secondary font-semibold self-center">{d}</div>
              {buckets.map(b => (
                <div
                  key={`${di}-${b}`}
                  className="aspect-square rounded-sm"
                  style={{ background: COLORS[Math.min(4, Math.max(0, cell(di, b)))] }}
                />
              ))}
            </Fragment>
          ))}
        </div>
        {hint && <div className="mt-2.5 text-[11px] text-[#c4b5fd]">⏰ {hint}</div>}
      </Card>
    </div>
  )
}
