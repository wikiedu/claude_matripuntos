import { useState, useEffect } from 'react'
import { apiClient } from '../services/apiClient'
import { AchievementBadge } from './AchievementBadge'
import { Trophy, Loader } from 'lucide-react'

interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  condition: string
}

interface UserAchievement {
  achievement: Achievement
  unlockedAt: string
}

export const AchievementsPanel = () => {
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ unlocked: 0, total: 0, percentage: 0 })
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  useEffect(() => {
    loadAchievements()
  }, [])

  const loadAchievements = async () => {
    try {
      setLoading(true)
      setError(null)

      const [allRes, userRes] = await Promise.all([
        apiClient.gamification.getAllAchievements(),
        apiClient.gamification.getUserAchievements(),
      ])

      setAllAchievements(allRes.achievements)
      setUserAchievements(userRes.achievements)
      setProgress(userRes.progress)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const isUnlocked = (achievementId: string) => {
    return userAchievements.some((ua) => ua.achievement.id === achievementId)
  }

  const getUnlockedDate = (achievementId: string) => {
    return userAchievements.find((ua) => ua.achievement.id === achievementId)?.unlockedAt
  }

  const filteredAchievements = allAchievements.filter((a) => {
    if (filter === 'unlocked') return isUnlocked(a.id)
    if (filter === 'locked') return !isUnlocked(a.id)
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin mr-2" size={24} />
        <span>Cargando logros...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded text-red-700">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy size={32} className="text-yellow-500" />
          <div>
            <h2 className="text-2xl font-bold">Logros</h2>
            <p className="text-gray-600">
              {progress.unlocked} de {progress.total} desbloqueados
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-yellow-600">{progress.percentage}%</div>
          <div className="text-sm text-gray-600">Completado</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos ({allAchievements.length})
        </button>
        <button
          onClick={() => setFilter('unlocked')}
          className={`px-4 py-2 rounded ${
            filter === 'unlocked'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Desbloqueados ({progress.unlocked})
        </button>
        <button
          onClick={() => setFilter('locked')}
          className={`px-4 py-2 rounded ${
            filter === 'locked'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Bloqueados ({progress.total - progress.unlocked})
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <AchievementBadge
            key={achievement.id}
            name={achievement.name}
            description={achievement.description}
            emoji={achievement.emoji}
            difficulty={achievement.difficulty}
            isUnlocked={isUnlocked(achievement.id)}
            unlockedAt={getUnlockedDate(achievement.id)}
          />
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Trophy size={48} className="mx-auto mb-2 opacity-50" />
          <p>No hay logros en esta categoría</p>
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={loadAchievements}
        className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
      >
        🔄 Actualizar
      </button>
    </div>
  )
}
