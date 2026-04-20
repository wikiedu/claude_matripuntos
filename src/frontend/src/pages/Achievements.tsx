import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useAppStore } from '../store/useAppStore'
import { useGamificationStatus } from '../hooks/useGamificationStatus'
import { Button } from '../components/v2/primitives/Button'
import { LevelHero } from '../components/v2/achievements/LevelHero'
import { AchievementsTabs } from '../components/v2/achievements/AchievementsTabs'
import { AchievementBadgeV2 } from '../components/v2/achievements/AchievementBadgeV2'
import { RankingTab } from '../components/v2/achievements/RankingTab'
import { HistoryTab } from '../components/v2/achievements/HistoryTab'
import type { AchievementMapNode } from '../types/index'

const LEVEL_ORDER = ['nido', 'brote', 'hogar', 'raices', 'diamante', 'leyenda', 'eterno']

type Tab = 'badges' | 'ranking' | 'historial'

function isTab(v: string | null): v is Tab {
  return v === 'badges' || v === 'ranking' || v === 'historial'
}

export default function Achievements() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, couple } = useAppStore()

  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : 'badges')

  function changeTab(t: Tab) {
    setTab(t)
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    setSearchParams(next, { replace: true })
  }

  const { data: map, isLoading } = useQuery<AchievementMapNode[]>({
    queryKey: ['achievements', 'map'],
    queryFn: () => apiClient.achievements.getMap(),
    staleTime: 30_000,
  })

  const { data: gamificationStatus } = useGamificationStatus()

  const nodes = useMemo(() => map ?? [], [map])
  const unlocked = useMemo(() => nodes.filter(n => n.status === 'unlocked'), [nodes])
  const inProgress = useMemo(() => nodes.filter(n => n.status === 'in_progress'), [nodes])
  const locked = useMemo(() => nodes.filter(n => n.status === 'locked'), [nodes])

  const levelOrdinal = (LEVEL_ORDER.indexOf(gamificationStatus?.level ?? 'nido') + 1) || 1
  const currentXp = gamificationStatus?.xp ?? 0
  const xpToNext = gamificationStatus?.xpToNext ?? 100
  const neededXp = currentXp + xpToNext
  const xpPct = gamificationStatus?.xpProgress ?? 0

  const dailyStreak = gamificationStatus?.dailyStreak ?? 0
  const multiplier = Number(gamificationStatus?.combinedMultiplier ?? gamificationStatus?.dailyMultiplier ?? 1.0)

  const extra = [
    { label: 'Racha diaria', value: `${dailyStreak} días` },
    { label: 'Multiplicador', value: `×${multiplier.toFixed(1)}` },
    { label: 'En progreso',   value: `${inProgress.length}` },
    { label: 'Bloqueados',    value: `${locked.length}` },
  ]

  const partner = couple?.users?.find(u => u.id !== user?.id)

  return (
    <main className="pb-6 pt-2">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm font-semibold"
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
          <span>Logros</span>
        </button>
      </div>

      <LevelHero
        levelName={gamificationStatus?.levelName ?? 'Nido'}
        levelOrdinal={levelOrdinal}
        currentXp={currentXp}
        neededXp={neededXp}
        pct={xpPct}
        unlocked={unlocked.length}
        total={nodes.length}
        extra={extra}
      />

      <AchievementsTabs tab={tab} onTab={changeTab} />

      {isLoading && (
        <p className="mx-4 text-sm text-text-secondary">Cargando logros...</p>
      )}

      {!isLoading && tab === 'badges' && (
        <div className="mx-4 space-y-5">
          <section>
            <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
              Desbloqueados ({unlocked.length})
            </h2>
            {unlocked.length === 0 ? (
              <p className="text-sm text-text-tertiary">Aún no has desbloqueado ningún logro.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {unlocked.map(n => <AchievementBadgeV2 key={n.id} node={n} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
              En progreso ({inProgress.length + locked.length})
            </h2>
            {inProgress.length + locked.length === 0 ? (
              <p className="text-sm text-text-tertiary">No hay logros por desbloquear ahora mismo.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {inProgress.map(n => <AchievementBadgeV2 key={n.id} node={n} />)}
                {locked.map(n => <AchievementBadgeV2 key={n.id} node={n} />)}
              </div>
            )}
          </section>
        </div>
      )}

      {!isLoading && tab === 'ranking' && (
        <RankingTab
          unlocked={unlocked}
          userName={user?.name ?? 'Tú'}
          partnerName={partner?.name ?? null}
        />
      )}

      {!isLoading && tab === 'historial' && (
        <HistoryTab unlocked={unlocked} />
      )}

      <div className="mx-4 mt-6">
        <Button variant="primary" fullWidth onClick={() => navigate('/analytics')}>
          📊 Ver analítica completa →
        </Button>
      </div>
    </main>
  )
}
