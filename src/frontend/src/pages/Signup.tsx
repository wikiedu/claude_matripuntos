import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'

export default function Signup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail]       = useState('')
  const [pwd, setPwd]           = useState('')
  const [confirm, setConfirm]   = useState('')
  const [accept, setAccept]     = useState(false)
  const [name, setName]         = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  const step1Valid =
    email.includes('@') &&
    pwd.length >= 6 &&
    confirm === pwd &&
    accept

  const step2Valid = name.trim().length >= 2

  function goStep2(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!step1Valid) {
      if (!email.includes('@'))        return setErr('Introduce un email válido')
      if (pwd.length < 6)              return setErr('La contraseña necesita al menos 6 caracteres')
      if (confirm !== pwd)             return setErr('Las contraseñas no coinciden')
      if (!accept)                     return setErr('Debes aceptar los términos')
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
      const data = await apiClient.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password: pwd, name: name.trim(), language: 'es' }),
      })
      apiClient.setToken(data.token)
      useAppStore.getState().setUser(data.user)
      useAppStore.getState().setCouple(null)
      useAppStore.setState({ isAuthenticated: true })
      navigate('/onboarding')
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

        <div className="flex gap-1 mb-6">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-brand-purple' : 'bg-brd-subtle'}`} />
        </div>

        {step === 1 && (
          <form onSubmit={goStep2} className="flex flex-col gap-3">
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <div className="relative">
              <Input label="Contraseña (mín. 6)" type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="new-password" required />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 bottom-2 text-text-secondary text-lg" aria-label="Mostrar contraseña">👁</button>
            </div>
            <Input label="Confirmar contraseña" type={showPwd ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required />
            <label className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="accent-brand-purple" />
              Acepto los términos y la política de privacidad
            </label>
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step1Valid} className="mt-2">
              Siguiente →
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input label="¿Cómo te llamas?" type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" required autoFocus />
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={!step2Valid || loading} className="mt-2">
              {loading ? 'Creando…' : 'Crear cuenta'}
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
