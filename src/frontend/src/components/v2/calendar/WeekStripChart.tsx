// WeekStripChart — v2 Calendar week-summary bar chart (Task 6.2 of v1.4 La Evolución).
// Pure-CSS 7-column chart with stacked mini-bars for you/partner points per day.
// Used above the weekly events list in Vista Semana.

import type { Event as AppEvent } from '../../../types'

interface Props {
  year: number
  week: number // ISO week number (kept in signature per spec; chart computes from Monday)
  events: AppEvent[]
  user?: { id: string; name: string }
  partner?: { name: string }
  onSelectDate?: (date: string) => void
}

const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_BAR_PX = 60

/** Return Monday of the ISO week (year, week) in LOCAL time. */
function getMondayForISOWeek(year: number, week: number): Date {
  // Jan 4 is always in ISO week 1 (by definition of ISO week calendar)
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const mondayOfWeek1 = new Date(jan4)
  mondayOfWeek1.setDate(jan4.getDate() - (jan4Day - 1))
  mondayOfWeek1.setHours(0, 0, 0, 0)
  const target = new Date(mondayOfWeek1)
  target.setDate(mondayOfWeek1.getDate() + (week - 1) * 7)
  return target
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function pointsOf(ev: AppEvent): number {
  const raw = ev.pointsAgreed ?? ev.pointsCalculated ?? 0
  const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw)
  return isNaN(n) ? 0 : n
}

export function WeekStripChart({
  year,
  week,
  events,
  user,
  partner,
  onSelectDate,
}: Props) {
  const monday = getMondayForISOWeek(year, week)
  const days: { date: Date; key: string; youPts: number; partnerPts: number }[] = []

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    d.setHours(0, 0, 0, 0)
    days.push({ date: d, key: toYMD(d), youPts: 0, partnerPts: 0 })
  }

  // Bucket events by local YMD of dateStart and split by creator
  for (const ev of events) {
    if (!ev.dateStart) continue
    const ds = new Date(ev.dateStart)
    if (isNaN(ds.getTime())) continue
    const key = toYMD(ds)
    const bucket = days.find((x) => x.key === key)
    if (!bucket) continue
    const pts = pointsOf(ev)
    const creatorId = ev.creator?.id ?? ev.createdBy
    if (user?.id && creatorId === user.id) {
      bucket.youPts += pts
    } else {
      bucket.partnerPts += pts
    }
  }

  const maxPts = Math.max(
    1,
    ...days.map((d) => Math.max(d.youPts, d.partnerPts)),
  )

  return (
    <div className="rounded-lg bg-surface-card border border-brd-subtle p-3">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dayNum = day.date.getDate()
          const youHeight = Math.round((day.youPts / maxPts) * MAX_BAR_PX)
          const partnerHeight = Math.round((day.partnerPts / maxPts) * MAX_BAR_PX)
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate?.(day.key)}
              className="flex flex-col items-center gap-1 p-1 rounded-md hover:bg-surface-muted focus:outline-none focus:ring-1 focus:ring-brand-purple/40 transition"
            >
              <div className="text-[10px] font-bold text-text-tertiary uppercase">
                {WEEK_LABELS[i]}
              </div>
              <div className="text-xs font-semibold text-text-secondary tabular-nums">
                {dayNum}
              </div>
              <div
                className="flex items-end gap-0.5 w-full justify-center"
                style={{ height: `${MAX_BAR_PX}px` }}
              >
                <div
                  className="w-2 bg-brand-amber rounded-t-sm transition-all"
                  style={{ height: `${Math.max(youHeight, day.youPts > 0 ? 2 : 0)}px` }}
                  aria-label={`Tú: ${day.youPts} pts`}
                />
                <div
                  className="w-2 bg-brand-purple rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(partnerHeight, day.partnerPts > 0 ? 2 : 0)}px`,
                  }}
                  aria-label={`Pareja: ${day.partnerPts} pts`}
                />
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-amber" />
          {user?.name ?? 'Tú'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-purple" />
          {partner?.name ?? 'Pareja'}
        </span>
      </div>
    </div>
  )
}
