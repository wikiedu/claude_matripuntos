// v1.6.1 — Banner ámbar en Dashboard que muestra "Tu perfil está al X%".
// Visible solo si:
//  - user.firstLoginAt < 7 días
//  - perfil completion < 80%
//  - no dismissed permanentemente (localStorage)
//
// Tap "Completar →" navega a /settings con focus en sección Perfil.
// × persiste dismiss permanente.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/apiClient'

const DISMISS_KEY = 'matripuntos_profile_banner_dismissed_at'
const BANNER_DAYS = 7

interface Props {
  firstLoginAt: string | Date | null | undefined
}

export function ProfileCompletionBanner({ firstLoginAt }: Props) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && !!localStorage.getItem(DISMISS_KEY),
  )

  const { data } = useQuery({
    queryKey: ['profile-completion'],
    queryFn: () => apiClient.request('/profile/completion') as Promise<{ percent: number; missing: string[] }>,
    enabled: !dismissed && !!firstLoginAt,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(!!localStorage.getItem(DISMISS_KEY))
  }, [])

  if (dismissed) return null
  if (!firstLoginAt) return null
  const ageDays = (Date.now() - new Date(firstLoginAt).getTime()) / 86_400_000
  if (ageDays > BANNER_DAYS) return null
  if (!data) return null
  if (data.percent >= 80) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    setDismissed(true)
  }

  return (
    <div
      data-testid="profile-completion-banner"
      className="mx-4 mb-3 rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 flex items-center gap-3"
    >
      <span className="text-amber-100 text-sm flex-1">
        Tu perfil está al <strong>{data.percent}%</strong> — completar mejora la app para ti.
      </span>
      <button
        type="button"
        onClick={() => navigate('/settings/profile')}
        className="text-sm text-amber-100 underline hover:text-white"
        data-testid="btn-banner-complete"
      >
        Completar →
      </button>
      <button
        type="button"
        data-testid="btn-banner-dismiss"
        onClick={handleDismiss}
        className="text-amber-100/60 hover:text-amber-100 text-xl px-2"
        aria-label="Descartar"
      >
        ×
      </button>
    </div>
  )
}
