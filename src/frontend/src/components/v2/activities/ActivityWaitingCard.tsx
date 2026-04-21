import { Card } from '../primitives/Card'

export interface ActivityWaitingCardVM {
  id: string
  title: string
  partnerName: string
  whenLabel: string
  pointsCalculated: number
}

interface Props {
  activity: ActivityWaitingCardVM
  onOpen: (id: string) => void
}

export function ActivityWaitingCard({ activity, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(activity.id)}
      className="w-full text-left bg-transparent border-0 p-0 mx-4 mb-2 block"
    >
      <Card className="p-3 border-dashed opacity-80">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">{activity.title}</div>
            <div className="text-[11px] text-text-secondary">
              {`Esperando a ${activity.partnerName}`} · <span>{activity.whenLabel}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-danger tabular-nums">{`−${activity.pointsCalculated.toFixed(0)} MP`}</span>
        </div>
      </Card>
    </button>
  )
}
