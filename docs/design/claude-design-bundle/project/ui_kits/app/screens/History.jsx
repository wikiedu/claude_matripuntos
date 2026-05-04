// Matripuntos — History (feed + filtros)

function HistoryScreen({ onBack }) {
  const [who, setWho] = React.useState('all'); // all, me, partner
  const [cat, setCat] = React.useState('all');
  const [range, setRange] = React.useState('week'); // week, month, all

  const ALL = [
    { id: 'h1', who: 'me',      name: 'Tú',     action: 'completaste 🛒 compra semanal',     cat: 'compras',   delta: 15, when: 'hace 30 min', date: 'hoy' },
    { id: 'h2', who: 'partner', name: 'Carlos', action: 'completó 🐕 sacar a Luna',          cat: 'mascotas',  delta:  5, when: 'hace 2 h',     date: 'hoy' },
    { id: 'h3', who: 'partner', name: 'Carlos', action: 'aceptó petición 📅 cena viernes',    cat: 'general',   delta:  8, when: 'ayer',         date: 'ayer' },
    { id: 'h4', who: 'me',      name: 'Tú',     action: 'enviaste petición 🚗 al taller',     cat: 'logistica', delta:-15, when: 'ayer',         date: 'ayer' },
    { id: 'h5', who: 'me',      name: 'Tú',     action: 'completaste 🍳 cena',                 cat: 'cocina',    delta: 12, when: 'ayer',         date: 'ayer' },
    { id: 'h6', who: 'partner', name: 'Carlos', action: 'completó 🧹 aspiradora',             cat: 'limpieza',  delta:  8, when: 'hace 3 d',      date: 'hace 3 d' },
    { id: 'h7', who: 'me',      name: 'Tú',     action: 'desbloqueaste 🏆 Imparable',          cat: 'logros',    delta: 20, when: 'hace 3 d',      date: 'hace 3 d' },
    { id: 'h8', who: 'partner', name: 'Carlos', action: 'propuso 📜 nueva regla · cocina',     cat: 'reglas',    delta:  0, when: 'hace 4 d',      date: 'hace 4 d' },
  ];

  const filtered = ALL.filter(h => (who === 'all' || h.who === who) && (cat === 'all' || h.cat === cat));
  // group by date
  const groups = filtered.reduce((acc, h) => { (acc[h.date] = acc[h.date] || []).push(h); return acc; }, {});

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>Historial</h2>
        <Pill tone="purple">{filtered.length}</Pill>
      </div>

      <div style={{ margin: '0 16px 10px', display: 'flex', gap: 4, padding: 4, background: 'rgba(26,16,53,0.6)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10 }}>
        {[{id:'all',l:'Todos'},{id:'me',l:'Yo'},{id:'partner',l:'Carlos'}].map(w => (
          <button key={w.id} onClick={() => setWho(w.id)} style={{
            flex: 1, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: who === w.id ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
            color: who === w.id ? '#fff' : '#9ca3af',
            fontSize: 12, fontWeight: 700,
          }}>{w.l}</button>
        ))}
      </div>

      <div style={{ margin: '0 16px 10px', display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'all',       l: 'Todas' },
          { id: 'cocina',    l: '🍳 Cocina' },
          { id: 'limpieza',  l: '🧹 Limpieza' },
          { id: 'compras',   l: '🛒 Compras' },
          { id: 'mascotas',  l: '🐕 Mascotas' },
          { id: 'logistica', l: '📦 Logística' },
          { id: 'reglas',    l: '📜 Reglas' },
          { id: 'logros',    l: '🏆 Logros' },
        ].map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{
            padding: '6px 12px', borderRadius: 9999, cursor: 'pointer', flexShrink: 0,
            background: cat === c.id ? 'rgba(245,158,11,0.15)' : 'rgba(26,16,53,0.85)',
            color: cat === c.id ? '#f59e0b' : '#9ca3af',
            border: `1px solid ${cat === c.id ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
            fontSize: 11, fontWeight: 600,
          }}>{c.l}</button>
        ))}
      </div>

      <div style={{ margin: '0 16px 10px', display: 'flex', gap: 6 }}>
        {[{id:'week',l:'Esta semana'},{id:'month',l:'Este mes'},{id:'all',l:'Todo'}].map(r => (
          <button key={r.id} onClick={() => setRange(r.id)} style={{
            flex: 1, padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
            background: range === r.id ? 'rgba(168,85,247,0.15)' : 'transparent',
            color: range === r.id ? '#a855f7' : '#6b7280',
            border: `1px solid ${range === r.id ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.1)'}`,
            fontSize: 11, fontWeight: 600,
          }}>{r.l}</button>
        ))}
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        {Object.entries(groups).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{date}</div>
            <Card style={{ padding: 0 }}>
              {items.map((h, i) => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                  borderTop: i > 0 ? '1px solid rgba(168,85,247,0.08)' : 'none',
                }}>
                  <Avatar emoji={h.who === 'me' ? '🐼' : '🦊'} color={h.who === 'me' ? '#7c3aed' : '#f59e0b'} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.35 }}>
                      <strong>{h.name}</strong> {h.action}
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{h.when}</div>
                  </div>
                  {h.delta !== 0 && (
                    <span style={{ fontSize: 13, fontWeight: 800, color: h.delta > 0 ? '#22c55e' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                      {h.delta > 0 ? '+' : ''}{h.delta}
                    </span>
                  )}
                </div>
              ))}
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: 30 }}>🗒️</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Sin movimientos con estos filtros</div>
          </div>
        )}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

Object.assign(window, { HistoryScreen });
