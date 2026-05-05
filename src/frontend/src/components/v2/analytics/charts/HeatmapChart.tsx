import { Card } from '../../primitives/Card'
import { Fragment, useState } from 'react'

interface GridCell { dow: number; bucket: number; norm: number; count?: number }
interface Props { grid: GridCell[]; buckets: number[]; hint?: string }

const DAYS = ['L','M','X','J','V','S','D']
const DAY_FULL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const COLORS = ['rgba(168,85,247,0.08)','rgba(168,85,247,0.3)','rgba(168,85,247,0.5)','rgba(168,85,247,0.75)','rgba(168,85,247,1)']

// Buckets of 3h starting at the bucket hour (e.g. 18 → "18-21h").
function bucketLabel(bucket: number): string {
  const end = bucket + 3
  return `${bucket}-${end === 24 ? 24 : end}h`
}

function activityLevel(norm: number): string {
  if (norm >= 4) return 'muy alta'
  if (norm >= 3) return 'alta'
  if (norm >= 2) return 'media'
  if (norm >= 1) return 'baja'
  return 'sin actividad'
}

export function HeatmapChart({ grid, buckets, hint }: Props) {
  // Tap-to-show popover for mobile, since `title` only works on hover.
  const [active, setActive] = useState<GridCell | null>(null)

  function cell(dow: number, bucket: number): GridCell | undefined {
    return grid.find(g => g.dow === dow && g.bucket === bucket)
  }

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🗓️ Heatmap de actividad</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Cuándo completáis más tareas</div>
      </div>
      <Card>
        {/* max-w caps cell size on wider viewports so the grid doesn't look
            zoomed-in; touchAction avoids iOS double-tap-zoom on the cells. */}
        <div
          className="grid gap-[3px] mx-auto"
          style={{
            gridTemplateColumns: `20px repeat(${buckets.length}, minmax(0, 1fr))`,
            maxWidth: 360,
            touchAction: 'manipulation',
          }}
        >
          <div />
          {buckets.map(h => <div key={h} className="text-[9px] text-text-tertiary text-center">{h}h</div>)}
          {DAYS.map((d, di) => (
            <Fragment key={d}>
              <div className="text-[9px] text-text-secondary font-semibold self-center">{d}</div>
              {buckets.map(b => {
                const c = cell(di, b)
                const norm = c?.norm ?? 0
                const count = c?.count ?? 0
                const tooltip = `${DAY_FULL[di]} · ${bucketLabel(b)} — ${count} ${count === 1 ? 'actividad' : 'actividades'} (${activityLevel(norm)})`
                return (
                  <button
                    key={`${di}-${b}`}
                    type="button"
                    title={tooltip}
                    aria-label={tooltip}
                    onClick={() => setActive(c ?? { dow: di, bucket: b, norm: 0, count: 0 })}
                    className="aspect-square rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/40 hover:ring-1 hover:ring-brand-purple/60"
                    // touchAction + tap-highlight avoid the iOS double-tap zoom
                    // and grey flash that made the heatmap feel like it was
                    // zooming/jumping when tapping cells.
                    style={{
                      background: COLORS[Math.min(4, Math.max(0, norm))],
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  />
                )
              })}
            </Fragment>
          ))}
        </div>

        {/* Mobile-friendly tap info */}
        {active && (
          <div className="mt-2.5 rounded-md bg-brand-purple/10 border border-brand-purple/30 px-2.5 py-1.5 text-[11px] text-text-primary flex items-center justify-between">
            <span>
              <span className="font-semibold">{DAY_FULL[active.dow]}</span>
              <span className="text-text-secondary"> · {bucketLabel(active.bucket)}</span>
              <span className="text-text-secondary"> — </span>
              <span className="font-bold text-brand-purple">{active.count ?? 0}</span>
              <span className="text-text-secondary"> {(active.count ?? 0) === 1 ? 'actividad' : 'actividades'}</span>
              <span className="text-text-tertiary"> ({activityLevel(active.norm)})</span>
            </span>
            <button onClick={() => setActive(null)} className="text-text-tertiary hover:text-text-primary ml-2" aria-label="Cerrar">✕</button>
          </div>
        )}

        {hint && <div className="mt-2.5 text-[11px] text-violet-300">⏰ {hint}</div>}
      </Card>
    </div>
  )
}
