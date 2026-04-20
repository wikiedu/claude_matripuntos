import { Card } from '../../primitives/Card'

interface Props { score: number; delta?: number }

export function EquityGaugeChart({ score, delta }: Props) {
  const clamped = Math.max(0, Math.min(100, score))
  const label = clamped >= 85 ? 'Excelente' : clamped >= 70 ? 'Bien' : clamped >= 50 ? 'Mejorable' : 'Desigual'
  const circumference = 314
  return (
    <div className="mx-4 mb-3.5">
      <div className="mb-2.5">
        <div className="text-sm font-bold text-text-primary">⚖️ Índice de equidad</div>
        <div className="text-[11px] text-text-secondary mt-0.5">0 = desigual · 100 = perfecto</div>
      </div>
      <Card className="text-center">
        <div className="relative w-[120px] h-[120px] mx-auto">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke="url(#eqgrad)"
              strokeWidth="10"
              strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="eqgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[28px] font-extrabold text-text-primary leading-none tabular-nums">{clamped}</div>
            <div className="text-[10px] text-text-secondary mt-0.5">{label}</div>
          </div>
        </div>
        {typeof delta === 'number' && (
          <div className={`mt-2.5 text-[11px] font-semibold ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
            {delta >= 0 ? '↗ +' : '↘ '}{delta} puntos vs mes anterior
          </div>
        )}
      </Card>
    </div>
  )
}
