import { Zap, Trophy, Target, Flame } from 'lucide-react'

interface AchievementBadgeProps {
  name: string
  description: string
  emoji: string
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  isUnlocked: boolean
  unlockedAt?: string
}

export const AchievementBadge = ({
  name,
  description,
  emoji,
  difficulty,
  isUnlocked,
  unlockedAt,
}: AchievementBadgeProps) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'border-green-300 bg-green-50'
      case 'medium':
        return 'border-blue-300 bg-blue-50'
      case 'hard':
        return 'border-orange-300 bg-orange-50'
      case 'legendary':
        return 'border-purple-300 bg-purple-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'Fácil'
      case 'medium':
        return 'Medio'
      case 'hard':
        return 'Difícil'
      case 'legendary':
        return 'Legendario'
      default:
        return ''
    }
  }

  const getDifficultyIcon = (diff: string) => {
    switch (diff) {
      case 'easy':
        return <Target size={14} className="text-green-600" />
      case 'medium':
        return <Zap size={14} className="text-blue-600" />
      case 'hard':
        return <Flame size={14} className="text-orange-600" />
      case 'legendary':
        return <Trophy size={14} className="text-purple-600" />
      default:
        return null
    }
  }

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all ${
        isUnlocked
          ? getDifficultyColor(difficulty)
          : 'border-gray-200 bg-gray-100 opacity-60'
      } ${!isUnlocked ? 'grayscale' : ''}`}
    >
      {/* Unlock Badge */}
      {isUnlocked && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
          <Trophy size={16} />
        </div>
      )}

      <div className="text-center">
        {/* Emoji/Icon */}
        <div className="text-4xl mb-2">{emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-sm text-gray-900 mb-1">{name}</h3>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-2">{description}</p>

        {/* Difficulty */}
        <div className="flex items-center justify-center gap-1">
          {getDifficultyIcon(difficulty)}
          <span className="text-xs font-medium text-gray-700">
            {getDifficultyLabel(difficulty)}
          </span>
        </div>

        {/* Unlocked Date */}
        {isUnlocked && unlockedAt && (
          <div className="text-xs text-gray-500 mt-2">
            Desbloqueado: {new Date(unlockedAt).toLocaleDateString('es-ES')}
          </div>
        )}

        {!isUnlocked && <div className="text-xs text-gray-500 mt-2">Bloqueado</div>}
      </div>
    </div>
  )
}
