import { useQuery } from '@tanstack/react-query'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryBalanceChart } from './charts/CategoryBalanceChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'
import { fetchAnalytics } from './analyticsUtils'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'

const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// Backend /analytics/daily-activity returns an array of {date, count, totalPoints, types}.
// No per-user split exists upstream, so we surface combined activity under "Tú" and leave
// the partner bar empty until an endpoint provides split data.
function normalizeDaily(raw: unknown) {
  if (!Array.isArray(raw)) return []
  return raw.map((d: any) => {
    const dt = new Date(d.date)
    const label = isNaN(dt.getTime()) ? String(d.date ?? '') : DOW[dt.getDay()]
    return {
      label,
      you: Number(d.totalPoints ?? 0),
      partner: 0,
    }
  })
}

// Backend /points/chart-data returns { chartData: [{idx, date, [youName]: cumulative, [partnerName]?: cumulative}], youName, partnerName }.
// Return both cumulative series so we can plot two lines (user request B4).
function normalizeDailyBalance(raw: unknown) {
  if (!raw || typeof raw !== 'object') return []
  const r = raw as { chartData?: any[]; youName?: string; partnerName?: string | null }
  if (!Array.isArray(r.chartData)) return []
  const youKey = r.youName ?? 'Tú'
  const partnerKey = r.partnerName ?? ''
  return r.chartData.map((d: any) => ({
    label: String(d.date ?? ''),
    you: Number(d[youKey] ?? 0),
    partner: partnerKey ? Number(d[partnerKey] ?? 0) : 0,
  }))
}

export function BasicAnalytics() {
  const couple = useAppStore(s => s.couple)
  const user   = useAppStore(s => s.user)
  const users  = (couple as any)?.users ?? []
  const youName     = user?.name ?? 'Tú'
  const partnerName = users.find((u: any) => u.id !== user?.id)?.name ?? 'Pareja'

  const { data: daily }  = useQuery({ queryKey: ['a-daily'],  queryFn: () => fetchAnalytics('/analytics/daily-activity') })
  // Pull the grouped (you/partner split) version so the new area chart can
  // render the reparto bar. The old single-total pie chart has been retired
  // in favor of CategoryBalanceChart.
  const { data: catsGrouped } = useQuery({
    queryKey: ['a-cats-grouped'],
    queryFn: () => fetchAnalytics('/analytics/points-by-category?groupByUser=true'),
  })
  // /points/chart-data?days=30 returns daily cumulative balance — the 30-day evolution chart
  // that used to live in Analítica Básica. It's not behind the /analytics prefix (no .data wrap).
  const { data: balance30 } = useQuery({
    queryKey: ['p-chart', 30],
    queryFn: () => apiClient.request('/points/chart-data?days=30'),
  })
  const { data: time }   = useQuery({ queryKey: ['a-time'],   queryFn: () => fetchAnalytics('/analytics/time-invested?range=week') })

  const dayList  = normalizeDaily(daily)
  const balancePoints = normalizeDailyBalance(balance30)

  return (
    <>
      <WeeklyBarsChart days={dayList} youName={youName} partnerName={partnerName} />
      <CategoryBalanceChart data={catsGrouped} youName={youName} partnerName={partnerName} />
      <BalanceEvolutionChart points={balancePoints} youName={youName} partnerName={partnerName} subtitle="Puntos acumulados · últimos 30 días" trendUnit="30 días" />
      <TimeInvestedChart you={time?.you ?? { name: youName, hours: 0 }} partner={time?.partner ?? { name: partnerName, hours: 0 }} />
    </>
  )
}
