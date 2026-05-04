// v2.3.0 — Fila de tarea (Claude Design canvas 15).
// Grid 36px / 1fr / auto: checkbox + body (name + meta) + pts.
// done: tachado + check verde. recur: ícono ↺.

import { Check, RefreshCw } from 'lucide-react'

interface Props {
  name: string
  category?: string | null
  pointsFinal: number | string
  done?: boolean
  recurring?: boolean
  ownerLabel?: string | null      // 'A ti' | 'Blanca' | null
  scheduledLabel?: string | null  // 'jueves' | 'sábado' | null
  spend?: boolean                  // true para Activities
  onCheckbox?: () => void
  onClick?: () => void
}

export function TaskRow({
  name, category, pointsFinal, done, recurring, ownerLabel, scheduledLabel,
  spend, onCheckbox, onClick,
}: Props) {
  const pts = Number(pointsFinal) || 0
  const ptsColor = done ? 'text-text-tertiary' : spend ? 'text-brand-purple' : 'text-brand-amber'
  const sign = spend ? '−' : '+'

  return (
    <div
      className="grid items-center gap-2.5 p-3 mb-1.5 rounded-xl bg-surface-card border border-brd-subtle"
      style={{ gridTemplateColumns: '36px 1fr auto' }}
    >
      <button
        type="button"
        onClick={onCheckbox}
        aria-label={done ? `${name} hecha` : `Marcar ${name} como hecha`}
        className={`w-7 h-7 rounded-[9px] inline-flex items-center justify-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple ${
          done
            ? 'bg-success border-success text-white'
            : 'bg-brand-purple/5 border border-[1.5px] border-brd-purple text-text-tertiary hover:border-brand-purple'
        }`}
      >
        {done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={onClick}
        className="text-left min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
      >
        <p
          className={`m-0 text-[13px] font-bold leading-tight tracking-tight flex items-center gap-1.5 ${
            done ? 'text-text-tertiary line-through' : 'text-text-primary'
          }`}
        >
          <span className="truncate">{name}</span>
          {recurring && (
            <RefreshCw className="w-3 h-3 text-text-tertiary flex-shrink-0" aria-label="Recurrente" />
          )}
        </p>
        <p className="m-0 mt-0.5 text-[10.5px] text-text-tertiary flex items-center gap-1.5 flex-wrap">
          {category && (
            <span
              className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-brand-purple/10 text-brand-purple"
            >
              {category}
            </span>
          )}
          {ownerLabel && (
            <>
              <span>{ownerLabel}</span>
              {scheduledLabel && <span aria-hidden className="w-[3px] h-[3px] rounded-full bg-text-tertiary inline-block" />}
            </>
          )}
          {scheduledLabel && <span>{scheduledLabel}</span>}
        </p>
      </button>

      <p className={`m-0 text-sm font-extrabold tabular-nums flex items-baseline gap-0.5 ${ptsColor}`}>
        {sign}{pts}
        <span className="text-[9px] font-bold text-text-tertiary">MP</span>
      </p>
    </div>
  )
}

export default TaskRow
