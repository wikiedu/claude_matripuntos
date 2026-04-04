import { Lock } from 'lucide-react'

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

const rarityColors = {
  common: 'bg-gray-100 text-gray-700 border-gray-300',
  rare: 'bg-blue-100 text-blue-700 border-blue-300',
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  legendary: 'bg-yellow-100 text-yellow-700 border-yellow-300'
}

const rarityBadgeColors = {
  common: 'bg-gray-200 text-gray-800',
  rare: 'bg-blue-200 text-blue-800',
  epic: 'bg-purple-200 text-purple-800',
  legendary: 'bg-yellow-200 text-yellow-800'
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${
        achievement.isUnlocked
          ? rarityColors[achievement.rarity]
          : 'bg-gray-50 text-gray-400 border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{achievement.name}</h3>
          {achievement.description && (
            <p className="text-sm opacity-75 mt-1">{achievement.description}</p>
          )}
        </div>

        {achievement.isUnlocked ? (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
              rarityBadgeColors[achievement.rarity]
            }`}
          >
            {achievement.rarity}
          </span>
        ) : (
          <Lock className="w-5 h-5 ml-2 flex-shrink-0" />
        )}
      </div>

      {achievement.isUnlocked && (
        <div className="text-sm font-semibold mb-2">+{achievement.pointsReward} pts</div>
      )}

      {!achievement.isUnlocked && achievement.progress && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold">
              {achievement.progress.current}/{achievement.progress.target}
            </span>
            <span className="text-xs font-semibold">{achievement.progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(achievement.progress.percentage, 100)}%`
              }}
            />
          </div>
        </div>
      )}

      {achievement.isUnlocked && achievement.unlockedAt && (
        <div className="text-xs mt-3 opacity-60">
          {new Date(achievement.unlockedAt).toLocaleDateString('es-ES')}
        </div>
      )}
    </div>
  )
}
