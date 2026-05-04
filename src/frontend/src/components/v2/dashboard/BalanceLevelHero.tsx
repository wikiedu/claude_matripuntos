// v2.2.0 — Hero unificado (Balance + Nivel pareja) según handoff Claude Design
// canvas 01. Cambios respecto a v2.1.0:
//   - Eyebrow conversacional ("Balance · esta semana") en vez de uppercase fuerte.
//   - Nombre explícito de quien lleva ventaja ("Blanca va 13.5 por delante").
//   - Level row con badge emoji 32x32 + perk + % visible.
//   - Barra interior con gradiente amber→orange en vez de blanco plano.
// v2.2.2 — Microinteracción canvas 13: la barra anima de 0% al valor real al
// montar (600ms cubic-bezier ease-out). Da sensación de "carga gratificante".

import { useState, useEffect } from 'react'

const LEVEL_EMOJI: Record<number, string> = {
  1: '🌱', 2: '🌿', 3: '🤝', 4: '💫', 5: '🏡',
  6: '🌳', 7: '🔥', 8: '💎', 9: '♾️', 10: '⭐',
}

const LEVEL_PERK: Record<number, string> = {
  1: 'Confianza',
  2: 'Compañía',
  3: 'Complicidad',
  4: 'Refugio',
  5: 'Raíces',
  6: 'Tribu',
  7: 'Legado',
  8: 'Eterno',
  9: 'Mito',
  10: 'Has llegado al máximo ✨',
}

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
  const diff = youBalance - partnerBalance
  const lead = diff > 0.5
  const behind = diff < -0.5
  const absDiff = Math.abs(diff)
  const explain = lead   ? `🎉 ${youName} va ${absDiff.toFixed(1)} por delante`
                : behind ? `💪 ${partnerName} va ${absDiff.toFixed(1)} por delante`
                : '🤝 Estáis empatados'
  const pct = needed > 0 ? Math.min(100, (current / needed) * 100) : 0
  const emoji = LEVEL_EMOJI[level] ?? '🌱'
  const nextPerk = level >= 10 ? '—' : LEVEL_PERK[level + 1] ?? ''

  // v2.2.2 — animar la barra desde 0 a pct al montar
  const [renderedPct, setRenderedPct] = useState(0)
  useEffect(() => {
    const t = window.setTimeout(() => setRenderedPct(pct), 60)
    return () => window.clearTimeout(t)
  }, [pct])

  return (
    <div className="mx-4 mb-3.5 p-4 pb-3.5 rounded-xl bg-grad-hero shadow-xl shadow-brand-indigo/30 relative overflow-hidden">
      {/* Glow decorativo del handoff */}
      <div
        aria-hidden
        className="absolute -right-5 -top-5 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-bold tracking-[0.08em] uppercase text-[rgba(199,210,254,0.85)]">
            Balance · esta semana
          </p>
          <p className="m-0 mt-1.5 text-[38px] font-extrabold text-white leading-none tabular-nums tracking-tight">
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
            <span className="text-sm font-medium opacity-70 ml-1">MP</span>
          </p>
          <p className="m-0 mt-1 text-[13px] font-medium text-white/95">{explain}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex flex-col items-end gap-px mb-1.5">
            <span className="text-[10px] font-semibold text-[rgba(199,210,254,0.7)]">{youName}</span>
            <span className="text-sm font-bold text-white tabular-nums">{youBalance >= 0 ? '+' : ''}{youBalance.toFixed(1)}</span>
          </div>
          <div className="flex flex-col items-end gap-px">
            <span className="text-[10px] font-semibold text-[rgba(199,210,254,0.7)]">{partnerName}</span>
            <span className="text-sm font-bold text-white tabular-nums">{partnerBalance >= 0 ? '+' : ''}{partnerBalance.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-3.5 pt-3 border-t border-white/20">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            aria-hidden
            className="w-8 h-8 rounded-[10px] inline-flex items-center justify-center text-lg"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 text-[13px] font-bold text-white leading-tight">
              <span className="text-[rgba(199,210,254,0.7)] font-semibold mr-1">Lv {level}</span>
              {levelName}
            </p>
            {level < 10 && (
              <p className="m-0 mt-0.5 text-[10px] text-[rgba(199,210,254,0.85)] leading-tight">
                Próximo: {nextPerk}
              </p>
            )}
          </div>
          <div className="text-[11px] font-bold text-white tabular-nums whitespace-nowrap">
            {Math.round(pct)}%
            <span className="text-[rgba(199,210,254,0.7)] font-medium ml-1">
              ({current}/{needed})
            </span>
          </div>
        </div>
        <div className="relative h-1.5 bg-black/25 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${renderedPct}%`,
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              transition: 'width 600ms cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
