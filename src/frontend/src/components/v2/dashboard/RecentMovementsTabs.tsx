import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export interface MovementVM {
  id: string
  userName: string
  userAvatarEmoji?: string
  userAvatarColor?: string
  action: string
  delta: number
  when: string
  // 'task' for verified task logs, 'activity' for accepted/forced events,
  // 'negotiation' for rejected events / resolved negotiations. Each kind
  // gets its own icon so the feed is scannable at a glance.
  kind: 'activity' | 'task' | 'negotiation'
  refId: string
  status?: string | null
}

// Pick an icon that reflects what happened, not just who did it. Avatars made
// every row look the same; a small typed badge (✅ task verified, 🎯 activity
// accepted, 🔄 negotiation, ❌ rejected) is much easier to scan.
function iconFor(m: MovementVM): string {
  if (m.status === 'rejected') return '❌'
  if (m.status === 'forced') return '⚡'
  if (m.kind === 'task') return '✅'
  if (m.kind === 'negotiation') return '🔄'
  return '🎯'
}

// Los puntos van al 0.5 más cercano. Renderizamos "14 MP" cuando es entero y
// "14.5 MP" cuando hay medio — mostrar "14.0 MP" era ruido visual sin aportar
// información.
function formatPoints(n: number): string {
  const abs = Math.abs(n)
  return Number.isInteger(abs) ? abs.toString() : abs.toFixed(1)
}

function signOf(n: number): string {
  if (n > 0) return '+'
  if (n < 0) return '-'
  return ''
}

function colorOf(n: number): string {
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-danger'
  return 'text-text-tertiary'
}

interface Props { movements: MovementVM[] }
type Tab = 'all' | 'activity' | 'task'

export function RecentMovementsTabs({ movements }: Props) {
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('all')

  const filtered = useMemo(
    () => (tab === 'all' ? movements : movements.filter((m) => m.kind === tab)).slice(0, 3),
    [movements, tab],
  )

  function onRowTap(m: MovementVM) {
    if (m.kind === 'task') nav(`/home/tasks?logId=${m.refId}`)
    else nav(`/home/activities/${m.refId}`)
  }

  return (
    <div className="mx-4 mb-3.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-text-primary m-0">Últimos movimientos</h3>
        <div className="flex gap-1">
          <ChipTab active={tab === 'all'}      onClick={() => setTab('all')}>Todo</ChipTab>
          <ChipTab active={tab === 'activity'} onClick={() => setTab('activity')}>Actividades</ChipTab>
          <ChipTab active={tab === 'task'}     onClick={() => setTab('task')}>Tareas</ChipTab>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[11px] text-text-tertiary text-center py-3">Aún no hay movimientos.</p>
      ) : (
        <div className="rounded-md bg-[rgba(26,16,53,0.3)] overflow-hidden">
          {filtered.map((m, i) => (
            <button
              type="button"
              key={m.id}
              onClick={() => onRowTap(m)}
              className={['flex items-center gap-2 px-3 py-2.5 w-full text-left bg-transparent border-0',
                i > 0 ? 'border-t border-brd-subtle' : ''].join(' ')}
            >
              <span
                aria-hidden
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-elevated border border-brd-subtle text-sm"
              >
                {iconFor(m)}
              </span>
              <div className="flex-1 min-w-0 text-xs">
                <span className="text-text-primary font-semibold">{m.userName}</span>
                <span className="text-text-secondary"> · {m.action}</span>
              </div>
              <span className={`text-xs font-bold tabular-nums ${colorOf(m.delta)}`}>
                {signOf(m.delta)}{formatPoints(m.delta)} MP
              </span>
              <span className="text-[10px] text-text-tertiary">{m.when}</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={() => nav('/analytics?tab=movements')} className="text-xs text-brand-purple font-bold mt-2">
        Ver historial completo →
      </button>
    </div>
  )
}

function ChipTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-[10px] font-bold',
        active ? 'bg-brand-amber text-white' : 'bg-surface-elevated text-text-secondary border border-brd-subtle',
      ].join(' ')}
    >{children}</button>
  )
}
