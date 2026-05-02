// v1.7 — Barra de nivel de pareja. Visible si feature flag activo y level data
// disponible. Animación level-up trigger via prop `levelChanged`.

import { useEffect, useState } from 'react'
import type { LevelInfo } from '../../../hooks/useGamificationV2'

interface Props {
  level: LevelInfo
  className?: string
}

export function LevelBar({ level, className = '' }: Props) {
  const [glow, setGlow] = useState(false)
  const range = Math.max(1, level.nextThreshold - level.threshold)
  const progress = level.level === 10 ? 1 : Math.max(0, Math.min(1, (level.xp - level.threshold) / range))
  const pct = Math.round(progress * 100)

  // Detectar level-up cuando level cambia (storage local del último visto)
  useEffect(() => {
    const lastSeen = Number(localStorage.getItem('mp_last_level') ?? '0')
    if (level.level > lastSeen) {
      setGlow(true)
      localStorage.setItem('mp_last_level', String(level.level))
      const t = setTimeout(() => setGlow(false), 2500)
      return () => clearTimeout(t)
    }
  }, [level.level])

  return (
    <div data-testid="level-bar" className={`rounded-xl bg-purple-900/30 border border-purple-500/20 px-3 py-2 ${glow ? 'animate-pulse ring-2 ring-amber-500' : ''} ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/85 font-semibold">
          {level.name} · Lv {level.level}
        </span>
        {level.level < 10 ? (
          <span className="text-[10px] text-white/60">
            {level.xpToNext} XP para Lv {level.level + 1}
          </span>
        ) : (
          <span className="text-[10px] text-amber-400">Nivel máximo</span>
        )}
      </div>
      <div className="h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
        <div
          data-testid="level-progress"
          className="h-full bg-gradient-to-r from-amber-500 to-pink-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
