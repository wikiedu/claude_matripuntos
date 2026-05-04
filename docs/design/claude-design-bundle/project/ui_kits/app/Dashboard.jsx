// Matripuntos UI kit — Dashboard (v3: condensed)
// - BalanceLevelHero fuses balance + nivel
// - StreakStrip: one compact row instead of two big tiles
// - DailyPhrase: single warm line under header
// - Tasks primary action above fold
// - RecentMovements kept but discrete, below fold

const DAILY_PHRASES = [
  'Cada pequeña tarea suma 💕',
  'Juntos todo pesa la mitad ✨',
  'Un buen equipo se cuida a partes iguales 🤝',
  'Los detalles pequeños, el cariño grande 🌱',
  'Hoy es un buen día para echar una mano 🫶',
];

function DailyPhrase() {
  const phrase = DAILY_PHRASES[new Date().getDate() % DAILY_PHRASES.length];
  return (
    <div style={{
      margin: '0 16px 14px',
      padding: '8px 12px',
      background: 'rgba(168,85,247,0.08)',
      border: '1px solid rgba(168,85,247,0.15)',
      borderRadius: 10,
      fontSize: 12, color: '#c4b5fd',
      textAlign: 'center', fontStyle: 'italic',
    }}>
      {phrase}
    </div>
  );
}

