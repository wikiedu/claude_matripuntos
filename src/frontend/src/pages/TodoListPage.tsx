import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckSquare, Trash2, Eye, EyeOff } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useTodos } from '../hooks/useTodos'
import type { Todo } from '../types'

export default function TodoListPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useTodos()
  const [newText, setNewText] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newShared, setNewShared] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['todos'] })

  const createMutation = useMutation({
    mutationFn: () => apiClient.todos.create({
      text: newText.trim(),
      dueDate: newDueDate || undefined,
      isShared: newShared,
    }),
    onSuccess: () => { setNewText(''); setNewDueDate(''); setNewShared(false); invalidate() },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      apiClient.todos.update(id, { isCompleted }),
    onSuccess: invalidate,
  })

  const toggleShareMutation = useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      apiClient.todos.update(id, { isShared }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.todos.delete(id),
    onSuccess: invalidate,
  })

  const handleCreate = () => {
    if (!newText.trim()) return
    createMutation.mutate()
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--matri-text-3)' }}>Cargando...</span>
      </div>
    )
  }

  const mine = data?.mine ?? []
  const partnerShared = data?.partnerShared ?? []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--matri-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--matri-card-bg)',
        borderBottom: '1px solid var(--matri-card-border)',
        padding: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckSquare size={20} color="var(--matri-amber)" />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--matri-text)' }}>To-dos</h1>
          {mine.filter(t => !t.isCompleted).length > 0 && (
            <span style={{
              background: 'rgba(96,165,250,0.15)', color: '#60a5fa',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              border: '1px solid rgba(96,165,250,0.3)',
            }}>
              {mine.filter(t => !t.isCompleted).length} pendientes
            </span>
          )}
        </div>
      </header>

      <div style={{ padding: 16 }}>
        {/* Add todo form */}
        <div style={{
          background: 'var(--matri-card-bg)',
          border: '1px solid var(--matri-card-border)',
          borderRadius: 12, padding: 14, marginBottom: 16,
        }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nuevo to-do... (Enter)"
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: 'var(--matri-text)', fontSize: 13, outline: 'none', marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--matri-card-border)',
                borderRadius: 8, padding: '6px 10px', color: 'var(--matri-text-2)', fontSize: 11,
              }}
            />
            <button
              onClick={() => setNewShared(!newShared)}
              title={newShared ? 'Compartido con pareja' : 'Solo yo'}
              style={{
                background: newShared ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${newShared ? 'rgba(168,85,247,0.3)' : 'var(--matri-card-border)'}`,
                borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                color: newShared ? '#a855f7' : 'var(--matri-text-3)', fontSize: 11,
              }}
            >
              {newShared ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              onClick={handleCreate}
              disabled={!newText.trim() || createMutation.isPending}
              style={{
                background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                border: 'none', borderRadius: 8, padding: '6px 14px',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Añadir
            </button>
          </div>
        </div>

        {/* My todos */}
        <p style={{ color: 'var(--matri-text-3)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
          Mis to-dos
        </p>
        {mine.length === 0 && (
          <p style={{ color: 'var(--matri-text-3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            Sin to-dos — añade el primero
          </p>
        )}
        {mine.map((todo: Todo) => (
          <div key={todo.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--matri-card-bg)',
            border: '1px solid var(--matri-card-border)',
            borderRadius: 10, padding: '10px 12px', marginBottom: 6,
          }}>
            <input
              type="checkbox"
              checked={todo.isCompleted}
              onChange={() => toggleMutation.mutate({ id: todo.id, isCompleted: !todo.isCompleted })}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f59e0b' }}
            />
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 13, color: 'var(--matri-text)',
                textDecoration: todo.isCompleted ? 'line-through' : 'none',
                opacity: todo.isCompleted ? 0.5 : 1,
              }}>
                {todo.text}
              </span>
              {todo.dueDate && (
                <p style={{ fontSize: 10, color: 'var(--matri-text-3)', marginTop: 2 }}>
                  📅 {new Date(todo.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
            <button
              onClick={() => toggleShareMutation.mutate({ id: todo.id, isShared: !todo.isShared })}
              title={todo.isShared ? 'Dejar de compartir' : 'Compartir con pareja'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              {todo.isShared
                ? <Eye size={14} color="#a855f7" />
                : <EyeOff size={14} color="var(--matri-text-3)" />}
            </button>
            <button
              onClick={() => deleteMutation.mutate(todo.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Trash2 size={14} color="#ef4444" />
            </button>
          </div>
        ))}

        {/* Partner shared todos */}
        {partnerShared.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ color: 'var(--matri-text-3)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>
              Compartidos por tu pareja
            </p>
            {partnerShared.map((todo: Todo) => (
              <div key={todo.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(168,85,247,0.05)',
                border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 6,
              }}>
                <input type="checkbox" checked={todo.isCompleted} disabled style={{ width: 16, height: 16 }} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 13, color: 'var(--matri-text-2)',
                    textDecoration: todo.isCompleted ? 'line-through' : 'none',
                    opacity: todo.isCompleted ? 0.5 : 1,
                  }}>
                    {todo.text}
                  </span>
                  {todo.dueDate && (
                    <p style={{ fontSize: 10, color: 'var(--matri-text-3)', marginTop: 2 }}>
                      📅 {new Date(todo.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
                <Eye size={12} color="#a855f7" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
