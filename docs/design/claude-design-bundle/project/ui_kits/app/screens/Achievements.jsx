// Matripuntos — Achievements (rediseño: badges + ranking + historial)

function AchievementsScreen({ onViewAnalytics, onBack }) {
  const [tab, setTab] = React.useState('badges');
  const BADGES = [
    { id: 'b1', emoji: '🏆', title: 'Primera semana',     desc: '7 días seguidos', earned: true,  at: 'hace 2 sem', rarity: 'common' },
    { id: 'b2', emoji: '🔥', title: 'Imparable',          desc: 'Racha de 10 días', earned: true, at: 'hoy',       rarity: 'rare' },
    { id: 'b3', emoji: '⚖️', title: 'Equidad total',      desc: '4 semanas parejos', earned: true, at: 'esta sem', rarity: 'rare' },
    { id: 'b4', emoji: '💎', title: 'Diamante',           desc: '1000 MP totales',   earned: false, prog: 320, of: 1000, rarity: 'epic' },
    { id: 'b5', emoji: '🌟', title: 'Compañero estrella', desc: '50 tareas juntos',  earned: false, prog: 32,  of: 50,   rarity: 'rare' },
    { id: 'b6', emoji: '👑', title: 'Rey/Reina del hogar', desc: 'Nivel 5',          earned: false, prog: 3,   of: 5,    rarity: 'legendary' },
  ];
  const RANKING = [
    { pos: 1, name: 'Carlos',  emoji: '🦊', color: '#f59e0b', mp: 340, you: false },
    { pos: 2, name: 'Tú',      emoji: '🐼', color: '#7c3aed', mp: 320, you: true  },
  ];
  const HISTORY = [
    { emoji: '🔥', title: 'Imparable',      when: 'hoy',       rarity: 'rare'    },
    { emoji: '⚖️', title: 'Equidad total',  when: 'esta sem',  rarity: 'rare'    },
    { emoji: '🏆', title: 'Primera semana', when: 'hace 2 sem', rarity: 'common' },
  ];
  const earned = BADGES.filter(b => b.earned).length;

  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 12px' }}>
        {onBack && (
          <button onClick={onBack} aria-label="Volver" style={{
            width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)',
            border: '1px solid rgba(168,85,247,0.2)', color: '#e2e8f0', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>←</button>
        )}
        <h2 style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 700, flex: 1 }}>Logros</h2>
        <Pill tone="amber">{earned}/{BADGES.length}</Pill>
      </div>

      <Card style={{ margin: '0 16px 14px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', border: 'none', boxShadow: '0 4px 24px rgba(79,70,229,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.85)', fontWeight: 600 }}>NIVEL ACTUAL</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Nivel 3 👑</div>
            <div style={{ fontSize: 11, color: 'rgba(199,210,254,0.85)', marginTop: 2 }}>Compañeros en ritmo</div>
          </div>
          <div style={{ fontSize: 44 }}>🌟</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={320} max={500} tone="amber" />
          <div style={{ fontSize: 10, color: 'rgba(199,210,254,0.85)', marginTop: 6 }}>320 / 500 MP · 180 para Nivel 4</div>
        </div>
      </Card>

      <div style={{ margin: '0 16px 14px', display: 'flex', gap: 4, padding: 4, background: 'rgba(26,16,53,0.6)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 10 }}>
        {[{id:'badges',l:'🏅 Badges'},{id:'rank',l:'📊 Ranking'},{id:'history',l:'🗒 Historial'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'transparent',
            color: tab === t.id ? '#fff' : '#9ca3af',
            fontSize: 12, fontWeight: 700,
          }}>{t.l}</button>
        ))}
      </div>

      {tab === 'badges' && (
        <div style={{ margin: '0 16px 14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {BADGES.map(b => <BadgeCard key={b.id} b={b} />)}
        </div>
      )}

      {tab === 'rank' && (
        <div style={{ margin: '0 16px 14px' }}>
          <Card style={{ padding: 0 }}>
            {RANKING.map((r, i) => (
              <div key={r.pos} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px',
                borderTop: i > 0 ? '1px solid rgba(168,85,247,0.1)' : 'none',
                background: r.you ? 'rgba(245,158,11,0.06)' : 'transparent',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: r.pos === 1 ? 'linear-gradient(135deg,#fbbf24,#d97706)' : 'rgba(168,85,247,0.15)',
                  color: '#fff', fontSize: 16, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.pos === 1 ? '🥇' : '🥈'}
                </div>
                <Avatar emoji={r.emoji} color={r.color} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 700 }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{r.you ? 'Eso eres tú' : 'Tu pareja'}</div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
                  {r.mp} <span style={{ fontSize: 10, opacity: 0.7 }}>MP</span>
                </div>
              </div>
            ))}
          </Card>
          <div style={{ marginTop: 10, padding: 12, background: 'rgba(168,85,247,0.08)', borderRadius: 10, fontSize: 12, color: '#c4b5fd', lineHeight: 1.4 }}>
            💡 Ranking acumulado desde el inicio. La diferencia es solo <strong style={{ color: '#a855f7' }}>20 MP</strong> — ¡muy ajustado!
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div style={{ margin: '0 16px 14px' }}>
          <Card style={{ padding: 0 }}>
            {HISTORY.map((h, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderTop: i > 0 ? '1px solid rgba(168,85,247,0.08)' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{h.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>{h.title}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>Desbloqueado · {h.when}</div>
                </div>
                <Pill tone={h.rarity === 'rare' ? 'purple' : 'neutral'}>
                  {h.rarity === 'rare' ? '★ Rara' : 'Común'}
                </Pill>
              </div>
            ))}
          </Card>
        </div>
      )}

      <button onClick={onViewAnalytics} style={{
        margin: '0 16px 20px', width: 'calc(100% - 32px)', padding: '12px 14px',
        background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
        color: '#a855f7', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>📊 Ver analítica completa →</button>
    </div>
  );
}

function BadgeCard({ b }) {
  const rarity = { common: { color: '#9ca3af', label: 'Común' }, rare: { color: '#a855f7', label: 'Rara' }, epic: { color: '#60a5fa', label: 'Épica' }, legendary: { color: '#f59e0b', label: 'Legendaria' } }[b.rarity];
  return (
    <div style={{
      background: b.earned ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(168,85,247,0.08))' : 'rgba(26,16,53,0.85)',
      border: `1px solid ${b.earned ? rarity.color + '55' : 'rgba(168,85,247,0.12)'}`,
      borderRadius: 14, padding: 12, textAlign: 'center',
      opacity: b.earned ? 1 : 0.85,
    }}>
      <div style={{ fontSize: 40, filter: b.earned ? 'none' : 'grayscale(1) opacity(0.5)' }}>{b.emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', marginTop: 4 }}>{b.title}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, minHeight: 24, lineHeight: 1.2 }}>{b.desc}</div>
      <div style={{ marginTop: 6 }}>
        <span style={{
          fontSize: 9, fontWeight: 700,
          padding: '2px 8px', borderRadius: 9999,
          background: `${rarity.color}20`, color: rarity.color,
          border: `1px solid ${rarity.color}55`,
        }}>{rarity.label}</span>
      </div>
      {b.earned ? (
        <div style={{ marginTop: 6, fontSize: 9, color: '#22c55e', fontWeight: 700 }}>✓ {b.at}</div>
      ) : (
        <div style={{ marginTop: 6 }}>
          <ProgressBar value={b.prog} max={b.of} tone="purple" />
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 3 }}>{b.prog}/{b.of}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AchievementsScreen });
