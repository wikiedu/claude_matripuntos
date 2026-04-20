interface ExtraItem {
  label: string
  value: string
}

interface Props {
  levelName: string
  levelOrdinal: number
  currentXp: number
  neededXp: number
  unlocked: number
  total: number
  extra?: ExtraItem[]
}

export function LevelHero({
  levelName,
  levelOrdinal,
  currentXp,
  neededXp,
  unlocked,
  total,
  extra,
}: Props) {
  const pct = neededXp > 0 ? Math.min(100, (currentXp / neededXp) * 100) : 0

  return (
    <div className="mx-4 mb-4 bg-grad-hero rounded-lg p-5 text-white shadow-xl shadow-brand-indigo/30">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-[rgba(199,210,254,0.9)]">
          NIVEL {levelOrdinal}
        </span>
      </div>
      <p className="m-0 mt-1 text-2xl font-extrabold leading-tight">{levelName}</p>

      <div className="mt-4">
        <div className="relative overflow-hidden rounded-full bg-white/20" style={{ height: 6 }}>
          <div
            className="absolute inset-y-0 left-0 bg-grad-cta rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="m-0 mt-1.5 text-[11px] font-semibold text-[rgba(199,210,254,0.9)] tabular-nums">
          {currentXp} / {neededXp} XP
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-white/20">
        <p className="m-0 text-[12px] font-bold text-white tabular-nums">
          🏅 {unlocked} / {total} logros
        </p>
      </div>

      {extra && extra.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {extra.map((item, i) => (
            <div key={i} className="bg-white/10 rounded-sm p-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(199,210,254,0.85)]">
                {item.label}
              </div>
              <div className="text-[13px] font-bold text-white tabular-nums mt-0.5">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
