import { useGamificationStatus } from '../hooks/useGamificationStatus'

export function LevelProgress() {
  const { data, isLoading } = useGamificationStatus()

  if (isLoading || !data) {
    return <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
  }

  return (
    <div className="rounded-xl p-4"
         style={{ background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.15)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{data.levelEmoji}</span>
          <div>
            <div className="text-sm font-bold text-white">Nivel {data.levelName}</div>
            <div className="text-[10px] text-gray-400">{data.xp.toLocaleString('es')} XP</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500">Siguiente</div>
          <div className="text-xs text-gray-300">{data.nextLevelEmoji} {data.nextLevel}</div>
          <div className="text-[10px] text-amber-400">
            {data.xpToNext > 0 ? `${data.xpToNext.toLocaleString('es')} XP` : '¡Máximo!'}
          </div>
        </div>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${data.xpProgress}%`,
            background: 'linear-gradient(90deg, #a855f7, #7c3aed)'
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-gray-600">0%</span>
        <span className="text-[9px] text-purple-400 font-bold">{data.xpProgress}%</span>
        <span className="text-[9px] text-gray-600">100%</span>
      </div>
    </div>
  )
}
