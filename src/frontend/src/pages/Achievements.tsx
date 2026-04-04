import { useQuery, useMutation } from '@tanstack/react-query'
import { Award, Loader } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { AchievementCard } from '../components/AchievementCard'
import { CoupleScoreGauge } from '../components/CoupleScoreGauge'

interface Achievement {
  id: string
  name: string
  description?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  pointsReward: string
  isUnlocked?: boolean
  unlockedAt?: string | null
  progress?: { current: number; target: number; percentage: number } | null
}

interface CoupleScore {
  equilibrium: number
  activity: number
  consensus: number
  constancy: number
}

export default function Achievements() {
  const { data: achievementsData, isLoading: achievementsLoading, refetch } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const response = await apiClient.request('/achievements')
      return response
    }
  })

  const { data: scoreData } = useQuery({
    queryKey: ['couple-score'],
    queryFn: async () => {
      const response = await apiClient.request('/achievements/couple-score')
      return response
    }
  })

  const checkMutation = useMutation({
    mutationFn: async () => {
      return apiClient.request('/achievements/check', { method: 'POST' })
    },
    onSuccess: () => {
      refetch()
    }
  })

  if (achievementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  const achievements = (achievementsData?.achievements || []) as Achievement[]
  const score = scoreData?.coupleScore as CoupleScore | undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Mis Logros</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {score && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Score Semanal</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <CoupleScoreGauge label="Equilibrio" value={score.equilibrium} color="emerald" />
              <CoupleScoreGauge label="Actividad" value={score.activity} color="indigo" />
              <CoupleScoreGauge label="Consenso" value={score.consensus} color="violet" />
              <CoupleScoreGauge label="Constancia" value={score.constancy} color="amber" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {achievements.map((ach: Achievement) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {checkMutation.isPending ? 'Verificando...' : 'Verificar mis logros'}
          </button>
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            Has desbloqueado <span className="font-bold">{achievementsData?.stats?.unlocked || 0}</span> de{' '}
            <span className="font-bold">{achievementsData?.stats?.total || 0}</span> logros
          </p>
        </div>
      </main>
    </div>
  )
}
