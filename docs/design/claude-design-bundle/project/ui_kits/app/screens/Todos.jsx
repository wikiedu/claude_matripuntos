// Matripuntos — Todos (lista personal sin puntos)

function TodosScreen() {
  const [items, setItems] = React.useState([
    { id: 't1', text: 'Llamar al dentista', done: false, priority: 'high' },
    { id: 't2', text: 'Revisar factura de la luz', done: false, priority: 'med' },
    { id: 't3', text: 'Responder email a mamá', done: true, priority: 'low' },
    { id: 't4', text: 'Renovar suscripción gym', done: false, priority: 'med' },
  ]);
  const [draft, setDraft] = React.useState('');
  const add = () => {
    if (!draft.trim()) return;
    setItems(prev => [{ id: 'n'+Date.now(), text: draft.trim(), done: false, priority: 'med' }, ...prev]);
    setDraft('');
  };
  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const cyclePri = (id) => setItems(prev => prev.map(i => {
    if (i.id !== id) return i;
    const order = ['low','med','high'];
    return { ...i, priority: order[(order.indexOf(i.priority) + 1) % 3] };
  }));
  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);

  return (
    <div style={{ paddingTop: 4 }}>
      <div className="page-title">
        <h2>📝 Mis to-dos</h2>
        <Pill tone="purple">{pending.length} pendientes</Pill>
      </div>

      <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10, fontSize: 11, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔒</span>
        <span>Privados — tu pareja no los ve. No suman Matripuntos.</span>
      </div>

      <div style={{ margin: '0 16px 14px', display: 'flex', gap: 8 }}>
        <Input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Nuevo to-do…"
          style={{ flex: 1, padding: '12px 14px', fontSize: 14 }} />
        <button onClick={add} style={{
          padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff',
          fontSize: 16, fontWeight: 700,
        }}>＋</button>
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 8 }}>Pendientes ({pending.length})</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map(i => <TodoRow key={i.id} item={i} onToggle={toggle} onRemove={remove} onCyclePri={cyclePri} />)}
          {pending.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12 }}>
              <div style={{ fontSize: 24 }}>✨</div>
              <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>Nada pendiente. A descansar 🫶</div>
            </div>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <div style={{ margin: '0 16px 14px' }}>
          <Label style={{ marginBottom: 8 }}>✓ Hecho ({done.length})</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.map(i => <TodoRow key={i.id} item={i} onToggle={toggle} onRemove={remove} onCyclePri={cyclePri} />)}
          </div>
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

function TodoRow({ item, onToggle, onRemove, onCyclePri }) {
  const priColors = { low: { bg: 'rgba(156,163,175,0.1)', fg: '#9ca3af', label: '·' }, med: { bg: 'rgba(96,165,250,0.15)', fg: '#60a5fa', label: '◆' }, high: { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', label: '!' } };
  const p = priColors[item.priority];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10,
    }}>
      <button onClick={() => onToggle(item.id)} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        background: item.done ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'transparent',
        border: item.done ? 'none' : '2px solid rgba(168,85,247,0.35)',
        color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{item.done ? '✓' : ''}</button>
      <button onClick={() => onCyclePri(item.id)} aria-label="Prioridad" style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
        background: p.bg, border: 'none', color: p.fg, fontSize: 13, fontWeight: 800,
      }}>{p.label}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: item.done ? '#6b7280' : '#e2e8f0', fontWeight: 600, textDecoration: item.done ? 'line-through' : 'none' }}>
          {item.text}
        </div>
      </div>
      <button onClick={() => onRemove(item.id)} style={{
        background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', padding: 4,
      }}>✕</button>
    </div>
  );
}

Object.assign(window, { TodosScreen });
