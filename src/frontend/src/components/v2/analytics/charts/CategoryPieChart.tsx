import { Card } from '../../primitives/Card'

interface Category { name: string; value: number; color: string; emoji: string }
interface Props { categories: Category[] }

export function CategoryPieChart({ categories }: Props) {
  if (categories.length === 0) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          🥧 Aún no hay datos suficientes para la distribución por categorías.
        </Card>
      </div>
    )
  }
  const total = categories.reduce((s, c) => s + c.value, 0)
  let cum = 0
  const size = 120, r = 50, cx = size / 2, cy = size / 2
  const arcs = categories.map(c => {
    const startAng = (cum / total) * 2 * Math.PI - Math.PI / 2
    cum += c.value
    const endAng = (cum / total) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(startAng), y1 = cy + r * Math.sin(startAng)
    const x2 = cx + r * Math.cos(endAng),   y2 = cy + r * Math.sin(endAng)
    const largeArc = endAng - startAng > Math.PI ? 1 : 0
    return { ...c, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z` }
  })

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🥧 Categorías</div>
        <div className="text-[11px] text-text-secondary mt-0.5">En qué gastáis más esfuerzo</div>
      </div>
      <Card className="flex items-center gap-3.5">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
          {arcs.map(a => <path key={a.name} d={a.d} fill={a.color} opacity={0.9} />)}
          <circle cx={cx} cy={cy} r={24} fill="#1a1138" />
          <text x={cx} y={cy - 1} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">100%</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="8" fill="#9ca3af">sem</text>
        </svg>
        <div className="flex-1 flex flex-col gap-1.5">
          {categories.map(c => (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span className="text-sm">{c.emoji}</span>
              <span className="text-text-primary font-semibold flex-1">{c.name}</span>
              <span className="font-bold tabular-nums" style={{ color: c.color }}>{Math.round(c.value / total * 100)}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
