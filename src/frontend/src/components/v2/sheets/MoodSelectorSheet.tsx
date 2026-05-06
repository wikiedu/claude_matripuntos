// v1.6 — Bottom sheet para seleccionar mood propio. Acceso desde:
//  - Tap en avatar del header
//  - Tap en lado propio de MoodPairCard
//  - Tap en MoodNudge
//
// Selección dispara onChange(key) + onClose. "Quitar mi mood" dispara
// onChange(null) — backend limpia currentMood + moodUpdatedAt.

import { MOODS } from '../../../data/moods'

interface Props {
  open: boolean
  currentMoodKey: string | null
  onChange: (key: string | null) => void
  onClose: () => void
}

export function MoodSelectorSheet({ open, currentMoodKey, onChange, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-label="Seleccionar mood">
      <div
        data-testid="mood-sheet-backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className="relative w-full bg-page-deep rounded-t-3xl p-6 shadow-2xl"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto h-1 w-12 rounded-full bg-white/20 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-4">¿Cómo estás hoy?</h3>

        <div className="grid grid-cols-5 gap-3">
          {MOODS.map(m => {
            const selected = m.key === currentMoodKey
            return (
              <button
                key={m.key}
                type="button"
                data-testid={`mood-opt-${m.key}`}
                data-selected={selected}
                onClick={() => { onChange(m.key); onClose() }}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 transition ${
                  selected
                    ? 'bg-purple-500/30 ring-2 ring-purple-400'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                aria-label={m.label}
              >
                <span className="text-3xl">{m.emoji}</span>
                <span className="text-xs text-white/80 text-center leading-tight">{m.label}</span>
              </button>
            )
          })}
        </div>

        {currentMoodKey && (
          <button
            type="button"
            data-testid="mood-clear-action"
            onClick={() => { onChange(null); onClose() }}
            className="mt-4 w-full text-sm text-white/60 hover:text-white py-2"
          >
            Quitar mi mood
          </button>
        )}
      </div>
    </div>
  )
}
