import { useGamificationStatus } from '../hooks/useGamificationStatus'

function DayDot({ state }: { state: 'done' | 'today' | 'frozen' | 'empty' }) {
  const colors = {
    done:   'bg-amber-400',
    today:  'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
    frozen: 'bg-blue-400',
    empty:  'bg-white/10',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[state]}`} />
}

export function StreakWidget() {
  const { data, isLoading } = useGamificationStatus()

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 animate-pulse">
        <div className="h-28 rounded-xl bg-white/5" />
        <div className="h-28 rounded-xl bg-white/5" />
      </div>
    )
  }

  const dailyDots: Array<'done' | 'today' | 'frozen' | 'empty'> = Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return 'today'
    if (i < data.dailyStreak - 1) return 'done'
    if (i === data.dailyStreak - 1 && !data.freezerAvailable) return 'frozen'
    return 'empty'
  })

  const weeklyDots: Array<'done' | 'today' | 'empty'> = Array.from({ length: 5 }, (_, i) => {
    if (i === data.weeklyStreak - 1) return 'today'
    if (i < data.weeklyStreak - 1) return 'done'
    return 'empty'
  })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {/* Daily streak */}
        <div className="rounded-xl p-3 text-center"
             style={{ background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div className="text-xl mb-1">🔥</div>
          <div className="text-3xl font-black text-amber-400 leading-none">{data.dailyStreak}</div>
          <div className="text-[9px] uppercase tracking-wide text-gray-500 mt-1">Racha diaria</div>
          <div className="flex gap-1.5 justify-center mt-2">
            {dailyDots.map((state, i) => <DayDot key={i} state={state} />)}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Tareas completadas</div>
          <div className="mt-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
              ×{data.dailyMultiplier.toFixed(1)} pts
            </span>
          </div>
        </div>

        {/* Weekly streak */}
        <div className="rounded-xl p-3 text-center"
             style={{ background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="text-xl mb-1">⚖️</div>
          <div className="text-3xl font-black text-purple-400 leading-none">{data.weeklyStreak}</div>
          <div className="text-[9px] uppercase tracking-wide text-gray-500 mt-1">Racha semanal</div>
          <div className="flex gap-1.5 justify-center mt-2">
            {weeklyDots.map((state, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${
                state === 'today' ? 'bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.6)]' :
                state === 'done'  ? 'bg-purple-400' : 'bg-white/10'
              }`} />
            ))}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Semanas equilibradas</div>
          <div className="mt-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7' }}>
              +{Math.round(data.weeklyBonus * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Freezer notification */}
      {!data.freezerAvailable && (
        <div className="rounded-lg p-2.5 flex gap-2.5 items-start"
             style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)' }}>
          <span className="text-lg flex-shrink-0">🧊</span>
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong className="text-blue-200">Congelador activado.</strong> Hemos protegido vuestra racha. Próximo congelador disponible el lunes.
          </p>
        </div>
      )}
    </div>
  )
}
