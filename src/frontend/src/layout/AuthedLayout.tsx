import { useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/v2/layout/AppHeader'
import { BottomNav } from '../components/v2/layout/BottomNav'
import { HeaderMenu } from '../components/v2/layout/HeaderMenu'
import { FabActionSheet } from '../components/v2/layout/FabActionSheet'
import { MoodSelectorSheet } from '../components/v2/sheets/MoodSelectorSheet'
import { useMoodVigent } from '../hooks/useMoodVigent'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import type { AchievementMapNode } from '../types/index'

export function AuthedLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [moodSheetOpen, setMoodSheetOpen] = useState(false)
  const { user, couple, logout, setUser } = useAppStore()
  const nav = useNavigate()
  const queryClient = useQueryClient()

  // Unread notifications count (polled so the bell badge stays fresh).
  // The hook is always called (before the null-return) so rules-of-hooks are preserved.
  // Backend returns { unreadCount } (see notificationRoutes.ts:98) — accept both
  // shapes so old clients keep working if we ever change it.
  const { data: unreadRes } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      apiClient.notifications.getUnreadCount() as Promise<{ unreadCount?: number; count?: number }>,
    enabled: !!user,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
  const unreadCount = unreadRes?.unreadCount ?? unreadRes?.count ?? 0

  // Achievement counts for HeaderMenu → "Logros" subtitle.
  const { data: achievementsMap } = useQuery<AchievementMapNode[]>({
    queryKey: ['achievements', 'map'],
    queryFn: () => apiClient.achievements.getMap(),
    enabled: !!user,
    staleTime: 60_000,
  })
  const unlockedCount = (achievementsMap ?? []).filter((n) => n.status === 'unlocked').length
  const totalAchievements = achievementsMap?.length ?? 0

  if (!user) return null

  // Derive partner from couple.users (the other user in the couple)
  const partner = couple?.users?.find((u) => u.id !== user.id) ?? null

  // v1.6 — Mood vigente (≤24h) propio y del partner. Hook devuelve null si
  // expira, no hay key, o key no está en catálogo.
  const myVigentMood = useMoodVigent(user.currentMood, (user as any).moodUpdatedAt)
  const partnerVigentMood = useMoodVigent(
    partner?.currentMood ?? null,
    (partner as any)?.moodUpdatedAt ?? null,
  )
  // Display strings que AppHeader espera (legacy contract: string|null).
  const userMoodDisplay = myVigentMood ? `${myVigentMood.emoji} ${myVigentMood.label}` : null
  const partnerMoodDisplay = partnerVigentMood ? `${partnerVigentMood.emoji} ${partnerVigentMood.label}` : null

  // v1.6 — mutation para fijar/quitar mood propio. Optimistic-style: actualiza
  // el store local y luego invalida queries dependientes para que se refresque
  // todo lo que muestra mood (header, dashboard MoodPairCard, etc.).
  const moodMutation = useMutation({
    mutationFn: async (moodKey: string | null) => {
      const updated = await apiClient.request('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ currentMood: moodKey }),
      })
      return updated
    },
    onSuccess: (data: any) => {
      const profile = data?.profile ?? {}
      setUser({
        ...user,
        currentMood: profile.currentMood ?? null,
        moodUpdatedAt: profile.moodUpdatedAt ?? null,
      } as any)
      queryClient.invalidateQueries({ queryKey: ['couple'] })
      queryClient.invalidateQueries({ queryKey: ['mood-history'] })
    },
  })

  function handleLogout() {
    logout()
    nav('/login')
  }

  return (
    <div className="min-h-screen pb-20 max-w-[500px] mx-auto overflow-x-hidden">
      <AppHeader
        userName={user.name}
        userAvatarEmoji={user.avatarEmoji}
        userAvatarColor={user.avatarColor}
        userMood={userMoodDisplay}
        partnerMood={partnerMoodDisplay}
        partnerName={partner?.name ?? null}
        partnerLastSeenAt={partner?.lastSeenAt ?? null}
        unreadCount={unreadCount}
        onBell={() => nav('/notifications')}
        onMenu={() => setMenuOpen(true)}
        onAvatar={() => setMoodSheetOpen(true)}
      />
      <MoodSelectorSheet
        open={moodSheetOpen}
        currentMoodKey={myVigentMood?.key ?? null}
        onChange={(key) => moodMutation.mutate(key)}
        onClose={() => setMoodSheetOpen(false)}
      />
      <HeaderMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        partnerName={partner?.name ?? null}
        unlockedCount={unlockedCount}
        totalAchievements={totalAchievements}
        onLogout={handleLogout}
      />
      {children}
      <BottomNav onFab={() => setFabOpen(true)} />
      <FabActionSheet open={fabOpen} onClose={() => setFabOpen(false)} />
    </div>
  )
}
