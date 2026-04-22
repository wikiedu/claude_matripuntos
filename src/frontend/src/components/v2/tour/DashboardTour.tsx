// Simple first-visit onboarding tour for the Dashboard. Centered modal
// that walks through 5 key concepts. Persisted as "seen" in localStorage
// so it shows exactly once per device. Intentionally centered (not
// arrow-pinned to DOM nodes) to avoid brittle positioning across
// viewports and re-renders.

import { useState } from 'react'
import { Sparkles, Plus, Bell, Scale, ListChecks, X } from 'lucide-react'
import { Button } from '../primitives/Button'

const TOUR_KEY = 'matripuntos_tour_v1_seen'

export function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_KEY) === '1'
  } catch {
    return true
  }
}

export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1')
  } catch {
    /* quota/privacy — ignore */
  }
}

interface Step {
  icon: typeof Sparkles
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bienvenid@ a Matripuntos',
    body: 'Un repartidor honesto de responsabilidades del hogar. En 30 segundos te cuento lo esencial.',
  },
  {
    icon: Scale,
    title: 'El Balance manda',
    body: 'El hero del dashboard te dice quién va por delante esta semana. Si está equilibrado, genial; si no, es una pista para charlar.',
  },
  {
    icon: Plus,
    title: 'Suma actividad con el botón central',
    body: 'Desde la barra inferior puedes registrar una tarea de hoy o proponer un evento puntual (cena, viaje...) a tu pareja.',
  },
  {
    icon: ListChecks,
    title: 'Las tareas son negociables',
    body: 'Tu pareja puede verificar lo que hiciste en 24 h o disputar los puntos. Si pasa el tiempo, se acepta solo.',
  },
  {
    icon: Bell,
    title: 'Nada se pierde',
    body: 'Las notificaciones (arriba a la derecha) te avisan de cada propuesta, respuesta y tarea disputada. Puedes filtrarlas por categoría.',
  },
]

interface Props {
  onClose: () => void
}

export function DashboardTour({ onClose }: Props) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const Icon = step.icon
  const isLast = i === STEPS.length - 1

  function finish() {
    markTourSeen()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-surface-card border border-brd-purple p-6 shadow-2xl">
        <button
          type="button"
          onClick={finish}
          aria-label="Cerrar tour"
          className="absolute top-3 right-3 w-8 h-8 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-brand-purple/20 border border-brand-purple flex items-center justify-center mb-3 text-brand-purple">
          <Icon className="w-6 h-6" />
        </div>
        <h2 id="tour-title" className="text-lg font-extrabold text-text-primary mb-1">
          {step.title}
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">{step.body}</p>

        <div className="mt-5 flex items-center justify-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? 'w-6 bg-brand-purple' : 'w-1.5 bg-brd-subtle'
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" size="sm" onClick={finish} className="flex-1">
            Saltar
          </Button>
          {isLast ? (
            <Button size="sm" onClick={finish} className="flex-1">
              Empezar
            </Button>
          ) : (
            <Button size="sm" onClick={() => setI((n) => Math.min(n + 1, STEPS.length - 1))} className="flex-1">
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
