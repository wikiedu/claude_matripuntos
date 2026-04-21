import { useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppHeader } from '../components/v2/layout/AppHeader'
import { BottomNav } from '../components/v2/layout/BottomNav'
import { HeaderMenu } from '../components/v2/layout/HeaderMenu'
import { FabActionSheet } from '../components/v2/layout/FabActionSheet'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import type { AchievementMapNode } from '../types/index'

export function AuthedLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const { user, couple, logout } = useAppStore()
  const nav = useNavigate()

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
  // NOTE: currentMood is on User; there's no partner.mood field yet in the couple
  // response, so partnerMood stays null until Phase 7 wires it up.
  const partnerMood: string | null = null

  function handleLogout() {
    logout()
    nav('/login')
  }

  return (
    <div className="min-h-screen pb-20 max-w-[500px] mx-auto">
      <AppHeader
        userName={user.name}
        userAvatarEmoji={user.avatarEmoji}
        userAvatarColor={user.avatarColor}
        userMood={user.currentMood ?? null}
        partnerMood={partnerMood}
        partnerName={partner?.name ?? null}
        unreadCount={unreadCount}
        onBell={() => nav('/notifications')}
        onMenu={() => setMenuOpen(true)}
        onAvatar={() => nav('/settings/profile')}
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
