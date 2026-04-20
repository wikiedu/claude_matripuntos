import { useQuery } from '@tanstack/react-query'
import { apiClient, fetchRecentActivity } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { useGamificationStatus } from '../hooks/useGamificationStatus'
import { useShoppingList } from '../hooks/useShoppingList'
import { useTodos } from '../hooks/useTodos'
import { DailyPhrase } from '../components/v2/dashboard/DailyPhrase'
import { BalanceLevelHero } from '../components/v2/dashboard/BalanceLevelHero'
import { StreakStrip } from '../components/v2/dashboard/StreakStrip'
import { TodayTasksSection } from '../components/v2/dashboard/TodayTasksSection'
import { RecentMovements } from '../components/v2/dashboard/RecentMovements'
import { QuickPreviews } from '../components/v2/dashboard/QuickPreviews'
import type { RecentActivity } from '../types/activity'

const LEVEL_ORDER = ['nido', 'brote', 'hogar', 'raices', 'diamante', 'leyenda', 'eterno']

export default function Dashboard() {
  const { user, couple } = useAppStore()

  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => apiClient.points.getBalance(),
    enabled: !!couple?.id,
  })
  const { data: recentActivities = [] } = useQuery<RecentActivity[]>({
    queryKey: ['recentActivity'],
    queryFn: fetchRecentActivity,
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id && !!couple?.id,
  })
  const { data: gamificationStatus } = useGamificationStatus()
  const { data: shoppingData } = useShoppingList()
  const { data: todosData } = useTodos()

  if (!user || !couple) return null

  const you = balance?.you ?? { name: user.name, balance: 0 }
  const partner = balance?.partner ?? null

  const pendingShopping = shoppingData?.active?.items.filter((i: { isChecked: boolean }) => !i.isChecked).length ?? 0
  const pendingTodos = todosData?.mine.filter((t: { isCompleted: boolean }) => !t.isCompleted).length ?? 0

  const levelOrdinal = (LEVEL_ORDER.indexOf(gamificationStatus?.level ?? 'nido') + 1) || 1
  const xpProgress = gamificationStatus?.xpProgress ?? 0
  const xpToNext = gamificationStatus?.xpToNext ?? 100
  const currentXp = Math.round(xpProgress * (xpProgress + xpToNext > 0 ? (xpToNext / (1 - xpProgress || 1)) : 100))
  const neededXp = Math.max(1, currentXp + xpToNext)

  const movements = recentActivities.slice(0, 3).map((a) => ({
    id: a.id,
    userName: user.name,
    action: a.name,
    delta: 0,
    when: new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  }))

  async function handleComplete(_taskId: string) {
    // TODO: wire up proper task completion in Phase 6 (Tasks redesign)
  }

  return (
    <main className="pb-4 pt-2">
      <DailyPhrase />
      <BalanceLevelHero
        youName={you.name}
        youBalance={Number(you.balance)}
        partnerName={partner?.name ?? 'Tu pareja'}
        partnerBalance={Number(partner?.balance ?? 0)}
        level={levelOrdinal}
        levelName={gamificationStatus?.levelName ?? 'Nido'}
        current={currentXp}
        needed={neededXp}
      />
      <StreakStrip
        streakDays={gamificationStatus?.dailyStreak ?? 0}
        multiplier={Number(gamificationStatus?.dailyMultiplier ?? 1.0)}
        freezes={gamificationStatus?.freezerAvailable ? 1 : 0}
      />
      <TodayTasksSection
        tasks={[]}
        onComplete={handleComplete}
        partnerName={partner?.name ?? 'Tu pareja'}
      />
      <RecentMovements movements={movements} />
      <QuickPreviews shoppingPending={pendingShopping} todoPending={pendingTodos} />
    </main>
  )
}
