// v2.2.10 — Teaser arriba de Analytics cuando aún no hay datos suficientes
// (Claude Design canvas 11 estado 4). En lugar de mostrar gráficos vacíos
// con cero, mostramos un mensaje motivador con barra de progreso al "día 7".

import { useAppStore } from '../../../store/useAppStore'

const DAYS_TO_UNLOCK = 7

export function AnalyticsTeaser() {
  const couple = useAppStore((s) => s.couple)
  const createdAtRaw = (couple as any)?.createdAt
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null
  if (!createdAt || isNaN(createdAt.getTime())) return null

  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysSinceCreation >= DAYS_TO_UNLOCK) return null

  const daysLeft = DAYS_TO_UNLOCK - daysSinceCreation
  const pct = Math.round((daysSinceCreation / DAYS_TO_UNLOCK) * 100)

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-4 border text-center"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(99,102,241,0.08))',
        borderColor: 'rgba(168,85,247,0.30)',
      }}
    >
      <div className="text-3xl mb-1.5">📊</div>
      <p className="m-0 text-sm font-bold text-text-primary">
        {daysSinceCreation} {daysSinceCreation === 1 ? 'día' : 'días'} registrados
      </p>
      <p className="m-0 mt-1 text-[11px] text-text-secondary leading-relaxed">
        Los gráficos se desbloquean en <strong className="text-brand-amber">{daysLeft} {daysLeft === 1 ? 'día' : 'días'} más</strong> · necesitamos 1 semana para que tengan sentido.
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-black/25 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
            transition: 'width 600ms cubic-bezier(0.22, 0.61, 0.36, 1)',
          }}
        />
      </div>
      <p className="m-0 mt-1 text-[10px] text-text-tertiary font-bold">{daysSinceCreation}/{DAYS_TO_UNLOCK} días</p>
    </div>
  )
}

export default AnalyticsTeaser
