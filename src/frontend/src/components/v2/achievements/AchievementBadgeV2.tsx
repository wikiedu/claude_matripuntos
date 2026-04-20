import type { AchievementMapNode } from '../../../types/index'

interface Props {
  node: AchievementMapNode
  onClick?: () => void
}

type Rarity = AchievementMapNode['rarity']

const rarityBorder: Record<Rarity, string> = {
  common:    'border-brd-subtle',
  rare:      'border-brand-purple/60',
  epic:      'border-brand-amber/60',
  legendary: 'border-transparent',
}

const rarityLabel: Record<Rarity, string> = {
  common:    'COMÚN',
  rare:      'RARO',
  epic:      'ÉPICO',
  legendary: 'LEGENDARIO',
}

const rarityPill: Record<Rarity, string> = {
  common:    'bg-brd-subtle text-text-secondary',
  rare:      'bg-brand-purple/15 text-brand-purple',
  epic:      'bg-brand-amber/15 text-brand-amber',
  legendary: 'bg-gradient-to-r from-brand-purple via-brand-amber to-brand-purple-dark text-white',
}

export function AchievementBadgeV2({ node, onClick }: Props) {
  const isLegendary = node.rarity === 'legendary'
  const isLocked = node.status === 'locked'
  const isInProgress = node.status === 'in_progress'

  const opacityClass = isLocked ? 'opacity-30' : isInProgress ? 'opacity-60' : ''

  const inner = (
    <div
      className={`rounded-md p-3 bg-surface-card ${isLegendary ? 'border-0' : `border-2 ${rarityBorder[node.rarity]}`} flex flex-col items-center text-center gap-1 h-full`}
    >
      <div className="text-3xl" aria-hidden>{node.icon}</div>
      <div className="text-xs font-bold text-text-primary line-clamp-2">{node.name}</div>
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide ${rarityPill[node.rarity]}`}
      >
        {rarityLabel[node.rarity]}
      </span>
      <div className="text-[10px] font-semibold text-text-tertiary tabular-nums">
        +{node.xpReward} XP
      </div>
      {isInProgress && node.progress && (
        <div className="w-full mt-1">
          <div className="relative overflow-hidden rounded-full bg-white/10" style={{ height: 3 }}>
            <div
              className="absolute inset-y-0 left-0 bg-grad-cta rounded-full transition-all"
              style={{ width: `${Math.min(100, node.progress.percentage)}%` }}
            />
          </div>
          <div className="text-[9px] text-text-tertiary tabular-nums mt-0.5">
            {node.progress.current}/{node.progress.target}
          </div>
        </div>
      )}
    </div>
  )

  const content = isLegendary ? (
    <div className="rounded-md bg-gradient-to-br from-brand-purple via-brand-amber to-brand-purple-dark p-[2px]">
      {inner}
    </div>
  ) : (
    inner
  )

  return (
    <div
      className={`${opacityClass} ${onClick ? 'cursor-pointer hover:scale-[1.02] transition' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {content}
    </div>
  )
}
