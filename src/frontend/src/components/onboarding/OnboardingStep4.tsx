import { useState } from 'react'
import { Mail, CheckCircle, Loader, Link2, Copy } from 'lucide-react'
import { apiClient } from '../../services/apiClient'

interface Step4Props {
  data: any
  onChange: (data: any, nextStep?: number) => void
  onSubmit: () => void
  isLoading: boolean
}

export default function OnboardingStep4({ data, onChange, onSubmit, isLoading }: Step4Props) {
  const [mode, setMode] = useState<'idle' | 'invite' | 'link'>('idle')
  const [email, setEmail] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkDone, setLinkDone] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      const result = await apiClient.invitations.invitePartner({ inviteeEmail: email.trim() })
      setInviteLink(result.invitation?.invitationLink || null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al crear invitación')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLink = async () => {
    if (!email.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      await apiClient.invitations.linkPartner({ partnerEmail: email.trim() })
      setLinkDone(true)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al vincular pareja')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          ¡Casi listo!
        </h2>
        <p className="text-gray-600">Conecta con tu pareja (opcional, puedes hacerlo después)</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Sin pareja conectada puedes usar la app igualmente. Después puedes vincularte desde Configuración → Tu Pareja.
        </p>
      </div>

      {/* Mode selector */}
      {mode === 'idle' && (
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => { setMode('link'); setActionError(null); setEmail('') }}
            className="w-full flex items-center gap-3 p-4 border-2 border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors text-left"
          >
            <Link2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Mi pareja ya tiene cuenta</p>
              <p className="text-xs text-gray-500">Vincula directamente con su email</p>
            </div>
          </button>
          <button
            onClick={() => { setMode('invite'); setActionError(null); setEmail(''); setInviteLink(null) }}
            className="w-full flex items-center gap-3 p-4 border-2 border-purple-200 rounded-xl hover:bg-purple-50 transition-colors text-left"
          >
            <Mail className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">Invitar a mi pareja</p>
              <p className="text-xs text-gray-500">Genera un enlace para que se registre</p>
            </div>
          </button>
        </div>
      )}

      {/* Link by email */}
      {mode === 'link' && !linkDone && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Email de tu pareja (debe tener cuenta en Matripuntos):</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="pareja@ejemplo.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {actionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setMode('idle'); setActionError(null) }} className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleLink}
              disabled={actionLoading || !email.trim()}
              className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Vincular pareja
            </button>
          </div>
        </div>
      )}

      {/* Link success */}
      {mode === 'link' && linkDone && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-800">✅ ¡Pareja vinculada correctamente!</p>
          <p className="text-xs text-green-700 mt-1">Ya estáis conectados. Podéis empezar a usar Matripuntos juntos.</p>
        </div>
      )}

      {/* Invite flow */}
      {mode === 'invite' && !inviteLink && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Email de tu pareja (le llegará el enlace):</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="pareja@ejemplo.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {actionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setMode('idle'); setActionError(null) }} className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleInvite}
              disabled={actionLoading || !email.trim()}
              className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Generar enlace
            </button>
          </div>
        </div>
      )}

      {/* Invite link result */}
      {mode === 'invite' && inviteLink && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-semibold text-green-800 mb-2">✅ Enlace generado</p>
            <p className="text-xs text-green-700 mb-3">Comparte este enlace con tu pareja. Caduca en 7 días.</p>
            <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-700 flex-1 truncate font-mono">{inviteLink}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000) }}
                className="flex-shrink-0 text-green-700 hover:text-green-900"
              >
                {copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button onClick={() => { setMode('idle'); setInviteLink(null) }} className="w-full py-2.5 px-4 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            Volver
          </button>
        </div>
      )}

      {/* Finish button */}
      <div className="border-t pt-6">
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Completar y Comenzar
            </>
          )}
        </button>
        <p className="text-xs text-gray-500 text-center mt-3">
          También puedes conectar con tu pareja más tarde desde Configuración
        </p>
      </div>
    </div>
  )
}
