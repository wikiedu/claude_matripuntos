// Matripuntos — Settings (7 secciones)

function SettingsScreen({ onBack, onLogout }) {
  const [section, setSection] = React.useState(null);

  const SECTIONS = [
    { id: 'profile',   emoji: '👤', title: 'Perfil y avatar',         desc: 'María Ruiz · 🐼' },
    { id: 'partner',   emoji: '💕', title: 'Pareja',                   desc: 'Carlos · vinculado' },
    { id: 'notif',     emoji: '🔔', title: 'Notificaciones',            desc: 'Push, email, horarios' },
    { id: 'premium',   emoji: '👑', title: 'Suscripción Premium',       desc: 'Gratis', badge: 'Upgrade' },
    { id: 'rules',     emoji: '📜', title: 'Reglas de puntos',           desc: 'Multiplicadores' },
    { id: 'display',   emoji: '🎨', title: 'Idioma y tema',              desc: 'Español · Oscuro' },
    { id: 'privacy',   emoji: '🔒', title: 'Privacidad y datos',         desc: 'Exportar, eliminar' },
  ];

  if (section) return <SettingsDetail section={section} onBack={() => setSection(null)} />;

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>Ajustes</h2>
      </div>

      <div style={{ margin: '0 16px 14px', padding: 16, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar emoji="🐼" color="#7c3aed" size="lg" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>María Ruiz</div>
          <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.85)' }}>maria@ejemplo.com</div>
        </div>
        <button style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Editar</button>
      </div>

      <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s)} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.12)',
            borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          }}>
            <span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{s.title}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{s.desc}</div>
            </div>
            {s.badge && <Pill tone="amber">{s.badge}</Pill>}
            <span style={{ color: '#6b7280', fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <button onClick={onLogout} style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#f87171', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>🚪 Cerrar sesión</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: '#6b7280', padding: '8px 0 20px' }}>
        Matripuntos v2.0 · Hecho con 💕
      </div>
    </div>
  );
}

function SettingsDetail({ section, onBack }) {
  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>
          {section.emoji} {section.title}
        </h2>
      </div>
      {section.id === 'notif'   && <NotifSettings />}
      {section.id === 'rules'   && <RulesSettings />}
      {section.id === 'premium' && <PremiumSettings />}
      {section.id === 'display' && <DisplaySettings />}
      {section.id === 'partner' && <PartnerSettings />}
      {section.id === 'profile' && <ProfileSettings />}
      {section.id === 'privacy' && <PrivacySettings />}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 42, height: 24, borderRadius: 12,
      background: on ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.1)',
      border: 'none', cursor: 'pointer', padding: 2, position: 'relative',
      transition: 'background 0.2s',
    }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', marginLeft: on ? 18 : 0, transition: 'margin 0.2s' }} />
    </button>
  );
}

function NotifSettings() {
  const [s, setS] = React.useState({ push: true, email: false, tasks: true, requests: true, streak: true, quiet: true });
  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }));
  const rows = [
    { k: 'push',     t: 'Push notifications', d: 'Alertas en tu teléfono' },
    { k: 'email',    t: 'Email',              d: 'Resumen semanal' },
    { k: 'tasks',    t: 'Nuevas tareas',      d: 'Cuando tu pareja te asigne algo' },
    { k: 'requests', t: 'Peticiones',         d: 'Recibidas y respuestas' },
    { k: 'streak',   t: 'Recordatorios racha', d: 'No rompas los días seguidos' },
    { k: 'quiet',    t: 'Modo silencioso',    d: 'De 22:00 a 08:00' },
  ];
  return (
    <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{r.t}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{r.d}</div>
          </div>
          <Toggle on={s[r.k]} onChange={v => set(r.k, v)} />
        </div>
      ))}
    </div>
  );
}

