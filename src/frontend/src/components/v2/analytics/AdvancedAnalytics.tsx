import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HeatmapChart } from './charts/HeatmapChart'
import { CompletionRateChart } from './charts/CompletionRateChart'
import { EquityGaugeChart } from './charts/EquityGaugeChart'
import { TopCategoriesChart } from './charts/TopCategoriesChart'
import { MonthlyInsightCard } from './charts/MonthlyInsightCard'
import { PremiumOverlay } from './PremiumOverlay'
import { fetchAnalytics } from './analyticsUtils'
import { useAppStore } from '../../../store/useAppStore'

const BRAND_PURPLE = '#7c3aed'
const BRAND_AMBER  = '#f59e0b'

// Mirror the Spanish labels + emojis used in Tasks/BasicAnalytics so the advanced
// chart doesn't surface raw slugs like "cocina" or "baños" as headings.
const CAT_LABEL: Record<string, string> = {
  cocina: 'Cocina', limpieza: 'Limpieza', baños: 'Baños', compra: 'Compra',
  logistica: 'Logística', cuidado: 'Cuidado', mantenimiento: 'Mantenimiento',
  jardineria: 'Jardinería', mascotas: 'Mascotas', other: 'Otros',
}
const CAT_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', baños: '🛁', compra: '🛒', logistica: '📋',
  cuidado: '👶', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾', other: '📦',
}
const labelFor = (slug: string) => {
  const key = slug?.toLowerCase?.() ?? ''
  const emoji = CAT_EMOJI[key] ?? CAT_EMOJI.other
  const label = CAT_LABEL[key] ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Otros')
  return `${emoji} ${label}`
}

interface Props {
  isPremium: boolean
  onOpenInterest: () => void
}

export function AdvancedAnalytics({ isPremium, onOpenInterest }: Props) {
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const showOverlay = !isPremium && !overlayDismissed
  const user   = useAppStore(s => s.user)
  const couple = useAppStore(s => s.couple)
  const users  = (couple as any)?.users ?? []
  const youName     = user?.name ?? 'Tú'
  const partnerName = users.find((u: any) => u.id !== user?.id)?.name ?? 'Pareja'
  const { data: heat }   = useQuery({ queryKey: ['a-heat'],  queryFn: () => fetchAnalytics('/analytics/heatmap?weeks=4') })
  const { data: rate }   = useQuery({ queryKey: ['a-rate'],  queryFn: () => fetchAnalytics('/analytics/completion-rate?range=month') })
  const { data: over }   = useQuery({ queryKey: ['a-over'],  queryFn: () => fetchAnalytics('/analytics/couple') })
  const { data: topRaw } = useQuery({ queryKey: ['a-top'],   queryFn: () => fetchAnalytics('/analytics/points-by-category?groupByUser=true') })
  const { data: insig }  = useQuery({ queryKey: ['a-insig'], queryFn: () => fetchAnalytics('/analytics/insight') })

  const topArr = topRaw && typeof topRaw === 'object'
    ? Object.entries(topRaw as Record<string, { you?: number; partner?: number }>)
        .map(([cat, v]) => ({
          cat: labelFor(cat),
          you: Number(v?.you ?? 0),
          partner: Number(v?.partner ?? 0),
        }))
        .filter(r => r.you > 0 || r.partner > 0)
        .sort((a, b) => (b.you + b.partner) - (a.you + a.partner))
    : []

  return (
    <div className="relative">
      {/* Blur tracks the overlay — dismissing it lets the user see/scroll the charts.
          Tied to isPremium would leave charts blurred forever for free users.
          Lower blur (2px) + will-change avoid the janky "zooming" repaint on
          mobile when scrolling over a large filtered area. */}
      <div
        style={{
          filter: showOverlay ? 'blur(2px)' : 'none',
          willChange: showOverlay ? 'filter' : 'auto',
          pointerEvents: showOverlay ? 'none' : 'auto',
          userSelect: showOverlay ? 'none' : 'auto',
        }}
      >
        <HeatmapChart grid={heat?.grid ?? []} buckets={heat?.buckets ?? [6,9,12,15,18,21]} hint={heat?.hint ?? undefined} />
        <CompletionRateChart rows={[
          { who: rate?.you?.name ?? 'Tú',      pct: rate?.you?.pct ?? 0,      color: BRAND_PURPLE },
          { who: rate?.partner?.name ?? 'Pareja', pct: rate?.partner?.pct ?? 0, color: BRAND_AMBER },
        ]} />
        <EquityGaugeChart score={Number(over?.equilibrium ?? 0)} delta={over?.equityDelta ?? 0} hasData={Boolean(over?.hasEquityData)} />
        <TopCategoriesChart data={topArr} youName={youName} partnerName={partnerName} />
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
