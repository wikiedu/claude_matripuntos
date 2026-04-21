interface Props {
  youName: string
  youBalance: number
  partnerName: string
  partnerBalance: number
  level: number
  levelName: string
  current: number
  needed: number
}

export function BalanceLevelHero({
  youName, youBalance, partnerName, partnerBalance,
  level, levelName, current, needed,
}: Props) {
  const diff   = youBalance - partnerBalance
  const lead   = diff > 0.5
  const behind = diff < -0.5
  const absDiff = Math.abs(diff)
  const leadLabel = lead      ? `Vas ${absDiff.toFixed(1)} MP por delante`
                  : behind    ? `${partnerName} va ${absDiff.toFixed(1)} MP por delante`
                  : 'Estáis empatados'
  const pct = needed > 0 ? Math.min(100, (current / needed) * 100) : 0

  return (
    <div className="mx-4 mb-3.5 p-4 pb-3.5 rounded-xl bg-grad-hero shadow-xl shadow-brand-indigo/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-semibold tracking-wide text-[rgba(199,210,254,0.9)]">BALANCE DE LA SEMANA</p>
          <p className="m-0 mt-1.5 text-[34px] font-extrabold text-white leading-none tabular-nums tracking-tight">
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
            <span className="text-base font-medium opacity-80 ml-1">MP</span>
          </p>
          <p className="m-0 mt-1.5 text-[13px] font-medium text-white/95">
            {lead ? '🎉 ' : behind ? '💪 ' : '🤝 '}{leadLabel}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] font-semibold text-[rgba(199,210,254,0.85)]">{youName}</div>
          <div className="text-[15px] font-bold text-white tabular-nums">{youBalance >= 0 ? '+' : ''}{youBalance.toFixed(1)}</div>
          <div className="text-[10px] font-semibold text-[rgba(199,210,254,0.85)] mt-1">{partnerName}</div>
          <div className="text-[15px] font-bold text-white tabular-nums">{partnerBalance >= 0 ? '+' : ''}{partnerBalance.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-semibold text-[rgba(199,210,254,0.9)]">👑 Nivel {level} · {levelName}</div>
          <div className="text-[11px] font-bold text-white tabular-nums">{current}/{needed}</div>
        </div>
        <div className="relative h-1.5 bg-black/20 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  )
}
