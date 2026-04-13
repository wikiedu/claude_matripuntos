import { useQuery, useMutation } from '@tanstack/react-query'
import { Award, Loader } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { AchievementCard } from '../components/AchievementCard'
import { CoupleScoreGauge } from '../components/CoupleScoreGauge'
import { BottomNav } from '../components/BottomNav'
import { LevelProgress } from '../components/LevelProgress'
import { AchievementsMap } from '../components/AchievementsMap'

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
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 72 }}>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Mis Logros</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-4 pb-24">
          <LevelProgress />
          <AchievementsMap />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
