import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'
import { WeeklyBarsChart } from './charts/WeeklyBarsChart'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { BalanceEvolutionChart } from './charts/BalanceEvolutionChart'
import { TimeInvestedChart } from './charts/TimeInvestedChart'

const fetchData = (path: string) => apiClient.request(path).then((r: any) => r.data)

export function BasicAnalytics() {
  const { data: daily }  = useQuery({ queryKey: ['a-daily'],  queryFn: () => fetchData('/analytics/daily-activity') })
  const { data: cats }   = useQuery({ queryKey: ['a-cats'],   queryFn: () => fetchData('/analytics/points-by-category') })
  const { data: trends } = useQuery({ queryKey: ['a-trends'], queryFn: () => fetchData('/analytics/weekly-trends?weeks=4') })
  const { data: time }   = useQuery({ queryKey: ['a-time'],   queryFn: () => fetchData('/analytics/time-invested?range=week') })

  return (
    <>
      <WeeklyBarsChart days={daily?.days ?? []} youName={daily?.youName ?? 'Tú'} partnerName={daily?.partnerName ?? 'Pareja'} />
      <CategoryPieChart categories={cats ?? []} />
      <BalanceEvolutionChart weeks={trends?.weeks ?? []} />
      <TimeInvestedChart you={time?.you ?? { name: 'Tú', hours: 0 }} partner={time?.partner ?? { name: 'Pareja', hours: 0 }} />
    </>
  )
}
