import { useState } from 'react'
import { BottomSheet } from '../primitives/BottomSheet'
import { Button } from '../primitives/Button'
import { Input } from '../primitives/Input'
import { apiClient } from '../../../services/apiClient'
import { useAppStore } from '../../../store/useAppStore'

interface Props {
  open: boolean
  onClose: () => void
  source: 'analytics_advanced_overlay' | 'settings_premium_cta' | 'onboarding'
}

export function PremiumInterestModal({ open, onClose, source }: Props) {
  const { user } = useAppStore()
  const [email, setEmail]     = useState(user?.email ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  async function submit() {
    setLoading(true); setErr(null)
    try {
      await apiClient.request('/premium/interest', {
        method: 'POST',
        body: JSON.stringify({ email, source }),
      })
      setDone(true)
    } catch (e: any) {
      if (e?.message?.includes('409') || e?.response?.status === 409) setDone(true)  // Ya estaba apuntado, es éxito silencioso
      else setErr(e?.response?.data?.error ?? e?.message ?? 'Error')
    } finally { setLoading(false) }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-grad-cta mx-auto mb-2 flex items-center justify-center text-3xl">👑</div>
        <h3 className="text-lg font-extrabold text-text-primary mb-1">Desbloquea Premium · Próximamente</h3>
        <p className="text-xs text-text-secondary mb-3">Matripuntos Premium está en camino. Queremos lanzarlo bien.</p>
        <ul className="text-left text-xs text-text-primary my-3 space-y-1">
          <li>✅ Rondas de negociación ilimitadas</li>
          <li>✅ Analítica avanzada completa</li>
          <li>✅ Histórico sin límite</li>
          <li>✅ Badge 👑 en tu perfil</li>
        </ul>
        {done ? (
          <div className="text-sm font-bold text-success my-4">¡Listo! Te avisaremos 💕</div>
        ) : (
          <>
            <div className="text-xs text-text-secondary mb-1.5">Te avisamos cuando esté disponible</div>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
            {err && <div className="text-[11px] text-danger mt-1">{err}</div>}
            <Button variant="primary" fullWidth onClick={submit} disabled={!email.includes('@') || loading} className="mt-3">
              {loading ? 'Enviando…' : 'Avísame'}
            </Button>
            <p className="text-[10px] text-text-tertiary mt-2">ℹ Sin compromiso · Sin spam</p>
          </>
        )}
      </div>
    </BottomSheet>
  )
}
