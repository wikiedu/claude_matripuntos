// v1.6 — Card horizontal en dashboard que muestra mood vigente de ambos.
// Tap en lado propio abre MoodSelectorSheet; tap en lado partner no hace nada
// (no se le puede fijar mood al otro). Si nadie tiene mood vigente, sigue
// visible con CTA suave invitando a compartir el propio.

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
    <div className="rounded-2xl bg-purple-900/30 border border-purple-500/20 p-4 grid grid-cols-2 gap-4">
      <button
        type="button"
        data-testid="my-side"
        onClick={onPickMine}
        className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition"
      >
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-2xl shadow"
          style={{ background: `linear-gradient(135deg, ${me.avatarColor ?? '#7c3aed'}, ${me.avatarColor ?? '#7c3aed'}cc)` }}
        >
          {me.avatarEmoji ?? '🙂'}
        </div>
        <div className="text-sm text-white font-medium">{me.name}</div>
        <div data-testid="my-mood" className="text-xs text-white/80">
          {myMood ? `${myMood.emoji} ${myMood.label}` : 'Comparte cómo estás →'}
        </div>
      </button>

      <div data-testid="partner-side" className="flex flex-col items-center gap-2 p-2">
        {partner ? (
          <>
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-2xl shadow"
              style={{ background: `linear-gradient(135deg, ${partner.avatarColor ?? '#ec4899'}, ${partner.avatarColor ?? '#ec4899'}cc)` }}
            >
              {partner.avatarEmoji ?? '🙂'}
            </div>
            <div className="text-sm text-white font-medium">{partner.name}</div>
            <div data-testid="partner-mood" className="text-xs text-white/80">
              {partnerMood ? `${partnerMood.emoji} ${partnerMood.label}` : '—'}
            </div>
          </>
        ) : (
          <div className="text-xs text-white/60">Sin pareja conectada</div>
        )}
      </div>
    </div>
  )
}
