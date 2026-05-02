// v1.7 — Card de reto semanal. Si null → no renderiza.

import type { ChallengeInfo } from '../../../hooks/useGamificationV2'

interface Props {
  challenge: ChallengeInfo
  className?: string
}

const TYPE_LABELS: Record<ChallengeInfo['type'], { emoji: string; label: string }> = {
  balance: { emoji: '⚖️', label: 'Equilibrar saldo' },
  verify: { emoji: '✅', label: 'Verificar tareas mutuamente' },
  diversity: { emoji: '🎨', label: 'Probar categorías nuevas' },
  no_dispute: { emoji: '🕊️', label: 'Sin disputas esta semana' },
  high_impact: { emoji: '🚀', label: 'Una actividad de alto impacto' },
}

export function ChallengeCard({ challenge, className = '' }: Props) {
  const meta = TYPE_LABELS[challenge.type]
  const pct = Math.min(100, Math.round((challenge.progress / Math.max(1, challenge.goal)) * 100))
  const completed = challenge.progress >= challenge.goal

  return (
    <div data-testid="challenge-card" className={`rounded-xl bg-purple-900/20 border border-purple-500/15 p-3 ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">{meta.emoji}</span>
          <span className="text-sm text-white font-medium">{meta.label}</span>
        </div>
        <span data-testid="challenge-reward" className="text-[10px] text-amber-400 font-semibold">
          +{challenge.rewardXp} XP
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
          <div
            data-testid="challenge-progress"
            className={`h-full transition-all ${completed ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-pink-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span data-testid="challenge-status" className="text-white/70 text-[11px] tabular-nums">
          {challenge.progress}/{challenge.goal}
        </span>
      </div>
      {completed && (
        <p data-testid="challenge-done" className="text-[11px] text-emerald-400 mt-1">¡Reto completado! 🎉</p>
      )}
    </div>
  )
}