function RulesSettings() {
  const [dailyMult, setDailyMult] = React.useState(1.5);
  const [weekly, setWeekly] = React.useState(0.25);
  return (
    <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Multiplicador de racha</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Más puntos con días seguidos</div>
          </div>
          <Pill tone="amber">×{dailyMult.toFixed(1)}</Pill>
        </div>
        <input type="range" min="1" max="3" step="0.1" value={dailyMult} onChange={e => setDailyMult(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#f59e0b' }} />
      </Card>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>⚖️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Bonus equilibrio</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Extra si semana pareja</div>
          </div>
          <Pill tone="purple">+{Math.round(weekly*100)}%</Pill>
        </div>
        <input type="range" min="0" max="0.5" step="0.05" value={weekly} onChange={e => setWeekly(parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#a855f7' }} />
      </Card>
      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', padding: '8px 12px' }}>
        ⚠️ Cambios requieren aprobación de Carlos
      </div>
    </div>
  );
}

function PremiumSettings() {
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ padding: 20, background: 'linear-gradient(135deg,#1a1138,#2d1e5f)', border: '1.5px solid rgba(245,158,11,0.5)', borderRadius: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>👑</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4 }}>Matripuntos Premium</div>
        <div style={{ fontSize: 12, color: '#c4b5fd', marginTop: 4, lineHeight: 1.4 }}>
          Analítica avanzada, categorías ilimitadas, export de datos y más.
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', marginTop: 14 }}>3,99€<span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>/mes</span></div>
        <button style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Empezar prueba gratis de 7 días
        </button>
      </div>
    </div>
  );
}

function DisplaySettings() {
  const [theme, setTheme] = React.useState('dark');
  const [lang, setLang] = React.useState('es');
  return (
    <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <Label style={{ marginBottom: 8 }}>Tema</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[{id:'dark',e:'🌙',l:'Oscuro'},{id:'light',e:'☀️',l:'Claro'},{id:'auto',e:'🔄',l:'Auto'}].map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{
              padding: 14, borderRadius: 12, cursor: 'pointer',
              background: theme === t.id ? 'rgba(245,158,11,0.1)' : 'rgba(26,16,53,0.85)',
              border: `1px solid ${theme === t.id ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 22 }}>{t.e}</span>
              <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{t.l}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label style={{ marginBottom: 8 }}>Idioma</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[{id:'es',l:'Español',f:'🇪🇸'},{id:'en',l:'English',f:'🇬🇧'},{id:'ca',l:'Català',f:'🏳'}].map(l => (
            <button key={l.id} onClick={() => setLang(l.id)} style={{
              padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              background: lang === l.id ? 'rgba(245,158,11,0.1)' : 'rgba(26,16,53,0.85)',
              border: `1px solid ${lang === l.id ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
              display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: 13, fontWeight: 600,
            }}>
              <span style={{ fontSize: 18 }}>{l.f}</span>
              <span style={{ flex: 1 }}>{l.l}</span>
              {lang === l.id && <span style={{ color: '#f59e0b' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PartnerSettings() {
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <Card style={{ padding: 16, textAlign: 'center' }}>
        <Avatar emoji="🦊" color="#f59e0b" size="lg" />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginTop: 8 }}>Carlos Vidal</div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>carlos@ejemplo.com</div>
        <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>✓ Vinculado desde hace 3 meses</div>
      </Card>
      <button style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
        Desvincular pareja
      </button>
    </div>
  );
}

function ProfileSettings() {
  const [name, setName] = React.useState('María Ruiz');
  const [email, setEmail] = React.useState('maria@ejemplo.com');
  return (
    <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <Avatar emoji="🐼" color="#7c3aed" size="lg" />
        <button style={{ display: 'block', margin: '8px auto 0', background: 'none', border: 'none', color: '#a855f7', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Cambiar avatar</button>
      </div>
      <div><Label style={{ marginBottom: 6 }}>Nombre</Label>
        <Input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} /></div>
      <div><Label style={{ marginBottom: 6 }}>Email</Label>
        <Input value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} /></div>
      <button style={{ padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Guardar cambios</button>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div style={{ margin: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { e: '📥', t: 'Exportar mis datos', d: 'Descarga un archivo con todo' },
        { e: '🔐', t: 'Cambiar contraseña', d: 'Por seguridad cada 3 meses' },
        { e: '👁️', t: 'Sesiones activas',    d: '2 dispositivos vinculados' },
        { e: '🗑️', t: 'Eliminar cuenta',      d: 'Acción irreversible', danger: true },
      ].map(r => (
        <button key={r.t} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
          background: 'rgba(26,16,53,0.85)', border: `1px solid ${r.danger ? 'rgba(239,68,68,0.25)' : 'rgba(168,85,247,0.12)'}`,
          borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        }}>
          <span style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{r.e}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: r.danger ? '#f87171' : '#e2e8f0', fontWeight: 700 }}>{r.t}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{r.d}</div>
          </div>
          <span style={{ color: '#6b7280', fontSize: 16 }}>›</span>
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { SettingsScreen });
