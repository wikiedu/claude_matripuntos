// EventCardV2 — v2 Calendar upcoming/event card (Task 6.2 of v1.4 La Evolución).
// Horizontal row: 40px emoji tile · title + subtitle · Status Pill.

import type { Event as AppEvent } from '../../../types'
import { Pill } from '../primitives/Pill'
import { formatLocalDate, formatLocalTime } from '../../../utils/dateUtils'

interface Props {
  event: AppEvent
  onTap: () => void
}

const TYPE_EMOJI: Record<string, string> = {
  cita: '💊',
  trabajo: '💼',
  viaje: '✈️',
  ausencia: '🏃',
  cuidado: '👶',
  ocio: '🎉',
}

function emojiFor(type: string | undefined): string {
  if (!type) return '📅'
  return TYPE_EMOJI[type.toLowerCase()] || '📅'
}

function statusPill(status: AppEvent['status']) {
  switch (status) {
    case 'accepted':
      return <Pill tone="success">🟢 Confirmado</Pill>
    case 'pending':
    case 'forced':
      return <Pill tone="purple">🟣 Pendiente</Pill>
    case 'draft':
    case 'negotiating':
      return <Pill tone="warn">🟡 Por negociar</Pill>
    case 'rejected':
      return <Pill tone="danger">🔴 Rechazado</Pill>
    default:
      return <Pill tone="indigo">⚫ Otro</Pill>
  }
}

/** True if the event has a real time component (not midnight-midnight placeholder). */
function hasRealTime(date: string): boolean {
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

export function EventCardV2({ event, onTap }: Props) {
  const title = event.title?.trim() || event.type || 'Actividad'
  const dateLabel = event.dateStart ? formatLocalDate(event.dateStart) : ''
  const timeLabel =
    event.dateStart && hasRealTime(event.dateStart) ? formatLocalTime(event.dateStart) : ''
  const subtitle = timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex items-center gap-3 p-3 rounded-lg bg-surface-card border border-brd-subtle w-full text-left hover:bg-surface-muted transition focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
    >
      <div className="w-10 h-10 rounded-md bg-surface-muted border border-brd-subtle flex items-center justify-center text-xl flex-shrink-0">
        {emojiFor(event.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate capitalize">
          {title}
        </div>
        <div className="text-xs text-text-secondary truncate">{subtitle}</div>
      </div>
      <div className="flex-shrink-0">{statusPill(event.status)}</div>
    </button>
  )
}
