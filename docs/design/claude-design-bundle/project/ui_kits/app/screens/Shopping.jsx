// Matripuntos — Shopping (lista simple)

function ShoppingScreen() {
  const [items, setItems] = React.useState([
    { id: 's1', text: 'Pan', done: false, by: 'María' },
    { id: 's2', text: 'Leche desnatada', done: false, by: 'María' },
    { id: 's3', text: 'Huevos', done: true, by: 'Carlos' },
    { id: 's4', text: 'Tomates', done: false, by: 'Carlos' },
    { id: 's5', text: 'Café', done: true, by: 'María' },
    { id: 's6', text: 'Papel higiénico', done: false, by: 'María' },
  ]);
  const [draft, setDraft] = React.useState('');
  const add = () => {
    if (!draft.trim()) return;
    setItems(prev => [{ id: 'n'+Date.now(), text: draft.trim(), done: false, by: 'María' }, ...prev]);
    setDraft('');
  };
  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));
  const pending = items.filter(i => !i.done);
  const done = items.filter(i => i.done);

  return (
    <div style={{ paddingTop: 4 }}>
      <div className="page-title">
        <h2>🛒 Compra</h2>
        <Pill tone="amber">{pending.length} por comprar</Pill>
      </div>

      <div style={{ margin: '0 16px 14px', display: 'flex', gap: 8 }}>
        <Input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Añadir a la lista…"
          style={{ flex: 1, padding: '12px 14px', fontSize: 14 }} />
        <button onClick={add} style={{
          padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
          fontSize: 16, fontWeight: 700,
        }}>＋</button>
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 8 }}>Por comprar ({pending.length})</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map(i => <ShopRow key={i.id} item={i} onToggle={toggle} onRemove={remove} />)}
          {pending.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12 }}>
              <div style={{ fontSize: 24 }}>🎉</div>
              <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>¡Compra hecha!</div>
            </div>
          )}
        </div>
      </div>

      {done.length > 0 && (
        <div style={{ margin: '0 16px 14px' }}>
          <Label style={{ marginBottom: 8 }}>✓ Hecho ({done.length})</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.map(i => <ShopRow key={i.id} item={i} onToggle={toggle} onRemove={remove} />)}
          </div>
        </div>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

function ShopRow({ item, onToggle, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10,
    }}>
      <button onClick={() => onToggle(item.id)} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
        background: item.done ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'transparent',
        border: item.done ? 'none' : '2px solid rgba(168,85,247,0.35)',
        color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{item.done ? '✓' : ''}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: item.done ? '#6b7280' : '#e2e8f0', fontWeight: 600, textDecoration: item.done ? 'line-through' : 'none' }}>
          {item.text}
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>añadido por {item.by}</div>
      </div>
      <button onClick={() => onRemove(item.id)} style={{
        background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', padding: 4,
      }}>✕</button>
    </div>
  );
}

Object.assign(window, { ShoppingScreen });
