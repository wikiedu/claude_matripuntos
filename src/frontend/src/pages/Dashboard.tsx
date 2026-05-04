import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, fetchRecentActivity } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { useGamificationStatus } from '../hooks/useGamificationStatus'
import { useShoppingList } from '../hooks/useShoppingList'
import { useTodos } from '../hooks/useTodos'
import { DailyPhrase } from '../components/v2/dashboard/DailyPhrase'
import { AnniversaryCard } from '../components/v2/anniversary/AnniversaryCard'
import { RedBalanceCard } from '../components/v2/dashboard/RedBalanceCard'
import { PauseBanner } from '../components/v2/dashboard/PauseBanner'
// v2.2.0 — MoodPairCard + MoodNudge sustituidos por MoodCard unificado
// (handoff Claude Design canvas 03).
import { MoodCard } from '../components/v2/dashboard/MoodCard'
import { useMoodVigent } from '../hooks/useMoodVigent'

function DashboardMoodCard({ user, userMoodUpdatedAt, partner, onPickMine }: {
  user: { name: string; currentMood?: string | null }
  userMoodUpdatedAt: string | Date | null | undefined
  partner: { name?: string | null } | null
  onPickMine: () => void
}) {
  const myMood = useMoodVigent(user.currentMood, userMoodUpdatedAt)
  const partnerMood = useMoodVigent(
    (partner as any)?.currentMood,
    (partner as any)?.moodUpdatedAt,
  )
  return (
    <MoodCard
      myMood={myMood}
      partnerMood={partnerMood}
      myName={user.name}
      partnerName={partner?.name ?? 'Tu pareja'}
      onPickMine={onPickMine}
    />
  )
}
// v2.1.0 — LevelBar retirado: BalanceLevelHero ya muestra el nivel.
import { StreakBadge } from '../components/v2/dashboard/StreakBadge'
import { ChallengeCard } from '../components/v2/dashboard/ChallengeCard'
import { ReplayCard } from '../components/v2/dashboard/ReplayCard'
import { useStreak, useChallenge, useReplays, isGamificationV2Enabled } from '../hooks/useGamificationV2'
// v2.2.0 — MoodNudge retirado (sustituido por MoodCard).
import { ProfileCompletionBanner } from '../components/v2/dashboard/ProfileCompletionBanner'
import { BalanceLevelHero } from '../components/v2/dashboard/BalanceLevelHero'
import { EmptyStateHero } from '../components/v2/dashboard/EmptyStateHero'
import { StreakStrip } from '../components/v2/dashboard/StreakStrip'
import { ActivitiesBanner } from '../components/v2/dashboard/ActivitiesBanner'
import { VerifyTasksBanner } from '../components/v2/dashboard/VerifyTasksBanner'
import { TodayTasksSection } from '../components/v2/dashboard/TodayTasksSection'
import { RecentMovementsTabs } from '../components/v2/dashboard/RecentMovementsTabs'
import { QuickPreviews } from '../components/v2/dashboard/QuickPreviews'
import { NoPartnerBanner } from '../components/v2/dashboard/NoPartnerBanner'
import { CATEGORY_EMOJI } from '../components/v2/tasks/CategoryFilterStrip'
import { DashboardTour, hasSeenTour } from '../components/v2/tour/DashboardTour'
import { toLocalDateString } from '../utils/dateUtils'
import type { RecentActivity } from '../types/activity'
import type { Task, TaskLog } from '../types/index'

// v2.1.0 — sistema unificado de 10 niveles (opción C aprobada).
const LEVEL_ORDER = ['encuentro', 'confianza', 'compania', 'complicidad', 'refugio', 'raices', 'tribu', 'legado', 'eterno', 'mito']

function deriveKind(a: RecentActivity): 'activity' | 'task' | 'negotiation' {
  if (a.type === 'task') return 'task'
  if (a.type === 'negotiation') return 'negotiation'
  return 'activity'
}

