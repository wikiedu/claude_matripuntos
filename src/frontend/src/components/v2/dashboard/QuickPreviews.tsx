import { useNavigate } from 'react-router-dom'
import { Card } from '../primitives/Card'

interface Props {
  shoppingPending: number
  todoPending: number
}

export function QuickPreviews({ shoppingPending, todoPending }: Props) {
  const nav = useNavigate()
  if (shoppingPending === 0 && todoPending === 0) return null

  return (
    <div className="mx-4 mb-3.5 grid grid-cols-2 gap-2">
      {shoppingPending > 0 && (
        <button onClick={() => nav('/shopping')} className="text-left">
          <Card className="hover:border-brand-amber/40 transition">
            <div className="text-xl mb-0.5">🛒</div>
            <div className="text-[11px] text-text-secondary">Compra</div>
            <div className="text-sm font-bold text-text-primary">{shoppingPending} pendientes</div>
          </Card>
        </button>
      )}
      {todoPending > 0 && (
        <button onClick={() => nav('/todos')} className="text-left">
          <Card className="hover:border-brand-purple/40 transition">
            <div className="text-xl mb-0.5">📝</div>
            <div className="text-[11px] text-text-secondary">To-dos</div>
            <div className="text-sm font-bold text-text-primary">{todoPending} por hacer</div>
          </Card>
        </button>
      )}
    </div>
  )
}
