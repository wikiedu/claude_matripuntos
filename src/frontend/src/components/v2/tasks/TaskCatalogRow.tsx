// Dense one-line row for the catalog listing in the Tasks page.
// Name + optional description on the left, pts + "+ Añadir" pill button on the right.

import { Plus, Loader } from 'lucide-react'

interface Props {
  name: string
  pts: number
  desc?: string
  onAdd: () => void
  busy?: boolean
  alreadyAdded?: boolean
}

export function TaskCatalogRow({ name, pts, desc, onAdd, busy, alreadyAdded }: Props) {
  return (
    <div className="py-1.5 px-2 border-b border-brd-subtle flex items-center gap-2 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{name}</p>
        {desc && <p className="text-[11px] text-text-tertiary truncate">{desc}</p>}
      </div>
      <span className="text-xs font-bold text-brand-amber tabular-nums">{pts} MP</span>
      {alreadyAdded ? (
        <span className="inline-flex items-center px-2 py-1 text-[11px] rounded-full font-semibold bg-surface-muted text-text-tertiary border border-brd-subtle">
          Añadida
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-full font-bold bg-grad-cta text-white disabled:opacity-50 transition"
        >
          {busy ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Añadir
        </button>
      )}
    </div>
  )
}
