// v2.2.8 — Banner del modo pausa (Claude Design canvas 14).
// Cuando la pareja está en modo vacaciones, sustituye el header del dashboard
// con una banda discreta indicando hasta cuándo. Ofrece reanudar al instante.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'

interface PauseStatus {
  isPaused: boolean
  pausedUntil: string | null
  pausedReason: string | null
}

export function PauseBanner() {
  const qc = useQueryClient()
  const { data } = useQuery<PauseStatus>({
    queryKey: ['couple', 'pause-status'],
    queryFn: () => apiClient.request('/auth/couple/pause-status').catch(async () => {
      // Fallback al endpoint nuevo si el legacy no existe
      return apiClient.request('/couple/pause-status')
    }),
    staleTime: 5 * 60_000,
  })

  const resumeMut = useMutation({
    mutationFn: () => apiClient.request('/couple/resume', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['couple', 'pause-status'] }),
  })

  if (!data?.isPaused || !data.pausedUntil) return null
  const until = new Date(data.pausedUntil)
  const untilLabel = until.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const daysLeft = Math.max(0, Math.ceil((until.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <div
      className="mx-4 mb-3 rounded-xl p-3.5 border"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(168,85,247,0.10))',
        borderColor: 'rgba(99,102,241,0.35)',
      }}
      data-testid="pause-banner"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl flex-shrink-0">🏖️</span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-bold text-text-primary">Modo pausa hasta {untilLabel}</p>
          <p className="m-0 mt-1 text-xs text-text-secondary leading-relaxed">
            {data.pausedReason
              ? <>"{data.pausedReason}"</>
              : <>El conteo está congelado · {daysLeft} {daysLeft === 1 ? 'día' : 'días'} para volver. La racha y los puntos no se tocan; los avisos digest no llegan.</>
            }
          </p>
          <button
            type="button"
            onClick={() => resumeMut.mutate()}
            disabled={resumeMut.isPending}
            className="mt-2 px-3 py-1.5 rounded-md bg-brand-purple text-white text-xs font-bold hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple disabled:opacity-50"
          >
            {resumeMut.isPending ? 'Reanudando…' : 'Reanudar ahora'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PauseBanner
