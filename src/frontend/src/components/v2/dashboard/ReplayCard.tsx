// v1.7 — Replay card. Mostrarse rotativa en Dashboard. Tap → marca seen.

import { useState } from 'react'
import { apiClient } from '../../../services/apiClient'
import type { ReplayCard as ReplayCardData } from '../../../hooks/useGamificationV2'

interface Props {
  replay: ReplayCardData
  onDismiss?: () => void
}

const TYPE_BG: Record<ReplayCardData['type'], string> = {
  anniversary: 'from-pink-600/30 to-purple-600/30',
  best_day: 'from-amber-600/30 to-pink-600/30',
  balance_record: 'from-emerald-600/30 to-cyan-600/30',
  first_event: 'from-purple-600/30 to-pink-600/30',
}

export function ReplayCard({ replay, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)

  async function handleSeen() {
    setDismissed(true)
    apiClient.request(`/gamification-v2/replay/${encodeURIComponent(replay.key)}/seen`, { method: 'POST' }).catch(() => {})
    onDismiss?.()
  }

  if (dismissed) return null

  return (
    <div
      data-testid="replay-card"
      className={`rounded-xl bg-gradient-to-br ${TYPE_BG[replay.type]} border border-white/10 p-3 relative`}
    >
      <button
        type="button"
        data-testid="replay-dismiss"
        onClick={handleSeen}
        aria-label="Cerrar"
        className="absolute top-1.5 right-1.5 text-white/50 text-sm hover:text-white"
      >
        ✕
      </button>
      <p data-testid="replay-title" className="text-sm font-semibold text-white mb-0.5 pr-5">
        {replay.title}
      </p>
      <p data-testid="replay-subtitle" className="text-xs text-white/85 leading-snug">
        {replay.subtitle}
      </p>
    </div>
  )
}
