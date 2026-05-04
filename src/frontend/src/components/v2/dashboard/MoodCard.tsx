// v2.2.0 — Card de mood unificada según handoff Claude Design canvas 03.
// Reemplaza el doble banner (MoodNudge + MoodPairCard) que producía la
// confusión "te pide poner mood mientras ya hay uno".
//
// 2 estados:
//   - empty: si tú no has puesto mood hoy → CTA grande "¿Cómo estás hoy?"
//   - filled: muestra tu mood + el del partner (o "aún no" si no compartió)

import type { Mood } from '../../../data/moods'

interface Props {
  myMood: Mood | null
  partnerMood: Mood | null
  myName: string
  partnerName: string
  onPickMine: () => void
}

export function MoodCard({ myMood, partnerMood, myName, partnerName, onPickMine }: Props) {
  if (!myMood) {
    // Estado A: sin mood → CTA prominente
    return (
      <button
        type="button"
        onClick={onPickMine}
        data-testid="mood-card-empty"
        className="w-full text-left mx-4 mb-3 px-3.5 py-3 rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        style={{
          width: 'calc(100% - 2rem)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(168,85,247,0.10))',
          borderColor: 'rgba(245,158,11,0.25)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="w-9 h-9 rounded-[10px] inline-flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            🫥
          </span>
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[13px] font-bold text-text-primary leading-tight">¿Cómo estás hoy?</p>
            <p className="m-0 mt-0.5 text-[11px] text-text-tertiary leading-tight">
              Comparte tu mood con {partnerName}
            </p>
          </div>
          <span aria-hidden className="text-brand-amber font-bold text-base">→</span>
        </div>
      </button>
    )
  }

  // Estado B: con mood propio → mostrar tuyo + el del partner
  return (
    <div
      data-testid="mood-card-filled"
      className="mx-4 mb-3 px-3.5 py-2.5 rounded-xl bg-surface-card border border-brd-subtle"
    >
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={onPickMine}
          aria-label="Cambiar mi estado de ánimo"
          className="flex items-center gap-2 min-w-0 flex-1 hover:bg-white/5 rounded-md px-1 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        >
          <span aria-hidden className="text-xl leading-none">{myMood.emoji}</span>
          <div className="text-left min-w-0">
            <p className="m-0 text-[10px] text-text-tertiary leading-none">{myName}</p>
            <p className="m-0 mt-0.5 text-xs font-semibold text-text-primary leading-none truncate">{myMood.label}</p>
          </div>
        </button>

        <div aria-hidden className="w-px h-6 bg-brd-subtle flex-shrink-0" />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          {partnerMood ? (
            <>
              <span aria-hidden className="text-xl leading-none">{partnerMood.emoji}</span>
              <div className="text-left min-w-0">
                <p className="m-0 text-[10px] text-text-tertiary leading-none">{partnerName}</p>
                <p className="m-0 mt-0.5 text-xs font-semibold text-text-primary leading-none truncate">{partnerMood.label}</p>
              </div>
            </>
          ) : (
            <>
              <span aria-hidden className="text-xl leading-none opacity-40">🫥</span>
              <div className="text-left min-w-0">
                <p className="m-0 text-[10px] text-text-tertiary leading-none">{partnerName}</p>
                <p className="m-0 mt-0.5 text-xs italic text-text-tertiary leading-none">aún no</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MoodCard
