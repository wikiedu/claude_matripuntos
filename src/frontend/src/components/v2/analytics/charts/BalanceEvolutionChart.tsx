import { Card } from '../../primitives/Card'

interface Point { label: string; you: number; partner: number }
interface Props {
  points: Point[]
  youName?: string
  partnerName?: string
  subtitle?: string
  trendUnit?: string // e.g. "30 días", "4 semanas"
}

const YOU_COLOR = '#a855f7'      // brand-purple
const PARTNER_COLOR = '#f59e0b'  // brand-amber

export function BalanceEvolutionChart({ points, youName = 'Tú', partnerName = 'Pareja', subtitle, trendUnit }: Props) {
  if (points.length < 2) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          📈 Aún no hay suficiente historial para mostrar tendencias.
        </Card>
      </div>
    )
  }
  const w = 280, h = 120, padTop = 10, padBottom = 20, padLeft = 28, padRight = 10
  const allVals = points.flatMap(p => [p.you, p.partner])
  const rawMin = Math.min(...allVals, 0)
  const rawMax = Math.max(...allVals, 10)
  // Round the bounds outward to a "nice" step so the Y-axis ticks land on
  // whole numbers a human would pick (5, 10, 25…) instead of 7.3333.
  const niceStep = (span: number): number => {
    const rough = span / 4
    const mag = Math.pow(10, Math.floor(Math.log10(rough)))
    const norm = rough / mag
    const pick = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
    return pick * mag
  }
  const step = niceStep(rawMax - rawMin || 10)
  const min = Math.floor(rawMin / step) * step
  const max = Math.ceil(rawMax / step) * step
  const range = (max - min) || 1
  const innerW = w - padLeft - padRight
  const innerH = h - padTop - padBottom
  const toY = (v: number) => padTop + innerH - ((v - min) / range) * innerH
  const xs = points.map((_, i) => padLeft + (i * innerW) / (points.length - 1))
  const yYou = points.map(v => toY(v.you))
  const yPartner = points.map(v => toY(v.partner))
  const pathYou = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${yYou[i]}`).join(' ')
  const pathPartner = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${yPartner[i]}`).join(' ')
  const ticks: number[] = []
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  const youDelta = points[points.length - 1].you - points[0].you
  const partnerDelta = points[points.length - 1].partner - points[0].partner
  // With many daily points we can't render a text label under every dot — pick a
  // sparse subset (first, ~each fifth, last) so the x-axis stays readable.
  const labelEvery = points.length > 10 ? Math.ceil(points.length / 5) : 1
  const showLabelAt = (i: number) => i === 0 || i === points.length - 1 || i % labelEvery === 0
  const defaultSubtitle = `Últimos ${points.length} ${trendUnit ?? 'puntos'}`

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">📈 Evolución del balance</div>
        <div className="text-[11px] text-text-secondary mt-0.5">{subtitle ?? defaultSubtitle}</div>
      </div>
      <Card>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1 rounded" style={{ background: YOU_COLOR }} />
            <span className="text-[11px] text-text-secondary">{youName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-1 rounded" style={{ background: PARTNER_COLOR }} />
            <span className="text-[11px] text-text-secondary">{partnerName}</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
          {/* Y-axis grid lines + labels. The zero line gets a stronger color so
              the "who's net positive" split is still scannable. */}
          {ticks.map((tick, i) => {
            const y = toY(tick)
            const isZero = tick === 0
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={w - padRight}
                  y2={y}
                  stroke={isZero ? 'rgba(156,163,175,0.45)' : 'rgba(156,163,175,0.15)'}
                  strokeDasharray={isZero ? '3 3' : '2 4'}
                />
                <text x={padLeft - 4} y={y + 3} fontSize="9" fill="#9ca3af" textAnchor="end">
                  {tick > 0 ? `+${tick}` : tick}
                </text>
              </g>
            )
          })}

          {/* Partner line (drawn first so "you" sits on top) */}
          <path d={pathPartner} stroke={PARTNER_COLOR} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* You line */}
          <path d={pathYou} stroke={YOU_COLOR} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {xs.map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={yPartner[i]} r={i === xs.length - 1 ? 4 : points.length > 10 ? 1.6 : 2.5} fill={PARTNER_COLOR} stroke="#1a1138" strokeWidth={points.length > 10 ? 0.8 : 1.5} />
              <circle cx={x} cy={yYou[i]} r={i === xs.length - 1 ? 4 : points.length > 10 ? 1.6 : 2.5} fill={YOU_COLOR} stroke="#1a1138" strokeWidth={points.length > 10 ? 0.8 : 1.5} />
              {showLabelAt(i) && (
                <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">{points[i].label}</text>
              )}
            </g>
          ))}
        </svg>

        <div className="mt-2 flex gap-3 text-[11px] font-semibold">
          <span className={youDelta >= 0 ? 'text-success' : 'text-danger'}>
            {youDelta >= 0 ? '↗' : '↘'} {youName}: {youDelta >= 0 ? '+' : ''}{youDelta.toFixed(1)} MP
          </span>
          <span className={partnerDelta >= 0 ? 'text-success' : 'text-danger'}>
            {partnerDelta >= 0 ? '↗' : '↘'} {partnerName}: {partnerDelta >= 0 ? '+' : ''}{partnerDelta.toFixed(1)} MP
          </span>
        </div>
      </Card>
    </div>
  )
}
