// v2.4 audit 04 S1-4 — flujo "olvidé mi contraseña" parte 1: solicitar email.
// El backend (POST /api/auth/forgot-password) devuelve siempre 200 para
// no revelar qué emails están registrados.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { apiClient } from '../services/apiClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null)
    try {
      await apiClient.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 max-w-[500px] mx-auto">
      <div className="w-full">
        <h1 className="text-2xl font-extrabold text-text-primary text-center mb-1">¿Olvidaste tu contraseña?</h1>
        <p className="text-sm text-text-secondary text-center mb-6">
          Te mandamos un enlace para crear una nueva.
        </p>

        {sent ? (
          <div className="rounded-xl bg-success/10 border border-success/30 p-4 text-sm text-text-primary">
            <p className="font-semibold mb-1">Solicitud recibida</p>
            <p className="text-text-secondary">
              Si tu email está registrado, recibirás un enlace en unos minutos.
              Revisa tu bandeja (y spam). El enlace caduca en 1 hora.
            </p>
            <div className="mt-4">
              <Link to="/login" className="text-brand-purple hover:underline text-sm">
                ← Volver al login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
            {err && <div className="text-xs text-danger">{err}</div>}
            <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading || !email}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
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
