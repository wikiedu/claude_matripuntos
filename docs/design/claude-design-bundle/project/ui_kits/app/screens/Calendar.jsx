// Matripuntos — Calendar (mes + semana + creación de eventos)

function CalendarScreen({ onNewEvent }) {
  const [view, setView] = React.useState('month');
  const [selected, setSelected] = React.useState(new Date().getDate());
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // L=0
  const events = {
    5:  [{ emoji: '🎂', color: '#f59e0b' }],
    12: [{ emoji: '🍕', color: '#a855f7' }],
    14: [{ emoji: '🩺', color: '#60a5fa' }],
    18: [{ emoji: '🎭', color: '#ec4899' }, { emoji: '🛒', color: '#22c55e' }],
    22: [{ emoji: '🎂', color: '#f59e0b' }],
    23: [{ emoji: '🍕', color: '#a855f7' }],
    24: [{ emoji: '🩺', color: '#60a5fa' }],
    27: [{ emoji: '🎭', color: '#ec4899' }],
  };
  const UPCOMING = [
    { id: 'e1', day: '22', month: 'abr', emoji: '🎂', title: 'Cumple de Sofía', time: '18:00', assignee: 'Los dos', status: 'Confirmado', tone: 'success' },
    { id: 'e2', day: '23', month: 'abr', emoji: '🍕', title: 'Cena con Marta', time: '21:00', assignee: 'Los dos', status: 'Confirmado', tone: 'success' },
    { id: 'e3', day: '24', month: 'abr', emoji: '🩺', title: 'Pediatra', time: '10:30', assignee: 'Carlos', status: 'Por negociar', tone: 'warn' },
    { id: 'e4', day: '27', month: 'abr', emoji: '🎭', title: 'Teatro', time: '20:00', assignee: 'Tú', status: 'Pendiente', tone: 'purple' },
  ];

  return (
    <div style={{ paddingTop: 4 }}>
      <div className="page-title">
        <h2>Calendario</h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={onNewEvent} style={{
            padding: '6px 12px', borderRadius: 9999, border: 'none',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
          }}>＋ Evento</button>
        </div>
      </div>

      <div style={{ margin: '0 16px 14px', display: 'flex', gap: 4, padding: 4, background: 'rgba(26,16,53,0.6)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10 }}>
        {[{ id: 'month', label: 'Mes' }, { id: 'week', label: 'Semana' }, { id: 'list', label: 'Lista' }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: view === v.id ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
            color: view === v.id ? '#fff' : '#9ca3af',
            fontSize: 12, fontWeight: 700,
          }}>{v.label}</button>
        ))}
      </div>

      {view === 'month' && (
        <div style={{ margin: '0 16px 14px' }}>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}>‹</button>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month]} {year}
              </div>
              <button style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 16, cursor: 'pointer' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
              {['L','M','X','J','V','S','D'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#6b7280', fontWeight: 600, padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {Array.from({ length: firstDow }).map((_, i) => <div key={'e'+i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const isSel = day === selected;
                const isToday = day === now.getDate();
                const ev = events[day];
                return (
                  <button key={day} onClick={() => setSelected(day)} style={{
                    aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                    background: isSel ? 'linear-gradient(135deg,#f59e0b,#d97706)' : isToday ? 'rgba(168,85,247,0.18)' : 'transparent',
                    border: isSel ? 'none' : isToday ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent',
                    color: isSel ? '#fff' : '#e2e8f0',
                    fontSize: 12, fontWeight: isSel || isToday ? 700 : 500,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    padding: 2,
                  }}>
                    <span>{day}</span>
                    {ev && (
                      <div style={{ display: 'flex', gap: 1 }}>
                        {ev.slice(0,3).map((e,i) => (
                          <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? '#fff' : e.color }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {view === 'week' && (
        <div style={{ margin: '0 16px 14px' }}>
          <Card style={{ padding: 12 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>Semana del 22 abr</div>
            {[
              { day: 'Lun 22', items: [{ time: '18:00', emoji: '🎂', title: 'Cumple de Sofía', tone: '#f59e0b' }] },
              { day: 'Mar 23', items: [{ time: '21:00', emoji: '🍕', title: 'Cena con Marta', tone: '#a855f7' }] },
              { day: 'Mié 24', items: [{ time: '10:30', emoji: '🩺', title: 'Pediatra', tone: '#60a5fa' }] },
              { day: 'Jue 25', items: [] },
              { day: 'Vie 26', items: [] },
              { day: 'Sáb 27', items: [{ time: '20:00', emoji: '🎭', title: 'Teatro', tone: '#ec4899' }] },
              { day: 'Dom 28', items: [] },
            ].map(d => (
              <div key={d.day} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: '1px solid rgba(168,85,247,0.08)' }}>
                <div style={{ width: 52, fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{d.day}</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {d.items.length === 0 ? (
                    <span style={{ fontSize: 11, color: '#4b5563' }}>Libre ✨</span>
                  ) : d.items.map((i, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 8px', background: `${i.tone}18`, borderRadius: 6, borderLeft: `3px solid ${i.tone}` }}>
                      <span style={{ fontSize: 14 }}>{i.emoji}</span>
                      <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{i.title}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{i.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div style={{ margin: '0 16px 14px' }}>
        <Label style={{ marginBottom: 8 }}>📅 Próximos eventos</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {UPCOMING.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'rgba(26,16,53,0.85)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 12 }}>
              <div style={{ width: 44, borderRadius: 10, background: 'rgba(168,85,247,0.15)', padding: '8px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7', lineHeight: 1 }}>{e.day}</div>
                <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', marginTop: 2 }}>{e.month}</div>
              </div>
              <div style={{ fontSize: 22 }}>{e.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{e.time} · {e.assignee}</div>
              </div>
              <Pill tone={e.tone}>{e.status}</Pill>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}

Object.assign(window, { CalendarScreen });
