import { Card } from '../../primitives/Card'

// Re-design of Categorías: instead of a pie + legend, group raw slugs into
// 4 macro-areas ("qué cubre cada uno") and show per-area who does more.
// The bar is a split between you (purple) and partner (amber); the area
// with the largest |you-partner| gap gets a ⚠️ highlight so the imbalance
// is impossible to miss.

interface CatPoints { you: number; partner: number }
// Input: raw `{ cat: {you, partner} }` object from /analytics/points-by-category?groupByUser=true
interface Props { data: Record<string, CatPoints> | undefined; youName?: string; partnerName?: string }

// Slug → macro-area mapping. Keep it small and forgiving: unknown slugs fall
// into "Otros" so new category names we add later don't disappear silently.
const AREAS: { key: string; label: string; emoji: string; slugs: string[] }[] = [
  { key: 'hogar',   label: 'Hogar',        emoji: '🏠', slugs: ['cocina', 'limpieza', 'baños', 'banos', 'compra'] },
  { key: 'cuidado', label: 'Cuidado',      emoji: '👶', slugs: ['cuidado', 'mascotas'] },
  { key: 'logistica', label: 'Logística',  emoji: '📋', slugs: ['logistica', 'logística'] },
  { key: 'mantenimiento', label: 'Mantenimiento', emoji: '🛠️', slugs: ['mantenimiento', 'jardineria', 'jardinería'] },
]

function groupByArea(data: Record<string, CatPoints>) {
  const out: Record<string, CatPoints & { label: string; emoji: string }> = {}
  for (const area of AREAS) {
    out[area.key] = { you: 0, partner: 0, label: area.label, emoji: area.emoji }
  }
  out.otros = { you: 0, partner: 0, label: 'Otros', emoji: '📦' }

  for (const [slug, v] of Object.entries(data ?? {})) {
    const k = slug?.toLowerCase?.() ?? ''
    const area = AREAS.find(a => a.slugs.includes(k))
    const bucket = area ? out[area.key] : out.otros
    bucket.you += Number(v?.you ?? 0)
    bucket.partner += Number(v?.partner ?? 0)
  }

  // Drop empty buckets so we don't render a page full of zeros.
  return Object.entries(out)
    .map(([k, v]) => ({ key: k, ...v, total: v.you + v.partner }))
    .filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function CategoryBalanceChart({ data, youName = 'Tú', partnerName = 'Pareja' }: Props) {
  const rows = groupByArea(data ?? {})

  if (rows.length === 0) {
    return (
      <div className="mx-4 mb-3.5">
        <div className="mb-2.5">
          <div className="text-sm font-bold text-text-primary">🏷️ Áreas · ¿quién cubre qué?</div>
          <div className="text-[11px] text-text-secondary mt-0.5">Reparto de puntos por áreas del hogar</div>
        </div>
        <Card className="text-center text-text-secondary text-xs py-6">
          🏷️ Aún no hay suficiente actividad para calcular el reparto.
        </Card>
      </div>
    )
  }

  // Tag the row with the biggest imbalance so the UI can flag it. Using
  // proportional gap (|you-partner|/total) avoids false-alarming high-volume
  // areas that are actually balanced (e.g. 50/45 in Hogar).
  let worstKey = rows[0].key
  let worstGap = 0
  for (const r of rows) {
    const gap = r.total > 0 ? Math.abs(r.you - r.partner) / r.total : 0
    if (gap > worstGap) { worstGap = gap; worstKey = r.key }
  }
  const hasImbalance = worstGap >= 0.3 // only highlight when it's visibly lopsided

  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">🏷️ Áreas · ¿quién cubre qué?</div>
        <div className="text-[11px] text-text-secondary mt-0.5">
          Puntos por área del hogar · {youName} vs {partnerName}
        </div>
      </div>

      <Card>
        {/* Legend */}
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

        <div className="flex flex-col gap-3">
          {rows.map(r => {
            const total = r.total || 1
            const youPct = Math.round((r.you / total) * 100)
            const partnerPct = 100 - youPct
            const isWorst = hasImbalance && r.key === worstKey
            return (
              <div key={r.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-primary font-semibold flex items-center gap-1.5">
                    <span className="text-base leading-none">{r.emoji}</span>
                    {r.label}
                    {isWorst && (
                      <span
                        title="Área con el mayor desequilibrio"
                        className="ml-1 text-[10px] font-bold text-danger bg-danger/10 border border-danger/30 rounded-sm px-1.5 py-[1px]"
                      >
                        ⚠️ Desequilibrio
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] text-text-tertiary tabular-nums">{Math.round(total)} pts</span>
                </div>
                {/* Split bar: one continuous track whose left half is "you" and right half is "partner" */}
                <div className="flex h-2.5 rounded-sm overflow-hidden bg-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-brand-purple to-brand-purple-dark"
                    style={{ width: `${youPct}%` }}
                    aria-label={`${youName}: ${youPct}%`}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-brand-amber-dark to-brand-amber"
                    style={{ width: `${partnerPct}%` }}
                    aria-label={`${partnerName}: ${partnerPct}%`}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] font-bold tabular-nums">
                  <span className="text-brand-purple">{youPct}%</span>
                  <span className="text-brand-amber">{partnerPct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
