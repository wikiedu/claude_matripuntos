// v1.6.3 — Indicador compacto en una fila: yo · pareja, con icono pequeño.
// Tap en lado propio abre MoodSelectorSheet; lado partner es solo lectura.
// Antes era card de dos columnas con avatar 14×14 que ocupaba demasiado
// espacio en el Dashboard inicial.

import { useMoodVigent } from '../../../hooks/useMoodVigent'

export interface UserPersonality {
  name: string
  avatarEmoji?: string | null
  avatarColor?: string | null
  currentMood?: string | null
  moodUpdatedAt?: string | Date | null
}

interface Props {
  me: UserPersonality
  partner: UserPersonality | null
  onPickMine: () => void
}

export function MoodPairCard({ me, partner, onPickMine }: Props) {
  const myMood = useMoodVigent(me.currentMood, me.moodUpdatedAt)
  const partnerMood = useMoodVigent(partner?.currentMood, partner?.moodUpdatedAt)

  return (
    <div className="rounded-xl bg-purple-900/20 border border-purple-500/15 px-3 py-2 flex items-center gap-3 text-xs">
      <button
        type="button"
        data-testid="my-side"
        onClick={onPickMine}
        aria-label="Cambiar mi estado de ánimo"
        className="flex items-center gap-1.5 hover:bg-white/5 rounded-md px-1 py-0.5 transition focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
      >
        <span data-testid="my-mood-emoji" className="text-base leading-none">
          {myMood ? myMood.emoji : '🫥'}
        </span>
        <span data-testid="my-mood" className="text-white/85">
          {myMood ? myMood.label : 'Tu estado →'}
        </span>
      </button>
      <span aria-hidden="true" className="text-white/30">·</span>
      <div data-testid="partner-side" className="flex items-center gap-1.5">
        {partner ? (
          <>
            <span data-testid="partner-mood-emoji" className="text-base leading-none">
              {partnerMood ? partnerMood.emoji : '🫥'}
            </span>
            <span data-testid="partner-mood" className="text-white/70">
              {partnerMood ? partnerMood.label : `${partner.name}: —`}
            </span>
          </>
        ) : (
          <span className="text-white/50">Sin pareja</span>
        )}
      </div>
    </div>
  )
}
