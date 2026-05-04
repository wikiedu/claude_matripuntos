// Matripuntos — RequestActivity (crear petición a pareja)
// Las peticiones consumen MP del que pide. 4 tipos: tarea, actividad, compra, regla.

function RequestActivityScreen({ onBack, onSend, balance = 15.5 }) {
  const [type, setType] = React.useState('activity');
  const [title, setTitle] = React.useState('');
  const [when, setWhen]   = React.useState('Hoy');
  const [offer, setOffer] = React.useState(10);
  const [note, setNote]   = React.useState('');

  const types = [
    { id: 'task',     emoji: '✅', title: 'Tarea',      desc: 'Pide que haga una tarea' },
    { id: 'activity', emoji: '📅', title: 'Actividad',   desc: 'Propón un plan o evento' },
    { id: 'shop',     emoji: '🛒', title: 'Compra',      desc: 'Pídele que compre algo' },
    { id: 'rule',     emoji: '📜', title: 'Cambio de regla', desc: 'Ajustar puntos o reparto' },
  ];
  const insufficient = offer > balance;
  const valid = title.trim().length >= 2 && !insufficient;

  return (
    <div style={{ paddingTop: 4, paddingBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>Nueva petición</h2>
        <Pill tone="amber">Tu balance: {balance.toFixed(1)} MP</Pill>
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 8 }}>Tipo de petición</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {types.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              background: type === t.id ? 'rgba(245,158,11,0.1)' : 'rgba(26,16,53,0.85)',
              border: `1px solid ${type === t.id ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
            }}>
              <div style={{ fontSize: 22, marginBottom: 2 }}>{t.emoji}</div>
              <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{t.title}</div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 6 }}>¿Qué le pides a Carlos?</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={type === 'task' ? 'Ej: sacar la basura' : type === 'activity' ? 'Ej: cena el viernes' : type === 'shop' ? 'Ej: comprar pan' : 'Ej: subir cocina a +2 MP'}
          style={{ width: '100%', padding: '12px 14px', fontSize: 14 }} />
      </div>

      {(type === 'task' || type === 'activity') && (
        <div style={{ margin: '0 16px 14px' }}>
          <Label style={{ marginBottom: 6 }}>¿Cuándo?</Label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Hoy','Mañana','Esta semana','Fin de semana'].map(w => (
              <button key={w} onClick={() => setWhen(w)} style={{
                padding: '8px 14px', borderRadius: 9999, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: when === w ? 'rgba(168,85,247,0.18)' : 'rgba(26,16,53,0.85)',
                color: when === w ? '#a855f7' : '#e2e8f0',
                border: `1px solid ${when === w ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.15)'}`,
              }}>{w}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ margin: '0 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 }}>
          <Label>💰 Ofreces por esta petición</Label>
          <span style={{ fontSize: 18, fontWeight: 800, color: insufficient ? '#f87171' : '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
            {offer} MP
          </span>
        </div>
        <input type="range" min="1" max="50" step="1" value={offer} onChange={e => setOffer(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: insufficient ? '#ef4444' : '#f59e0b' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginTop: 2 }}>
          <span>1 MP</span><span>25 MP</span><span>50 MP</span>
        </div>
        {insufficient && (
          <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 11, color: '#f87171' }}>
            ⚠️ No tienes suficientes MP. Completa tareas para ganar más.
          </div>
        )}
      </div>

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 6 }}>Nota (opcional)</Label>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder="Algo que quieras añadir…"
          style={{
            width: '100%', padding: '10px 12px', fontSize: 13, color: '#e2e8f0', font: 'inherit',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: 8, outline: 'none', resize: 'none', minHeight: 60, boxSizing: 'border-box',
          }} />
      </div>

      <div style={{ margin: '0 16px 14px', padding: 12, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10 }}>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Resumen</div>
        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
          Pides a <strong style={{ color: '#ec4899' }}>Carlos</strong> que <strong>{title || '…'}</strong>
          {(type === 'task' || type === 'activity') && <> · <span style={{ color: '#a855f7' }}>{when}</span></>}.
          Le ofreces <strong style={{ color: '#f59e0b' }}>{offer} MP</strong>.
        </div>
      </div>

      <div style={{ margin: '0 16px' }}>
        <button onClick={() => valid && onSend({ type, title, when, offer, note })} disabled={!valid}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed',
            opacity: valid ? 1 : 0.4,
            boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
          }}>
          📤 Enviar petición · −{offer} MP
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { RequestActivityScreen });
