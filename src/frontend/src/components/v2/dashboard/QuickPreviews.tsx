import { useNavigate } from 'react-router-dom'
import { Card } from '../primitives/Card'

interface Props {
  shoppingPending: number
  todoPending: number
  partnerSharedPending?: number
}

export function QuickPreviews({ shoppingPending, todoPending, partnerSharedPending = 0 }: Props) {
  const nav = useNavigate()

  const shoppingSubtitle =
    shoppingPending === 0 ? 'Todo comprado' : `${shoppingPending} pendiente${shoppingPending === 1 ? '' : 's'}`

  const todoMine = todoPending === 0 ? 'Sin to-dos' : `${todoPending} por hacer`
  const todoSubtitle =
    partnerSharedPending > 0
      ? `${todoMine} · +${partnerSharedPending} compartido${partnerSharedPending === 1 ? '' : 's'}`
      : todoMine

  return (
    <div className="mx-4 mb-3.5 grid grid-cols-2 gap-2">
      <button onClick={() => nav('/shopping')} className="text-left">
        <Card className="hover:border-brand-amber/40 transition">
          <div className="text-xl mb-0.5">🛒</div>
          <div className="text-[11px] text-text-secondary">Compra</div>
          <div className="text-sm font-bold text-text-primary">{shoppingSubtitle}</div>
        </Card>
      </button>
      <button onClick={() => nav('/todos')} className="text-left">
        <Card className="hover:border-brand-purple/40 transition">
          <div className="text-xl mb-0.5">📝</div>
          <div className="text-[11px] text-text-secondary">To-dos</div>
          <div className="text-sm font-bold text-text-primary">{todoSubtitle}</div>
        </Card>
      </button>
    </div>
  )
}
