import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader, CheckCircle, Mail } from 'lucide-react'
import { apiClient } from '../../services/apiClient'

interface OnboardingJoinFlowProps {
  token: string
}

export default function OnboardingJoinFlow({ token }: OnboardingJoinFlowProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'validate' | 'register' | 'complete'>('validate')
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })

  const [profileData, setProfileData] = useState({
    surname: '',
    dateOfBirth: '',
  })

  // Validate invitation token on mount
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        setIsLoading(true)
        const response = await apiClient.invitations.validateToken(token)

        if (response.valid) {
          setInvitation(response.invitation)
          setFormData(prev => ({ ...prev, email: response.invitation.inviteeEmail }))
          setStep('register')
        } else {
          setError('Invitación inválida o expirada')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error validating invitation')
      } finally {
        setIsLoading(false)
      }
    }

    validateInvitation()
  }, [token])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.password || formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Register with invitation
      await apiClient.invitations.registerWithInvitation({
        token,
        email: formData.email,
        password: formData.password,
        name: formData.name,
      })

      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registering')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsLoading(true)

      // Complete profile
      await apiClient.profile.completeUserProfile({
        surname: profileData.surname,
        dateOfBirth: profileData.dateOfBirth,
      })

      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error completing profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Matripuntos</h1>
          </div>
          <p className="text-gray-600">
            {invitation?.inviterName && (
              <>
                <Mail className="w-4 h-4 inline mr-1" />
                {invitation.inviterName} te invitó a unirte
              </>
            )}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isLoading && step === 'validate' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-gray-600">Validando invitación...</p>
          </div>
        ) : step === 'register' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ¡Bienvenido a Matripuntos!
            </h2>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 inline animate-spin mr-2" />
                    Registrando...
                  </>
                ) : (
                  'Crear cuenta'
                )}
              </button>
            </form>
          </div>
        ) : step === 'complete' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Completa tu perfil</h2>
            <p className="text-gray-600 mb-6">Unos últimos datos para terminar...</p>

            <form onSubmit={handleCompleteProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                <input
                  type="text"
                  value={profileData.surname}
                  onChange={(e) => setProfileData({ ...profileData, surname: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tu apellido (opcional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 inline animate-spin mr-2" />
                    Completando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Ir al Dashboard
                  </>
                )}
              </button>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  )
}
