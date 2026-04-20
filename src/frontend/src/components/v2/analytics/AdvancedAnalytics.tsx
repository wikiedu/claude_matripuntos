import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'
import { HeatmapChart } from './charts/HeatmapChart'
import { CompletionRateChart } from './charts/CompletionRateChart'
import { EquityGaugeChart } from './charts/EquityGaugeChart'
import { TopCategoriesChart } from './charts/TopCategoriesChart'
import { MonthlyInsightCard } from './charts/MonthlyInsightCard'
import { PremiumOverlay } from './PremiumOverlay'

interface Props {
  isPremium: boolean
  onOpenInterest: () => void
}

const fetchData = (path: string) => apiClient.request(path).then((r: any) => r.data)

export function AdvancedAnalytics({ isPremium, onOpenInterest }: Props) {
  const { data: heat }   = useQuery({ queryKey: ['a-heat'],  queryFn: () => fetchData('/analytics/heatmap?weeks=4') })
  const { data: rate }   = useQuery({ queryKey: ['a-rate'],  queryFn: () => fetchData('/analytics/completion-rate?range=month') })
  const { data: over }   = useQuery({ queryKey: ['a-over'],  queryFn: () => fetchData('/analytics/couple') })
  const { data: topRaw } = useQuery({ queryKey: ['a-top'],   queryFn: () => fetchData('/analytics/points-by-category?groupByUser=true') })
  const { data: insig }  = useQuery({ queryKey: ['a-insig'], queryFn: () => fetchData('/analytics/insight') })

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
          { who: rate?.you?.name ?? 'Tú',      pct: rate?.you?.pct ?? 0,      color: '#7c3aed' },
          { who: rate?.partner?.name ?? 'Pareja', pct: rate?.partner?.pct ?? 0, color: '#f59e0b' },
        ]} />
        <EquityGaugeChart score={Number(over?.equilibrium ?? 0)} delta={over?.equityDelta ?? 0} />
        <TopCategoriesChart data={topArr} />
        <MonthlyInsightCard text={insig?.text ?? 'Aún no hay suficiente actividad este mes.'} bullets={insig?.bullets ?? []} />
      </div>
      {!isPremium && <PremiumOverlay onOpenInterest={onOpenInterest} />}
    </div>
  )
}
