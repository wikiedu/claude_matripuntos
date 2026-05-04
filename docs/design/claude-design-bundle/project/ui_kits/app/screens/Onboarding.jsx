// Matripuntos — Onboarding (6 pasos)
// bienvenida · nombre/avatar · invitar pareja · reglas de puntos · categorías · listo

function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState({
    name: '',
    avatarEmoji: '🐼',
    avatarColor: '#7c3aed',
    pairMethod: 'code',
    pairCode: '',
    rules: { dailyMult: 1.5, weeklyBonus: 0.25 },
    categories: ['cocina', 'limpieza'],
  });
  const set = (patch) => setData(d => ({ ...d, ...patch }));

  const steps = [
    { id: 'welcome',   title: 'Bienvenida',          comp: <StepWelcome /> },
    { id: 'profile',   title: 'Tu perfil',           comp: <StepProfile data={data} set={set} /> },
    { id: 'pair',      title: 'Invitar a tu pareja', comp: <StepPair data={data} set={set} /> },
    { id: 'rules',     title: 'Reglas de puntos',    comp: <StepRules data={data} set={set} /> },
    { id: 'cats',      title: 'Categorías',          comp: <StepCategories data={data} set={set} /> },
    { id: 'done',      title: '¡Todo listo!',        comp: <StepDone data={data} /> },
  ];
  const cur = steps[step];
  const isLast = step === steps.length - 1;
  const valid = step !== 1 || data.name.trim().length >= 2;

  return (
    <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
          aria-label="Volver"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
            color: '#e2e8f0', cursor: step === 0 ? 'not-allowed' : 'pointer',
            opacity: step === 0 ? 0.3 : 1, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>PASO {step+1} DE {steps.length}</div>
          <div style={{ fontSize: 16, color: '#e2e8f0', fontWeight: 700 }}>{cur.title}</div>
        </div>
        {!isLast && (
          <button onClick={() => onComplete(data)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
            Saltar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'linear-gradient(90deg,#f59e0b,#a855f7)' : 'rgba(168,85,247,0.12)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {cur.comp}
      </div>

      <div style={{ padding: '16px 0 20px' }}>
        <button
          onClick={() => isLast ? onComplete(data) : (valid && setStep(step + 1))}
          disabled={!valid}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: isLast ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.4,
            boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
          }}
        >
          {isLast ? '🎉 Empezar a usar Matripuntos' : 'Continuar →'}
        </button>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingBottom: 20 }}>
      <div style={{
        width: 120, height: 120, borderRadius: 30, marginBottom: 20,
        background: 'linear-gradient(135deg,#f59e0b,#a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 60, boxShadow: '0 12px 40px rgba(168,85,247,0.4)',
      }}>💕</div>
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
        Bienvenida a Matripuntos
      </h2>
      <p style={{ margin: '12px 0 0', fontSize: 14, color: '#9ca3af', lineHeight: 1.5, maxWidth: 280 }}>
        La app que convierte las tareas del hogar en un juego justo y divertido para vosotros dos.
      </p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        {[
          { icon: '⚖️', text: 'Equilibrio en la pareja' },
          { icon: '🏆', text: 'Puntos, niveles y logros' },
          { icon: '🔔', text: 'Peticiones entre ambos' },
        ].map(f => (
          <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(168,85,247,0.08)', borderRadius: 10, border: '1px solid rgba(168,85,247,0.15)' }}>
            <span style={{ fontSize: 20 }}>{f.icon}</span>
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{f.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepProfile({ data, set }) {
  const emojis = ['🐼','🦊','🐱','🐻','🦁','🐨','🐰','🦄','🐸','🐯','🐶','🐵'];
  const colors = ['#7c3aed','#f59e0b','#ec4899','#3b82f6','#22c55e','#ef4444'];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 12px',
          background: data.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 50, boxShadow: `0 8px 24px ${data.avatarColor}55`,
        }}>{data.avatarEmoji}</div>
        <Label>Tu avatar</Label>
      </div>
      <div>
        <Label style={{ marginBottom: 6 }}>Tu nombre</Label>
        <Input value={data.name} onChange={e => set({ name: e.target.value })}
          placeholder="María" style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
      </div>
      <div>
        <Label style={{ marginBottom: 8 }}>Elige un emoji</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {emojis.map(e => (
            <button key={e} onClick={() => set({ avatarEmoji: e })} style={{
              aspectRatio: '1', borderRadius: 10, cursor: 'pointer', fontSize: 22,
              background: data.avatarEmoji === e ? 'rgba(245,158,11,0.2)' : 'rgba(168,85,247,0.08)',
              border: `1px solid ${data.avatarEmoji === e ? 'rgba(245,158,11,0.5)' : 'rgba(168,85,247,0.15)'}`,
            }}>{e}</button>
          ))}
        </div>
      </div>
      <div>
        <Label style={{ marginBottom: 8 }}>Color</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          {colors.map(c => (
            <button key={c} onClick={() => set({ avatarColor: c })} style={{
              width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', background: c,
              border: data.avatarColor === c ? '3px solid #fff' : '3px solid transparent',
              boxShadow: data.avatarColor === c ? `0 0 0 2px ${c}` : 'none',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepPair({ data, set }) {
  const methods = [
    { id: 'code', emoji: '🔢', title: 'Código de 6 dígitos', desc: 'Te generamos uno para compartir' },
    { id: 'qr',   emoji: '📱', title: 'Código QR',             desc: 'Escanea desde el móvil de tu pareja' },
    { id: 'link', emoji: '🔗', title: 'Link mágico',            desc: 'Envíalo por WhatsApp o email' },
  ];
  const code = data.pairCode || '472·913';
  React.useEffect(() => { if (!data.pairCode) set({ pairCode: '472·913' }); }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
        Elige cómo quieres invitar a tu pareja. Podrá entrar con su cuenta y vincularse.
      </p>
      {methods.map(m => (
        <button key={m.id} onClick={() => set({ pairMethod: m.id })} style={{
          display: 'flex', gap: 12, padding: 14,
          background: data.pairMethod === m.id ? 'rgba(245,158,11,0.1)' : 'rgba(26,16,53,0.85)',
          border: `1px solid ${data.pairMethod === m.id ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
          borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{ fontSize: 26 }}>{m.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>{m.title}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{m.desc}</div>
          </div>
          {data.pairMethod === m.id && <span style={{ color: '#f59e0b', fontSize: 18 }}>✓</span>}
        </button>
      ))}

      {data.pairMethod === 'code' && (
        <div style={{ padding: 16, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'rgba(199,210,254,0.9)', fontWeight: 600, letterSpacing: '0.1em' }}>TU CÓDIGO</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '0.15em', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{code}</div>
          <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.8)', marginTop: 4 }}>Caduca en 24 horas</div>
        </div>
      )}
      {data.pairMethod === 'qr' && (
        <div style={{ padding: 16, background: '#fff', borderRadius: 14, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 140, height: 140, background: 'repeating-conic-gradient(#000 0deg 10deg, #fff 10deg 20deg)', borderRadius: 8, border: '4px solid #fff' }} />
        </div>
      )}
      {data.pairMethod === 'link' && (
        <button style={{ padding: '14px', borderRadius: 12, border: 'none', background: 'rgba(168,85,247,0.15)', color: '#a855f7', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          🔗 Copiar link de invitación
        </button>
      )}
    </div>
  );
}

function StepRules({ data, set }) {
  const setRule = (k, v) => set({ rules: { ...data.rules, [k]: v } });
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
        Estas reglas dan más valor a los días seguidos y al equilibrio. Podréis cambiarlas después.
      </p>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>🔥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Bonus por racha</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Multiplicador si completas días seguidos</div>
          </div>
          <Pill tone="amber">×{data.rules.dailyMult.toFixed(1)}</Pill>
        </div>
        <input type="range" min="1" max="3" step="0.1" value={data.rules.dailyMult}
          onChange={e => setRule('dailyMult', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280' }}>
          <span>×1.0</span><span>×2.0</span><span>×3.0</span>
        </div>
      </Card>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>⚖️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Bonus equilibrio</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Extra si acabáis la semana parejos</div>
          </div>
          <Pill tone="purple">+{Math.round(data.rules.weeklyBonus * 100)}%</Pill>
        </div>
        <input type="range" min="0" max="0.5" step="0.05" value={data.rules.weeklyBonus}
          onChange={e => setRule('weeklyBonus', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#a855f7' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280' }}>
          <span>0%</span><span>+25%</span><span>+50%</span>
        </div>
      </Card>
    </div>
  );
}

function StepCategories({ data, set }) {
  const ALL = [
    { id: 'cocina',    emoji: '🍳', label: 'Cocina' },
    { id: 'limpieza',  emoji: '🧹', label: 'Limpieza' },
    { id: 'compras',   emoji: '🛒', label: 'Compras' },
    { id: 'mascotas',  emoji: '🐕', label: 'Mascotas' },
    { id: 'niños',     emoji: '👶', label: 'Niños' },
    { id: 'finanzas',  emoji: '💰', label: 'Finanzas' },
    { id: 'jardin',    emoji: '🌿', label: 'Jardín' },
    { id: 'mantenimiento', emoji: '🔧', label: 'Mantenimiento' },
    { id: 'logistica', emoji: '📦', label: 'Logística' },
  ];
  const toggle = (id) => set({ categories: data.categories.includes(id) ? data.categories.filter(c => c !== id) : [...data.categories, id] });
  return (
    <div style={{ flex: 1 }}>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: '#9ca3af' }}>
        Elige las categorías que usaréis. Podréis añadir más después.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {ALL.map(c => (
          <button key={c.id} onClick={() => toggle(c.id)} style={{
            padding: '14px 6px', borderRadius: 12, cursor: 'pointer',
            background: data.categories.includes(c.id) ? 'rgba(245,158,11,0.12)' : 'rgba(26,16,53,0.85)',
            border: `1px solid ${data.categories.includes(c.id) ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 24 }}>{c.emoji}</span>
            <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>{c.label}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
        {data.categories.length} seleccionadas
      </div>
    </div>
  );
}

function StepDone({ data }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#e2e8f0' }}>
        ¡Todo listo{data.name ? `, ${data.name}` : ''}!
      </h2>
      <p style={{ margin: '12px 0 20px', fontSize: 13, color: '#9ca3af', maxWidth: 280 }}>
        Ya puedes empezar a registrar tareas, ganar Matripuntos y pedirle cosas a tu pareja.
      </p>
      <div style={{ padding: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: 14, width: '100%', maxWidth: 280 }}>
        <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.9)', fontWeight: 600 }}>PRIMER REGALO</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 2 }}>+10 MP</div>
        <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.85)', marginTop: 2 }}>por empezar con buen pie ✨</div>
      </div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen });
