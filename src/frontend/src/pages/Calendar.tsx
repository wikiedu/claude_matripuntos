// Calendar page — v2 design (Task 6.2 of v1.4 La Evolución).
// MonthGrid + WeekStripChart + EventCardV2 "Próximos" list, EventDetail bottom sheet.
// Rendered naked inside AuthedLayout (AppHeader/BottomNav provided globally).

import { useCallback, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isSheetOpen } from '../lib/sheetLock'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { Skeleton, SkeletonList } from '../components/v2/primitives/Skeleton'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import type { Event as AppEvent, TaskLog } from '../types/index'
import { MonthGrid } from '../components/v2/calendar/MonthGrid'
import { WeekStripChart } from '../components/v2/calendar/WeekStripChart'
import { EventCardV2 } from '../components/v2/calendar/EventCardV2'
import { BottomSheet } from '../components/v2/primitives/BottomSheet'
import { Button } from '../components/v2/primitives/Button'
import { EventNegotiationCard } from '../components/EventNegotiationCard'
import { CalendarV2Section } from '../components/v2/calendar/CalendarV2Section'
import { useCalendarEntries, type CalendarEntry } from '../hooks/useCalendarV2'
import { toLocalDateString } from '../utils/dateUtils'

// ─── Inline ISO week helpers (per spec) ───────────────────────────────────────
function getISOWeek(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: t.getUTCFullYear(), week }
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay() || 7
  const m = new Date(d)
  m.setDate(d.getDate() - day + 1)
  m.setHours(0, 0, 0, 0)
  return m
}

// ─── Segment control (matches Tasks.tsx pattern) ──────────────────────────────
function Segment<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-surface-card border border-brd-subtle">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              active
                ? 'bg-grad-cta text-white shadow-md shadow-brand-amber/30'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

