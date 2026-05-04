// Matripuntos — RequestInbox (ver peticiones recibidas / enviadas)

function RequestInboxScreen({ onBack, onAccept, onDecline, onCounter }) {
  const [tab, setTab] = React.useState('received');
  const RECEIVED = [
    { id: 'r1', from: 'Carlos', fromEmoji: '🦊', fromColor: '#f59e0b', type: 'activity', emoji: '📅', title: 'Cena el viernes', detail: 'Viernes · 21:00', offer: 8, note: 'Prueba el restaurante nuevo, invito yo 😉', when: 'hace 2 h', status: 'pending' },
    { id: 'r2', from: 'Carlos', fromEmoji: '🦊', fromColor: '#f59e0b', type: 'task', emoji: '🚗', title: 'Llevar el coche al taller', detail: 'Mañana', offer: 15, when: 'ayer', status: 'pending' },
    { id: 'r3', from: 'Carlos', fromEmoji: '🦊', fromColor: '#f59e0b', type: 'rule', emoji: '📜', title: 'Subir cocina a +2 MP', detail: 'Cambio de reglas', offer: 5, note: 'Porque siempre me toca a mí…', when: 'hace 3 d', status: 'countered' },
  ];
  const SENT = [
    { id: 's1', to: 'Carlos', toEmoji: '🦊', toColor: '#f59e0b', type: 'shop', emoji: '🛒', title: 'Comprar pan y leche', detail: 'Hoy', offer: 5, when: 'hace 30 min', status: 'pending' },
    { id: 's2', to: 'Carlos', toEmoji: '🦊', toColor: '#f59e0b', type: 'activity', emoji: '🎭', title: 'Teatro el sábado', detail: 'Sábado · 20:00', offer: 12, when: 'ayer', status: 'accepted' },
    { id: 's3', to: 'Carlos', toEmoji: '🦊', toColor: '#f59e0b', type: 'task', emoji: '🧺', title: 'Recoger la colada', detail: 'Hoy', offer: 3, when: 'hace 1 sem', status: 'declined' },
  ];
  const items = tab === 'received' ? RECEIVED : SENT;
  const pendCount = (tab === 'received' ? RECEIVED : SENT).filter(i => i.status === 'pending').length;

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>Peticiones</h2>
        {pendCount > 0 && <Pill tone="amber">{pendCount} pendientes</Pill>}
      </div>

      <div style={{ margin: '0 16px 14px', display: 'flex', gap: 6, padding: 4, background: 'rgba(26,16,53,0.6)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 12 }}>
        {[
          { id: 'received', label: '📥 Recibidas', count: RECEIVED.filter(r => r.status === 'pending').length },
          { id: 'sent',     label: '📤 Enviadas',  count: SENT.filter(r => r.status === 'pending').length },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
            color: tab === t.id ? '#fff' : '#9ca3af',
            fontSize: 13, fontWeight: 700,
          }}>
            {t.label} {t.count > 0 && <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.9 }}>· {t.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(r => (
          <RequestCard key={r.id} req={r} tab={tab}
            onAccept={() => onAccept(r)}
            onDecline={() => onDecline(r)}
            onCounter={() => onCounter(r)} />
        ))}
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

function RequestCard({ req, tab, onAccept, onDecline, onCounter }) {
  const statusTone = { pending: 'warn', accepted: 'success', declined: 'danger', countered: 'info' }[req.status];
  const statusLabel = { pending: '⏳ Pendiente', accepted: '✓ Aceptada', declined: '✗ Rechazada', countered: '↔ Contraoferta' }[req.status];
  return (
    <div style={{
      background: 'rgba(26,16,53,0.85)',
      border: `1px solid ${req.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(168,85,247,0.12)'}`,
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'rgba(168,85,247,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{req.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>{req.title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Avatar emoji={req.fromEmoji || req.toEmoji} color={req.fromColor || req.toColor} size="sm" />
            <span>{tab === 'received' ? `de ${req.from}` : `para ${req.to}`}</span>
            <span>·</span>
            <span>{req.detail}</span>
            <span>·</span>
            <span>{req.when}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {req.offer} MP
          </div>
          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>ofrece</div>
        </div>
      </div>

      {req.note && (
        <div style={{ padding: '8px 10px', background: 'rgba(168,85,247,0.06)', borderRadius: 8, fontSize: 12, color: '#c4b5fd', marginBottom: 10, lineHeight: 1.4, fontStyle: 'italic' }}>
          "{req.note}"
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <Pill tone={statusTone}>{statusLabel}</Pill>

        {tab === 'received' && req.status === 'pending' && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onDecline} style={{
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Rechazar</button>
            <button onClick={onCounter} style={{
              padding: '8px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>Negociar</button>
            <button onClick={onAccept} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>✓ Aceptar</button>
          </div>
        )}
        {tab === 'sent' && req.status === 'pending' && (
          <button style={{
            padding: '8px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(239,68,68,0.08)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          }}>Cancelar</button>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RequestInboxScreen });
