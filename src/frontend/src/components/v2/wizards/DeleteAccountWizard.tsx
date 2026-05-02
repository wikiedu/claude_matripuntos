// v1.6.1 — Wizard de borrado de cuenta de 3 pasos:
//  1. Educativo (qué pasa con tu pareja, irreversible)
//  2. Verificar identidad con password + enviar código
//  3. Confirmar con código de 6 dígitos + escribir "ELIMINAR"
//
// Backend: POST /api/account/delete-request → email con code (consola dev)
//          POST /api/account/delete con password + code → anonimiza histórico.

import { useState } from 'react'
import { apiClient } from '../../../services/apiClient'

interface Props { isOpen: boolean; onClose: () => void; onDeleted: () => void }

export function DeleteAccountWizard({ isOpen, onClose, onDeleted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const reset = () => {
    setStep(1); setPassword(''); setCode(''); setConfirm(''); setError(null); setLoading(false)
  }

  const handleClose = () => { reset(); onClose() }

  const requestCode = async () => {
    setLoading(true); setError(null)
    try {
      const data: any = await apiClient.request('/account/delete-request', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      if (data?.codeViaConsole && data?.code) {
        // Modo dev: el backend devuelve el code para que lo veas en consola.
        console.log('[DELETE-CODE]', data.code)
      }
      setStep(3)
    } catch (e: any) {
      setError(e?.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (confirm !== 'ELIMINAR') {
      setError('Debes escribir ELIMINAR en mayúsculas')
      return
    }
    setLoading(true); setError(null)
    try {
      await apiClient.request('/account/delete', {
        method: 'POST',
        body: JSON.stringify({ password, code }),
      })
      onDeleted()
    } catch (e: any) {
      setError(e?.message ?? 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <div
      data-testid="delete-account-wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-label="Eliminar cuenta"
    >
      <div className="bg-[#1a1035] rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-white mb-3">Eliminar cuenta</h2>
            <div className="text-sm text-white/80 space-y-2 mb-4">
              <p>Esto eliminará tus datos personales (perfil, mood histórico, notificaciones).</p>
              <p>Tu pareja conservará el histórico de la etapa compartida marcado como "Usuario eliminado".</p>
              <p>Tras 30 días en papelera, el borrado es definitivo. <strong>No es reversible</strong>.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-white/10 text-white">Cancelar</button>
              <button data-testid="btn-step1-continue" onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600">
                Continuar
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white mb-3">Verifica tu identidad</h2>
            <p className="text-sm text-white/70 mb-3">
              Te enviaremos un código de 6 dígitos para confirmar.
            </p>
            <input
              type="password" placeholder="Tu contraseña" value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white mb-3 border border-white/20"
              data-testid="input-password" autoFocus
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg bg-white/10 text-white">Atrás</button>
              <button
                disabled={loading || !password}
                data-testid="btn-step2-send-code"
                onClick={requestCode}
                className="px-4 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50"
              >
                {loading ? 'Enviando…' : 'Enviar código'}
              </button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-white mb-3">Confirmación final</h2>
            <p className="text-xs text-white/70 mb-2">
              Te hemos enviado un código por email (revisa también la consola en dev).
            </p>
            <input
              placeholder="Código de 6 dígitos" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white mb-2 font-mono tracking-widest border border-white/20"
              data-testid="input-code" autoFocus
            />
            <p className="text-xs text-white/60 mb-1">Escribe ELIMINAR para confirmar:</p>
            <input
              placeholder="ELIMINAR" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 text-white mb-3 border border-white/20"
              data-testid="input-confirm"
            />
            {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-white/10 text-white">Atrás</button>
              <button
                disabled={loading || code.length !== 6 || confirm !== 'ELIMINAR'}
                data-testid="btn-step3-confirm"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50 hover:bg-red-700"
              >
                {loading ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
