import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Avatar } from '../primitives/Avatar'
import { fetchAnalytics } from './analyticsUtils'

type WhoFilter   = 'all' | 'me' | 'partner'
type RangeFilter = 'week' | 'month' | 'all'

export function MovementsTab() {
  const [who,   setWho]   = useState<WhoFilter>('all')
  const [cat,   _setCat]  = useState('all')
  const [range, setRange] = useState<RangeFilter>('week')

  const { data: list = [] } = useQuery({
    queryKey: ['movements', who, cat, range],
    queryFn: async () => {
      const r = await fetchAnalytics(`/points/history?who=${who}&cat=${cat}&range=${range}`)
      return Array.isArray(r) ? r : (r?.transactions ?? r?.history ?? [])
    },
  })

  const groups: Record<string, any[]> = {}
  ;(list as any[]).forEach((m: any) => {
    const key = m.dateLabel ?? 'Otros'
    ;(groups[key] ??= []).push(m)
  })

  return (
    <>
      <div className="mx-4 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {(['all','me','partner'] as WhoFilter[]).map(w => (
          <button key={w} onClick={() => setWho(w)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${who === w ? 'bg-brand-purple text-white' : 'bg-surface-card text-text-secondary border border-brd-subtle'}`}>
            {w === 'all' ? 'Todos' : w === 'me' ? 'Tú' : 'Pareja'}
          </button>
        ))}
        {(['week','month','all'] as RangeFilter[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ml-auto ${range === r ? 'bg-brand-amber text-white' : 'bg-surface-card text-text-secondary border border-brd-subtle'}`}>
            {r === 'week' ? 'Semana' : r === 'month' ? 'Mes' : 'Todo'}
          </button>
        ))}
      </div>

      {Object.keys(groups).length === 0 && (
        <div className="mx-4 mt-8 text-center text-text-secondary text-sm">Sin movimientos en este rango</div>
      )}

      {Object.entries(groups).map(([day, items]) => (
        <div key={day} className="mx-4 mb-4">
          <div className="text-[11px] font-bold text-text-secondary uppercase mb-1.5">{day}</div>
          <div className="rounded-md bg-[rgba(26,16,53,0.3)] overflow-hidden">
            {items.map((m: any, i: number) => (
              <div key={m.id} className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? 'border-t border-brd-subtle' : ''}`}>
                <Avatar emoji={m.userAvatarEmoji} color={m.userAvatarColor} size="sm" />
                <div className="flex-1 text-xs min-w-0">
                  <span className="text-text-primary font-semibold">{m.userName}</span>
                  <span className="text-text-secondary"> · {m.action}</span>
                </div>
                <span className={`text-xs font-bold tabular-nums ${Number(m.delta) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {Number(m.delta) >= 0 ? '+' : ''}{Number(m.delta).toFixed(1)} MP
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
