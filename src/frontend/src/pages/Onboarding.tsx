import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { StepWelcome } from './onboarding/StepWelcome'
import { StepProfile } from './onboarding/StepProfile'
import { StepPair } from './onboarding/StepPair'
import { StepRules } from './onboarding/StepRules'
import { StepCategories } from './onboarding/StepCategories'
import { StepDone } from './onboarding/StepDone'

export interface OnboardingData {
  avatarEmoji: string
  avatarColor: string
  pairMethod: 'email' | 'code' | 'solo'
  pairEmail: string
  pairCode: string
  rules: { dailyMult: number; weeklyBonus: number }
  categories: string[]
}

const DEFAULT_CATEGORIES = [
  'cocina',
  'banos',
  'limpieza',
  'compra',
  'logistica',
  'cuidado',
  'mantenimiento',
  'jardineria',
  'mascotas',
]

export default function Onboarding() {
  const nav = useNavigate()
  const location = useLocation()
  const { token } = useParams<{ token?: string }>()
  const { user } = useAppStore()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    avatarEmoji: '🐼',
    avatarColor: '#7c3aed',
    pairMethod: 'code',
    pairEmail: '',
    pairCode: '',
    rules: { dailyMult: 1.5, weeklyBonus: 0.25 },
    categories: [...DEFAULT_CATEGORIES],
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Auto-skip to Profile step if user arrived via invitation link
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const urlToken = token ?? params.get('token') ?? ''
    if (urlToken) {
      setData((prev) => ({ ...prev, pairMethod: 'code', pairCode: urlToken }))
      setStep(1)
    }
  }, [token, location.search])

  // If user already completed onboarding, skip to dashboard
  useEffect(() => {
    if (user?.hasCompletedOnboarding) nav('/dashboard')
  }, [user?.hasCompletedOnboarding, nav])

  function update(patch: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...patch }))
  }

  async function finish() {
    setBusy(true)
    setErr(null)
    try {
      // 1. Persist avatar
      await apiClient.profile.updateMe({
        avatarEmoji: data.avatarEmoji,
        avatarColor: data.avatarColor,
      })

      // 2. Persist rule multipliers
      await apiClient.configuration.update({
        multipliersConfig: {
          dailyMult: data.rules.dailyMult,
          weeklyBonus: data.rules.weeklyBonus,
        },
      })

      // 3. Partner invite (non-blocking if it fails)
      if (data.pairMethod === 'email' && data.pairEmail.includes('@')) {
        try {
          await apiClient.request('/auth/invite-partner', {
            method: 'POST',
            body: JSON.stringify({ inviteeEmail: data.pairEmail }),
          })
        } catch {
          // Non-blocking: user can re-invite later from settings
        }
      }
      // TODO: persist categories when backend supports it

      // 4. Flip hasCompletedOnboarding + create minimal UserProfile
      await apiClient.request('/profile/user', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      // 5. Refresh store so redirect works with fresh flag
      await useAppStore
        .getState()
        .loadUserData()
        .catch(() => {})

      nav('/dashboard')
    } catch (e: any) {
      setErr(e?.message ?? 'Error al guardar tu configuración')
    } finally {
      setBusy(false)
    }
  }

  const next = () => setStep((s) => Math.min(5, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

  const total = 6
  const pct = Math.round(((step + 1) / total) * 100)

  return (
    <main className="bg-surface-base min-h-screen px-6 flex flex-col">
      <div className="flex-1 flex flex-col py-8 max-w-md mx-auto w-full">
        {step > 0 && step < 5 && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={prev}
              className="text-text-secondary text-xl"
              aria-label="Atrás"
            >
              ←
            </button>
            <div className="flex-1 h-1 bg-brd-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-purple to-brand-amber transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-text-tertiary font-semibold">
              {step + 1}/{total}
            </span>
          </div>
        )}

        {step === 0 && <StepWelcome onNext={next} />}
        {step === 1 && (
          <StepProfile
            userName={user?.name ?? 'Tú'}
            data={data}
            onChange={update}
            onNext={next}
          />
        )}
        {step === 2 && <StepPair data={data} onChange={update} onNext={next} />}
        {step === 3 && <StepRules data={data} onChange={update} onNext={next} />}
        {step === 4 && (
          <StepCategories data={data} onChange={update} onNext={next} />
        )}
        {step === 5 && (
          <StepDone
            data={data}
            userName={user?.name ?? 'Tú'}
            onFinish={finish}
            busy={busy}
            err={err}
          />
        )}
      </div>
    </main>
  )
}
