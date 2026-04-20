interface Props {
  streakDays: number
  multiplier: number
  freezes: number
  maxFreezes?: number
}

export function StreakStrip({ streakDays, multiplier, freezes, maxFreezes = 1 }: Props) {
  if (streakDays === 0) {
    return (
      <div className="mx-4 mb-3.5 px-3 py-2.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-center text-xs text-text-secondary">
        💤 Empieza una racha hoy
      </div>
    )
  }
  return (
    <div className="mx-4 mb-3.5 px-3 py-2.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-around text-xs font-semibold text-text-primary">
      <span>🔥 <span className="tabular-nums">{streakDays}</span> días</span>
      <span className="text-text-secondary">·</span>
      <span>×{multiplier.toFixed(1)}</span>
      <span className="text-text-secondary">·</span>
      <span>🧊 {freezes}/{maxFreezes}</span>
    </div>
  )
}
