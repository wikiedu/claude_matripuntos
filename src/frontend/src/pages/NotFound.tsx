import { useNavigate } from 'react-router-dom'
import { CheckSquare, MessageSquare, Settings, ChevronRight } from 'lucide-react'
import { Button } from '../components/v2/primitives/Button'

const SUGGESTIONS: { icon: typeof CheckSquare; label: string; to: string }[] = [
  { icon: CheckSquare,    label: 'Mis tareas', to: '/tasks' },
  { icon: MessageSquare,  label: 'Negociar',   to: '/request-inbox' },
  { icon: Settings,       label: 'Ajustes',    to: '/settings' },
]

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div
          className="mx-auto mb-6 w-24 h-24 rounded-xl bg-grad-cta flex items-center justify-center text-5xl shadow-xl shadow-brand-amber/20"
          aria-hidden
        >
          🌸
        </div>

        <h1 className="text-[20px] font-extrabold text-text-primary leading-tight">
          Esta página se fue de paseo
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          No pasa nada, aquí tienes por dónde seguir
        </p>

        <div className="mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate('/dashboard')}>
            🏠 Volver al inicio
          </Button>
        </div>

        <div className="mt-6 space-y-2 text-left">
          {SUGGESTIONS.map(({ icon: Icon, label, to }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-md bg-surface-card border border-brd-subtle text-text-secondary hover:text-text-primary hover:border-brd-purple transition"
            >
              <Icon className="w-4 h-4 text-brand-purple flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold">{label}</span>
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
