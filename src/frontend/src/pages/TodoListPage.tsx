import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Trash2, Pencil, X, Check, Plus } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useTodos } from '../hooks/useTodos'
import { Button } from '../components/v2/primitives/Button'
import { Input } from '../components/v2/primitives/Input'
import { Pill } from '../components/v2/primitives/Pill'
import type { Todo } from '../types'

type TabKey = 'mine' | 'shared'

export default function TodoListPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useTodos()
  const [tab, setTab] = useState<TabKey>('mine')
  const [newText, setNewText] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newShared, setNewShared] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['todos'] })

  const createMutation = useMutation({
    mutationFn: () => apiClient.todos.create({
      text: newText.trim(),
      dueDate: newDueDate || undefined,
      isShared: newShared,
    }),
    onSuccess: () => {
      setNewText('')
      setNewDueDate('')
      setNewShared(false)
      invalidate()
    },
  })

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiClient.todos.update(id, { isCompleted }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { text?: string; dueDate?: string | null; isShared?: boolean } }) =>
      apiClient.todos.update(id, data),
    onSuccess: () => { setEditingId(null); invalidate() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.todos.delete(id),
    onSuccess: invalidate,
  })

  const handleCreate = () => {
    if (!newText.trim()) return
    createMutation.mutate()
  }

  const mine = data?.mine ?? []
  const partnerShared = data?.partnerShared ?? []

  const minePending = useMemo(() => mine.filter(t => !t.isCompleted).length, [mine])
  // Shared tab = everything shared in the couple: mine marked shared + partner's shared.
  // Sort: pending first, then most recently created.
  const mineShared = useMemo(() => mine.filter(t => t.isShared), [mine])
  const sharedCount = mineShared.length + partnerShared.length

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
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-5 h-5 text-brand-amber" />
        <h1 className="text-2xl font-extrabold text-text-primary">To-dos</h1>
      </div>

      {/* Segment */}
      <div className="mb-4">
        <Segment<TabKey>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: 'Mis to-dos', badge: minePending },
            { value: 'shared', label: 'Compartidos con pareja', badge: sharedCount },
          ]}
        />
      </div>

      {tab === 'mine' ? (
        <>
          {/* Add form */}
          <div className="rounded-lg bg-surface-card border border-brd-subtle p-3 mb-4">
            <Input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nuevo to-do… (Enter)"
              aria-label="Texto del to-do"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="flex-1 bg-surface-muted border border-brd-subtle rounded-md px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-brand-purple"
                aria-label="Fecha"
              />
              <button
                type="button"
                onClick={() => setNewShared(v => !v)}
                aria-pressed={newShared}
                className={`px-3 py-2 rounded-md text-xs font-semibold border transition ${
                  newShared
                    ? 'bg-brand-purple/15 text-brand-purple border-brand-purple/30'
                    : 'bg-surface-muted text-text-secondary border-brd-subtle hover:text-text-primary'
                }`}
              >
                {newShared ? 'Compartido' : 'Solo yo'}
              </button>
              <Button
                onClick={handleCreate}
                disabled={!newText.trim() || createMutation.isPending}
                size="sm"
              >
                <span className="inline-flex items-center gap-1">
                  <Plus className="w-4 h-4" />
                  Añadir
                </span>
              </Button>
            </div>
          </div>

          {/* My todos list */}
          {mine.length === 0 ? (
            /* Empty state — patrón Journal v2.7.7 (E.1 Fase 2) */
            <div className="text-center py-10 px-4 rounded-xl bg-surface-card border border-brd-subtle border-dashed">
              <div className="text-4xl mb-3" aria-hidden="true">📝</div>
              <p className="text-sm font-semibold text-text-primary mb-1">Sin to-dos pendientes</p>
              <p className="text-xs text-text-secondary mb-4 max-w-xs mx-auto leading-relaxed">
                Apunta recordatorios rápidos para ti, o márcalos como compartidos para que los veáis los dos.
              </p>
              <button
                type="button"
                onClick={() => {
                  document.querySelector<HTMLInputElement>('input[aria-label="Texto del to-do"]')?.focus()
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-amber hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber rounded px-2 py-1"
              >
                ➕ Crear el primer to-do
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {mine.map(todo => (
                <TodoItemRow
                  key={todo.id}
                  todo={todo}
                  isEditing={editingId === todo.id}
                  onStartEdit={() => setEditingId(todo.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(patch) => updateMutation.mutate({ id: todo.id, data: patch })}
                  onToggleComplete={() =>
                    toggleCompleteMutation.mutate({ id: todo.id, isCompleted: !todo.isCompleted })
                  }
                  onDelete={() => deleteMutation.mutate(todo.id)}
                  saving={updateMutation.isPending}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Shared tab: mine-shared (fully editable) + partner-shared (toggle-only). */}
          {sharedCount === 0 ? (
            /* Empty state — patrón Journal v2.7.7 (E.1 Fase 2) */
            <div className="text-center py-10 px-4 rounded-xl bg-surface-card border border-brd-subtle border-dashed">
              <div className="text-4xl mb-3" aria-hidden="true">🤝</div>
              <p className="text-sm font-semibold text-text-primary mb-1">Aún no hay to-dos compartidos</p>
              <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
                Marca uno como “Compartido” al crearlo o editarlo y aparecerá aquí para los dos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mineShared.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
                    Creados por ti
                  </p>
                  <div className="space-y-1.5">
                    {mineShared.map(todo => (
                      <TodoItemRow
                        key={todo.id}
                        todo={todo}
                        isEditing={editingId === todo.id}
                        onStartEdit={() => setEditingId(todo.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={(patch) => updateMutation.mutate({ id: todo.id, data: patch })}
                        onToggleComplete={() =>
                          toggleCompleteMutation.mutate({ id: todo.id, isCompleted: !todo.isCompleted })
                        }
                        onDelete={() => deleteMutation.mutate(todo.id)}
                        saving={updateMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
              {partnerShared.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wide mb-1.5">
                    Creados por tu pareja
                  </p>
                  <div className="space-y-1.5">
                    {partnerShared.map(todo => (
                      <SharedTodoRow key={todo.id} todo={todo} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}

// ─── My todo row ──────────────────────────────────────────────────────────
interface TodoItemRowProps {
  todo: Todo
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (patch: { text?: string; dueDate?: string | null; isShared?: boolean }) => void
  onToggleComplete: () => void
  onDelete: () => void
  saving?: boolean
}

function TodoItemRow({
  todo, isEditing, onStartEdit, onCancelEdit, onSaveEdit, onToggleComplete, onDelete, saving,
}: TodoItemRowProps) {
  const [text, setText] = useState(todo.text)
  const [dueDate, setDueDate] = useState(todo.dueDate ? todo.dueDate.slice(0, 10) : '')
  const [isShared, setIsShared] = useState(todo.isShared)

  // Reset local state when entering edit mode (in case the source todo changed).
  const startEdit = () => {
    setText(todo.text)
    setDueDate(todo.dueDate ? todo.dueDate.slice(0, 10) : '')
    setIsShared(todo.isShared)
    onStartEdit()
  }

  const save = () => {
    const t = text.trim()
    if (!t) return
    onSaveEdit({
      text: t,
      dueDate: dueDate || null,
      isShared,
    })
  }

  if (isEditing) {
    return (
      <div className="rounded-lg bg-surface-elevated border border-brand-purple/40 p-3 space-y-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
          aria-label="Editar texto"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-surface-muted border border-brd-subtle rounded-md px-3 py-2 text-xs text-text-secondary focus:outline-none focus:border-brand-purple"
            aria-label="Fecha"
          />
          <button
            type="button"
            onClick={() => setIsShared(v => !v)}
            aria-pressed={isShared}
            className={`px-3 py-2 rounded-md text-xs font-semibold border transition ${
              isShared
                ? 'bg-brand-purple/15 text-brand-purple border-brand-purple/30'
                : 'bg-surface-muted text-text-secondary border-brd-subtle hover:text-text-primary'
            }`}
          >
            {isShared ? 'Compartido' : 'Solo yo'}
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" fullWidth onClick={save} disabled={!text.trim() || saving}>
            <span className="inline-flex items-center justify-center gap-1">
              <Check className="w-4 h-4" /> Guardar
            </span>
          </Button>
          <Button variant="ghost" size="sm" fullWidth onClick={onCancelEdit}>
            <span className="inline-flex items-center justify-center gap-1">
              <X className="w-4 h-4" /> Cancelar
            </span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-card border border-brd-subtle pr-2">
      <label className="flex items-center justify-center w-11 h-11 cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={onToggleComplete}
          className="w-5 h-5 accent-brand-amber cursor-pointer"
          aria-label={todo.isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}
        />
      </label>
      <div className="flex-1 min-w-0 py-2">
        <p
          className={`truncate text-sm ${
            todo.isCompleted ? 'text-text-tertiary line-through' : 'text-text-primary'
          }`}
        >
          {todo.text}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {todo.dueDate && (
            <span className="text-[11px] text-text-tertiary">
              📅 {new Date(todo.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {todo.isShared && <Pill tone="purple">compartido</Pill>}
        </div>
      </div>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Editar"
        className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-muted transition flex-shrink-0"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Eliminar"
        className="p-2 rounded-md text-danger/80 hover:text-danger hover:bg-danger/10 transition flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Shared (partner) todo row — partner may toggle completion (B3) ────────
function SharedTodoRow({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient()
  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiClient.todos.update(id, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
  return (
    <div className="flex items-center gap-2 rounded-lg bg-brand-purple/5 border border-brand-purple/20 pr-3">
      <div className="flex items-center justify-center w-11 h-11 flex-shrink-0">
        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={(e) => toggleMutation.mutate({ id: todo.id, isCompleted: e.target.checked })}
          disabled={toggleMutation.isPending}
          className="w-5 h-5 accent-brand-purple cursor-pointer"
          aria-label="Marcar como hecho"
        />
      </div>
      <div className="flex-1 min-w-0 py-2">
        <p
          className={`truncate text-sm ${
            todo.isCompleted ? 'text-text-tertiary line-through' : 'text-text-secondary'
          }`}
        >
          {todo.text}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {todo.dueDate && (
            <span className="text-[11px] text-text-tertiary">
              📅 {new Date(todo.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
          )}
          <Pill tone="purple">compartido</Pill>
        </div>
      </div>
    </div>
  )
}

// ─── Segment control (same pattern used in Tasks.tsx) ──────────────────────
function Segment<T extends string>({
  value, onChange, options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; badge?: number }[]
}) {
  return (
    <div className="inline-flex gap-1 p-1 rounded-lg bg-surface-card border border-brd-subtle">
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              active
                ? 'bg-grad-cta text-white shadow-md shadow-brand-amber/30'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
            {opt.badge !== undefined && opt.badge > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-white/20 text-white' : 'bg-danger/80 text-white'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
