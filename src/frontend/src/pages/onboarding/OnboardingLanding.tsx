import { useNavigate } from 'react-router-dom'

export function OnboardingLanding() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--matri-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>

      {/* Logo */}
      <div style={{ fontSize: 48, marginBottom: 8 }}>🏠</div>
      <h1 style={{ color: 'var(--matri-text)', fontSize: 28, fontWeight: 800, marginBottom: 4, textAlign: 'center' }}>
        Matripuntos
      </h1>
      <p style={{ color: 'var(--matri-text-2)', fontSize: 14, marginBottom: 40, textAlign: 'center' }}>
        El hogar justo, en pareja.
      </p>

      {/* Value props */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
        {[
          { icon: '⚖️', title: 'Equidad real', desc: 'Registrad lo que cada uno hace y negociad los puntos hasta quedar conformes.' },
          { icon: '🎮', title: 'Gamificado', desc: 'Rachas, logros y niveles para que cuidar el hogar sea menos un deber y más un juego.' },
          { icon: '🤝', title: 'Sin peleas innecesarias', desc: 'El historial habla por vosotros. Los datos no discuten.' },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              background: 'var(--matri-card-bg)',
              border: '1px solid var(--matri-card-border)',
              borderRadius: 12, padding: '14px 16px',
            }}
          >
            <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
            <div>
              <p style={{ color: 'var(--matri-text)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</p>
              <p style={{ color: 'var(--matri-text-2)', fontSize: 12, lineHeight: 1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => navigate('/signup')}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
          }}
        >
          Crear cuenta gratis
        </button>
        <button
          onClick={() => navigate('/login')}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'transparent',
            border: '1px solid var(--matri-card-border)',
            color: 'var(--matri-text-2)', fontWeight: 500, fontSize: 14, cursor: 'pointer',
          }}
        >
          Ya tengo cuenta
        </button>
      </div>
    </div>
  )
}
