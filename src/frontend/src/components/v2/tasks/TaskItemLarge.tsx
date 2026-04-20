// Large task row used in the "Hoy" section of the Tasks page.
// Shows emoji tile (48px), task name, meta pill with category + pts, and a CTA button.

import { CheckCircle, Loader } from 'lucide-react'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './CategoryFilterStrip'

export interface TaskItemData {
  id: string
  name: string
  category: string
  pointsBase: number | string
  isRecurring?: boolean
  scheduledFor?: string
}

interface Props {
  task: TaskItemData
  doneToday: boolean
  status?: 'verified' | 'pending' | 'disputed'
  ongoing?: boolean   // true when assigned to partner or in progress — renders purple CTA
  busy?: boolean
  onMark: () => void
}

export function TaskItemLarge({ task, doneToday, status, ongoing, busy, onMark }: Props) {
  const emoji = CATEGORY_EMOJI[task.category?.toLowerCase()] || '🏠'
  const catLabel = CATEGORY_LABEL[task.category?.toLowerCase()] || task.category

  const statusBadge = doneToday
    ? status === 'verified'
      ? { text: '✅ Verificada', className: 'bg-success/15 text-success border border-success/30' }
      : status === 'disputed'
        ? { text: '⚠️ Disputada', className: 'bg-danger/15 text-danger border border-danger/30' }
        : { text: '⏳ Pendiente', className: 'bg-warn/15 text-warn border border-warn/30' }
    : null

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-card border border-brd-subtle">
      <div className="w-12 h-12 rounded-md bg-surface-muted flex items-center justify-center text-2xl flex-shrink-0">
        {doneToday ? '✅' : emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${doneToday ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
          {task.name}
        </p>
        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-muted text-text-secondary border border-brd-subtle">
          <span>{catLabel}</span>
          <span className="opacity-60">·</span>
          <span className="font-bold">{task.pointsBase} MP</span>
        </div>
      </div>

      {statusBadge ? (
        <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      ) : (
        <button
          type="button"
          onClick={onMark}
          disabled={busy}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1.5 disabled:opacity-50 ${
            ongoing
              ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/40'
              : 'bg-grad-cta text-white shadow-lg shadow-brand-amber/30'
          }`}
        >
          {busy ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Marcar
        </button>
      )}
    </div>
  )
}
