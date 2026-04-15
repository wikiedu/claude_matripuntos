import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/apiClient'

interface BottomNavProps {
  onPlusPress?: () => void
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Inicio', icon: '🏠' },
  { path: '/tasks', label: 'Tareas', icon: '✅' },
  { path: '/calendar', label: 'Calendario', icon: '📅' },
  { path: '/achievements', label: 'Logros', icon: '🏆' },
]

export function BottomNav({ onPlusPress }: BottomNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showSheet, setShowSheet] = useState(false)
  const [shoppingInput, setShoppingInput] = useState('')
  const [todoInput, setTodoInput] = useState('')
  const [activeQuick, setActiveQuick] = useState<'shopping' | 'todo' | null>(null)

  const addShoppingMutation = useMutation({
    mutationFn: (text: string) => apiClient.shopping.addItem(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] })
      setShoppingInput('')
      setActiveQuick(null)
      setShowSheet(false)
    },
  })

  const addTodoMutation = useMutation({
    mutationFn: (text: string) => apiClient.todos.create({ text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
      setTodoInput('')
      setActiveQuick(null)
      setShowSheet(false)
    },
  })

  const handlePlusPress = () => {
    if (onPlusPress) { onPlusPress(); return }
    setShowSheet(true)
  }

  return (
    <>
      {/* Action sheet overlay */}
      {showSheet && (
        <div
          onClick={() => { setShowSheet(false); setActiveQuick(null) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 48,
          }}
        />
      )}

      {showSheet && (
        <div style={{
          position: 'fixed', bottom: 72, left: 16, right: 16, zIndex: 49,
          background: 'var(--matri-card-bg)',
          border: '1px solid var(--matri-card-border)',
          borderRadius: 16, padding: 16,
        }}>
          {activeQuick === null && (
            <>
              <p style={{ fontSize: 11, color: 'var(--matri-text-3)', textAlign: 'center', marginBottom: 12 }}>¿Qué quieres añadir?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/request-activity') }}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    color: 'var(--matri-amber)', fontSize: 11, fontWeight: 600,
                  }}
                >
                  📅 Actividad
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveQuick('shopping') }}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
                    color: '#a855f7', fontSize: 11, fontWeight: 600,
                  }}
                >
                  🛒 Compra
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveQuick('todo') }}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                    color: '#60a5fa', fontSize: 11, fontWeight: 600,
                  }}
                >
                  📝 To-do
                </button>
              </div>
            </>
          )}

          {activeQuick === 'shopping' && (
            <div onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: 11, color: 'var(--matri-text-3)', marginBottom: 8 }}>🛒 Añadir a la compra</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={shoppingInput}
                  onChange={e => setShoppingInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && shoppingInput.trim() && addShoppingMutation.mutate(shoppingInput.trim())}
                  placeholder="¿Qué necesitáis?"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--matri-card-border)',
                    borderRadius: 8, padding: '8px 12px',
                    color: 'var(--matri-text)', fontSize: 13,
                  }}
                />
                <button
                  onClick={() => shoppingInput.trim() && addShoppingMutation.mutate(shoppingInput.trim())}
                  disabled={!shoppingInput.trim() || addShoppingMutation.isPending}
                  style={{
                    background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
                    border: 'none', borderRadius: 8, padding: '0 14px',
                    color: '#fff', cursor: 'pointer', fontSize: 14,
                  }}
                >+</button>
              </div>
            </div>
          )}

          {activeQuick === 'todo' && (
            <div onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: 11, color: 'var(--matri-text-3)', marginBottom: 8 }}>📝 Nuevo to-do</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={todoInput}
                  onChange={e => setTodoInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && todoInput.trim() && addTodoMutation.mutate(todoInput.trim())}
                  placeholder="¿Qué tienes que hacer?"
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--matri-card-border)',
                    borderRadius: 8, padding: '8px 12px',
                    color: 'var(--matri-text)', fontSize: 13,
                  }}
                />
                <button
                  onClick={() => todoInput.trim() && addTodoMutation.mutate(todoInput.trim())}
                  disabled={!todoInput.trim() || addTodoMutation.isPending}
                  style={{
                    background: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
                    border: 'none', borderRadius: 8, padding: '0 14px',
                    color: '#fff', cursor: 'pointer', fontSize: 14,
                  }}
                >+</button>
              </div>
            </div>
          )}
        </div>
      )}

      <nav
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'var(--matri-card-bg)',
          borderTop: '1px solid var(--matri-card-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '8px 0 12px', zIndex: 50,
        }}
      >
        <NavItem icon={NAV_ITEMS[0].icon} label={NAV_ITEMS[0].label} active={location.pathname === NAV_ITEMS[0].path} onClick={() => navigate(NAV_ITEMS[0].path)} />
        <NavItem icon={NAV_ITEMS[1].icon} label={NAV_ITEMS[1].label} active={location.pathname === NAV_ITEMS[1].path} onClick={() => navigate(NAV_ITEMS[1].path)} />
        <button
          onClick={handlePlusPress}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff', cursor: 'pointer', marginTop: -20,
            boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
          }}
          aria-label="Nueva actividad"
        >
          +
        </button>
        <NavItem icon={NAV_ITEMS[2].icon} label={NAV_ITEMS[2].label} active={location.pathname === NAV_ITEMS[2].path} onClick={() => navigate(NAV_ITEMS[2].path)} />
        <NavItem icon={NAV_ITEMS[3].icon} label={NAV_ITEMS[3].label} active={location.pathname === NAV_ITEMS[3].path} onClick={() => navigate(NAV_ITEMS[3].path)} />
      </nav>
    </>
  )
}

interface NavItemProps {
  icon: string; label: string; active: boolean; onClick: () => void
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 9, color: active ? 'var(--matri-amber)' : 'var(--matri-text-3)', fontWeight: active ? 600 : 400 }}>
        {label}
      </span>
    </button>
  )
}
