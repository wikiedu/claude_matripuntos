import { type RecentActivity } from '../types/activity'

interface RecentMovementItemProps {
  movement: RecentActivity
  onClick: () => void
}

/**
 * RecentMovementItem
 *
 * Displays a single activity from the recent activity feed.
 * Shows icon based on type (event, task, negotiation), activity name, date,
 * and a visual arrow indicator. Clickable with hover effects.
 *
 * @param movement - The activity item to display
 * @param onClick - Callback when the item is clicked
 */
export function RecentMovementItem({ movement, onClick }: RecentMovementItemProps) {
  // Icon and label based on activity type
  const typeConfig: Record<
    string,
    { icon: string; label: string }
  > = {
    event: { icon: '🎉', label: 'Evento' },
    task: { icon: '✅', label: 'Tarea' },
    negotiation: { icon: '💬', label: 'Negociación' },
  }

  const config = typeConfig[movement.type] || { icon: '📌', label: 'Actividad' }

  // Format date as "3 de abril"
  const formatDate = (date: Date): string => {
    const dateObj = new Date(date)
    const formatter = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
    })
    return formatter.format(dateObj)
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 hover:border-gray-300 text-left"
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0">{config.icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-gray-600 flex-shrink-0">
            {config.label}
          </span>
          <span className="text-sm text-gray-900 font-medium truncate">
            {movement.name}
          </span>
        </div>
        <span className="text-xs text-gray-500 mt-1 block">
          {formatDate(movement.date)}
        </span>
      </div>

      {/* Arrow indicator */}
      <span className="text-gray-400 text-lg flex-shrink-0">→</span>
    </button>
  )
}
