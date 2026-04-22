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
import { StepJoinAccount } from './onboarding/StepJoinAccount'

export interface OnboardingData {
  avatarEmoji: string
  avatarColor: string
  pairMethod: 'email' | 'code' | 'solo'
  pairEmail: string
  pairCode: string
  rules: { nightMult: number; weeklyBonus: number }
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

type StepKey = 'welcome' | 'profile' | 'pair' | 'rules' | 'categories' | 'done'

export default function Onboarding() {
  const nav = useNavigate()
  const location = useLocation()
  const { token } = useParams<{ token?: string }>()
  const { user, couple } = useAppStore()

  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    avatarEmoji: '🐼',
    avatarColor: '#7c3aed',
    pairMethod: 'code',
    pairEmail: '',
    pairCode: '',
    rules: { nightMult: 1.5, weeklyBonus: 0.25 },
    categories: [...DEFAULT_CATEGORIES],
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Resolve the invitation token from /onboarding/join/:token or ?token=...
  const params = new URLSearchParams(location.search)
  const urlToken = token ?? params.get('token') ?? ''

  // If we have a token but no logged-in user, this is a fresh invitee opening
  // the link from their inbox — they don't have an account yet. Show the
  // single-step join screen instead of dropping them into the middle of the
  // wizard (which used to land on StepRules and explode on submit because
  // every protected POST would 401).
  const showJoinAccountFlow = urlToken && !user

  // Bug 2026-04-22: si el invitee ya entró por link y está vinculado a la
  // pareja, el wizard le seguía pidiendo "Conecta con tu pareja" en el paso
  // 3/6 — redundante y confuso. Cuando ya hay pareja (2 users), construimos
  // el wizard sin StepPair (5 pasos en vez de 6). Mismo flujo para cuentas
  // nuevas en solitario que luego se emparejan fuera del onboarding.
  const hasPartner = (couple?.users?.length ?? 0) >= 2
  const steps: StepKey[] = hasPartner
    ? ['welcome', 'profile', 'rules', 'categories', 'done']
    : ['welcome', 'profile', 'pair', 'rules', 'categories', 'done']
  const total = steps.length
  const currentKey = steps[Math.min(step, total - 1)]

  // If a logged-in user opens the invite link, just pre-fill the pair code
  // and skip straight to Rules — they already have an account.
  useEffect(() => {
    if (urlToken && user) {
      setData((prev) => ({ ...prev, pairMethod: 'code', pairCode: urlToken }))
      const rulesIdx = steps.indexOf('rules')
      if (rulesIdx >= 0) setStep(rulesIdx)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken, user])

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
      // 1. Create UserProfile + flip hasCompletedOnboarding (must go first — PUT /profile/me needs the row to exist)
      await apiClient.request('/profile/user', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      // 2. Persist avatar
      await apiClient.profile.updateMe({
        avatarEmoji: data.avatarEmoji,
        avatarColor: data.avatarColor,
      })

      // 3. Persist rule multipliers
      await apiClient.configuration.update({
        multipliersConfig: {
          nightMult: data.rules.nightMult,
          weekendBonus: data.rules.weeklyBonus,
        },
      })

      // 4. Partner invite (non-blocking if it fails)
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

  const next = () => setStep((s) => Math.min(total - 1, s + 1))
  const prev = () => setStep((s) => Math.max(0, s - 1))

  const pct = Math.round(((step + 1) / total) * 100)
  const isWelcomeStep = currentKey === 'welcome'
  const isDoneStep = currentKey === 'done'

  // Invitee landing — pre-account. Render the single-step join screen and
  // bypass the wizard entirely.
  if (showJoinAccountFlow) {
    return (
      <main className="bg-surface-base min-h-screen px-6 flex flex-col">
        <div className="flex-1 flex flex-col py-8 max-w-md mx-auto w-full">
          <StepJoinAccount token={urlToken} />
        </div>
      </main>
    )
  }

  return (
    <main className="bg-surface-base min-h-screen px-6 flex flex-col">
      <div className="flex-1 flex flex-col py-8 max-w-md mx-auto w-full">
        {!isWelcomeStep && !isDoneStep && (
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

        {currentKey === 'welcome' && <StepWelcome onNext={next} />}
        {currentKey === 'profile' && (
          <StepProfile
            userName={user?.name ?? 'Tú'}
            data={data}
            onChange={update}
            onNext={next}
          />
        )}
        {currentKey === 'pair' && <StepPair data={data} onChange={update} onNext={next} />}
        {currentKey === 'rules' && <StepRules data={data} onChange={update} onNext={next} />}
        {currentKey === 'categories' && (
          <StepCategories data={data} onChange={update} onNext={next} />
        )}
        {currentKey === 'done' && (
          <StepDone
            data={data}
            userName={user?.name ?? 'Tú'}
            pairMethod={hasPartner ? 'code' : data.pairMethod}
            inviteeEmail={data.pairEmail}
            onFinish={finish}
            busy={busy}
            err={err}
          />
        )}
      </div>
    </main>
  )
}
