import { Card } from '../../primitives/Card'

interface Point { label: string; balance: number }
interface Props {
  points: Point[]
  subtitle?: string
  trendUnit?: string // e.g. "30 días", "4 semanas"
}

export function BalanceEvolutionChart({ points, subtitle, trendUnit }: Props) {
  if (points.length < 2) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          📈 Aún no hay suficiente historial para mostrar tendencias.
        </Card>
      </div>
    )
  }
  const w = 280, h = 110, pad = 20
  const min = Math.min(...points.map(v => v.balance), -10)
  const max = Math.max(...points.map(v => v.balance), 20)
  const range = (max - min) || 1
  const xs = points.map((_, i) => pad + (i * (w - 2*pad)) / (points.length - 1))
  const ys = points.map(v => h - pad - ((v.balance - min) / range) * (h - 2*pad))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ')
  const zeroY = h - pad - ((0 - min) / range) * (h - 2*pad)
  const delta = points[points.length - 1].balance - points[0].balance
  // With 30 daily points we can't render a text label under every dot — pick a
  // sparse subset (first, ~each fifth, last) so the x-axis stays readable.
  const labelEvery = points.length > 10 ? Math.ceil(points.length / 5) : 1
  const showLabelAt = (i: number) => i === 0 || i === points.length - 1 || i % labelEvery === 0
  const showValueAt = (i: number) => points.length <= 10 || i === 0 || i === points.length - 1
  const defaultSubtitle = `Últimos ${points.length} ${trendUnit ?? 'puntos'}`

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">📈 Evolución del balance</div>
        <div className="text-[11px] text-text-secondary mt-0.5">{subtitle ?? defaultSubtitle}</div>
      </div>
      <Card>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
          <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="rgba(156,163,175,0.3)" strokeDasharray="3 3" />
          <text x={w - pad + 2} y={zeroY + 3} fontSize="9" fill="#6b7280">0</text>
          <path d={`${path} L ${xs[xs.length - 1]} ${h - pad} L ${xs[0]} ${h - pad} Z`} fill="url(#balgrad)" opacity={0.4} />
          <defs>
            <linearGradient id="balgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={path} stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {xs.map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={ys[i]} r={i === xs.length - 1 ? 5 : points.length > 10 ? 1.8 : 3} fill="#a855f7" stroke="#1a1138" strokeWidth={points.length > 10 ? 1 : 2} />
              {showLabelAt(i) && (
                <text x={x} y={h - 4} fontSize="9" fill="#9ca3af" textAnchor="middle">{points[i].label}</text>
              )}
              {showValueAt(i) && (
                <text x={x} y={ys[i] - 8} fontSize="9" fill="#c4b5fd" textAnchor="middle" fontWeight="700">
                  {points[i].balance > 0 ? '+' : ''}{points[i].balance}
                </text>
              )}
            </g>
          ))}
        </svg>
        <div className={`mt-2 text-[11px] font-semibold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
          {delta >= 0 ? '↗' : '↘'} Tendencia {delta >= 0 ? 'positiva' : 'negativa'}: {delta >= 0 ? '+' : ''}{delta.toFixed(1)} MP en {trendUnit ?? `${points.length} pts`}
        </div>
      </Card>
    </div>
  )
}
