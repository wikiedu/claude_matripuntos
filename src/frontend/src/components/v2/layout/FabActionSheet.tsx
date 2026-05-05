import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../primitives/BottomSheet'

interface Props {
  open: boolean
  onClose: () => void
}

export function FabActionSheet({ open, onClose }: Props) {
  const nav = useNavigate()
  function go(path: string, state?: any) { nav(path, { state }); onClose() }

  const opts = [
    { emoji: '📅', title: 'Nueva actividad', desc: 'Propón una actividad que negociar', tone: 'amber',  onClick: () => go('/request-activity') },
    { emoji: '🛒', title: 'Añadir a la compra', desc: 'Item para la lista de la compra', tone: 'purple', onClick: () => go('/shopping', { autoFocus: true }) },
    { emoji: '📝', title: 'Nuevo to-do',       desc: 'Recordatorio personal sin puntos',  tone: 'indigo', onClick: () => go('/todos',    { autoFocus: true }) },
  ]

  const toneColors: Record<string, string> = {
    amber:  'bg-brand-amber/15  border-brand-amber/30  text-brand-amber',
    purple: 'bg-brand-purple/15 border-brand-purple/30 text-brand-purple',
    indigo: 'bg-brand-indigo/15 border-brand-indigo/30 text-indigo-300',
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="¿Qué quieres crear?">
      <div className="flex flex-col gap-2">
        {opts.map(o => (
          <button
            key={o.title}
            onClick={o.onClick}
            className={`flex items-center gap-3 px-3 py-3 rounded-md border ${toneColors[o.tone]} hover:opacity-90 transition text-left`}
          >
            <span className="text-2xl w-10 text-center">{o.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text-primary">{o.title}</div>
              <div className="text-[11px] text-text-secondary mt-0.5">{o.desc}</div>
            </div>
            <span className="text-text-tertiary text-lg">›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