export default function Dashboard() {
  const { user, couple } = useAppStore()
  const queryClient = useQueryClient()

  // Tour interactivo (quick-win #15): solo se muestra tras completar el
  // onboarding real, para no saturar al usuario nuevo con dos overlays.
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    if (user?.hasCompletedOnboarding && !hasSeenTour()) {
      setShowTour(true)
    }
  }, [user?.hasCompletedOnboarding])

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
    // A task is "done for now" if there is a log for it dated today (any status)
    // OR a pending-verification log from any recent day. Pending logs already
    // show up in the verification widget; re-listing them in Hoy confuses the
    // user into thinking the task still needs doing. Once the partner verifies
    // or disputes, the task reappears.
    const taskIdsHidden = new Set<string>()
    for (const l of logs) {
      if (l.date && toLocalDateString(l.date) === today) taskIdsHidden.add(l.taskId)
      if (l.status === 'pending') taskIdsHidden.add(l.taskId)
    }
    // Mirror the Tasks page "Hoy" logic: only show tasks the user actively
    // scheduled — today or overdue. Unscheduled catalog/recurring tasks are
    // intentionally excluded so the dashboard doesn't populate with stuff the
    // user didn't put there.
    //
    // Bug 2026-04-23: ocultar recurrentes pausadas (frequency!=null,
    // isRecurring=false) — Task.scheduledFor puede quedar apuntando al último
    // día generado y hacerlas aparecer hoy como "overdue". Mismo filtro que en
    // Tasks.tsx.
    return tasksRes.tasks
      .filter((t) => !(t.frequency && !t.isRecurring))
      .filter((t) => {
        if (!t.scheduledFor) return false
        const sf = toLocalDateString(t.scheduledFor)
        return sf <= today
      })
      .filter((t) => !taskIdsHidden.has(t.id))
      // Keep the full pending list so the "N pendientes" badge is accurate —
      // TodayTasksSection itself caps the visible rows at 3 and links to /tasks.
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

  const levelOrdinal = (LEVEL_ORDER.indexOf(gamificationStatus?.level ?? 'encuentro') + 1) || 1
  const currentXp = gamificationStatus?.xp ?? 0
  const xpToNext = gamificationStatus?.xpToNext ?? 100
  const neededXp = currentXp + xpToNext

  const usersById = new Map((couple.users ?? []).map((u) => [u.id, u.name]))
  const movements = recentActivities.slice(0, 50).map((a) => ({
    id: a.id,
    userName: a.userId ? (usersById.get(a.userId) ?? user.name) : user.name,
    action: a.name,
    delta: a.delta ?? 0,
    when: new Date(a.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    kind: deriveKind(a),
    refId: a.relatedId,
    status: a.status ?? null,
  }))

  async function handleComplete(taskId: string) {
    const task = tasksRes?.tasks.find((t) => t.id === taskId)
    if (!task) return
    try {
      const pointsBase = Number(task.pointsBase ?? 0)
      await apiClient.tasks.logCompletion(taskId, {
        date: toLocalDateString(new Date()),
        pointsBase,
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

  const isSolo = (couple.users?.length ?? 0) < 2

  // v2.2.0 — vigencia del mood se calcula dentro de DashboardMoodCard via useMoodVigent.
  const userMoodUpdatedAt = (user as any)?.moodUpdatedAt
  // Tap → AuthedLayout maneja el sheet via avatar; aquí emitimos un click sintético
  // sobre el botón del header que ya está integrado. Más simple: navegar al perfil
  // que también abre el flujo. Trade-off: re-uso del flow existente vs duplicar
  // el MoodSelectorSheet aquí. Optamos por trigger via custom event escuchado
  // por AuthedLayout — pero como todavía no hay event bus, usamos solución
  // mínima: tap dispara click programático sobre el avatar del header.
  const triggerMoodSheet = () => {
    const btn = document.querySelector<HTMLElement>('[aria-label="Mi perfil"]')
    btn?.click()
  }

  // v1.7 — Hooks gamification v2 (no-op si feature flag off → enabled false).
  // v2.1.0 — useLevel retirado del dashboard porque BalanceLevelHero ya muestra
  // el nivel inline. Se sigue usando en Achievements page.
  const streakQ = useStreak()
  const challengeQ = useChallenge()
  const replaysQ = useReplays()
  const v2Enabled = isGamificationV2Enabled()

  return (
    <main className="pb-4 pt-2">
      {showTour && <DashboardTour onClose={() => setShowTour(false)} />}
      {isSolo && <NoPartnerBanner />}
      <ProfileCompletionBanner firstLoginAt={(user as any)?.firstLoginAt} />
      {v2Enabled && !isSolo && (
        <div className="px-4 mb-3 space-y-2">
          {/* v2.1.0 — LevelBar retirado del dashboard. BalanceLevelHero ya muestra
              el nivel pareja inline con el balance, así que tener un banner
              independiente arriba es duplicación visual. */}
          {streakQ.data && <StreakBadge streak={streakQ.data} />}
          {challengeQ.data && <ChallengeCard challenge={challengeQ.data} />}
          {(replaysQ.data ?? []).slice(0, 1).map(r => (
            <ReplayCard key={r.key} replay={r} />
          ))}
        </div>
      )}
      {/* v2.2.8 — banner pausa (Claude Design canvas 14). Solo visible si la
          pareja está en modo vacation; oculto en el resto de casos. */}
      <PauseBanner />

      {/* v2.2.0 — Jerarquía nueva (canvas 01 Claude Design):
          1. Hero (Balance + Nivel pareja, lo principal)
          2. Frase del día (calidez)
          3. Mood card unificada (sustituye Nudge + PairCard)
          4. Anniversary chip (discreto)
          → luego sigue: streaks, tareas hoy, etc. */}
      {/* v2.2.7 — empty state cuando aún no se ha registrado nada (canvas 11). */}
      {(currentXp === 0 && Number(you.balance) === 0 && Number(partner?.balance ?? 0) === 0) ? (
        <EmptyStateHero partnerName={partner?.name ?? 'tu pareja'} />
      ) : (
        <BalanceLevelHero
          youName={you.name}
          youBalance={Number(you.balance)}
          partnerName={partner?.name ?? 'Tu pareja'}
          partnerBalance={Number(partner?.balance ?? 0)}
          level={levelOrdinal}
          levelName={gamificationStatus?.levelName ?? 'Encuentro'}
          current={currentXp}
          needed={neededXp}
        />
      )}
      <DailyPhrase />
      {!isSolo && user && (
        <DashboardMoodCard
          user={user}
          userMoodUpdatedAt={userMoodUpdatedAt}
          partner={partner}
          onPickMine={triggerMoodSheet}
        />
      )}
      {/* v2.2.6 — card escalada si llevo días en rojo crónico (privacidad
          asimétrica: solo la veo yo, mi pareja no recibe ninguna alerta). */}
      <RedBalanceCard />
      <AnniversaryCard />
      <StreakStrip
        streakDays={gamificationStatus?.dailyStreak ?? 0}
        multiplier={Number(gamificationStatus?.combinedMultiplier ?? gamificationStatus?.dailyMultiplier ?? 1.0)}
        freezes={gamificationStatus?.freezerAvailable ? 1 : 0}
      />
      <ActivitiesBanner />
      <VerifyTasksBanner logs={logsRes?.logs ?? []} />
      <TodayTasksSection
        tasks={todayTasks}
        onComplete={handleComplete}
        partnerName={partner?.name ?? 'Tu pareja'}
      />
      <RecentMovementsTabs movements={movements} />
      <QuickPreviews
        shoppingPending={pendingShopping}
        todoPending={pendingTodos}
        partnerSharedPending={partnerSharedPending}
      />
    </main>
  )
}
