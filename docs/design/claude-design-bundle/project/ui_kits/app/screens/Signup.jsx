// Matripuntos — Signup screen (hi-fi)

function SignupScreen({ onSignup, onGoLogin }) {
  const [step, setStep] = React.useState(1);
  const [data, setData] = React.useState({
    name: '', email: '', password: '', confirm: '', accept: false,
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const validStep1 = data.email.includes('@') && data.password.length >= 6 && data.password === data.confirm;
  const validStep2 = data.name.trim().length >= 2 && data.accept;

  return (
    <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
        <button onClick={() => step > 1 ? setStep(step - 1) : onGoLogin()} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
          color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>PASO {step} DE 2</div>
          <div style={{ fontSize: 16, color: '#e2e8f0', fontWeight: 700 }}>
            {step === 1 ? 'Crea tu cuenta' : 'Cuéntanos de ti'}
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: 'rgba(168,85,247,0.12)', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ width: step === 1 ? '50%' : '100%', height: '100%', background: 'linear-gradient(90deg,#f59e0b,#a855f7)', transition: 'width 0.3s' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label style={{ marginBottom: 6 }}>Email</Label>
              <Input type="email" value={data.email} onChange={e => set('email', e.target.value)}
                placeholder="tu@email.com" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
            </div>
            <div>
              <Label style={{ marginBottom: 6 }}>Contraseña</Label>
              <Input type="password" value={data.password} onChange={e => set('password', e.target.value)}
                placeholder="mínimo 6 caracteres" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
              <PasswordStrength value={data.password} />
            </div>
            <div>
              <Label style={{ marginBottom: 6 }}>Confirmar contraseña</Label>
              <Input type="password" value={data.confirm} onChange={e => set('confirm', e.target.value)}
                placeholder="repite la contraseña" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
              {data.confirm && data.confirm !== data.password && (
                <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Las contraseñas no coinciden</div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label style={{ marginBottom: 6 }}>¿Cómo te llamas?</Label>
              <Input value={data.name} onChange={e => set('name', e.target.value)}
                placeholder="Tu nombre" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
            </div>
            <div style={{
              padding: 12, background: 'rgba(168,85,247,0.08)',
              borderRadius: 10, border: '1px solid rgba(168,85,247,0.2)',
            }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={data.accept} onChange={e => set('accept', e.target.checked)}
                  style={{ marginTop: 2, accentColor: '#f59e0b', width: 16, height: 16 }} />
                <span style={{ fontSize: 12, color: '#c4b5fd', lineHeight: 1.4 }}>
                  Acepto los <strong style={{ color: '#a855f7' }}>Términos de uso</strong> y la{' '}
                  <strong style={{ color: '#a855f7' }}>Política de privacidad</strong>.
                </span>
              </label>
            </div>
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <button
            onClick={() => step === 1 ? (validStep1 && setStep(2)) : (validStep2 && onSignup(data))}
            disabled={step === 1 ? !validStep1 : !validStep2}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: (step === 1 ? validStep1 : validStep2) ? 'pointer' : 'not-allowed',
              opacity: (step === 1 ? validStep1 : validStep2) ? 1 : 0.4,
              boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            }}
          >
            {step === 1 ? 'Siguiente' : 'Crear cuenta →'}
          </button>
          <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 12, color: '#9ca3af' }}>
            ¿Ya tienes cuenta?{' '}
            <button onClick={onGoLogin} style={{ background: 'none', border: 'none', color: '#a855f7', fontWeight: 700, cursor: 'pointer', fontSize: 12, padding: 0 }}>
              Inicia sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ value }) {
  const score = Math.min(4, [value.length >= 6, /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)].filter(Boolean).length);
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'];
  const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#22c55e'];
  if (!value) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score] : 'rgba(255,255,255,0.08)',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: colors[score], marginTop: 4, fontWeight: 600 }}>
        {labels[score]}
      </div>
    </div>
  );
}

Object.assign(window, { SignupScreen });
