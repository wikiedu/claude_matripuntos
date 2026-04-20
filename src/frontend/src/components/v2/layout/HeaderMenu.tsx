import { useNavigate } from 'react-router-dom'

interface Props {
  open: boolean
  onClose: () => void
  unlockedCount?: number
  totalAchievements?: number
  partnerName?: string | null
  onLogout: () => void
}

export function HeaderMenu({ open, onClose, unlockedCount = 0, totalAchievements = 0, partnerName, onLogout }: Props) {
  const nav = useNavigate()
  if (!open) return null

  const items = [
    { id: 'achievements', emoji: '🏆', title: 'Logros',  desc: `${unlockedCount}/${totalAchievements} desbloqueados`, to: '/achievements' },
    { id: 'profile',      emoji: '👤', title: 'Perfil',  desc: 'Mi cuenta',                                           to: '/settings/profile' },
    { id: 'partner',      emoji: '💕', title: 'Pareja',  desc: partnerName ? `${partnerName} · vinculado` : 'Sin pareja', to: '/settings/partner' },
    { id: 'rules',        emoji: '📜', title: 'Reglas',  desc: 'Puntos y multiplicadores',                            to: '/settings/rules' },
    { id: 'settings',     emoji: '⚙️', title: 'Ajustes', desc: 'Notificaciones, idioma',                              to: '/settings' },
    { id: 'help',         emoji: '❓', title: 'Ayuda',   desc: 'Cómo funciona',                                        to: '/help' },
  ]

  function go(to: string) { nav(to); onClose() }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[58]" />
      <div className="fixed top-[68px] right-4 z-[59] w-[260px] bg-[rgba(26,16,53,0.98)] border border-brd-purple rounded-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={() => go(it.to)}
            className={`flex items-center gap-2.5 w-full px-3 py-3 text-left hover:bg-surface-muted transition ${i > 0 ? 'border-t border-brd-subtle' : ''}`}
          >
            <span className="text-xl w-7 text-center">{it.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text-primary">{it.title}</div>
              <div className="text-[10px] text-text-secondary mt-px">{it.desc}</div>
            </div>
            <span className="text-text-tertiary text-sm">›</span>
          </button>
        ))}
        <button
          onClick={() => { onLogout(); onClose() }}
          className="flex items-center gap-2.5 w-full px-3 py-3 bg-danger/10 border-t border-danger/20 text-left hover:bg-danger/20 transition"
        >
          <span className="text-xl w-7 text-center">🚪</span>
          <span className="text-sm font-bold text-danger">Cerrar sesión</span>
        </button>
      </div>
    </>
  )
}
