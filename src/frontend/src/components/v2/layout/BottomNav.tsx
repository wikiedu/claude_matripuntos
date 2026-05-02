import { useNavigate, useLocation } from 'react-router-dom'
import { Home, CheckSquare, Calendar, BarChart3, Plus } from 'lucide-react'

interface Props {
  onFab: () => void
}

const LEFT = [
  { id: 'dashboard', label: 'Inicio',     icon: Home,       to: '/dashboard' },
  { id: 'home',      label: 'Hogar',      icon: CheckSquare, to: '/home' },
]
const RIGHT = [
  { id: 'calendar',  label: 'Calendario', icon: Calendar,   to: '/calendar' },
  { id: 'analytics', label: 'Analítica',  icon: BarChart3,  to: '/analytics' },
]

export function BottomNav({ onFab }: Props) {
  const nav = useNavigate()
  const loc = useLocation()

  function renderItem(it: typeof LEFT[number]) {
    const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + '/')
    const Icon = it.icon
    return (
      <button
        key={it.id}
        onClick={() => nav(it.to)}
        aria-label={it.label}
        aria-current={active ? 'page' : undefined}
        className="flex flex-col items-center justify-center gap-1 px-3 py-1 min-w-[44px] min-h-[44px] bg-transparent border-0 focus:outline-none focus:ring-2 focus:ring-brand-purple/40 rounded"
      >
        <Icon size={18} className={active ? 'text-brand-amber' : 'text-text-tertiary'} />
        <span className={`text-[9px] font-semibold ${active ? 'text-brand-amber' : 'text-text-tertiary'}`}>{it.label}</span>
      </button>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-brd-subtle backdrop-blur-md max-w-[500px] mx-auto flex items-center justify-around py-2 pb-3">
      {LEFT.map(renderItem)}
      <button
        onClick={onFab}
        aria-label="Añadir"
        className="w-11 h-11 rounded-full bg-grad-cta text-white text-2xl -mt-5 shadow-lg shadow-brand-amber/40 flex items-center justify-center"
      >
        <Plus size={22} strokeWidth={3} />
      </button>
      {RIGHT.map(renderItem)}
    </nav>
  )
}
