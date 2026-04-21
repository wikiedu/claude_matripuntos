import { Check, X, Repeat } from 'lucide-react'
import { Card } from '../primitives/Card'
import { Button } from '../primitives/Button'
import { Pill } from '../primitives/Pill'

export interface ActivityActionCardVM {
  id: string
  title: string
  creatorName: string
  whenLabel: string
  pointsCalculated: number
  round: number
}

interface Props {
  activity: ActivityActionCardVM
  busy?: boolean
  onAccept: (id: string) => void
  onCounter: (id: string) => void
  onReject: (id: string) => void
  onOpen: (id: string) => void
}

export function ActivityActionCard({ activity, busy, onAccept, onCounter, onReject, onOpen }: Props) {
  const a = activity
  return (
    <Card className="p-3">
      <button
        type="button"
        data-testid="action-card-body"
        onClick={() => onOpen(a.id)}
        className="w-full text-left bg-transparent border-0 p-0"
      >
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{a.title}</div>
            <div className="text-[11px] text-text-secondary">
              De {a.creatorName} · <span>{a.whenLabel}</span>
              {a.round > 1 && <> · <Pill tone="indigo">Ronda {a.round}</Pill></>}
            </div>
          </div>
          <span className="text-sm font-bold text-danger tabular-nums">{`−${a.pointsCalculated.toFixed(0)} MP`}</span>
        </div>
      </button>
      <div className="flex gap-2 mt-2.5">
        <Button variant="primary" size="sm" fullWidth disabled={busy} onClick={() => onAccept(a.id)}>
          <Check size={14} /> Aceptar
        </Button>
        <Button variant="secondary" size="sm" fullWidth disabled={busy} onClick={() => onCounter(a.id)}>
          <Repeat size={14} /> Contraoferta
        </Button>
        <Button variant="outline" size="sm" disabled={busy} aria-label="Rechazar" onClick={() => onReject(a.id)}>
          <X size={14} />
        </Button>
      </div>
    </Card>
  )
}
