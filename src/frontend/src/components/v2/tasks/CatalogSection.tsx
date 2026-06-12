// Sección "Catálogo" plegable de la página Tareas (extraída de pages/Tasks.tsx en T2).
// El estado abierto/cerrado vive aquí — ningún otro componente lo lee.

import { useState } from 'react'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from './CategoryFilterStrip'
import { TaskCatalogRow } from './TaskCatalogRow'
import type { CatalogGroup } from './taskCatalog'

export function CatalogSection({
  catalog, addingFromCatalog, onAdd,
}: {
  catalog: CatalogGroup[]
  addingFromCatalog: string | null
  onAdd: (name: string, category: string, pts: number, desc?: string) => void
}) {
  const [showCatalog, setShowCatalog] = useState(false)
  if (catalog.length === 0) return null
  return (
    <section>
      <button
        type="button"
        onClick={() => setShowCatalog((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-surface-card border border-brd-subtle text-sm font-semibold text-text-primary hover:bg-surface-muted transition-colors"
      >
        <span>
          📚 {showCatalog ? 'Ocultar catálogo' : 'Ver catálogo'}
          <span className="ml-1.5 text-xs font-normal text-text-tertiary">
            ({catalog.reduce((s, g) => s + g.tasks.length, 0)} ideas)
          </span>
        </span>
        <span className="text-text-tertiary text-xs">{showCatalog ? '▲' : '▼'}</span>
      </button>
      {showCatalog && (
        <div className="mt-2 rounded-md bg-surface-card border border-brd-subtle overflow-hidden">
          {catalog.map((group) => (
            <div key={group.category}>
              <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-tertiary bg-surface-muted border-b border-brd-subtle">
                {CATEGORY_EMOJI[group.category]} {CATEGORY_LABEL[group.category]}
              </div>
              {group.tasks.map((t) => (
                <TaskCatalogRow
                  key={`${group.category}-${t.name}`}
                  name={t.name}
                  pts={t.pts}
                  desc={t.desc}
                  busy={addingFromCatalog === t.name}
                  onAdd={() => onAdd(t.name, group.category, t.pts, t.desc)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
