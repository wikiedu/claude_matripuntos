import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Plus, Trash2, Archive, ChevronDown, ChevronRight } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useShoppingList } from '../hooks/useShoppingList'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { Pill } from '../components/v2/primitives/Pill'
import {
  CATEGORIES,
  CATEGORY_ORDER,
  inferCategory,
  type ShoppingCategoryKey,
} from '../utils/shoppingCategory'
import type { ShoppingItem } from '../types'

export default function ShoppingListPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useShoppingList()
  const [newText, setNewText] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [showCompleted, setShowCompleted] = useState(true)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shopping'] })

  const addMutation = useMutation({
    mutationFn: (text: string) => apiClient.shopping.addItem(text),
    onSuccess: () => { setNewText(''); invalidate() },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isChecked }: { id: string; isChecked: boolean }) =>
      apiClient.shopping.updateItem(id, { isChecked }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.shopping.deleteItem(id),
    onSuccess: invalidate,
  })

  const archiveMutation = useMutation({
    mutationFn: () => apiClient.shopping.archive(),
    onSuccess: () => { setConfirmArchive(false); invalidate() },
  })

  const handleAdd = () => {
    const text = newText.trim()
    if (!text) return
    addMutation.mutate(text)
  }

  // ─── Derivations ──────────────────────────────────────────────────────────
  const activeItems = data?.active?.items ?? []
  const history = data?.history ?? []

  const { pendingByCategory, pendingCount, completedItems } = useMemo(() => {
    const pending: Record<ShoppingCategoryKey, ShoppingItem[]> = {
      fresco: [], despensa: [], hogar: [], mascotas: [], otros: [],
    }
    const done: ShoppingItem[] = []
    for (const item of activeItems) {
      if (item.isChecked) done.push(item)
      else pending[inferCategory(item.text)].push(item)
    }
    for (const cat of CATEGORY_ORDER) {
      pending[cat].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    }
    done.sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''))
    const pendCount = CATEGORY_ORDER.reduce((n, c) => n + pending[c].length, 0)
    return { pendingByCategory: pending, pendingCount: pendCount, completedItems: done }
  }, [activeItems])

  const suggestedCategory = newText.trim() ? inferCategory(newText) : null

  if (isLoading) {
    return (
      <main className="px-4 pt-8 pb-6">
        <p className="text-center text-sm text-text-tertiary">Cargando...</p>
      </main>
    )
  }

  return (
    <main className="px-4 pt-2 pb-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-brand-amber" />
          <h1 className="text-2xl font-extrabold text-text-primary">Lista de la compra</h1>
        </div>
      </div>

      {/* Counter */}
      <p className="text-xs text-text-secondary mb-4">
        <span className="font-bold text-text-primary">{pendingCount}</span> pendientes
        <span className="mx-1 text-text-tertiary">·</span>
        <span className="font-bold text-text-primary">{completedItems.length}</span> completados
      </p>

      {/* Add item */}
      <div className="mb-2 flex gap-2">
        <div className="flex-1">
          <Input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Añadir item… (Enter)"
            aria-label="Añadir item a la lista"
          />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newText.trim() || addMutation.isPending}
          aria-label="Añadir"
          className="flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Category auto-suggest */}
      {suggestedCategory && (
        <p className="text-[11px] text-text-tertiary mb-4">
          → Se añadirá en {CATEGORIES[suggestedCategory].emoji} {CATEGORIES[suggestedCategory].label}
        </p>
      )}
      {!suggestedCategory && <div className="mb-4" />}

      {/* Empty state — patrón Journal v2.7.7 (E.1 Fase 2) */}
      {activeItems.length === 0 && (
        <div className="text-center py-10 px-4 rounded-xl bg-surface-card border border-brd-subtle border-dashed">
          <div className="text-4xl mb-3" aria-hidden="true">🛒</div>
          <p className="text-sm font-semibold text-text-primary mb-1">La lista está vacía</p>
          <p className="text-xs text-text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
            Todo lo que añadáis aquí lo veis los dos al momento. Las categorías se detectan solas.
          </p>
          <button
            type="button"
            onClick={() => {
              document.querySelector<HTMLInputElement>('input[aria-label="Añadir item a la lista"]')?.focus()
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded px-2 py-1"
          >
            ➕ Añadir el primer item
          </button>
        </div>
      )}

      {/* Pending items grouped by category */}
      {pendingCount > 0 && (
        <div className="space-y-4 mb-4">
          {CATEGORY_ORDER.map(cat => {
            const items = pendingByCategory[cat]
            if (items.length === 0) return null
            return (
              <section key={cat}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{CATEGORIES[cat].emoji}</span>
                  <h2 className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                    {CATEGORIES[cat].label}
                  </h2>
                  <span className="text-[11px] text-text-tertiary">· {items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map(item => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      category={cat}
                      onToggle={() => toggleMutation.mutate({ id: item.id, isChecked: true })}
                      onDelete={() => deleteMutation.mutate(item.id)}
                      busy={toggleMutation.isPending || deleteMutation.isPending}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Completed today (collapsible) */}
      {completedItems.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowCompleted(v => !v)}
            className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-surface-muted border border-brd-subtle text-text-secondary hover:text-text-primary transition"
          >
            {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="text-xs font-semibold">
              Completados hoy · {completedItems.length}
            </span>
          </button>
          {showCompleted && (
            <div className="space-y-1.5 mt-2">
              {completedItems.map(item => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  category={inferCategory(item.text)}
                  onToggle={() => toggleMutation.mutate({ id: item.id, isChecked: false })}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  busy={toggleMutation.isPending || deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Archive button */}
      {activeItems.length > 0 && (
        <div className="mb-6">
          {!confirmArchive ? (
            <Button
              variant="outline"
              fullWidth
              onClick={() => setConfirmArchive(true)}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Archive className="w-4 h-4" />
                Archivar lista y empezar nueva
              </span>
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending}
              >
                Confirmar archivo
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmArchive(false)}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary mb-2">
            Listas anteriores
          </p>
          <div className="space-y-2">
            {history.map(list => (
              <details
                key={list.id}
                className="rounded-lg bg-surface-card border border-brd-subtle overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-text-secondary flex items-center justify-between">
                  <span>
                    {list.archivedAt
                      ? new Date(list.archivedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                      : '—'}
                    <span className="mx-1 text-text-tertiary">·</span>
                    {list.items.length} items
                  </span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                </summary>
                <div className="px-4 pb-3 pt-1 border-t border-brd-subtle">
                  {list.items.map(item => (
                    <div
                      key={item.id}
                      className={`text-xs py-1 ${item.isChecked ? 'text-text-tertiary line-through' : 'text-text-secondary'}`}
                    >
                      {item.isChecked ? '✓' : '·'} {item.text}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Row component ─────────────────────────────────────────────────────────
interface ShoppingItemRowProps {
  item: ShoppingItem
  category: ShoppingCategoryKey
  onToggle: () => void
  onDelete: () => void
  busy?: boolean
}

function ShoppingItemRow({ item, category, onToggle, onDelete, busy }: ShoppingItemRowProps) {
  const cat = CATEGORIES[category]
  return (
    <div className={`flex items-center gap-2 rounded-lg bg-surface-card border border-brd-subtle pr-2 ${busy ? 'opacity-60' : ''}`}>
      <label className="flex items-center justify-center w-11 h-11 cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={item.isChecked}
          onChange={onToggle}
          disabled={busy}
          className="w-5 h-5 accent-brand-amber cursor-pointer disabled:cursor-not-allowed"
          aria-label={item.isChecked ? 'Marcar como pendiente' : 'Marcar como completado'}
        />
      </label>
      <span
        className={`flex-1 min-w-0 truncate text-sm ${
          item.isChecked ? 'text-text-tertiary line-through' : 'text-text-primary'
        }`}
      >
        {item.text}
      </span>
      <Pill tone={item.isChecked ? 'purple' : 'amber'} className="flex-shrink-0">
        <span>{cat.emoji}</span>
        <span className="hidden sm:inline">{cat.label}</span>
      </Pill>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        aria-label="Eliminar"
        className="p-2 rounded-md text-danger/80 hover:text-danger hover:bg-danger/10 transition flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
