import { useState, useEffect, useRef, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/v2/layout/AppHeader'
import { BottomNav } from '../components/v2/layout/BottomNav'
import { HeaderMenu } from '../components/v2/layout/HeaderMenu'
import { FabActionSheet } from '../components/v2/layout/FabActionSheet'
import { MoodSelectorSheet } from '../components/v2/sheets/MoodSelectorSheet'
import { useMoodVigent } from '../hooks/useMoodVigent'
import { telemetry } from '../services/telemetry'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import type { AchievementMapNode } from '../types/index'
import { isSheetOpen } from '../lib/sheetLock'

export function AuthedLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [moodSheetOpen, setMoodSheetOpen] = useState(false)
  const { user, couple, logout, setUser, loadUserData } = useAppStore()
  const nav = useNavigate()
  const queryClient = useQueryClient()

  // v2.2.11 — refresca couple cada 60s para presence indicator.
  // v2.3.2 — además respeta sheetLock: si el usuario tiene un sheet/modal
  // abierto, saltamos el tick para no resetear su flujo.
  // v2.4 audit 07 S0 — pasamos `silent=true` a loadUserData para que NO
  // toque isLoading. Antes cada tick provocaba el flash "Cargando…" en
  // ProtectedRoute (esa era la causa principal del "refresh extraño"
  // reportado).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      if (typeof document === 'undefined') return
      if (document.visibilityState !== 'visible') return
      if (isSheetOpen()) return
      loadUserData?.(true).catch(() => {})
    }
    const id = window.setInterval(tick, 60_000)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [user, loadUserData])

  // Unread notifications count (polled so the bell badge stays fresh).
  // The hook is always called (before the null-return) so rules-of-hooks are preserved.
  // Backend returns { unreadCount } (see notificationRoutes.ts:98) — accept both
  // shapes so old clients keep working if we ever change it.
  // v2.3.5 — refetchInterval respeta sheetLock: cuando hay un sheet abierto
  // (false stop) no refetcheamos para no provocar re-renders intermedios.
  const { data: unreadRes } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      apiClient.notifications.getUnreadCount() as Promise<{ unreadCount?: number; count?: number }>,
    enabled: !!user,
    refetchInterval: () => (isSheetOpen() ? false : 30_000),
    staleTime: 10_000,
  })
  const unreadCount = unreadRes?.unreadCount ?? unreadRes?.count ?? 0

  // v2.5.3 audit 12 S1-Q-5 — cuando llega una nueva notif (unreadCount
  // incrementa), el partner ha hecho algo: invalidamos queries downstream
  // para que balance/eventos/tareas se refresquen sin esperar al próximo
  // tick de polling. Cierra el ciclo notif → UI update.
  const prevUnreadRef = useRef(unreadCount)
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current && !isSheetOpen()) {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'logs', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'status'] })
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, queryClient])

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
        onChange={(key) => {
          moodMutation.mutate(key)
          // v1.6.1 — telemetry: dispara mood.set o mood.cleared.
          if (key) {
            void telemetry.track('mood.set', { moodKey: key as any, source: 'header' })
          } else {
            void telemetry.track('mood.cleared', {})
          }
        }}
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
