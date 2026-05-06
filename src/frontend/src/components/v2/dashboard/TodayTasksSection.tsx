import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../primitives/Button'
import { Card } from '../primitives/Card'

interface Task {
  id: string
  name: string
  category: string
  categoryEmoji: string
  pointsExpected: number
  assignee: 'me' | 'partner' | 'free'
  partnerName?: string
}

interface Props {
  tasks: Task[]
  onComplete: (taskId: string) => void
  partnerName: string
}

// v2.7.7 audit 06 S2-10 — memo() para evitar re-renders en cada tick
// del polling (60s). Shallow equality detecta cuando `tasks` es
// referencialmente igual y skipea. El padre (Dashboard) debe pasar
// tasks desde useMemo o React Query data (ambos estables).
function TodayTasksSectionImpl({ tasks, onComplete, partnerName }: Props) {
  const nav = useNavigate()

  if (tasks.length === 0) {
    return (
      <Card className="mx-4 mb-3.5 text-center py-5">
        <div className="text-3xl mb-1">🎉</div>
        <div className="text-sm font-bold text-text-primary">Día libre</div>
        <div className="text-[11px] text-text-secondary mt-1">Has completado todo — disfrutad el resto del día 💕</div>
      </Card>
    )
  }

  return (
    <div className="mx-4 mb-3.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-text-primary m-0">Hoy</h3>
        <span className="text-[11px] text-text-secondary">{tasks.length} pendientes</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.slice(0, 3).map(t => (
          <Card key={t.id} className="p-3">
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-md bg-brand-purple/15 text-xl flex items-center justify-center flex-shrink-0">{t.categoryEmoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">{t.name}</div>
                <div className="text-[11px] text-text-secondary">+{t.pointsExpected.toFixed(1)} MP</div>
              </div>
            </div>
            {t.assignee === 'me' && (
              <Button variant="primary" fullWidth onClick={() => onComplete(t.id)}>✓ Marcar como hecha</Button>
            )}
            {t.assignee === 'partner' && (
              <Button variant="outline" fullWidth disabled>Esperando a {partnerName}</Button>
            )}
            {t.assignee === 'free' && (
              <Button variant="secondary" fullWidth onClick={() => onComplete(t.id)}>Hacerla yo</Button>
            )}
          </Card>
        ))}
        {tasks.length > 3 && (
          <button onClick={() => nav('/tasks')} className="text-xs text-brand-purple font-bold">Ver todas ({tasks.length}) →</button>
        )}
      </div>
    </div>
  )
}

export const TodayTasksSection = memo(TodayTasksSectionImpl)
