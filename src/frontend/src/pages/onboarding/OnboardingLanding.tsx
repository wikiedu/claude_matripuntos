// v2.7.6 audit 09 S2-U-1 — reescritura con Tailwind v2 tokens.
// Antes: inline styles + var(--matri-*) legacy. Ahora todo Tailwind y
// alineado con el resto del v2 design system.

import { useNavigate } from 'react-router-dom'

export function OnboardingLanding() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-grad-page flex flex-col items-center justify-center px-6 py-8">
      <div className="text-5xl mb-2" aria-hidden="true">🏠</div>
      <h1 className="text-text-primary text-[28px] font-extrabold mb-1 text-center">
        Matripuntos
      </h1>
      <p className="text-text-secondary text-sm mb-10 text-center">
        El hogar justo, en pareja.
      </p>

      <div className="w-full max-w-[360px] flex flex-col gap-4 mb-10">
        {[
          { icon: '⚖️', title: 'Equidad real', desc: 'Registrad lo que cada uno hace y negociad los puntos hasta quedar conformes.' },
          { icon: '🎮', title: 'Gamificado', desc: 'Rachas, logros y niveles para que cuidar el hogar sea menos un deber y más un juego.' },
          { icon: '🤝', title: 'Sin peleas innecesarias', desc: 'El historial habla por vosotros. Los datos no discuten.' },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="flex gap-3.5 items-start bg-surface-card border border-brd-subtle rounded-md px-4 py-3.5"
          >
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
            <div>
              <p className="text-text-primary font-semibold text-sm mb-0.5">{title}</p>
              <p className="text-text-secondary text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-[360px] flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="w-full py-3.5 rounded-md bg-grad-cta text-white font-bold text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        >
          Crear cuenta gratis
        </button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full py-3.5 rounded-md bg-transparent border border-brd-subtle text-text-secondary font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
        >
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}
