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
      <span>
        <span aria-hidden style={{ display: 'inline-block', animation: 'mp-flame-flicker 2.4s ease-in-out infinite' }}>🔥</span>
        {' '}<span className="tabular-nums">{streakDays}</span> días
      </span>
      <span className="text-text-secondary">·</span>
      <span>×{multiplier.toFixed(1)}</span>
      <span className="text-text-secondary">·</span>
      <span>🧊 {freezes}/{maxFreezes}</span>
      {/* v2.2.9 — flame flicker (canvas 13). Animación sutil, no se ve "móvil
          cargando", se ve "vivo". 2.4s cycle: 100% → 88% → 100% → 92% → 100%. */}
      <style>{`
        @keyframes mp-flame-flicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          22%      { transform: scale(0.92); opacity: 0.85; }
          44%      { transform: scale(1.02); opacity: 1; }
          66%      { transform: scale(0.95); opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}
