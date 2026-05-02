import { useEffect, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'

// Alfabeto espejo del backend (src/backend/src/utils/joinCode.ts). Si cambia
// uno, cambia el otro — no hay shared package todavía.
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const JOIN_CODE_LENGTH = 6

function normalizeJoinCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/[\s-]/g, '')
  if (trimmed.length !== JOIN_CODE_LENGTH) return null
  for (const c of trimmed) {
    if (!JOIN_CODE_ALPHABET.includes(c)) return null
  }
  return trimmed
}

// Estado del preview del joinCode. "idle" = sin código en URL (flujo solo).
type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading'; code: string }
  | { kind: 'ready'; code: string; partnerName: string; coupleId: string }
  | { kind: 'full'; code: string }
  | { kind: 'notFound'; code: string }
  | { kind: 'error'; code: string; message: string }

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [preview, setPreview]   = useState<PreviewState>({ kind: 'idle' })
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail]       = useState('')
  const [pwd, setPwd]           = useState('')
  const [confirm, setConfirm]   = useState('')
  const [accept, setAccept]     = useState(false)
  // v1.6.2 fix S0-2: GDPR Art. 8 — confirmación de mayoría de edad obligatoria.
  const [ageOk, setAgeOk]       = useState(false)
  const [name, setName]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  // Al cargar: si hay ?code= en la URL, intentamos preview. Si falla con 404
  // el usuario puede crear una cuenta normal. Si falla con 409 (full) o red,
  // damos mensaje claro y no dejamos avanzar con ese código.
  useEffect(() => {
    const raw = params.get('code')
    if (!raw) {
      setPreview({ kind: 'idle' })
      return
    }
    const code = normalizeJoinCode(raw)
    if (!code) {
      setPreview({ kind: 'error', code: raw, message: 'El código del enlace no es válido' })
      return
    }
    setPreview({ kind: 'loading', code })
    apiClient.auth
      .previewCouple(code)
      .then((res: any) => {
        if (res?.isFull) {
          setPreview({ kind: 'full', code })
          return
        }
        const partnerName = res?.members?.[0]?.name ?? 'tu pareja'
        setPreview({ kind: 'ready', code, partnerName, coupleId: res.coupleId })
      })
      .catch((e: any) => {
        const msg = typeof e?.message === 'string' ? e.message : ''
        if (msg.includes('no encontrado') || msg.includes('not found')) {
          setPreview({ kind: 'notFound', code })
        } else {
          setPreview({ kind: 'error', code, message: msg || 'No pudimos validar el código' })
        }
      })
  }, [params])

  const hasValidCode = preview.kind === 'ready'
  const step1Valid =
    email.includes('@') &&
    pwd.length >= 8 &&
    confirm === pwd &&
    accept &&
    ageOk

  const step2Valid = name.trim().length >= 2

  function goStep2(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!step1Valid) {
      if (!email.includes('@'))        return setErr('Introduce un email válido')
      if (pwd.length < 8)              return setErr('La contraseña necesita al menos 8 caracteres')
      if (confirm !== pwd)             return setErr('Las contraseñas no coinciden')
      if (!accept)                     return setErr('Debes aceptar los términos')
      if (!ageOk)                      return setErr('Debes confirmar que tienes 18 años o más')
    }
    setStep(2)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!step2Valid) {
      setErr('Tu nombre necesita al menos 2 caracteres')
      return
    }
    setLoading(true); setErr(null)
    try {
      // Dos caminos: con código (registerWithCode, queda vinculado a la
      // pareja existente) o sin código (signup normal — crea pareja solo).
      const data = hasValidCode
        ? await apiClient.auth.registerWithCode({
            email,
            password: pwd,
            name: name.trim(),
            joinCode: preview.code,
            language: 'es',
            ageConfirmed: true,
          })
        : await apiClient.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password: pwd, name: name.trim(), language: 'es', ageConfirmed: true }),
          })

      apiClient.setToken(data.token)
      useAppStore.getState().setUser(data.user)
      useAppStore.setState({ isAuthenticated: true })

      if (hasValidCode) {
        // Bug 2026-04-23: al entrar con joinCode dejábamos couple=null y
        // navegábamos a /home; ProtectedRoute detectaba
        // !couple && !hasCompletedOnboarding y redirigía a /onboarding, donde
        // hasPartner (calculado con couple?.users.length >= 2) era false y
        // aparecía StepPair pidiendo "conectar con pareja" aunque ya estuviese
        // conectado. Cargamos la pareja real antes de navegar → Onboarding
        // detecta hasPartner=true y salta StepPair, o directamente vamos al
        // dashboard si el usuario decide que ya está configurado.
        await useAppStore.getState().loadUserData().catch(() => {})
        navigate('/onboarding')
      } else {
        useAppStore.getState().setCouple(null)
        navigate('/onboarding')
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="bg-surface-base min-h-screen px-6 flex flex-col">
      <div className="flex-1 flex flex-col justify-center py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="w-[72px] h-[72px] rounded-[20px] mx-auto mb-4 bg-gradient-to-br from-brand-amber to-brand-purple flex items-center justify-center text-4xl shadow-xl shadow-brand-purple/40">💕</div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight m-0">Crea tu cuenta</h1>
          <div className="text-[13px] text-text-secondary mt-1">Paso {step} de 2</div>
        </div>

        {preview.kind === 'loading' && (
          <div className="mb-5 rounded-[16px] border border-brd-subtle bg-surface-raised px-4 py-3 text-xs text-text-secondary">
            Validando código <span className="font-mono">{preview.code}</span>…
          </div>
        )}

        {preview.kind === 'ready' && (
          <div className="mb-5 rounded-[16px] border border-brand-purple/40 bg-brand-purple/10 px-4 py-3">
            <div className="text-[13px] font-semibold text-text-primary">
              Te unes al hogar de {preview.partnerName}
            </div>
            <div className="text-xs text-text-secondary mt-1">
              Código: <span className="font-mono">{preview.code}</span>
            </div>
          </div>
        )}

        {preview.kind === 'full' && (
          <div className="mb-5 rounded-[16px] border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">
            Este hogar ya está completo (<span className="font-mono">{preview.code}</span>).
            Pídele a tu pareja que revise su código o crea una cuenta nueva sin código.
          </div>
        )}

        {preview.kind === 'notFound' && (
          <div className="mb-5 rounded-[16px] border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-warning">
            No encontramos el código <span className="font-mono">{preview.code}</span>.
            Puedes crear tu propia cuenta abajo y pedirle a tu pareja el código correcto después.
          </div>
        )}

        {preview.kind === 'error' && (
          <div className="mb-5 rounded-[16px] border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">
            {preview.message}. Puedes crear tu cuenta abajo sin código.
          </div>
        )}

        <div className="flex gap-1 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
        </div>

        {step === 1 && (
          <form onSubmit={goStep2} className="flex flex-col gap-3">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <div className="relative">
              <Input label="Contraseña (mín. 8)" type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="new-password" required />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-2 bottom-2 text-text-secondary text-lg"
                aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPwd}
              >👁</button>
            </div>
            {pwd.length > 0 && pwd.length < 8 && (
              <div className="text-[11px] text-danger -mt-2">
                Faltan {8 - pwd.length} caracteres
              </div>
            )}
            <Input label="Confirmar contraseña" type={showPwd ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
            {confirm.length > 0 && confirm !== pwd && (
              <div className="text-[11px] text-danger -mt-2">
                Las contraseñas no coinciden
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="accent-brand-purple" />
              Acepto los términos y la política de privacidad
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary mt-1" data-testid="age-confirm-label">
              <input
                type="checkbox"
                checked={ageOk}
                onChange={e => setAgeOk(e.target.checked)}
                className="accent-brand-purple"
                data-testid="age-confirm-checkbox"
              />
              Confirmo tener 18 años o más
            </label>
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step1Valid || preview.kind === 'full'} className="mt-2">
              Siguiente →
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input label="¿Cómo te llamas?" type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" required autoFocus />
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step2Valid || loading || preview.kind === 'full'} className="mt-2">
              {loading ? 'Creando…' : hasValidCode ? 'Unirme al hogar' : 'Crear cuenta'}
            </Button>
            <button type="button" onClick={() => { setStep(1); setErr(null) }} className="text-xs text-text-secondary mt-1 self-center">← volver</button>
          </form>
        )}

        <div className="text-center mt-8 text-xs text-text-secondary">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-purple font-bold">Inicia sesión →</Link>
        </div>
      </div>
    </main>
  )
}
