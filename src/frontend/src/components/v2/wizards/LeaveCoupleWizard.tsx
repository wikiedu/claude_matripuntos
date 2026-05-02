// v1.6.1 — Wizard de salir de pareja en 2 pasos:
//  1. Educativo (ambos quedáis sin couple, podéis ver "Mi etapa con [nombre]")
//  2. Confirmar con password
//
// Backend: POST /api/couple/leave → dissolveCouple + reasigna users a couples nuevos.
// Tras éxito, frontend debe re-loguear o pedir /auth/me para refrescar token con nuevo coupleId.

import { useState } from 'react'
import { apiClient } from '../../../services/apiClient'

interface Props { isOpen: boolean; onClose: () => void; onLeft: () => void; partnerName?: string }

export function LeaveCoupleWizard({ isOpen, onClose, onLeft, partnerName }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setStep(1); setPassword(''); setError(null); setLoading(false)
  }
  const handleClose = () => { reset(); onClose() }

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await apiClient.request('/couple/leave', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      onLeft()
    } catch (e: any) {
      setError(e?.message ?? 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div
      data-testid="leave-couple-wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-label="Salir de la pareja"
    >
      <div className="bg-[#1a1035] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-white mb-3">Salir de la pareja</h2>
            <div className="text-sm text-white/80 space-y-2 mb-4">
              <p>Ambos quedaréis sin pareja activa.</p>
              <p>Podréis ver <strong>"Mi etapa con {partnerName ?? 'tu pareja'}"</strong> como histórico read-only en Settings.</p>
              <p>Podréis emparejaros con otra persona después.</p>
              <p className="text-amber-300/80">Esta acción se aplica a ambos miembros del couple.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-white/10 text-white">Cancelar</button>
              <button data-testid="btn-step1-continue" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium">
                Continuar
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white mb-3">Confirma tu identidad</h2>
            <input
              type="password" placeholder="Tu contraseña" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white mb-3 border border-white/20"
              data-testid="input-password" autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg bg-white/10 text-white">Atrás</button>
              <button
                disabled={loading || !password}
                data-testid="btn-step2-confirm"
                onClick={submit}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-50 hover:bg-amber-700"
              >
                {loading ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
