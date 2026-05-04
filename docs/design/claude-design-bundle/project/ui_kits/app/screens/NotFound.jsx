// Matripuntos — NotFound (404 con humor)

function NotFoundScreen({ onGoHome, onNavigate }) {
  const phrases = [
    'Parece que esta página se fue de luna de miel 🌴',
    'Esta ruta desapareció sin pedir permiso 🫠',
    'Ni Carlos ni María saben dónde está esto 🤷',
  ];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  return (
    <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: 'transparent', backgroundImage: 'linear-gradient(135deg,#f59e0b,#a855f7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', letterSpacing: '-0.05em', lineHeight: 1 }}>
        404
      </div>
      <div style={{ fontSize: 36, marginTop: -4 }}>🔍💔</div>
      <h2 style={{ margin: '16px 0 0', fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>
        Esta página no existe
      </h2>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9ca3af', maxWidth: 280, lineHeight: 1.5 }}>
        {phrase}
      </p>

      <button onClick={onGoHome} style={{
        marginTop: 24, padding: '12px 24px', borderRadius: 10, border: 'none',
        background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
        fontSize: 14, fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
      }}>🏠 Volver al inicio</button>

      <div style={{ marginTop: 28, width: '100%', maxWidth: 280 }}>
        <Label style={{ marginBottom: 8, textAlign: 'left' }}>¿Quizás buscabas…?</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'tasks',     e: '✅', l: 'Tareas' },
            { id: 'analytics', e: '📊', l: 'Analítica' },
            { id: 'inbox',     e: '📥', l: 'Peticiones' },
            { id: 'settings',  e: '⚙️', l: 'Ajustes' },
          ].map(s => (
            <button key={s.id} onClick={() => onNavigate(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.15)',
              borderRadius: 10, cursor: 'pointer', textAlign: 'left', color: '#e2e8f0', fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontSize: 18 }}>{s.e}</span>
              <span style={{ flex: 1 }}>{s.l}</span>
              <span style={{ color: '#6b7280' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { NotFoundScreen });
