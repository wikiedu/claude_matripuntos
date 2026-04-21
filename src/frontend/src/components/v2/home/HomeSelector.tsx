import { ReactNode } from 'react'
import { Home as HomeIcon, Target } from 'lucide-react'

export type HomeView = 'tasks' | 'activities'

interface Props {
  active: HomeView
  activitiesCount: number
  onChange: (v: HomeView) => void
}

export function HomeSelector({ active, activitiesCount, onChange }: Props) {
  return (
    <div className="mx-4 mt-2 mb-3 grid grid-cols-2 gap-2">
      <Chip
        active={active === 'tasks'}
        icon={<HomeIcon size={16} />}
        label="Tareas"
        onClick={() => onChange('tasks')}
      />
      <Chip
        active={active === 'activities'}
        icon={<Target size={16} />}
        label="Actividades"
        badge={activitiesCount}
        onClick={() => onChange('activities')}
      />
    </div>
  )
}

function Chip({
  active, icon, label, badge, onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
        active
          ? 'bg-grad-cta text-white border-0 shadow-lg shadow-brand-amber/30'
          : 'bg-surface-elevated text-text-secondary border border-brd-subtle',
      ].join(' ')}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-danger text-white text-[10px] font-bold px-1.5 rounded-full">{badge}</span>
      )}
    </button>
  )
}