function BalanceLevelHero({ youName, youBalance, partnerName, partnerBalance, level, current, needed }) {
  const lead   = youBalance > 0.5;
  const behind = youBalance < -0.5;
  const absBal = Math.abs(youBalance);
  const leadLabel = lead      ? `Vas ${absBal.toFixed(1)} MP por delante`
                  : behind    ? `${partnerName} va ${absBal.toFixed(1)} MP por delante`
                  : `Estáis empatados`;
  const remaining = needed - current;
  return (
    <div style={{
      margin: '0 16px 14px',
      background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
      borderRadius: 18, padding: '16px 16px 14px',
      boxShadow: '0 4px 24px rgba(79,70,229,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: 'rgba(199,210,254,0.9)', fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}>
            BALANCE DE LA SEMANA
          </p>
          <p style={{ margin: '6px 0 0', color: '#fff', fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {youBalance >= 0 ? '+' : ''}{youBalance.toFixed(1)}
            <span style={{ fontSize: 16, fontWeight: 500, opacity: 0.8, marginLeft: 4 }}>MP</span>
          </p>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: 500 }}>
            {lead ? '🎉 ' : behind ? '💪 ' : '🤝 '}
            {leadLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(199,210,254,0.85)', fontWeight: 600 }}>{youName}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {youBalance >= 0 ? '+' : ''}{youBalance.toFixed(1)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(199,210,254,0.85)', fontWeight: 600, marginTop: 4 }}>{partnerName}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {partnerBalance >= 0 ? '+' : ''}{partnerBalance.toFixed(1)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.9)', fontWeight: 600 }}>
            👑 Nivel {level} · Compañeros en ritmo
          </div>
          <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {current}/{needed}
          </div>
        </div>
        <div style={{ height: 6, background: 'rgba(0,0,0,0.25)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${(current/needed)*100}%`,
            background: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
            borderRadius: 3,
          }} />
        </div>
        <div style={{ fontSize: 10, color: 'rgba(199,210,254,0.85)', marginTop: 4 }}>
          ✨ {remaining} MP para subir al Nivel {level + 1}
        </div>
      </div>
    </div>
  );
}

function StreakStrip({ dailyStreak = 12, weeklyStreak = 4, dailyMult = 1.5, weeklyBonus = 0.25 }) {
  return (
    <div style={{
      margin: '0 16px 14px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 24 }}>🔥</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {dailyStreak} días
          </div>
          <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 2, fontWeight: 600 }}>
            ×{dailyMult.toFixed(1)} puntos hoy
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'rgba(168,85,247,0.1)',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 24 }}>⚖️</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {weeklyStreak} sem a la par
          </div>
          <div style={{ fontSize: 10, color: '#c4b5fd', marginTop: 2, fontWeight: 600 }}>
            +{Math.round(weeklyBonus * 100)}% bonus
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingTasksList({ tasks, onComplete }) {
  if (tasks.length === 0) {
    return (
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 14, padding: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#22c55e' }}>¡Todo hecho por hoy!</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Disfrutad el resto del día 💕</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Tareas de hoy</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Completa una para ganar puntos</div>
        </div>
        <Pill tone="amber">{tasks.length} pendientes</Pill>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map(t => <PendingTaskRow key={t.id} task={t} onComplete={onComplete} />)}
      </div>
    </div>
  );
}

function PendingTaskRow({ task, onComplete }) {
  const mine = task.assignedTo === 'tú' || task.assignedTo === 'Tú';
  return (
    <div style={{
      background: 'rgba(26,16,53,0.85)',
      border: `1px solid ${mine ? 'rgba(245,158,11,0.3)' : 'rgba(168,85,247,0.15)'}`,
      borderRadius: 14, padding: '14px 14px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(168,85,247,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>{task.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600 }}>{task.title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            {task.meta}
            {task.assignedTo && <> · para <strong style={{ color: mine ? '#f59e0b' : '#ec4899' }}>{task.assignedTo}</strong></>}
          </div>
        </div>
        <Pill tone="amber">+{task.points} MP</Pill>
      </div>
      <button
        onClick={() => onComplete(task.id)}
        style={{
          width: '100%', padding: '11px 14px',
          borderRadius: 10, border: 'none', cursor: 'pointer',
          background: mine ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(168,85,247,0.12)',
          color: mine ? '#fff' : '#a855f7',
          fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: mine ? '0 2px 10px rgba(245,158,11,0.35)' : 'none',
          transition: 'transform 0.15s',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {mine ? '✓ Marcar como hecha' : 'Marcar como hecha'}
      </button>
    </div>
  );
}

function RecentMovements({ items }) {
  return (
    <div style={{ margin: '0 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#9ca3af' }}>Últimos movimientos</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>↓ scroll</div>
      </div>
      <Card style={{ padding: 0 }}>
        {items.map((m, i) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderTop: i > 0 ? '1px solid rgba(168,85,247,0.08)' : 'none',
          }}>
            <Avatar emoji={m.avatarEmoji} color={m.avatarColor} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.35 }}>
                <strong style={{ fontWeight: 700 }}>{m.who}</strong> {m.action}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{m.when}</div>
            </div>
            {m.delta !== 0 && (
              <span style={{
                fontSize: 14, fontWeight: 800,
                color: m.delta > 0 ? '#22c55e' : '#f87171',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {m.delta > 0 ? '+' : ''}{m.delta}
                <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginLeft: 2 }}>MP</span>
              </span>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

// FAB action menu — coincide con src/frontend/src/components/BottomNav.tsx
function FabActionMenu({ open, onClose, onPick }) {
  if (!open) return null;
  const actions = [
    { id: 'activity', emoji: '📅', title: 'Actividad',  desc: 'Evento del calendario', color: '#f59e0b' },
    { id: 'shop',     emoji: '🛒', title: 'Compra',      desc: 'Añadir a la lista',     color: '#a855f7' },
    { id: 'todo',     emoji: '📝', title: 'To-do',       desc: 'Nueva tarea rápida',    color: '#3b82f6' },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)', zIndex: 55,
      }} />
      <div style={{
        position: 'fixed', bottom: 82, left: '50%', transform: 'translateX(-50%)',
        zIndex: 56, width: 280,
        display: 'flex', flexDirection: 'column', gap: 8,
        animation: 'fabMenuIn 0.2s ease-out',
      }}>
        {actions.map(a => (
          <button
            key={a.id}
            onClick={() => { onPick(a.id); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '12px 14px',
              background: 'rgba(26,16,53,0.98)',
              border: `1px solid ${a.color}40`,
              borderRadius: 14, cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${a.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>{a.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{a.desc}</div>
            </div>
            <span style={{ color: a.color, fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>
      <style>{`
        @keyframes fabMenuIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}

Object.assign(window, { DailyPhrase, BalanceLevelHero, StreakStrip, PendingTasksList, RecentMovements, FabActionMenu });
