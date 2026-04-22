import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'

export default function Login() {
  const nav = useNavigate()
  const { login, demoLogin } = useAppStore()
  const [email, setEmail]     = useState('')
  const [pwd, setPwd]         = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoAvailable, setDemoAvailable] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  // Probe backend for demo availability. Silently hides the CTA when the
  // endpoint is 404 or DEMO_MODE_ENABLED=false — so local dev and prod can
  // diverge without UI churn.
  useEffect(() => {
    let cancelled = false
    apiClient.auth
      .demoAvailable()
      .then((r: any) => { if (!cancelled) setDemoAvailable(!!r?.available) })
      .catch(() => { /* demo disabled or endpoint not deployed yet */ })
    return () => { cancelled = true }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      await login(email, pwd)
      const user = useAppStore.getState().user
      nav(user?.hasCompletedOnboarding ? '/dashboard' : '/onboarding')
    } catch (e: any) {
      setErr(e?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  async function startDemo() {
    setDemoLoading(true); setErr(null)
    try {
      await demoLogin()
      nav('/dashboard')
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo abrir el demo')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <main className="bg-surface-base min-h-screen px-6 flex flex-col">
      <div className="flex-1 flex flex-col justify-center py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-[20px] mx-auto mb-4 bg-gradient-to-br from-brand-amber to-brand-purple flex items-center justify-center text-4xl shadow-xl shadow-brand-purple/40">💕</div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight m-0">Matripuntos</h1>
          <div className="text-[13px] text-text-secondary mt-1">Equilibrio en pareja</div>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          <div className="relative">
            <Input label="Contraseña" type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoComplete="current-password" required />
            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 bottom-2 text-text-secondary text-lg" aria-label="Mostrar contraseña">👁</button>
          </div>
          {err && <div className="text-xs text-danger">{err}</div>}
          <button type="button" className="text-[11px] text-brand-purple self-end">olvidé mi contraseña →</button>
          <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <div className="flex items-center gap-3 my-5 text-xs text-text-tertiary">
          <div className="flex-1 h-px bg-brd-subtle" />o<div className="flex-1 h-px bg-brd-subtle" />
        </div>
        <Button variant="outline" fullWidth disabled title="Disponible pronto">Continuar con Google</Button>
        <div className="h-2" />
        <Button variant="outline" fullWidth disabled title="Disponible pronto">Continuar con Apple</Button>
        {demoAvailable && (
          <>
            <div className="h-2" />
            <Button
              variant="ghost"
              fullWidth
              onClick={startDemo}
              disabled={demoLoading || loading}
            >
              {demoLoading ? 'Abriendo demo…' : '✨ Probar con datos de ejemplo'}
            </Button>
          </>
        )}
        <div className="text-center mt-6 text-xs text-text-secondary">
          ¿Primera vez aquí? <Link to="/signup" className="text-brand-purple font-bold">Crea tu cuenta →</Link>
        </div>
      </div>
    </main>
  )
}
