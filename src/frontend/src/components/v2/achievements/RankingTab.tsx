import type { AchievementMapNode } from '../../../types/index'
import { Card } from '../primitives/Card'
import { Pill } from '../primitives/Pill'

interface Props {
  unlocked: AchievementMapNode[]
  userName: string
  partnerName?: string | null
}

function findLastUnlock(unlocked: AchievementMapNode[]): AchievementMapNode | null {
  const withDate = unlocked.filter(n => n.unlockedAt)
  if (withDate.length === 0) return null
  return withDate.reduce((latest, cur) => {
    const a = new Date(latest.unlockedAt as string).getTime()
    const b = new Date(cur.unlockedAt as string).getTime()
    return b > a ? cur : latest
  })
}

export function RankingTab({ unlocked, userName, partnerName }: Props) {
  const youCount = unlocked.length
  const lastUnlock = findLastUnlock(unlocked)

  return (
    <div className="mx-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card padding="md">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1">
            Tú ({userName})
          </div>
          <div className="text-3xl font-extrabold text-text-primary tabular-nums">{youCount}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">logros</div>
          {lastUnlock ? (
            <div className="mt-3 pt-3 border-t border-brd-subtle">
              <div className="text-[10px] uppercase tracking-wide text-text-tertiary">Último</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-lg">{lastUnlock.icon}</span>
                <span className="text-xs font-bold text-text-primary line-clamp-2">
                  {lastUnlock.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-brd-subtle text-[11px] text-text-tertiary">
              Aún sin desbloqueos
            </div>
          )}
        </Card>

        <Card padding="md" className="opacity-60">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-1">
            {partnerName ?? 'Pareja'}
          </div>
          <div className="text-3xl font-extrabold text-text-tertiary tabular-nums">—</div>
          <div className="text-[11px] text-text-secondary mt-0.5">datos próximamente</div>
          <div className="mt-3 pt-3 border-t border-brd-subtle">
            <Pill tone="purple">próximamente</Pill>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              Diferencia
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              Tú vs {partnerName ?? 'pareja'}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-text-tertiary tabular-nums">—</div>
        </div>
      </Card>

      <p className="text-[11px] text-text-tertiary text-center px-2">
        El ranking completo con tu pareja llegará próximamente.
      </p>
    </div>
  )
}
