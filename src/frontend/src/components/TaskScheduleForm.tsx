// v2.7.6 audit 06 S2-1 / 09 S2-U-1 — reescritura con Tailwind v2 tokens.
// Antes: inline styles enteros con paleta clara hardcodeada (#fffbeb,
// #f59e0b, #92400e, #e5e7eb), incoherente con el resto de la app dark.
// Y referencias a `var(--matri-*)` legacy. Ahora todo tokens v2.

import { useState } from 'react'
import type { TaskSchedule } from '../types'

interface Props {
  value: TaskSchedule | null
  onChange: (schedule: TaskSchedule | null) => void
}

const FREQUENCY_OPTIONS = [
  { value: '', label: 'Sin repetición' },
  { value: 'daily', label: 'Cada día' },
  { value: 'biweekly', label: 'Cada 2 días' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'bimonthly', label: 'Cada 2 semanas' },
  { value: 'monthly', label: 'Cada mes' },
]

export function TaskScheduleForm({ value, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!value)

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) onChange(null)
  }

  const update = (patch: Partial<TaskSchedule>) => {
    if (!value) return
    onChange({ ...value, ...patch })
  }

  const inputCls = 'bg-surface-muted border border-brd-subtle rounded-md px-3 py-2 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber'

  return (
    <div
      className={`mt-3 rounded-lg p-3 transition-colors border-2 ${
        enabled ? 'bg-brand-amber/10 border-brand-amber/60' : 'bg-surface-muted border-brd-subtle'
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2.5 w-full bg-transparent border-0 p-0 cursor-pointer"
        aria-pressed={enabled}
      >
        <span
          className={`inline-flex items-center w-[42px] h-6 rounded-full px-[3px] flex-shrink-0 transition-colors ${
            enabled ? 'bg-brand-amber justify-end' : 'bg-text-tertiary justify-start'
          }`}
        >
          <span className="block w-[18px] h-[18px] rounded-full bg-white shadow-sm flex-shrink-0" />
        </span>
        <span className={`text-sm font-semibold ${enabled ? 'text-brand-amber' : 'text-text-secondary'}`}>
          📅 Planificar esta tarea
        </span>
      </button>

      {enabled && (
        <div className="flex flex-col gap-2 mt-3">
          <input
            type="datetime-local"
            value={value?.scheduledFor ?? ''}
            onChange={(e) => {
              const v = e.target.value
              if (!value) onChange({ scheduledFor: v })
              else update({ scheduledFor: v })
            }}
            className={inputCls}
          />

          <select
            value={value?.frequency ?? ''}
            onChange={(e) => {
              const freq = e.target.value
              if (!value?.scheduledFor) return
              if (!freq) onChange({ scheduledFor: value.scheduledFor })
              else update({ frequency: freq as TaskSchedule['frequency'] })
            }}
            className={inputCls}
          >
            {FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {value?.frequency && (
            <div className="flex gap-2">
              <input
                type="date"
                value={value.recurrenceEnd ?? ''}
                onChange={(e) => update({ recurrenceEnd: e.target.value || undefined })}
                placeholder="Termina el..."
                className={`${inputCls} flex-1`}
              />
              <input
                type="number"
                min={1}
                value={value.maxOccurrences ?? ''}
                onChange={(e) =>
                  update({ maxOccurrences: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Máx. veces"
                className={`${inputCls} flex-1`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
