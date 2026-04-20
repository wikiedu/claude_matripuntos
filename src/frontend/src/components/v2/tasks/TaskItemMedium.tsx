// Denser task row used in the "Esta semana" section of the Tasks page.
// Same props as TaskItemLarge but compact: 36px emoji tile, no meta pill, small CTA.

import { CheckCircle, Loader } from 'lucide-react'
import { CATEGORY_EMOJI } from './CategoryFilterStrip'
import type { TaskItemData } from './TaskItemLarge'

interface Props {
  task: TaskItemData
  doneToday: boolean
  status?: 'verified' | 'pending' | 'disputed'
  ongoing?: boolean
  busy?: boolean
  onMark: () => void
}

export function TaskItemMedium({ task, doneToday, status, ongoing, busy, onMark }: Props) {
  const emoji = CATEGORY_EMOJI[task.category?.toLowerCase()] || '🏠'

  const statusBadge = doneToday
    ? status === 'verified'
      ? { text: '✅', className: 'bg-success/15 text-success border border-success/30' }
      : status === 'disputed'
        ? { text: '⚠️', className: 'bg-danger/15 text-danger border border-danger/30' }
        : { text: '⏳', className: 'bg-warn/15 text-warn border border-warn/30' }
    : null

  return (
    <div className="flex items-center gap-2 py-2 px-3 text-sm rounded-lg bg-surface-card border border-brd-subtle">
      <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center text-lg flex-shrink-0">
        {doneToday ? '✅' : emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`truncate font-medium ${doneToday ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
          {task.name}
        </p>
        <p className="text-[11px] text-text-tertiary">{task.pointsBase} MP</p>
      </div>

      {statusBadge ? (
        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      ) : (
        <button
          type="button"
          onClick={onMark}
          disabled={busy}
          className={`px-2 py-1 text-[11px] rounded-md font-bold transition flex items-center gap-1 disabled:opacity-50 ${
            ongoing
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
              : 'bg-grad-cta text-white'
          }`}
        >
          {busy ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Marcar
        </button>
      )}
    </div>
  )
}
