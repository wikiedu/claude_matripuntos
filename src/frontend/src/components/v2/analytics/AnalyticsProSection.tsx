// v2.0.3 — Sección Analytics Pro. Insights cards + heatmap compacto.
// Se renderiza al inicio de /analytics como banner narrativo.

import { useAnalyticsInsights, useAnalyticsHeatmap, useAnalyticsSummary } from '../../../hooks/useAnalyticsV2'
import { apiClient } from '../../../services/apiClient'

const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', flat: '=' }
const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function AnalyticsProSection() {
  const insightsQ = useAnalyticsInsights()
  const heatmapQ = useAnalyticsHeatmap()
  const summaryQ = useAnalyticsSummary()

  if (insightsQ.isLoading || heatmapQ.isLoading) {
    return (
      <section className="px-4 mb-3">
        <p className="text-xs text-text-tertiary">Cargando insights…</p>
      </section>
    )
  }

  const insights = insightsQ.data ?? []
  const heatmap = heatmapQ.data?.heatmap ?? []
  const heatmapTotal = heatmapQ.data?.total ?? 0
  const summary = summaryQ.data

  return (
    <section className="px-4 mb-4 space-y-3" data-testid="analytics-pro-section">
      {/* Insights cards */}
      {insights.length === 0 ? (
        <div className="rounded-lg bg-surface-card border border-brd-subtle p-3">
          <p className="text-xs text-white/60">
            📊 Aún no hay suficientes datos para generar insights. Vuelve cuando tengáis 2-3 semanas de actividad.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await apiClient.request('/analytics/v2/insights/regenerate', { method: 'POST' })
                insightsQ.refetch()
              } catch {}
            }}
            className="text-[11px] text-amber-400 underline mt-1"
          >
            Regenerar ahora
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.slice(0, 3).map(c => (
            <article
              key={c.id}
              data-testid="analytics-insight-card"
              className="rounded-lg bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/20 p-3"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white flex-1">{c.title}</p>
                {c.trend && (
                  <span className={`text-xs ${c.trend === 'up' ? 'text-emerald-400' : c.trend === 'down' ? 'text-rose-400' : 'text-white/50'}`}>
                    {TREND_ICON[c.trend]}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 mt-0.5 leading-snug">{c.body}</p>
            </article>
          ))}
        </div>
      )}

      {/* Heatmap 7×24 compacto */}
      {heatmap.length > 0 && heatmapTotal > 0 && (
        <div className="rounded-lg bg-surface-card border border-brd-subtle p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-white/80">⏰ Heatmap actividad (24h × 7d)</p>
            <p className="text-[10px] text-white/50">{heatmapTotal} eventos · 90d</p>
          </div>
          <Heatmap grid={heatmap} />
        </div>
      )}

      {/* Mini summary */}
      {summary && summary.events.total > 0 && (
        <div className="rounded-lg bg-surface-card border border-brd-subtle p-3">
          <p className="text-xs font-semibold text-white/80 mb-1">📊 Resumen 30 días</p>
          <ul className="text-xs text-white/85 space-y-0.5">
            <li>• {summary.events.accepted} actividades aceptadas</li>
            <li>• {summary.events.rejected} rechazadas · {summary.events.pending} pendientes</li>
            <li>• Saldo neto: {summary.netBalance >= 0 ? '+' : ''}{summary.netBalance} · banda {summary.equityBand}</li>
            <li>• {summary.taskLogs.verified} tareas verificadas / {summary.taskLogs.total} total</li>
          </ul>
        </div>
      )}
    </section>
  )
}

function Heatmap({ grid }: { grid: number[][] }) {
  const max = grid.flat().reduce((a, b) => Math.max(a, b), 0)
  return (
    <div className="overflow-x-auto">
      <table className="text-[8px] border-collapse">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className={`text-white/40 ${h % 6 === 0 ? '' : 'text-transparent'}`} style={{ width: 10 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, r) => (
            <tr key={r}>
              <td className="text-white/60 pr-1">{DAY_LABELS[r]}</td>
              {row.map((v, h) => {
                const intensity = max > 0 ? v / max : 0
                const bg = v === 0
                  ? 'rgba(255,255,255,0.04)'
                  : `rgba(245, 158, 11, ${0.15 + intensity * 0.7})`
                return (
                  <td
                    key={h}
                    title={`${DAY_LABELS[r]} ${h}h: ${v}`}
                    style={{ width: 10, height: 10, background: bg }}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
