// v1.7 — Badge inline con fire emoji + streak count. Tap → modal stats.

import type { StreakInfo } from '../../../hooks/useGamificationV2'

interface Props {
  streak: StreakInfo
  onTap?: () => void
  className?: string
}

export function StreakBadge({ streak, onTap, className = '' }: Props) {
  if (streak.daily === 0 && streak.weekly === 0) return null

  return (
    <button
      type="button"
      data-testid="streak-badge"
      onClick={onTap}
      className={`flex items-center gap-2 text-xs text-white/85 px-2 py-1 rounded-md hover:bg-white/5 ${className}`}
    >
      {streak.daily > 0 && (
        <span data-testid="streak-daily">🔥 {streak.daily} días</span>
      )}
      {streak.weekly > 0 && (
        <>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span data-testid="streak-weekly">⚡ {streak.weekly} sem</span>
        </>
      )}
    </button>
  )
}
