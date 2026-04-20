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

  return (
    <div style={{
      marginTop: 12,
      border: `2px solid ${enabled ? '#f59e0b' : '#e5e7eb'}`,
      borderRadius: 10,
      padding: '10px 12px',
      background: enabled ? '#fffbeb' : '#f9fafb',
      transition: 'all 0.2s',
    }}>
      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          width: '100%', marginBottom: enabled ? 12 : 0,
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: enabled ? 'flex-end' : 'flex-start',
          width: 42, height: 24, borderRadius: 12,
          background: enabled ? '#f59e0b' : '#d1d5db',
          padding: '0 3px',
          flexShrink: 0,
          transition: 'background 0.2s',
          boxSizing: 'border-box' as const,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 9,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            display: 'block',
            flexShrink: 0,
          }} />
        </span>
        <span style={{
          fontSize: 14, fontWeight: 600,
          color: enabled ? '#92400e' : '#6b7280',
        }}>
          📅 Planificar esta tarea
        </span>
      </button>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Date+time */}
          <input
            type="datetime-local"
            value={value?.scheduledFor ?? ''}
            onChange={e => {
              const v = e.target.value
              if (!value) onChange({ scheduledFor: v })
              else update({ scheduledFor: v })
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--matri-card-border)',
              borderRadius: 8, padding: '8px 10px',
              color: 'var(--matri-text)', fontSize: 12,
            }}
          />

          {/* Frequency */}
          <select
            value={value?.frequency ?? ''}
            onChange={e => {
              const freq = e.target.value
              if (!value?.scheduledFor) return
              if (!freq) onChange({ scheduledFor: value.scheduledFor })
              else update({ frequency: freq as TaskSchedule['frequency'] })
            }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--matri-card-border)',
              borderRadius: 8, padding: '8px 10px',
              color: 'var(--matri-text)', fontSize: 12,
            }}
          >
            {FREQUENCY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* End condition (only if recurring) */}
          {value?.frequency && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="date"
                value={value.recurrenceEnd ?? ''}
                onChange={e => update({ recurrenceEnd: e.target.value || undefined })}
                placeholder="Termina el..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--matri-card-border)',
                  borderRadius: 8, padding: '8px 10px',
                  color: 'var(--matri-text)', fontSize: 11,
                }}
              />
              <input
                type="number"
                min={1}
                value={value.maxOccurrences ?? ''}
                onChange={e => update({ maxOccurrences: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Máx. veces"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--matri-card-border)',
                  borderRadius: 8, padding: '8px 10px',
                  color: 'var(--matri-text)', fontSize: 11,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
