// v2.0.1 — Vista mes simple. Grid 7×N celdas con dots por type.
// Variantes día/semana/año se completan en v2.0.1.x.

import { useMemo } from 'react'
import type { CalendarEntry } from '../../../hooks/useCalendarV2'

interface Props {
  year: number
  month: number  // 0-11
  entries: CalendarEntry[]
  onEntryClick?: (entry: CalendarEntry) => void
}

const TYPE_COLOR: Record<string, string> = {
  event: 'bg-purple-500',
  task: 'bg-amber-500',
  service: 'bg-cyan-500',
  birthday: 'bg-pink-500',
  holiday: 'bg-emerald-500',
  external: 'bg-blue-500',
  manual: 'bg-gray-400',
}

const DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarMonthViewV2({ year, month, entries, onEntryClick }: Props) {
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1))
    const startOffset = (first.getUTCDay() + 6) % 7  // Lunes = 0
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
    const totalCells = Math.ceil((startOffset + lastDay) / 7) * 7
    const arr: { day: number | null; date: Date | null; entries: CalendarEntry[] }[] = []
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1
      if (dayNum < 1 || dayNum > lastDay) {
        arr.push({ day: null, date: null, entries: [] })
      } else {
        const d = new Date(Date.UTC(year, month, dayNum))
        const dayEntries = entries.filter(e => {
          const ed = new Date(e.date)
          return ed.getUTCFullYear() === year && ed.getUTCMonth() === month && ed.getUTCDate() === dayNum
        })
        arr.push({ day: dayNum, date: d, entries: dayEntries })
      }
    }
    return arr
  }, [year, month, entries])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  return (
    <div data-testid="calendar-month-v2" className="flex flex-col">
      <div className="grid grid-cols-7 gap-px text-[11px] text-text-tertiary mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center font-semibold py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-brd-subtle rounded-md overflow-hidden">
        {cells.map((cell, i) => {
          const isToday = isCurrentMonth && cell.day === today.getDate()
          return (
            <div
              key={i}
              data-testid={cell.day ? `calendar-cell-${cell.day}` : undefined}
              className={`min-h-[60px] bg-surface-card p-1 ${isToday ? 'ring-2 ring-amber-500 ring-inset' : ''}`}
            >
              {cell.day && (
                <>
                  <div className={`text-[11px] ${isToday ? 'text-amber-500 font-bold' : 'text-text-secondary'}`}>{cell.day}</div>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {cell.entries.slice(0, 4).map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onEntryClick?.(e)}
                        title={e.title}
                        className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[e.type] ?? TYPE_COLOR.manual}`}
                        aria-label={e.title}
                      />
                    ))}
                    {cell.entries.length > 4 && (
                      <span className="text-[9px] text-text-tertiary">+{cell.entries.length - 4}</span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
