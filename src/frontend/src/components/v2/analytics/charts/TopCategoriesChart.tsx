import { Card } from '../../primitives/Card'

interface Row { cat: string; you: number; partner: number }
interface Props { data: Row[]; youName?: string; partnerName?: string }

export function TopCategoriesChart({ data, youName = 'Tú', partnerName = 'Pareja' }: Props) {
  if (data.length === 0) {
    return (
      <div className="mx-4 mb-3.5">
        <Card className="text-center text-text-secondary text-xs py-6">
          🏅 Aún no hay movimientos por categoría.
        </Card>
      </div>
    )
  }
  const max = Math.max(1, ...data.flatMap(d => [d.you, d.partner]))
  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🏅 Top categorías por persona</div>
        <div className="text-[11px] text-text-secondary mt-0.5">¿Quién cubre qué?</div>
      </div>
      <Card>
        {/* Legend so the purple/amber bars are identifiable (B7) */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm bg-gradient-to-r from-brand-purple to-brand-purple-dark" />
            <span className="text-[11px] text-text-secondary">{youName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm bg-gradient-to-r from-brand-amber-dark to-brand-amber" />
            <span className="text-[11px] text-text-secondary">{partnerName}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {data.map(d => (
            <div key={d.cat}>
              <div className="text-xs text-text-primary font-semibold mb-1">{d.cat}</div>
              <div className="flex gap-1 items-center">
                <div className="h-2.5 rounded-sm bg-gradient-to-r from-brand-purple to-brand-purple-dark" style={{ flex: d.you / max || 0.01 }} />
                <span className="text-[10px] text-brand-purple font-bold tabular-nums min-w-[22px]">{d.you}</span>
                <span className="text-[10px] text-text-tertiary">·</span>
                <span className="text-[10px] text-brand-amber font-bold tabular-nums min-w-[22px] text-right">{d.partner}</span>
                <div className="h-2.5 rounded-sm bg-gradient-to-r from-brand-amber-dark to-brand-amber" style={{ flex: d.partner / max || 0.01 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
