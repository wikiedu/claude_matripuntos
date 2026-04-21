import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/v2/primitives/Button'
import { Input } from '../../components/v2/primitives/Input'
import { apiClient } from '../../services/apiClient'
import { useAppStore } from '../../store/useAppStore'

interface Props {
  token: string
}

interface InvitationInfo {
  inviteeEmail: string
  inviterName: string
}

// Single-step join screen for users who arrived via /onboarding/join/:token
// without an existing account. We validate the token to show whose invite it
// is, then collect just enough to create the account (name + password) and
// drop the user straight into the dashboard already paired.
export function StepJoinAccount({ token }: Props) {
  const nav = useNavigate()
  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiClient.auth
      .validateToken(token)
      .then((res: any) => {
        if (cancelled) return
        if (!res?.invitation) {
          setTokenError('Esta invitación no es válida.')
        } else {
          setInfo({
            inviteeEmail: res.invitation.inviteeEmail,
            inviterName: res.invitation.inviterName,
          })
        }
      })
      .catch((err: any) => {
        if (cancelled) return
        const msg = String(err?.message ?? '')
        if (msg.includes('410')) setTokenError('Esta invitación ha caducado o ya se usó.')
        else if (msg.includes('404')) setTokenError('Esta invitación no existe.')
        else setTokenError('No pudimos validar la invitación.')
      })
      .finally(() => !cancelled && setLoadingInfo(false))
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!info) return
    if (name.trim().length < 2) {
      setSubmitError('Escribe tu nombre.')
      return
    }
    if (password.length < 8) {
      setSubmitError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res: any = await apiClient.auth.registerWithInvitation({
        token,
        email: info.inviteeEmail,
        password,
        name: name.trim(),
      })
      // Save the JWT so subsequent calls are authed
      apiClient.setToken(res.token)
      // Skip the rest of the wizard — the inviter already configured the
      // couple. We just mark this user as onboarded and drop them on the
      // dashboard, which is the whole point of the simpler join flow.
      try {
        await apiClient.profile.updateMe({ hasCompletedOnboarding: true })
      } catch {
        // Non-blocking — user can still navigate the app
      }
      await useAppStore.getState().loadUserData().catch(() => {})
      nav('/dashboard')
    } catch (err: any) {
      const msg = String(err?.message ?? '')
      if (msg.includes('Email already registered')) {
        setSubmitError('Ya tienes cuenta con este email. Inicia sesión.')
      } else {
        setSubmitError(err?.message ?? 'No pudimos crear la cuenta.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInfo) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
        Validando invitación…
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-10">
        <div className="text-5xl">😕</div>
        <h1 className="text-xl font-bold text-text-primary">{tokenError}</h1>
        <p className="text-sm text-text-secondary max-w-xs">
          Pídele a tu pareja que te genere un nuevo link desde Ajustes → Tu Pareja.
        </p>
        <Button variant="ghost" onClick={() => nav('/login')}>
          Ir a iniciar sesión
        </Button>
      </div>
    )
  }

  if (!info) return null

  return (
    <div className="flex-1 flex flex-col py-8">
      <div className="text-center mb-8">
        <div className="w-[80px] h-[80px] mx-auto rounded-[24px] bg-gradient-to-br from-brand-amber to-brand-purple flex items-center justify-center text-4xl shadow-2xl shadow-brand-purple/40 mb-4">
          💕
        </div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
          {info.inviterName} te ha invitado
        </h1>
        <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto">
          Crea tu contraseña y entrarás directo a vuestro Matripuntos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Tu email"
          value={info.inviteeEmail}
          readOnly
          className="opacity-70 cursor-not-allowed"
        />
        <Input
          label="Tu nombre"
          placeholder="Cómo quieres que aparezca"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <Input
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
        />

        {submitError && (
          <div className="text-xs text-danger bg-danger/10 rounded-md px-3 py-2">{submitError}</div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={submitting}
        >
          {submitting ? 'Creando cuenta…' : 'Entrar a Matripuntos'}
        </Button>
        <p className="text-[11px] text-text-tertiary text-center">
          Te uniremos a la pareja de {info.inviterName}. La configuración ya está lista.
        </p>
      </form>
    </div>
  )
}
