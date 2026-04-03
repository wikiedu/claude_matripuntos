import { Mail, CheckCircle, Loader } from 'lucide-react'

interface Step4Props {
  data: any
  onChange: (data: any, nextStep?: number) => void
  onSubmit: () => void
  isLoading: boolean
}

export default function OnboardingStep4({ data, onChange, onSubmit, isLoading }: Step4Props) {
  const handleEmailChange = (email: string) => {
    onChange({ partnerEmail: email })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Mail className="w-6 h-6 text-primary" />
          ¡Casi listo!
        </h2>
        <p className="text-gray-600">Invita a tu pareja para que se una (opcional)</p>
      </div>

      {/* Option to skip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 Puedes invitar a tu pareja ahora o hacerlo más tarde desde la app.
        </p>
      </div>

      {/* Email input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email de tu pareja</label>
        <input
          type="email"
          value={data.partnerEmail || ''}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="pareja@ejemplo.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Dejá vacío si no quieres invitar ahora</p>
      </div>

      {/* How it works */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo funciona la invitación?</h3>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">Envían enlace o email</p>
              <p className="text-sm text-gray-600">
                Tu pareja recibirá un email con un enlace exclusivo
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">Se registra y completa su perfil</p>
              <p className="text-sm text-gray-600">
                Si no tiene cuenta, puede crearse una rápidamente
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-900">¡Listo! Empiezan a jugar juntos</p>
              <p className="text-sm text-gray-600">
                Ambos pueden ver el dashboard y negociar puntos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invitation methods */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métodos de invitación</h3>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="invitationMethod"
              value="email"
              checked={!data.invitationMethod || data.invitationMethod === 'email'}
              onChange={() => onChange({ invitationMethod: 'email' })}
              className="w-4 h-4 text-primary mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Por email</p>
              <p className="text-sm text-gray-600">
                Enviaremos un email con el enlace de invitación
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="invitationMethod"
              value="link"
              checked={data.invitationMethod === 'link'}
              onChange={() => onChange({ invitationMethod: 'link' })}
              className="w-4 h-4 text-primary mt-1"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">Copiar enlace</p>
              <p className="text-sm text-gray-600">
                Copia el enlace y comparte de otras formas (WhatsApp, etc)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Action buttons */}
      <div className="border-t pt-6 space-y-3">
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

        {data.partnerEmail && (
          <p className="text-xs text-gray-500 text-center">
            Invitaremos a {data.partnerEmail} después de completar tu perfil
          </p>
        )}

        <p className="text-xs text-gray-500 text-center">
          o puedes hacerlo más tarde desde Configuración
        </p>
      </div>
    </div>
  )
}
