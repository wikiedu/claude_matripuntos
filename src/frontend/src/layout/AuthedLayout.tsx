import { useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/v2/layout/AppHeader'
import { BottomNav } from '../components/v2/layout/BottomNav'
import { HeaderMenu } from '../components/v2/layout/HeaderMenu'
import { FabActionSheet } from '../components/v2/layout/FabActionSheet'
import { useAppStore } from '../store/useAppStore'

export function AuthedLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const { user, couple, logout } = useAppStore()
  const nav = useNavigate()

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
        hasUnreadNotif={false}
        onBell={() => nav('/notifications')}
        onMenu={() => setMenuOpen(true)}
        onAvatar={() => nav('/settings/profile')}
      />
      <HeaderMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        partnerName={partner?.name ?? null}
        onLogout={handleLogout}
      />
      {children}
      <BottomNav onFab={() => setFabOpen(true)} />
      <FabActionSheet open={fabOpen} onClose={() => setFabOpen(false)} />
    </div>
  )
}
