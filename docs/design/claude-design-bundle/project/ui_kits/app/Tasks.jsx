// Matripuntos UI kit — Tasks screen (list + catalog + add modal)

const TASK_CATEGORIES = [
  { id: 'cocina', emoji: '🍳', label: 'Cocina' },
  { id: 'limpieza', emoji: '🧹', label: 'Limpieza' },
  { id: 'compras', emoji: '🛒', label: 'Compras' },
  { id: 'ninos', emoji: '👶', label: 'Niños' },
  { id: 'mascotas', emoji: '🐕', label: 'Mascotas' },
  { id: 'reparaciones', emoji: '🔧', label: 'Reparaciones' },
  { id: 'finanzas', emoji: '💰', label: 'Finanzas' },
  { id: 'otros', emoji: '📋', label: 'Otros' },
];

function CategoryFilter({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', overflowX: 'auto' }}>
      <button onClick={() => onSelect(null)} style={chipStyle(selected === null)}>Todas</button>
      {TASK_CATEGORIES.slice(0, 5).map(c => (
        <button key={c.id} onClick={() => onSelect(c.id)} style={chipStyle(selected === c.id)}>
          {c.emoji} {c.label}
        </button>
      ))}
    </div>
  );
}

function chipStyle(active) {
  return {
    padding: '6px 12px', borderRadius: 9999,
    background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${active ? 'rgba(245,158,11,0.4)' : 'rgba(168,85,247,0.15)'}`,
    color: active ? '#f59e0b' : '#e2e8f0',
    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    cursor: 'pointer', flexShrink: 0,
  };
}

function TaskItem({ task, onComplete }) {
  const done = task.status === 'done';
  return (
    <Card style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12, opacity: done ? 0.55 : 1 }}>
      <button
        onClick={() => !done && onComplete(task.id)}
        style={{
          width: 22, height: 22, borderRadius: '50%',
          border: `2px solid ${done ? '#22c55e' : 'rgba(168,85,247,0.4)'}`,
          background: done ? '#22c55e' : 'transparent',
          color: '#052e12', fontSize: 12, fontWeight: 700,
          cursor: done ? 'default' : 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >{done ? '✓' : ''}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>
          {task.emoji} {task.title}
        </div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
          {task.meta}
          {task.assignedTo && ` · Asignado a ${task.assignedTo}`}
        </div>
      </div>
      <Pill tone={done ? 'success' : 'amber'}>
        {done ? `+${task.points}` : `+${task.points} MP`}
      </Pill>
    </Card>
  );
}

function TaskCatalogRow({ item, onAdd }) {
  return (
    <Card style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{item.estimate}</div>
      </div>
      <Pill tone="amber" style={{ marginRight: 8 }}>+{item.points} MP</Pill>
      <Button variant="secondary" onClick={() => onAdd(item)} style={{ padding: '5px 12px', fontSize: 12 }}>Añadir</Button>
    </Card>
  );
}

function AddTaskSheet({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('cocina');
  const [points, setPoints] = useState(8);
  if (!open) return null;
  const sel = TASK_CATEGORIES.find(c => c.id === cat);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 48 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 49,
        maxWidth: 500, margin: '0 auto',
        background: 'rgba(26,16,53,0.98)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 16px 28px',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ width: 36, height: 4, background: 'rgba(168,85,247,0.3)', borderRadius: 2, margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Nueva tarea</h3>
        <Label style={{ marginBottom: 4 }}>Nombre</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué vais a hacer?" style={{ width: '100%', marginBottom: 12 }} />
        <Label style={{ marginBottom: 6 }}>Categoría</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {TASK_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={chipStyle(cat === c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <Label style={{ marginBottom: 4 }}>Puntos</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input type="range" min="1" max="30" value={points} onChange={e => setPoints(+e.target.value)} style={{ flex: 1, accentColor: '#f59e0b' }} />
          <Pill tone="amber" style={{ minWidth: 56, justifyContent: 'center' }}>+{points} MP</Pill>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</Button>
          <Button variant="primary" onClick={() => { onCreate({ title: title || 'Nueva tarea', emoji: sel.emoji, points }); onClose(); }} style={{ flex: 1, justifyContent: 'center' }}>
            Crear
          </Button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { TASK_CATEGORIES, CategoryFilter, TaskItem, TaskCatalogRow, AddTaskSheet });
