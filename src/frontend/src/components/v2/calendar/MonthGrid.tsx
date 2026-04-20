// MonthGrid — v2 Calendar month view (Task 6.2 of v1.4 La Evolución).
// 7-col European Monday-start grid with emoji indicators, today highlight,
// selected-day amber border, and long-press support on empty cells.

import { useRef } from 'react'
import type { Event as AppEvent } from '../../../types'

interface Props {
  year: number
  month: number // 1-12
  events: AppEvent[]
  selectedDate: string | null // YYYY-MM-DD
  onSelect: (date: string) => void
  onLongPress?: (date: string) => void
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

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

/** Local YYYY-MM-DD for a given year/month/day. */
function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** European Monday=0 offset. JS getDay(): Sun=0..Sat=6. */
function mondayOffset(jsDay: number): number {
  return (jsDay + 6) % 7
}

export function MonthGrid({
  year,
  month,
  events,
  selectedDate,
  onSelect,
  onLongPress,
}: Props) {
  // Group events by local YYYY-MM-DD of dateStart
  const byDay = new Map<string, AppEvent[]>()
  for (const ev of events) {
    if (!ev.dateStart) continue
    const d = new Date(ev.dateStart)
    if (isNaN(d.getTime())) continue
    const key = ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const arr = byDay.get(key) ?? []
    arr.push(ev)
    byDay.set(key, arr)
  }

  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingBlanks = mondayOffset(firstOfMonth.getDay())
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7

  const todayKey = (() => {
    const t = new Date()
    return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate())
  })()

  // Long-press timer (single, since only one cell can be pressed at a time)
  const pressTimer = useRef<number | null>(null)
  const pressFiredRef = useRef(false)

  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const startPress = (date: string, hasEvents: boolean) => {
    if (!onLongPress || hasEvents) return
    pressFiredRef.current = false
    clearPress()
    pressTimer.current = window.setTimeout(() => {
      pressFiredRef.current = true
      onLongPress(date)
    }, 500)
  }

  const handleClick = (date: string) => {
    // If a long-press just fired, swallow the click so we don't also select
    if (pressFiredRef.current) {
      pressFiredRef.current = false
      return
    }
    onSelect(date)
  }

  const cells: React.ReactNode[] = []

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - leadingBlanks + 1
    const isInMonth = dayNumber >= 1 && dayNumber <= daysInMonth

    if (!isInMonth) {
      cells.push(
        <div
          key={`blank-${i}`}
          className="aspect-square rounded-md p-1 bg-surface-card border border-brd-subtle opacity-30"
          aria-hidden="true"
        />,
      )
      continue
    }

    const dateKey = ymd(year, month, dayNumber)
    const dayEvents = byDay.get(dateKey) ?? []
    const hasEvents = dayEvents.length > 0
    const isToday = dateKey === todayKey
    const isSelected = selectedDate === dateKey

    const borderCls = isSelected
      ? 'border-brand-amber border-2'
      : 'border-brd-subtle border'
    const ringCls = isToday && !isSelected ? 'ring-1 ring-brand-purple/30' : ''

    cells.push(
      <button
        key={dateKey}
        type="button"
        onClick={() => handleClick(dateKey)}
        onMouseDown={() => startPress(dateKey, hasEvents)}
        onMouseUp={clearPress}
        onMouseLeave={clearPress}
        onTouchStart={() => startPress(dateKey, hasEvents)}
        onTouchEnd={clearPress}
        onTouchCancel={clearPress}
        className={`aspect-square rounded-md p-1 flex flex-col items-start justify-start bg-surface-card ${borderCls} ${ringCls} text-left transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-purple/40`}
      >
        <span
          className={`text-[10px] leading-none ${
            isToday ? 'text-brand-purple font-bold' : 'text-text-secondary'
          }`}
        >
          {dayNumber}
        </span>
        {hasEvents && (
          <div className="mt-auto flex flex-wrap items-end gap-0.5">
            {dayEvents.slice(0, 3).map((ev) => (
              <span key={ev.id} className="text-[11px] leading-none">
                {emojiFor(ev.type)}
              </span>
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[9px] leading-none px-1 py-[1px] rounded-full bg-brand-purple/20 text-brand-purple font-semibold">
                +{dayEvents.length - 3}
              </span>
            )}
          </div>
        )}
      </button>,
    )
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[11px] font-bold text-text-tertiary uppercase tracking-wide py-1"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
    </div>
  )
}
