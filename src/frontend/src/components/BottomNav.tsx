import { useLocation, useNavigate } from 'react-router-dom'

interface BottomNavProps {
  onPlusPress?: () => void
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Inicio', icon: '🏠' },
  { path: '/tasks', label: 'Tareas', icon: '✅' },
  { path: '/calendar', label: 'Calendario', icon: '📅' },
  { path: '/achievements', label: 'Logros', icon: '🏆' },
]

export function BottomNav({ onPlusPress }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--matri-card-bg)',
        borderTop: '1px solid var(--matri-card-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 0 12px',
        zIndex: 50,
      }}
    >
      {/* Inicio */}
      <NavItem
        icon={NAV_ITEMS[0].icon}
        label={NAV_ITEMS[0].label}
        active={location.pathname === NAV_ITEMS[0].path}
        onClick={() => navigate(NAV_ITEMS[0].path)}
      />
      {/* Tareas */}
      <NavItem
        icon={NAV_ITEMS[1].icon}
        label={NAV_ITEMS[1].label}
        active={location.pathname === NAV_ITEMS[1].path}
        onClick={() => navigate(NAV_ITEMS[1].path)}
      />
      {/* FAB + */}
      <button
        onClick={onPlusPress}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: '#fff',
          cursor: 'pointer',
          marginTop: -20,
          boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
        }}
        aria-label="Nueva actividad"
      >
        +
      </button>
      {/* Calendario */}
      <NavItem
        icon={NAV_ITEMS[2].icon}
        label={NAV_ITEMS[2].label}
        active={location.pathname === NAV_ITEMS[2].path}
        onClick={() => navigate(NAV_ITEMS[2].path)}
      />
      {/* Logros */}
      <NavItem
        icon={NAV_ITEMS[3].icon}
        label={NAV_ITEMS[3].label}
        active={location.pathname === NAV_ITEMS[3].path}
        onClick={() => navigate(NAV_ITEMS[3].path)}
      />
    </nav>
  )
}

interface NavItemProps {
  icon: string
  label: string
  active: boolean
  onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0 8px',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span
        style={{
          fontSize: 9,
          color: active ? 'var(--matri-amber)' : 'var(--matri-text-3)',
          fontWeight: active ? 600 : 400,
        }}
      >
        {label}
      </span>
    </button>
  )
}
