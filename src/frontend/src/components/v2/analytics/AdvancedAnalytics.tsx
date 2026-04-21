import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HeatmapChart } from './charts/HeatmapChart'
import { CompletionRateChart } from './charts/CompletionRateChart'
import { EquityGaugeChart } from './charts/EquityGaugeChart'
import { TopCategoriesChart } from './charts/TopCategoriesChart'
import { MonthlyInsightCard } from './charts/MonthlyInsightCard'
import { PremiumOverlay } from './PremiumOverlay'
import { fetchAnalytics } from './analyticsUtils'

const BRAND_PURPLE = '#7c3aed'
const BRAND_AMBER  = '#f59e0b'

interface Props {
  isPremium: boolean
  onOpenInterest: () => void
}

export function AdvancedAnalytics({ isPremium, onOpenInterest }: Props) {
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const showOverlay = !isPremium && !overlayDismissed
  const { data: heat }   = useQuery({ queryKey: ['a-heat'],  queryFn: () => fetchAnalytics('/analytics/heatmap?weeks=4') })
  const { data: rate }   = useQuery({ queryKey: ['a-rate'],  queryFn: () => fetchAnalytics('/analytics/completion-rate?range=month') })
  const { data: over }   = useQuery({ queryKey: ['a-over'],  queryFn: () => fetchAnalytics('/analytics/couple') })
  const { data: topRaw } = useQuery({ queryKey: ['a-top'],   queryFn: () => fetchAnalytics('/analytics/points-by-category?groupByUser=true') })
  const { data: insig }  = useQuery({ queryKey: ['a-insig'], queryFn: () => fetchAnalytics('/analytics/insight') })

  const topArr = topRaw && typeof topRaw === 'object'
    ? Object.entries(topRaw as Record<string, { you?: number; partner?: number }>).map(([cat, v]) => ({
        cat,
        you: v?.you ?? 0,
        partner: v?.partner ?? 0,
      }))
    : []

  return (
    <div className="relative">
      <div style={{ filter: isPremium ? 'none' : 'blur(3px)', pointerEvents: isPremium ? 'auto' : 'none', userSelect: isPremium ? 'auto' : 'none' }}>
        <HeatmapChart grid={heat?.grid ?? []} buckets={heat?.buckets ?? [6,9,12,15,18,21]} hint="Más activos los jueves a las 18-21h" />
        <CompletionRateChart rows={[
          { who: rate?.you?.name ?? 'Tú',      pct: rate?.you?.pct ?? 0,      color: BRAND_PURPLE },
          { who: rate?.partner?.name ?? 'Pareja', pct: rate?.partner?.pct ?? 0, color: BRAND_AMBER },
        ]} />
        <EquityGaugeChart score={Number(over?.equilibrium ?? 0)} delta={over?.equityDelta ?? 0} />
        <TopCategoriesChart data={topArr} />
        <MonthlyInsightCard text={insig?.text ?? 'Aún no hay suficiente actividad este mes.'} bullets={insig?.bullets ?? []} />
      </div>
      {showOverlay && (
        <PremiumOverlay
          onOpenInterest={onOpenInterest}
          onClose={() => setOverlayDismissed(true)}
        />
      )}
    </div>
  )
}
