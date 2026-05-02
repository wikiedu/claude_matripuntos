// v2.0.1.x — Sección Calendar 360 unificado: muestra próximos 30 días con
// entries de TODAS las fuentes (events, tasks, services, birthdays, holidays).
// Se renderiza al final de Calendar.tsx como complemento a la vista v1.

import { useMemo } from 'react'
import { useCalendarEntries, type CalendarEntry } from '../../../hooks/useCalendarV2'

const TYPE_META: Record<string, { emoji: string; label: string; bg: string }> = {
  event:     { emoji: '🎉', label: 'Actividad',     bg: 'bg-purple-500/20 text-purple-200' },
  task:      { emoji: '✓',  label: 'Tarea',         bg: 'bg-amber-500/20 text-amber-200' },
  service:   { emoji: '🧹', label: 'Servicio',      bg: 'bg-cyan-500/20 text-cyan-200' },
  birthday:  { emoji: '🎂', label: 'Cumpleaños',    bg: 'bg-pink-500/20 text-pink-200' },
  holiday:   { emoji: '🏖️', label: 'Festivo',       bg: 'bg-emerald-500/20 text-emerald-200' },
  external:  { emoji: '📅', label: 'Google',        bg: 'bg-blue-500/20 text-blue-200' },
  manual:    { emoji: '✏️',  label: 'Manual',        bg: 'bg-gray-500/20 text-gray-200' },
}

export function CalendarV2Section() {
  const today = new Date()
  const horizon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const entriesQ = useCalendarEntries({
    from: today.toISOString(),
    to: horizon.toISOString(),
  })

  const groups = useMemo(() => {
    const all = entriesQ.data?.entries ?? []
    const sorted = [...all].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const map = new Map<string, CalendarEntry[]>()
    for (const e of sorted) {
      const k = new Date(e.date).toISOString().slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    return [...map.entries()].slice(0, 14)  // próximos 14 días con datos
  }, [entriesQ.data])

  if (entriesQ.isLoading) return null
  if (groups.length === 0) {
    return (
      <section data-testid="calendar-v2-section" className="px-4 mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
          📅 Próximos eventos (vista unificada)
        </h2>
        <div className="rounded-lg bg-surface-card border border-brd-subtle p-3 text-center">
          <p className="text-xs text-white/60 italic">
            Aún no hay eventos en los próximos 30 días.
            Crea uno desde Settings → Calendario → Servicios externos para empezar.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section data-testid="calendar-v2-section" className="px-4 mt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">
        📅 Próximos eventos (vista unificada)
      </h2>
      <div className="space-y-2">
        {groups.map(([dateKey, items]) => (
          <div key={dateKey} className="rounded-lg bg-surface-card border border-brd-subtle p-2">
            <p className="text-[11px] font-semibold text-amber-300 mb-1">
              {formatDate(dateKey)}
            </p>
            <ul className="space-y-1">
              {items.map(e => {
                const meta = TYPE_META[e.type] ?? TYPE_META.manual
                return (
                  <li key={e.id} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded ${meta.bg} text-[10px]`}>
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-white/85 flex-1 truncate">{e.title}</span>
                    {!e.allDay && (
                      <span className="text-white/40 text-[10px]">
                        {new Date(e.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
}
