import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { CATEGORY_EMOJI } from '../components/v2/tasks/CategoryFilterStrip'
import { toLocalDateString } from '../utils/dateUtils'
import type { RecentActivity } from '../types/activity'
import type { Task, TaskLog } from '../types/index'

const LEVEL_ORDER = ['nido', 'brote', 'hogar', 'raices', 'diamante', 'leyenda', 'eterno']

export default function Dashboard() {
  const { user, couple } = useAppStore()
  const queryClient = useQueryClient()

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

  // Real tasks list (to derive "Hoy" section). Dashboard shows a trimmed view
  // of what /tasks shows — pending today for the user.
  const { data: tasksRes } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.tasks.getAll() as Promise<{ tasks: Task[] }>,
    enabled: !!user?.id && !!couple?.id,
    staleTime: 60_000,
  })

  const { data: logsRes } = useQuery({
    queryKey: ['taskLogs', 'all'],
    queryFn: () => apiClient.tasks.getAllLogs() as Promise<{ logs: TaskLog[] }>,
    enabled: !!user?.id && !!couple?.id,
    staleTime: 60_000,
  })

  const todayTasks = useMemo(() => {
    if (!tasksRes?.tasks) return []
    const today = toLocalDateString(new Date())
    const logs = logsRes?.logs ?? []
    // A task is already "done" today if there is any log for it whose local date
    // is today — regardless of who completed it (pair-level completion).
    const taskIdsLoggedToday = new Set(
      logs
        .filter((l) => l.date && toLocalDateString(l.date) === today)
        .map((l) => l.taskId),
    )
    return tasksRes.tasks
      .filter((t) => t.scheduledFor && toLocalDateString(t.scheduledFor) === today)
      .filter((t) => !taskIdsLoggedToday.has(t.id))
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        categoryEmoji: CATEGORY_EMOJI[t.category?.toLowerCase()] ?? '✅',
        pointsExpected: Number(t.pointsBase ?? 0),
        assignee: 'free' as const,
      }))
  }, [tasksRes, logsRes])

  if (!user || !couple) return null

  const you = balance?.you ?? { name: user.name, balance: 0 }
  const partner = balance?.partner ?? null

  const pendingShopping = shoppingData?.active?.items.filter((i: { isChecked: boolean }) => !i.isChecked).length ?? 0
  const pendingTodos = todosData?.mine.filter((t: { isCompleted: boolean }) => !t.isCompleted).length ?? 0
  const partnerSharedPending =
    todosData?.partnerShared.filter((t: { isCompleted: boolean }) => !t.isCompleted).length ?? 0

  const levelOrdinal = (LEVEL_ORDER.indexOf(gamificationStatus?.level ?? 'nido') + 1) || 1
  const currentXp = gamificationStatus?.xp ?? 0
  const xpToNext = gamificationStatus?.xpToNext ?? 100
  const neededXp = currentXp + xpToNext

  const usersById = new Map((couple.users ?? []).map((u) => [u.id, u.name]))
  const movements = recentActivities.slice(0, 3).map((a) => ({
    id: a.id,
    userName: a.userId ? (usersById.get(a.userId) ?? user.name) : user.name,
    action: a.name,
    delta: a.delta ?? 0,
    when: new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  }))

  async function handleComplete(taskId: string) {
    const task = tasksRes?.tasks.find((t) => t.id === taskId)
    if (!task) return
    try {
      const pointsBase = Number(task.pointsBase ?? 0)
      await apiClient.tasks.logCompletion(taskId, {
        date: toLocalDateString(new Date()),
        pointsBase,
        pointsFinal: pointsBase,
      })
      // Keep the rest of the app in sync — partner will see the pending
      // verification in their inbox, and my own balance/activity won't update
      // until they verify. We still refresh those keys so the UI reflects the
      // pending state immediately.
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['taskLogs', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    } catch (err) {
      console.error('[Dashboard.handleComplete]', err)
    }
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
        multiplier={Number(gamificationStatus?.combinedMultiplier ?? gamificationStatus?.dailyMultiplier ?? 1.0)}
        freezes={gamificationStatus?.freezerAvailable ? 1 : 0}
      />
      <TodayTasksSection
        tasks={todayTasks}
        onComplete={handleComplete}
        partnerName={partner?.name ?? 'Tu pareja'}
      />
      <RecentMovements movements={movements} />
      <QuickPreviews
        shoppingPending={pendingShopping}
        todoPending={pendingTodos}
        partnerSharedPending={partnerSharedPending}
      />
    </main>
  )
}
