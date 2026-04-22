import { useQuery } from '@tanstack/react-query'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryBalanceChart } from './charts/CategoryBalanceChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'
import { fetchAnalytics } from './analyticsUtils'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'

const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// Build the 7-day window the chart shows — aligned to the local day so a row
// exists even when neither partner logged anything (otherwise Mon..Sun renders
// with gaps and the chart lies about the week).
function lastSevenDaysWindow() {
  const days: { iso: string; label: string }[] = []
  const base = new Date()
  base.setHours(12, 0, 0, 0) // avoid DST / timezone edge drifting a day
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    days.push({ iso: d.toISOString().split('T')[0], label: DOW[d.getDay()] })
  }
  return days
}

// Backend /analytics/daily-activity?groupByUser=true returns `{date, you, partner}[]`
// covering only days that have activity. Merge against the fixed 7-day window so
// empty days render as zero-height bars instead of disappearing.
function normalizeDailySplit(raw: unknown, window: { iso: string; label: string }[]) {
  const rows: { date: string; you: number; partner: number }[] = Array.isArray(raw) ? raw : []
  const byDate = new Map(rows.map(r => [String(r.date), r]))
  return window.map(w => {
    const row = byDate.get(w.iso)
    return {
      label: w.label,
      you: Number(row?.you ?? 0),
      partner: Number(row?.partner ?? 0),
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

  const weekWindow = lastSevenDaysWindow()
  const weekStart = weekWindow[0].iso
  const weekEnd = weekWindow[weekWindow.length - 1].iso
  const { data: daily }  = useQuery({
    queryKey: ['a-daily', weekStart, weekEnd],
    queryFn: () => fetchAnalytics(`/analytics/daily-activity?groupByUser=true&startDate=${weekStart}&endDate=${weekEnd}`),
  })
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

  const dayList  = normalizeDailySplit(daily, weekWindow)
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
