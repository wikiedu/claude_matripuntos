// v2.4 audit 04 S1-4 — flujo "olvidé mi contraseña" parte 2: aplicar
// la nueva contraseña con el token recibido por email.

import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { apiClient } from '../services/apiClient'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const tokenFromUrl = params.get('token') ?? ''

  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl)
  }, [tokenFromUrl])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (password.length < 8) {
      setErr('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== password2) {
      setErr('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await apiClient.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), newPassword: password }),
      })
      setDone(true)
      // Redirige a login tras 3s para que pueda iniciar sesión.
      setTimeout(() => nav('/login'), 3000)
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 max-w-[500px] mx-auto">
      <div className="w-full">
        <h1 className="text-2xl font-extrabold text-text-primary text-center mb-1">Nueva contraseña</h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          Crea una contraseña nueva de al menos 8 caracteres.
        </p>

        {done ? (
          <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-sm text-text-primary">
            <p className="font-semibold mb-1">Contraseña actualizada ✓</p>
            <p className="text-text-secondary">Te llevamos al login…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {!tokenFromUrl && (
              <Input
                placeholder="Token recibido por email"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            )}
            <Input
              type="password"
              placeholder="Nueva contraseña (≥8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Repite la contraseña"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button
              variant="primary"
              fullWidth
              size="lg"
              type="submit"
              disabled={loading || !token || !password || !password2}
            >
              {loading ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
            <Link to="/login" className="text-xs text-brand-purple text-center hover:underline mt-1">
              ← Volver al login
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
