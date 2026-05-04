// v2.3.1 — Refactor canvas 15 (act-card pattern). Card con:
//   - Icono emoji 36px en bg-brand-purple/15
//   - Título + meta + price morado con '−' destacado
//   - Status box con copy claro
//   - 3 botones accept/negotiate/reject estilo canvas

import { Check, X, Repeat } from 'lucide-react'

const TYPE_EMOJI: Record<string, string> = {
  trabajo: '💼',     viaje: '✈️',    salud: '🩺',     deporte: '🏃',
  ocio: '🎬',        social: '👯',   alto_impacto: '💒', cuidado: '👶',
  personal: '😌',    cena: '🍽️',     boda: '💒',       cumpleanos: '🎂',
  cumpleaños: '🎂',  default: '🎯',
}

function emojiFor(title: string, type?: string): string {
  if (type && TYPE_EMOJI[type.toLowerCase()]) return TYPE_EMOJI[type.toLowerCase()]
  const t = title.toLowerCase()
  if (t.includes('cena') || t.includes('comida') || t.includes('restaurant')) return '🍽️'
  if (t.includes('boda')) return '💒'
  if (t.includes('cumple')) return '🎂'
  if (t.includes('cine') || t.includes('teatro')) return '🎬'
  if (t.includes('viaje') || t.includes('escapada')) return '✈️'
  if (t.includes('médic') || t.includes('medico')) return '🩺'
  if (t.includes('deport') || t.includes('gimnasio')) return '🏃'
  return TYPE_EMOJI.default
}

export interface ActivityActionCardVM {
  id: string
  title: string
  creatorName: string
  whenLabel: string
  pointsCalculated: number
  round: number
  type?: string
}

interface Props {
  activity: ActivityActionCardVM
  busy?: boolean
  onAccept: (id: string) => void
  onCounter: (id: string) => void
  onReject: (id: string) => void
  onOpen: (id: string) => void
}

export function ActivityActionCard({ activity, busy, onAccept, onCounter, onReject, onOpen }: Props) {
  const a = activity
  const emoji = emojiFor(a.title, a.type)

  return (
    <div
      className="mx-4 mb-2 p-3 rounded-2xl bg-surface-card"
      style={{ border: '1px solid rgba(168,85,247,0.20)' }}
      data-testid="action-card"
    >
      <button
        type="button"
        data-testid="action-card-body"
        onClick={() => onOpen(a.id)}
        className="w-full text-left bg-transparent border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded"
      >
        <div className="flex gap-2.5 items-start">
          <div
            aria-hidden
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(168,85,247,0.15)' }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-extrabold text-text-primary tracking-tight truncate">{a.title}</div>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              <span className="text-text-secondary font-semibold">{a.whenLabel}</span>
              {' · '}propuesta de {a.creatorName}
              {a.round > 1 && <> · ronda {a.round}</>}
            </div>
          </div>
          <div className="text-[13px] font-extrabold text-brand-purple tabular-nums whitespace-nowrap">
            −{a.pointsCalculated.toFixed(0)} MP
          </div>
        </div>
      </button>

      <div
        className="mt-2.5 px-2.5 py-2 rounded-[9px] text-[11px] leading-snug"
        style={{
          background: 'rgba(168,85,247,0.10)',
          border: '1px solid rgba(168,85,247,0.30)',
          color: 'var(--brand-purple)',
        }}
      >
        <strong className="text-text-primary font-bold">{a.creatorName} propone</strong> esta actividad.
        Acepta para reservar y restar los puntos.
      </div>

      <div className="flex gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => onAccept(a.id)}
          disabled={busy}
          className="flex-1 px-2 py-2 rounded-md bg-success text-white text-[11px] font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
        >
          <Check size={12} /> Aceptar
        </button>
        <button
          type="button"
          onClick={() => onCounter(a.id)}
          disabled={busy}
          className="flex-1 px-2 py-2 rounded-md bg-transparent border border-brd-subtle text-text-secondary text-[11px] font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        >
          <Repeat size={12} /> Negociar
        </button>
        <button
          type="button"
          onClick={() => onReject(a.id)}
          disabled={busy}
          aria-label="Rechazar"
          className="px-3 py-2 rounded-md bg-transparent border text-danger text-[11px] font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          style={{ borderColor: 'rgba(239,68,68,0.30)' }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
