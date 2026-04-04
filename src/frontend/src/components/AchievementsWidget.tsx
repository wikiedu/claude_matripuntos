import { useQuery } from '@tanstack/react-query'
import { Award, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiClient } from '../services/apiClient'
import { AchievementCard } from './AchievementCard'

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

export function AchievementsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const response = await apiClient.request('/achievements/user')
      return response
    },
    staleTime: 5 * 60 * 1000
  })

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Mis Logros</h2>
        </div>
        <div className="text-center py-4 text-gray-500">Cargando...</div>
      </div>
    )
  }

  const achievements = (data?.achievements || []) as Achievement[]
  const lastThree = achievements.slice(0, 3)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Mis Logros</h2>
        </div>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
          {data?.progress?.percentage || 0}%
        </span>
      </div>

      {lastThree.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 mb-4">
          {lastThree.map((ach: Achievement) => (
            <AchievementCard key={ach.id} achievement={ach} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Aún no has desbloqueado logros</p>
          <p className="text-xs mt-1">¡Completa eventos y tareas para desbloquearlos!</p>
        </div>
      )}

      <Link
        to="/achievements"
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors font-medium text-sm"
      >
        Ver todos los logros
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
