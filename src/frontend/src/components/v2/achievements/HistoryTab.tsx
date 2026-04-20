import type { AchievementMapNode } from '../../../types/index'
import { Card } from '../primitives/Card'

interface Props {
  unlocked: AchievementMapNode[]
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function HistoryTab({ unlocked }: Props) {
  const sorted = [...unlocked]
    .filter(n => n.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt as string).getTime() - new Date(a.unlockedAt as string).getTime())

  if (sorted.length === 0) {
    return (
      <div className="mx-4">
        <Card padding="lg" className="text-center">
          <p className="text-sm text-text-secondary m-0">
            Aún no has desbloqueado ningún logro 🙌
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-4">
      <Card padding="md">
        <ul className="relative space-y-3 m-0 p-0 list-none">
          <span
            className="absolute left-[7px] top-2 bottom-2 w-px bg-brd-subtle"
            aria-hidden
          />
          {sorted.map((node) => (
            <li key={node.id} className="relative flex items-start gap-3 pl-0">
              <span
                className="mt-1.5 w-3.5 h-3.5 rounded-full bg-grad-cta flex-shrink-0 shadow shadow-brand-amber/30 z-10"
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
                  {formatDate(node.unlockedAt as string)}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-xl">{node.icon}</span>
                  <span className="text-sm font-bold text-text-primary line-clamp-2">
                    {node.name}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-brand-amber tabular-nums mt-0.5">
                  +{node.xpReward} XP
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
