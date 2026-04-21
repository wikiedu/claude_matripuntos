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
  const w = 280, h = 120, pad = 20
  const allVals = points.flatMap(p => [p.you, p.partner])
  const min = Math.min(...allVals, 0)
  const max = Math.max(...allVals, 10)
  const range = (max - min) || 1
  const xs = points.map((_, i) => pad + (i * (w - 2 * pad)) / (points.length - 1))
  const yYou = points.map(v => h - pad - ((v.you - min) / range) * (h - 2 * pad))
  const yPartner = points.map(v => h - pad - ((v.partner - min) / range) * (h - 2 * pad))
  const pathYou = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${yYou[i]}`).join(' ')
  const pathPartner = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${yPartner[i]}`).join(' ')
  const zeroY = h - pad - ((0 - min) / range) * (h - 2 * pad)
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
          {/* Zero baseline */}
          <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="rgba(156,163,175,0.3)" strokeDasharray="3 3" />
          <text x={w - pad + 2} y={zeroY + 3} fontSize="9" fill="#6b7280">0</text>

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
