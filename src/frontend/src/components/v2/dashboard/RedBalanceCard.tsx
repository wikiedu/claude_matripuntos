// v2.2.6 — Card escalada para "saldo en rojo crónico" (Claude Design canvas 09).
//
// Tres severities:
//  - soft (3 días): "tres días flojos · sin drama, aquí 3 cosas rápidas"
//  - warn (7 días): "buen momento para hablarlo · chips emocionales"
//  - crit (14+ días): "¿pausamos el conteo?"
//
// Privacidad: solo se renderiza para EL user en rojo (privacidad asimétrica).
// El partner NO ve nada de esto. Esa decisión la implementamos en el endpoint
// devolviendo `status` solo desde la perspectiva de quien llama.

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'

type Severity = 'soft' | 'warn' | 'crit'

interface Status {
  daysInRed: number
  severity: Severity | null
  myDailyDelta: number[]
  partnerName: string | null
}

const SEVERITY_STYLES: Record<Severity, { bg: string; border: string; emoji: string }> = {
  soft: {
    bg: 'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(245,158,11,0.05))',
    border: 'rgba(251,191,36,0.30)',
    emoji: '💡',
  },
  warn: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.10))',
    border: 'rgba(245,158,11,0.40)',
    emoji: '🟠',
  },
  crit: {
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.20), rgba(168,85,247,0.10))',
    border: 'rgba(239,68,68,0.45)',
    emoji: '⏸️',
  },
}

export function RedBalanceCard() {
  const { data } = useQuery<{ status: Status }>({
    queryKey: ['red-balance'],
    queryFn: () => apiClient.request('/points/red-balance'),
    staleTime: 10 * 60_000,
  })

  const status = data?.status
  if (!status || !status.severity) return null
  const sty = SEVERITY_STYLES[status.severity]
  const partnerName = status.partnerName ?? 'tu pareja'

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-3.5 border"
      style={{ background: sty.bg, borderColor: sty.border }}
      data-testid={`red-balance-${status.severity}`}
    >
      {status.severity === 'soft' && (
        <>
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="text-xl flex-shrink-0">{sty.emoji}</span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-text-primary">
                Has tenido {status.daysInRed} días flojos
              </p>
              <p className="m-0 mt-1 text-xs text-text-secondary leading-relaxed">
                Sin drama — pasa. Si quieres recuperar, mira tareas rápidas en la lista de hoy.
              </p>
            </div>
          </div>
        </>
      )}

      {status.severity === 'warn' && (
        <>
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="text-xl flex-shrink-0">{sty.emoji}</span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-text-primary">
                Llevas una semana en rojo
              </p>
              <p className="m-0 mt-1 text-xs text-text-secondary leading-relaxed">
                El reparto está descompensado. Es buen momento para hablarlo con {partnerName} — antes de que escale. ¿Hay algo que esté pasando?
              </p>
            </div>
          </div>
        </>
      )}

      {status.severity === 'crit' && (
        <>
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="text-xl flex-shrink-0">{sty.emoji}</span>
            <div className="min-w-0">
              <p className="m-0 text-sm font-bold text-text-primary">
                {status.daysInRed} días en rojo
              </p>
              <p className="m-0 mt-1 text-xs text-text-secondary leading-relaxed">
                El sistema funciona cuando los dos jugáis. Si uno está en mal momento, los puntos solo añaden ruido. Considera <strong className="text-text-primary">pausar el conteo</strong> 1-2 semanas — el saldo se congela, no se borra.
              </p>
              <p className="m-0 mt-2 text-[11px] text-text-tertiary italic">
                Esta card solo la ves tú. {partnerName} no recibe ninguna alerta.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default RedBalanceCard