function monthLabel(d: Date): string {
  const raw = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(d)
  return capitalize(raw)
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Calendar: React.FC = () => {
  const { isAuthenticated, user, couple } = useAppStore()
  const navigate = useNavigate()

  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1 // 1-12
  const { week } = getISOWeek(currentDate)

  const partner = useMemo(() => {
    if (!couple?.users || !user) return undefined
    const other = couple.users.find((u) => u.id !== user.id)
    return other ? { name: other.name } : undefined
  }, [couple, user])

  // v2.5.6 audit 05 S1 — Calendar migrado a React Query (mismo patrón
  // que Tasks v2.5.0). Antes hacía useState + setLoading(true) + useEffect
  // que recargaba en cada cambio de mes con spinner full-screen. Ahora
  // useQuery con sheetLock-aware refetchInterval, y los cambios de mes
  // sólo refiltran in-memory porque el endpoint devuelve TODOS los
  // eventos del couple (no paginados por mes).
  const queryClient = useQueryClient()
  const eventsQuery = useQuery({
    queryKey: ['events', 'all'],
    queryFn: () => apiClient.events.getAll() as Promise<{ events?: AppEvent[] }>,
    select: (d) => d?.events ?? [],
    enabled: isAuthenticated,
    staleTime: 10_000,
    refetchInterval: () => (isSheetOpen() ? false : 30_000),
    refetchIntervalInBackground: false,
  })
  const events: AppEvent[] = eventsQuery.data ?? []
  const loading = eventsQuery.isLoading && !eventsQuery.data
  const error = eventsQuery.error?.message ?? null

  // API estable para los pocos callers que invalidan tras mutación.
  const loadEvents = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['events', 'all'] })
  }, [queryClient])

  // Task logs — completed/verified tareas show up on their own day so the
  // calendar reflects actual lived activity, not just future events.
  const { data: logsRes } = useQuery({
    queryKey: ['taskLogs', 'all'],
    queryFn: () => apiClient.tasks.getAllLogs() as Promise<{ logs: TaskLog[] }>,
    enabled: isAuthenticated && !!couple?.id,
    staleTime: 60_000,
  })

  // Pseudo-events for the calendar grid so MonthGrid/WeekStripChart can render
  // a single merged list. Marked with type 'tarea' so MonthGrid picks the ✅ emoji.
  // These are display-only: tapping them is disabled downstream (not clickable
  // as negotiation cards, since they aren't Events).
  const taskLogPseudoEvents = useMemo<AppEvent[]>(() => {
    const logs = logsRes?.logs ?? []
    return logs
      .filter((l) => !!l.date)
      .map((l) => ({
        id: `log-${l.id}`,
        coupleId: (couple?.id ?? '') as string,
        createdBy: l.completedBy?.id ?? '',
        type: 'tarea',
        title: l.task?.name ?? 'Tarea',
        dateStart: l.date,
        dateEnd: l.date,
        pointsCalculated: l.pointsFinal,
        status: 'accepted',
      })) as AppEvent[]
  }, [logsRes, couple?.id])

  const calendarEntries = useMemo(
    () => [...events, ...taskLogPseudoEvents],
    [events, taskLogPseudoEvents],
  )

  // E.6 Fase 2 — entradas Calendar 360 (services recurrentes, cumpleaños,
  // festivos) del mes visible. Antes solo aparecían en la lista unificada del
  // final (CalendarV2Section, próximos 30 días); ahora también pintan en el
  // MonthGrid y en el drawer del día seleccionado. Excluimos event/task para
  // no duplicar lo que ya viene de events + taskLogs.
  const monthFromISO = useMemo(() => new Date(year, month - 1, 1).toISOString(), [year, month])
  const monthToISO = useMemo(
    () => new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
    [year, month],
  )
  const v2EntriesQuery = useCalendarEntries({
    from: monthFromISO,
    to: monthToISO,
    types: ['service', 'birthday', 'holiday'],
  })
  const v2Entries = useMemo<CalendarEntry[]>(
    () =>
      (v2EntriesQuery.data?.entries ?? []).filter((e) =>
        ['service', 'birthday', 'holiday'].includes(e.type),
      ),
    [v2EntriesQuery.data],
  )

  // Pseudo-events display-only para el MonthGrid (mismo patrón que taskLogs):
  // el tipo se mapea a emoji en MonthGrid (🧹/🎂/🏖️); no son tappables como
  // negociación porque el drawer solo renderiza EventCardV2 con Events reales.
  const v2PseudoEvents = useMemo<AppEvent[]>(
    () =>
      v2Entries.map((e) => ({
        id: `cal-${e.id}`,
        coupleId: (couple?.id ?? '') as string,
        createdBy: '',
        type: e.type,
        title: e.title,
        dateStart: e.date,
        dateEnd: e.endDate ?? e.date,
        status: 'accepted',
      })) as AppEvent[],
    [v2Entries, couple?.id],
  )

  const monthGridEntries = useMemo(
    () => [...calendarEntries, ...v2PseudoEvents],
    [calendarEntries, v2PseudoEvents],
  )

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // ─── Derived ───────────────────────────────────────────────────────────────
  const todayYMD = toLocalDateString(new Date())

  const goPrevMonth = () => {
    const d = new Date(currentDate)
    d.setDate(1)
    d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
    setSelectedDate(null)
  }
  const goNextMonth = () => {
    const d = new Date(currentDate)
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
    setSelectedDate(null)
  }

  // Events on the selected day (real Events, tappable for negotiation detail)
  const eventsOnSelected = selectedDate
    ? events.filter((ev) => {
        if (!ev.dateStart) return false
        return toLocalDateString(ev.dateStart) === selectedDate
      })
    : []

  // Task logs on the selected day — display-only rows so task-only days
  // don't appear empty in the drawer. Not tappable (they are not Events).
  const tasksOnSelected = selectedDate
    ? (logsRes?.logs ?? []).filter((l) => !!l.date && toLocalDateString(l.date) === selectedDate)
    : []

  // E.6 — entradas Calendar 360 del día seleccionado (display-only rows).
  const v2OnSelected = selectedDate
    ? v2Entries.filter((e) => !!e.date && toLocalDateString(e.date) === selectedDate)
    : []

  // Events in the current ISO week (monday..sunday of currentDate)
  const weekMonday = getMondayOfWeek(currentDate)
  const weekSunday = new Date(weekMonday)
  weekSunday.setDate(weekMonday.getDate() + 6)
  weekSunday.setHours(23, 59, 59, 999)

  const eventsThisWeek = events
    .filter((ev) => {
      if (!ev.dateStart) return false
      const d = new Date(ev.dateStart)
      if (isNaN(d.getTime())) return false
      return d >= weekMonday && d <= weekSunday
    })
    .sort((a, b) => +new Date(a.dateStart) - +new Date(b.dateStart))

  // Upcoming: next 5 events from today onwards
  const upcoming = events
    .filter((ev) => {
      if (!ev.dateStart) return false
      const d = new Date(ev.dateStart)
      if (isNaN(d.getTime())) return false
      return toLocalDateString(d) >= todayYMD
    })
    .sort((a, b) => +new Date(a.dateStart) - +new Date(b.dateStart))
    .slice(0, 5)

  const handleLongPress = (date: string) => {
    navigate(`/request-activity?date=${date}`)
  }

  const openNewActivity = () => {
    const target = selectedDate ?? todayYMD
    navigate(`/request-activity?date=${target}`)
  }

  // v2.0.7 — desde Calendar también se puede crear tarea, no sólo actividad.
  const openNewTask = () => {
    navigate('/tasks?new=1')
  }

  const currentUserId = user?.id ?? ''

  return (
    <main className="px-4 pt-3 pb-6">
      {/* Title + month nav */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-extrabold text-text-primary">Calendario</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={goPrevMonth}
            className="p-1.5 rounded-md bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary transition"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-text-primary min-w-[120px] text-center tabular-nums">
            {monthLabel(currentDate)}
          </span>
          <button
            onClick={goNextMonth}
            className="p-1.5 rounded-md bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary transition"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View toggle + new activity */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <Segment<'month' | 'week'>
          value={view}
          onChange={setView}
          options={[
            { value: 'month', label: 'Mes' },
            { value: 'week', label: 'Semana' },
          ]}
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={openNewTask}>
            <span className="inline-flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Tarea
            </span>
          </Button>
          <Button size="sm" onClick={openNewActivity}>
            <span className="inline-flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Actividad
            </span>
          </Button>
        </div>
      </div>

      {/* Inline banners — error viene de useQuery, se limpia con un refetch
          (no setError local). */}
      {error && (
        <div className="mb-3 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm flex items-start justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => loadEvents()} className="flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        /* E.4 Fase 2 — skeleton del grid en lugar de spinner */
        <div className="space-y-3">
          <Skeleton className="h-[320px] rounded-xl" />
          <SkeletonList count={2} />
        </div>
      ) : (
        <>
          {view === 'month' ? (
            <>
              <MonthGrid
                year={year}
                month={month}
                events={monthGridEntries}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                onLongPress={handleLongPress}
              />

              {selectedDate && (
                <section className="mt-4">
                  <h2 className="text-sm font-bold text-text-primary mb-2">
                    Actividad del día{' '}
                    <span className="text-text-secondary font-normal">
                      {new Intl.DateTimeFormat('es-ES', {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(`${selectedDate}T00:00:00`))}
                    </span>
                  </h2>
                  {eventsOnSelected.length === 0 &&
                  tasksOnSelected.length === 0 &&
                  v2OnSelected.length === 0 ? (
                    <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
                      <p className="text-sm text-text-secondary">Sin actividad este día</p>
                    </div>
                  ) : (
                    // Smart scroll: once the combined list grows beyond ~6 rows
                    // (~22rem) we cap the height and let the user scroll inside
                    // the drawer instead of pushing the rest of the page down.
                    <div
                      className={`space-y-3 ${
                        eventsOnSelected.length + tasksOnSelected.length + v2OnSelected.length > 6
                          ? 'max-h-[22rem] overflow-y-auto pr-1'
                          : ''
                      }`}
                    >
                      {eventsOnSelected.length > 0 && (
                        <div className="space-y-2">
                          {eventsOnSelected.map((ev) => (
                            <EventCardV2
                              key={ev.id}
                              event={ev}
                              onTap={() => setSelectedEvent(ev)}
                            />
                          ))}
                        </div>
                      )}
                      {v2OnSelected.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
                            Agenda del hogar ({v2OnSelected.length})
                          </p>
                          <div className="space-y-1.5">
                            {v2OnSelected.map((e) => (
                              <CalendarEntryRow key={e.id} entry={e} />
                            ))}
                          </div>
                        </div>
                      )}
                      {tasksOnSelected.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
                            Tareas completadas ({tasksOnSelected.length})
                          </p>
                          <div className="space-y-1.5">
                            {tasksOnSelected.map((l) => (
                              <TaskLogRow key={l.id} log={l} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : (
            <>
              <WeekStripChart
                year={year}
                week={week}
                events={calendarEntries}
                user={user ? { id: user.id, name: user.name } : undefined}
                partner={partner}
                onSelectDate={setSelectedDate}
              />

              <section className="mt-4">
                <h2 className="text-sm font-bold text-text-primary mb-2">
                  Eventos esta semana
                </h2>
                {eventsThisWeek.length === 0 ? (
                  <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
                    <p className="text-sm text-text-secondary">Sin eventos esta semana</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {eventsThisWeek.map((ev) => (
                      <EventCardV2
                        key={ev.id}
                        event={ev}
                        onTap={() => setSelectedEvent(ev)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Próximos (always visible) */}
          <section className="mt-6">
            <h2 className="text-sm font-bold text-text-primary mb-2">Próximos</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-md bg-surface-card border border-brd-subtle p-6 text-center">
                <div className="text-3xl mb-2">🗓️</div>
                <p className="text-sm font-semibold text-text-primary mb-1">
                  Nada a la vista
                </p>
                <p className="text-xs text-text-secondary">
                  Cuando crees una actividad aparecerá aquí
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((ev) => (
                  <EventCardV2
                    key={ev.id}
                    event={ev}
                    onTap={() => setSelectedEvent(ev)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Event detail modal */}
      <BottomSheet
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title?.trim() || selectedEvent?.type || 'Evento'}
      >
        {selectedEvent && (
          <EventNegotiationCard
            eventId={selectedEvent.id}
            eventTitle={selectedEvent.title?.trim() || selectedEvent.type || 'Evento'}
            createdBy={selectedEvent.createdBy}
            currentUserId={currentUserId}
            onStatusChange={loadEvents}
          />
        )}
      </BottomSheet>

      {/* v2.0.1.x — Calendar 360 unificado: services + birthdays + holidays + Google */}
      <CalendarV2Section />
    </main>
  )
}

// E.6 — non-interactive row for a Calendar 360 entry (service/birthday/holiday)
// on the selected day. Mirrors TaskLogRow styling.
const V2_ENTRY_META: Record<string, { emoji: string; label: string }> = {
  service: { emoji: '🧹', label: 'Servicio' },
  birthday: { emoji: '🎂', label: 'Cumpleaños' },
  holiday: { emoji: '🏖️', label: 'Festivo' },
}

function CalendarEntryRow({ entry }: { entry: CalendarEntry }) {
  const meta = V2_ENTRY_META[entry.type] ?? { emoji: '📅', label: 'Evento' }
  const timeLabel = !entry.allDay
    ? new Date(entry.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-card border border-brd-subtle">
      <div className="w-9 h-9 rounded-md bg-surface-muted border border-brd-subtle flex items-center justify-center text-base flex-shrink-0">
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{entry.title}</div>
        <div className="text-[11px] text-text-secondary truncate">{meta.label}</div>
      </div>
      {timeLabel && (
        <div className="text-[11px] font-semibold text-text-secondary tabular-nums flex-shrink-0">
          {timeLabel}
        </div>
      )}
    </div>
  )
}

// Simple non-interactive row for a completed TaskLog on the selected day.
function TaskLogRow({ log }: { log: TaskLog }) {
  const name = log.task?.name ?? 'Tarea'
  const pts = typeof log.pointsFinal === 'number' ? log.pointsFinal : Number(log.pointsFinal ?? 0)
  const who = log.completedBy?.name
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-card border border-brd-subtle">
      <div className="w-9 h-9 rounded-md bg-success/10 border border-success/30 flex items-center justify-center text-base flex-shrink-0">
        ✅
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{name}</div>
        {who && <div className="text-[11px] text-text-secondary truncate">{who}</div>}
      </div>
      <div className="text-[11px] font-bold text-brand-amber tabular-nums flex-shrink-0">
        +{pts} pts
      </div>
    </div>
  )
}

export default Calendar
