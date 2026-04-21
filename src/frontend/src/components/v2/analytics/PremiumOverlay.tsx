import { Button } from '../primitives/Button'

interface Props {
  onOpenInterest: () => void
  onClose?: () => void
}

export function PremiumOverlay({ onOpenInterest, onClose }: Props) {
  return (
    <div
      className="absolute inset-0 flex items-start justify-center pt-20 bg-gradient-to-b from-[rgba(15,10,30,0.2)] via-[rgba(15,10,30,0.85)] to-[rgba(15,10,30,0.95)] pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="relative mx-4 px-5 py-5 bg-grad-premium border border-brand-amber/50 rounded-xl text-center shadow-xl shadow-brand-amber/25 max-w-[340px]"
        onClick={e => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-sm leading-none transition-colors"
          >
            ✕
          </button>
        )}
        <div className="text-4xl mb-1.5">✨</div>
        <div className="text-lg font-extrabold text-white tracking-tight">Desbloquea Analítica Avanzada</div>
        <div className="text-xs text-[#c4b5fd] mt-1.5 leading-relaxed">
          Heatmaps, tasas de cumplimiento, índice de equidad histórico y comparativas mensuales con insights.
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center my-3.5">
          {['🗓️ Heatmap', '🎯 Cumplimiento', '⚖️ Equidad', '🏅 Top cat.', '💬 Insights'].map(x => (
            <span key={x} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-brand-amber/15 text-[#fbbf24] border border-brand-amber/30">
              {x}
            </span>
          ))}
        </div>
        <Button variant="primary" fullWidth onClick={onOpenInterest}>
          👑 Hazte Premium · 3,99€/mes
        </Button>
        <div className="text-[10px] text-text-secondary mt-2">Primera semana gratis · Cancela cuando quieras</div>
      </div>
    </div>
  )
}
