// Matripuntos UI kit — Header + Bottom nav + FAB
// Pixel-match to src/frontend/src/components/BottomNav.tsx

function AppHeader({ user, partnerMood, partnerName, onTheme, onBell, onMenu }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const emoji = hour < 12 ? '☀️' : hour < 20 ? '🌤️' : '🌙';
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 16px 12px',
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(15,10,30,0.95)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(168,85,247,0.1)',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>
          {greeting} {emoji}
        </p>
        <h1 style={{ margin: '2px 0 0', color: '#e2e8f0', fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em' }}>
          {user.name.split(' ')[0]}
        </h1>
        {partnerMood && partnerName && (
          <p style={{ margin: '3px 0 0', color: '#9ca3af', fontSize: 11 }}>
            {partnerName} está {partnerMood} hoy
          </p>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBell} aria-label="Notificaciones" style={{
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
          width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
          color: '#e2e8f0', padding: 0, position: 'relative', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          🔔
          <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, background: '#ef4444', border: '1.5px solid rgba(15,10,30,1)' }} />
        </button>
        <button onClick={onMenu} aria-label="Más" style={{
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
          width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
          color: '#e2e8f0', padding: 0, fontSize: 18, fontWeight: 700, letterSpacing: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>⋯</button>
        <Avatar emoji={user.avatarEmoji} color={user.avatarColor} mood={user.mood} size="lg" />
      </div>
    </header>
  );
}

function HeaderMenu({ open, onClose, onNavigate, onLogout }) {
  if (!open) return null;
  const items = [
    { id: 'achievements', emoji: '🏆', title: 'Logros',    desc: '3/6 desbloqueados' },
    { id: 'profile',      emoji: '👤', title: 'Perfil',     desc: 'Mi cuenta' },
    { id: 'partner',      emoji: '💕', title: 'Pareja',     desc: 'Carlos · vinculado' },
    { id: 'rules',        emoji: '📜', title: 'Reglas',     desc: 'Puntos y multiplicadores' },
    { id: 'settings',     emoji: '⚙️', title: 'Ajustes',    desc: 'Notificaciones, idioma' },
    { id: 'help',         emoji: '❓', title: 'Ayuda',      desc: 'Cómo funciona' },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)', zIndex: 58,
      }} />
      <div style={{
        position: 'absolute', top: 68, right: 16, zIndex: 59,
        width: 260,
        background: 'rgba(26,16,53,0.98)',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: 14,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'hMenuIn 0.18s ease-out',
      }}>
        {items.map((it, i) => (
          <button
            key={it.id}
            onClick={() => { onNavigate(it.id); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '11px 12px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textAlign: 'left',
              borderTop: i > 0 ? '1px solid rgba(168,85,247,0.08)' : 'none',
            }}
          >
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{it.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{it.title}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{it.desc}</div>
            </div>
            <span style={{ color: '#6b7280', fontSize: 14 }}>›</span>
          </button>
        ))}
        <button
          onClick={() => { onLogout && onLogout(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '11px 12px',
            background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer',
            borderTop: '1px solid rgba(239,68,68,0.15)',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>🚪</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>Cerrar sesión</span>
        </button>
      </div>
      <style>{`
        @keyframes hMenuIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Inicio',     icon: '🏠' },
  { id: 'tasks',     label: 'Tareas',     icon: '✅' },
  { id: 'calendar',  label: 'Calendario', icon: '📅' },
  { id: 'analytics', label: 'Analítica',  icon: '📊' },
];

function BottomNav({ current, onNavigate, onFab }) {
  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(26,16,53,0.95)',
      borderTop: '1px solid rgba(168,85,247,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '8px 0 12px',
      backdropFilter: 'blur(10px)',
      maxWidth: 500, margin: '0 auto',
    }}>
      {left.map(it => <NavItem key={it.id} {...it} active={current === it.id} onClick={() => onNavigate(it.id)} />)}
      <button onClick={onFab} aria-label="Añadir" style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'linear-gradient(135deg,#f59e0b,#d97706)',
        border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
        marginTop: -20, boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>+</button>
      {right.map(it => <NavItem key={it.id} {...it} active={current === it.id} onClick={() => onNavigate(it.id)} />)}
    </nav>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px',
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 9, color: active ? '#f59e0b' : '#6b7280', fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

Object.assign(window, { AppHeader, HeaderMenu, BottomNav });
