// Matripuntos — Login screen (hi-fi)
// Email + password clásico. Hay placeholders preparados para Google/Apple/OTP
// pero solo email funciona hasta que se conecte Google OAuth.

function LoginScreen({ onLogin, onGoSignup, onForgot }) {
  const [email, setEmail]       = React.useState('maria@ejemplo.com');
  const [password, setPassword] = React.useState('demo1234');
  const [showPwd, setShowPwd]   = React.useState(false);
  const [loading, setLoading]   = React.useState(false);

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin({ email }); }, 700);
  };

  return (
    <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40, paddingBottom: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
            background: 'linear-gradient(135deg,#f59e0b,#a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            boxShadow: '0 8px 24px rgba(168,85,247,0.4)',
          }}>💕</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            Matripuntos
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Vuestra relación, en equilibrio ✨
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Label style={{ marginBottom: 6 }}>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Label>Contraseña</Label>
              <button type="button" onClick={onForgot} style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                ¿Olvidada?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" style={{ width: '100%', padding: '12px 42px 12px 14px', fontSize: 14 }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, padding: 4,
              }}>{showPwd ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '14px', borderRadius: 12, border: 'none', cursor: loading ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
            fontSize: 15, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
            opacity: loading ? 0.8 : 1,
          }}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(168,85,247,0.15)' }} />
          <span style={{ fontSize: 11, color: '#6b7280' }}>o continúa con</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(168,85,247,0.15)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SocialButton icon="G" label="Google" disabled />
          <SocialButton icon="" label="Apple" disabled />
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
          Próximamente · Por ahora solo email
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 20px', fontSize: 13, color: '#9ca3af' }}>
        ¿Aún no tienes cuenta?{' '}
        <button onClick={onGoSignup} style={{ background: 'none', border: 'none', color: '#f59e0b', fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}>
          Crear cuenta
        </button>
      </div>
    </div>
  );
}

function SocialButton({ icon, label, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '11px 14px', borderRadius: 10,
      background: 'rgba(26,16,53,0.85)',
      border: '1px solid rgba(168,85,247,0.2)',
      color: '#e2e8f0', cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: 13, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );
}

Object.assign(window, { LoginScreen });
