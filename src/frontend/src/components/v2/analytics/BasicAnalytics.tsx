import { useQuery } from '@tanstack/react-query'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'
import { fetchAnalytics } from './analyticsUtils'

// Palette mirrors CategoryFilterStrip — keeps pie matching the Tasks filter colors.
const CAT_COLORS: Record<string, string> = {
  cocina: '#f59e0b', limpieza: '#a855f7', baños: '#06b6d4', compra: '#10b981',
  logistica: '#6366f1', cuidado: '#ec4899', mantenimiento: '#f97316',
  jardineria: '#84cc16', mascotas: '#ef4444', other: '#9ca3af',
}
const CAT_EMOJI: Record<string, string> = {
  cocina: '🍳', limpieza: '🧹', baños: '🛁', compra: '🛒', logistica: '📋',
  cuidado: '👶', mantenimiento: '🔧', jardineria: '🌿', mascotas: '🐾', other: '📦',
}
const CAT_LABEL: Record<string, string> = {
  cocina: 'Cocina', limpieza: 'Limpieza', baños: 'Baños', compra: 'Compra',
  logistica: 'Logística', cuidado: 'Cuidado', mantenimiento: 'Mantenimiento',
  jardineria: 'Jardinería', mascotas: 'Mascotas', other: 'Otros',
}

function normalizeCats(raw: unknown) {
  if (!raw || typeof raw !== 'object') return []
  const entries = Object.entries(raw as Record<string, number>)
    .filter(([, v]) => typeof v === 'number' && v > 0)
  return entries.map(([key, value]) => ({
    name: CAT_LABEL[key] ?? key,
    value,
    color: CAT_COLORS[key] ?? CAT_COLORS.other,
    emoji: CAT_EMOJI[key] ?? CAT_EMOJI.other,
  }))
}

export function BasicAnalytics() {
  const { data: daily }  = useQuery({ queryKey: ['a-daily'],  queryFn: () => fetchAnalytics('/analytics/daily-activity') })
  const { data: cats }   = useQuery({ queryKey: ['a-cats'],   queryFn: () => fetchAnalytics('/analytics/points-by-category') })
  const { data: trends } = useQuery({ queryKey: ['a-trends'], queryFn: () => fetchAnalytics('/analytics/weekly-trends?weeks=4') })
  const { data: time }   = useQuery({ queryKey: ['a-time'],   queryFn: () => fetchAnalytics('/analytics/time-invested?range=week') })

  const catList = normalizeCats(cats)

  return (
    <>
      <WeeklyBarsChart days={daily?.days ?? []} youName={daily?.youName ?? 'Tú'} partnerName={daily?.partnerName ?? 'Pareja'} />
      <CategoryPieChart categories={catList} />
      <BalanceEvolutionChart weeks={trends?.weeks ?? []} />
      <TimeInvestedChart you={time?.you ?? { name: 'Tú', hours: 0 }} partner={time?.partner ?? { name: 'Pareja', hours: 0 }} />
    </>
  )
}
