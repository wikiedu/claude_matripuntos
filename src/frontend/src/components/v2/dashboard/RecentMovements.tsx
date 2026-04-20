import { useNavigate } from 'react-router-dom'
import { Avatar } from '../primitives/Avatar'

interface Movement {
  id: string
  userName: string
  userAvatarEmoji?: string
  userAvatarColor?: string
  action: string
  delta: number
  when: string
}

interface Props { movements: Movement[] }

export function RecentMovements({ movements }: Props) {
  const nav = useNavigate()
  if (movements.length === 0) return null

  return (
    <div className="mx-4 mb-3.5">
      <h3 className="text-sm font-bold text-text-primary mb-2">Últimos movimientos</h3>
      <div className="rounded-md bg-[rgba(26,16,53,0.3)] overflow-hidden">
        {movements.slice(0, 3).map((m, i) => (
          <div key={m.id} className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? 'border-t border-brd-subtle' : ''}`}>
            <Avatar emoji={m.userAvatarEmoji} color={m.userAvatarColor} size="sm" />
            <div className="flex-1 min-w-0 text-xs">
              <span className="text-text-primary font-semibold">{m.userName}</span>
              <span className="text-text-secondary"> · {m.action}</span>
            </div>
            <span className={`text-xs font-bold tabular-nums ${m.delta >= 0 ? 'text-success' : 'text-danger'}`}>
              {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)} MP
            </span>
            <span className="text-[10px] text-text-tertiary">{m.when}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => nav('/analytics?tab=movements')}
        className="text-xs text-brand-purple font-bold mt-2"
      >Ver historial completo →</button>
    </div>
  )
}
