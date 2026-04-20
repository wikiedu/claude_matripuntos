import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Plus, Trash2, Archive } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { useShoppingList } from '../hooks/useShoppingList'
import type { ShoppingItem } from '../types'

export default function ShoppingListPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useShoppingList()
  const [newText, setNewText] = useState('')
  const [confirmArchive, setConfirmArchive] = useState(false)

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

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--matri-text-3)' }}>Cargando...</span>
      </div>
    )
  }

  const active = data?.active
  const history = data?.history ?? []
  const pendingCount = active?.items.filter(i => !i.isChecked).length ?? 0

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
          <ShoppingCart size={20} color="var(--matri-amber)" />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--matri-text)' }}>Lista de la compra</h1>
          {pendingCount > 0 && (
            <span style={{
              background: 'rgba(245,158,11,0.15)', color: 'var(--matri-amber)',
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              border: '1px solid rgba(245,158,11,0.3)',
            }}>
              {pendingCount} pendientes
            </span>
          )}
        </div>
      </header>

      <div style={{ padding: 16 }}>
        {/* Add item input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Añadir item... (Enter)"
            style={{
              flex: 1, background: 'var(--matri-card-bg)',
              border: '1px solid var(--matri-card-border)',
              borderRadius: 10, padding: '10px 14px',
              color: 'var(--matri-text)', fontSize: 13,
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim() || addMutation.isPending}
            style={{
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              border: 'none', borderRadius: 10, padding: '0 14px',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Active list items */}
        <div style={{ marginBottom: 16 }}>
          {(active?.items ?? []).length === 0 && (
            <p style={{ color: 'var(--matri-text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Lista vacía — añade el primer item
            </p>
          )}
          {(active?.items ?? []).map((item: ShoppingItem) => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--matri-card-bg)',
              border: '1px solid var(--matri-card-border)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 6,
            }}>
              <input
                type="checkbox"
                checked={item.isChecked}
                onChange={() => toggleMutation.mutate({ id: item.id, isChecked: !item.isChecked })}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f59e0b' }}
              />
              <span style={{
                flex: 1, fontSize: 13, color: 'var(--matri-text)',
                textDecoration: item.isChecked ? 'line-through' : 'none',
                opacity: item.isChecked ? 0.5 : 1,
              }}>
                {item.text}
              </span>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <Trash2 size={14} color="#ef4444" />
              </button>
            </div>
          ))}
        </div>

        {/* Archive button */}
        {(active?.items ?? []).length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {!confirmArchive ? (
              <button
                onClick={() => setConfirmArchive(true)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
                  background: 'transparent', border: '1px dashed rgba(168,85,247,0.3)',
                  color: '#a855f7', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Archive size={14} /> Archivar lista y empezar nueva
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                    background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                    border: 'none', color: '#fff', fontSize: 12, fontWeight: 700,
                  }}
                >
                  Confirmar archivo
                </button>
                <button
                  onClick={() => setConfirmArchive(false)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                    background: 'transparent', border: '1px solid var(--matri-card-border)',
                    color: 'var(--matri-text-3)', fontSize: 12,
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* History accordion */}
        {history.length > 0 && (
          <div>
            <p style={{ color: 'var(--matri-text-3)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
              Listas anteriores
            </p>
            {history.map(list => (
              <details key={list.id} style={{ marginBottom: 8 }}>
                <summary style={{
                  background: 'var(--matri-card-bg)',
                  border: '1px solid var(--matri-card-border)',
                  borderRadius: 10, padding: '10px 14px',
                  fontSize: 12, color: 'var(--matri-text-2)', cursor: 'pointer',
                  listStyle: 'none',
                }}>
                  {new Date(list.archivedAt!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {list.items.length} items
                </summary>
                <div style={{ paddingLeft: 12, paddingTop: 4 }}>
                  {list.items.map(item => (
                    <div key={item.id} style={{
                      fontSize: 12, color: 'var(--matri-text-3)', padding: '4px 0',
                      textDecoration: item.isChecked ? 'line-through' : 'none',
                    }}>
                      {item.isChecked ? '✓' : '·'} {item.text}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
