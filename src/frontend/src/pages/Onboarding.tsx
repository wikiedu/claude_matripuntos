import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader, ChevronRight, User, Home, Users, Zap } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { apiClient } from '../services/apiClient'
import OnboardingStep1 from '../components/onboarding/OnboardingStep1'
import OnboardingStep2 from '../components/onboarding/OnboardingStep2'
import OnboardingStep3 from '../components/onboarding/OnboardingStep3'
import OnboardingStep4 from '../components/onboarding/OnboardingStep4'
import OnboardingJoinFlow from '../components/onboarding/OnboardingJoinFlow'

type OnboardingStep = 1 | 2 | 3 | 4

interface OnboardingData {
  // User profile
  surname?: string
  dateOfBirth?: string
  weeklyWorkHours?: number
  workMode?: 'presencial' | 'teletrabajo' | 'hibrido'
  taskPreferencesLoves?: string[]
  taskPreferencesDislikes?: string[]

  // Couple profile
  homeType?: 'piso' | 'casa' | 'otro'
  homeSizeM2?: number

  // Family
  children?: Array<{
    name: string
    dateOfBirth: string
    livesWithUser1: boolean
    livesWithUser2: boolean
  }>
  pets?: Array<{
    name: string
    type: string
    quantity: number
  }>

  // Partner invitation
  partnerEmail?: string
  invitationMethod?: 'email' | 'link'
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { token } = useParams<{ token: string }>()
  const { user } = useAppStore()

  // Check if joining via invitation link
  useEffect(() => {
    if (token) {
      // This is a join flow
      return
    }

    // If already authenticated and completed onboarding, go to dashboard
    if (user?.hasCompletedOnboarding) {
      navigate('/dashboard')
    }
  }, [token, user, navigate])

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({})
  const [error, setError] = useState<string | null>(null)

  const handleStepChange = (stepData: Partial<OnboardingData>, nextStep?: OnboardingStep) => {
    setData(prev => ({ ...prev, ...stepData }))
    if (nextStep) {
      setCurrentStep(nextStep)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Save user profile
      if (user?.id) {
        await apiClient.profile.completeUserProfile({
          surname: data.surname,
          dateOfBirth: data.dateOfBirth,
          weeklyWorkHours: data.weeklyWorkHours,
          workMode: data.workMode,
          taskPreferencesLoves: data.taskPreferencesLoves,
          taskPreferencesDislikes: data.taskPreferencesDislikes,
        })
      }

      // Save couple profile
      await apiClient.profile.createCoupleProfile({
        homeType: data.homeType,
        homeSizeM2: data.homeSizeM2,
      })

      // Add children if any
      if (data.children && data.children.length > 0) {
        for (const child of data.children) {
          await apiClient.family.addChild(child)
        }
      }

      // Add pets if any
      if (data.pets && data.pets.length > 0) {
        for (const pet of data.pets) {
          await apiClient.family.addPet(pet)
        }
      }

      // If partner email provided, send invitation
      if (data.partnerEmail) {
        await apiClient.invitations.invitePartner({
          inviteeEmail: data.partnerEmail,
        })
      }

      navigate('/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding'
      setError(message)
      console.error('Onboarding error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // If joining via invitation link
  if (token) {
    return <OnboardingJoinFlow token={token} />
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
          <p className="text-gray-600">Vamos a completar tu perfil</p>
        </div>

        {/* Progress bar */}
        <div className="bg-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Paso {currentStep} de 4</span>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2 text-gray-600">Guardando datos...</span>
          </div>
        ) : (
          <>
            {currentStep === 1 && (
              <OnboardingStep1
                data={data}
                onChange={handleStepChange}
              />
            )}
            {currentStep === 2 && (
              <OnboardingStep2
                data={data}
                onChange={handleStepChange}
              />
            )}
            {currentStep === 3 && (
              <OnboardingStep3
                data={data}
                onChange={handleStepChange}
              />
            )}
            {currentStep === 4 && (
              <OnboardingStep4
                data={data}
                onChange={handleStepChange}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            )}
          </>
        )}

        {/* Navigation buttons */}
        {!isLoading && currentStep > 1 && (
          <div className="mt-8 flex gap-4">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as OnboardingStep)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Atrás
            </button>
            {currentStep < 4 && (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1) as OnboardingStep)}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
              >
                Siguiente <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
