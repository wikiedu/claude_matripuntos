// Matripuntos UI kit — Analytics screen
// Dos pestañas: Básico (gratis) · Avanzado (premium, visible bloqueado)

function AnalyticsScreen({ isPremium = false, onGoPremium }) {
  const [tab, setTab] = React.useState('basic');
  return (
    <div style={{ paddingTop: 4 }}>
      <div className="page-title">
        <h2>Analítica</h2>
        <Pill tone="purple">Abril</Pill>
      </div>
      <AnalyticsTabs tab={tab} onTab={setTab} isPremium={isPremium} />
      {tab === 'basic'    && <BasicAnalytics />}
      {tab === 'advanced' && <AdvancedAnalytics isPremium={isPremium} onGoPremium={onGoPremium} />}
      <div style={{ height: 20 }} />
    </div>
  );
}

function AnalyticsTabs({ tab, onTab, isPremium }) {
  return (
    <div style={{ margin: '0 16px 16px', display: 'flex', gap: 6, padding: 4, background: 'rgba(26,16,53,0.6)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 12 }}>
      <button
        onClick={() => onTab('basic')}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: tab === 'basic' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
          color: tab === 'basic' ? '#fff' : '#9ca3af',
          fontSize: 13, fontWeight: 700,
          boxShadow: tab === 'basic' ? '0 2px 10px rgba(79,70,229,0.4)' : 'none',
        }}
      >📊 Básico</button>
      <button
        onClick={() => onTab('advanced')}
        style={{
          flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: tab === 'advanced' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'transparent',
          color: tab === 'advanced' ? '#fff' : '#9ca3af',
          fontSize: 13, fontWeight: 700,
          boxShadow: tab === 'advanced' ? '0 2px 10px rgba(245,158,11,0.4)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        📈 Avanzado {!isPremium && <span style={{ fontSize: 11 }}>🔒</span>}
      </button>
    </div>
  );
}

// ========== BÁSICO ==========

function BasicAnalytics() {
  return (
    <>
      <WeeklyBarsChart />
      <CategoryPieChart />
      <BalanceEvolutionChart />
      <TimeInvestedChart />
    </>
  );
}

// 1. Barras semanales tú vs pareja
function WeeklyBarsChart() {
  const days = [
    { label: 'L', you: 10, partner:  8 },
    { label: 'M', you:  5, partner: 12 },
    { label: 'X', you:  8, partner:  5 },
    { label: 'J', you: 15, partner:  6 },
    { label: 'V', you: 12, partner: 10 },
    { label: 'S', you:  0, partner:  8 },
    { label: 'D', you:  5, partner:  0 },
  ];
  const max = Math.max(...days.flatMap(d => [d.you, d.partner]));
  const youTotal = days.reduce((s, d) => s + d.you, 0);
  const partnerTotal = days.reduce((s, d) => s + d.partner, 0);
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>📊 Puntos por día</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Tú vs Carlos · esta semana</div>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>● Tú</span>
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Carlos</span>
        </div>
      </div>
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, marginBottom: 8 }}>
          {days.map(d => (
            <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%' }}>
                <div style={{
                  flex: 1,
                  height: `${(d.you/max)*100}%`,
                  background: 'linear-gradient(180deg,#a855f7,#7c3aed)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: d.you > 0 ? 2 : 0,
                }} />
                <div style={{
                  flex: 1,
                  height: `${(d.partner/max)*100}%`,
                  background: 'linear-gradient(180deg,#fbbf24,#d97706)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: d.partner > 0 ? 2 : 0,
                }} />
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>{d.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(168,85,247,0.1)' }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Tú · total</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{youTotal} MP</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Carlos · total</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{partnerTotal} MP</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// 2. Distribución por categoría (pie SVG)
function CategoryPieChart() {
  const categories = [
    { name: 'Cocina',    value: 32, color: '#f59e0b', emoji: '🍳' },
    { name: 'Limpieza',  value: 24, color: '#a855f7', emoji: '🧹' },
    { name: 'Compras',   value: 18, color: '#3b82f6', emoji: '🛒' },
    { name: 'Mascotas',  value: 14, color: '#22c55e', emoji: '🐕' },
    { name: 'Otros',     value: 12, color: '#ec4899', emoji: '✨' },
  ];
  const total = categories.reduce((s, c) => s + c.value, 0);
  let cumulative = 0;
  const size = 120, radius = 50, cx = size/2, cy = size/2;
  const arcs = categories.map(c => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI/2;
    cumulative += c.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI/2;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return {
      ...c,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
    };
  });
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🥧 Categorías</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>En qué gastáis más esfuerzo</div>
      </div>
      <Card style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
          {arcs.map(a => <path key={a.name} d={a.d} fill={a.color} opacity={0.9} />)}
          <circle cx={cx} cy={cy} r={24} fill="#1a1138" />
          <text x={cx} y={cy-1} textAnchor="middle" fontSize="12" fontWeight="700" fill="#e2e8f0">100%</text>
          <text x={cx} y={cy+11} textAnchor="middle" fontSize="8" fill="#9ca3af">sem</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {categories.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>{c.emoji}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600, flex: 1 }}>{c.name}</span>
              <span style={{ color: c.color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Math.round(c.value/total*100)}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// 3. Evolución balance últimas 4 semanas (line chart SVG)
function BalanceEvolutionChart() {
  const weeks = [
    { label: 'S-3', balance:  -8 },
    { label: 'S-2', balance:   3 },
    { label: 'S-1', balance:  12 },
    { label: 'Ahora', balance: 15.5 },
  ];
  const w = 280, h = 110, pad = 20;
  const min = Math.min(...weeks.map(v => v.balance), -10);
  const max = Math.max(...weeks.map(v => v.balance),  20);
  const xs = weeks.map((_, i) => pad + (i * (w - 2*pad)) / (weeks.length - 1));
  const ys = weeks.map(v => h - pad - ((v.balance - min) / (max - min)) * (h - 2*pad));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x} ${ys[i]}`).join(' ');
  const zeroY = h - pad - ((0 - min) / (max - min)) * (h - 2*pad);
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>📈 Evolución del balance</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Últimas 4 semanas</div>
      </div>
      <Card style={{ padding: 14 }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
          <line x1={pad} y1={zeroY} x2={w-pad} y2={zeroY} stroke="rgba(156,163,175,0.3)" strokeDasharray="3 3" />
          <text x={w-pad+2} y={zeroY+3} fontSize="9" fill="#6b7280">0</text>
          <path d={`${path} L ${xs[xs.length-1]} ${h-pad} L ${xs[0]} ${h-pad} Z`} fill="url(#balgrad)" opacity={0.4} />
          <defs>
            <linearGradient id="balgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={path} stroke="#a855f7" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {xs.map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={ys[i]} r={i === xs.length-1 ? 5 : 3} fill="#a855f7" stroke="#1a1138" strokeWidth="2" />
              <text x={x} y={h-4} fontSize="9" fill="#9ca3af" textAnchor="middle">{weeks[i].label}</text>
              <text x={x} y={ys[i]-8} fontSize="9" fill="#c4b5fd" textAnchor="middle" fontWeight="700">
                {weeks[i].balance > 0 ? '+' : ''}{weeks[i].balance}
              </text>
            </g>
          ))}
        </svg>
        <div style={{ marginTop: 8, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
          ↗ Tendencia positiva: +{(weeks[weeks.length-1].balance - weeks[0].balance).toFixed(1)} MP en 4 semanas
        </div>
      </Card>
    </div>
  );
}

// 4. Tiempo estimado invertido
function TimeInvestedChart() {
  const you = 4.5, partner = 5.2;
  const total = you + partner;
  const youPct = (you/total) * 100;
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>⏱️ Tiempo invertido</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Estimado esta semana</div>
      </div>
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Tú</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>{you.toFixed(1)}h</div>
          </div>
          <div style={{ fontSize: 22, color: '#6b7280' }}>vs</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Carlos</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{partner.toFixed(1)}h</div>
          </div>
        </div>
        <div style={{ height: 10, background: 'rgba(245,158,11,0.25)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${youPct}%`, background: 'linear-gradient(90deg,#a855f7,#7c3aed)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>{Math.round(youPct)}%</span>
          <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>{Math.round(100-youPct)}%</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af' }}>
          ⚖️ Reparto equilibrado — diferencia de solo {Math.abs(you-partner).toFixed(1)}h
        </div>
      </Card>
    </div>
  );
}

// ========== AVANZADO ==========

function AdvancedAnalytics({ isPremium, onGoPremium }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: isPremium ? 'none' : 'blur(3px)', pointerEvents: isPremium ? 'auto' : 'none', userSelect: isPremium ? 'auto' : 'none' }}>
        <HeatmapChart />
        <CompletionRateChart />
        <EquityIndexChart />
        <TopCategoriesChart />
        <MonthlyComparisonCard />
      </div>
      {!isPremium && <PremiumOverlay onGoPremium={onGoPremium} />}
    </div>
  );
}

function PremiumOverlay({ onGoPremium }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: 80,
      background: 'linear-gradient(180deg, rgba(15,10,30,0.2) 0%, rgba(15,10,30,0.85) 40%, rgba(15,10,30,0.95) 100%)',
      pointerEvents: 'auto',
    }}>
      <div style={{
        margin: '0 16px', padding: '22px 20px',
        background: 'linear-gradient(135deg,#1a1138,#2d1e5f)',
        border: '1.5px solid rgba(245,158,11,0.5)',
        borderRadius: 18, textAlign: 'center',
        boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
        maxWidth: 340,
      }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>✨</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
          Desbloquea Analítica Avanzada
        </div>
        <div style={{ fontSize: 12, color: '#c4b5fd', marginTop: 6, lineHeight: 1.5 }}>
          Heatmaps, tasas de cumplimiento, índice de equidad histórico y comparativas mensuales con insights.
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center',
          margin: '14px 0',
        }}>
          {['🗓️ Heatmap', '🎯 Cumplimiento', '⚖️ Equidad', '🏅 Top cat.', '💬 Insights'].map(x => (
            <span key={x} style={{
              fontSize: 10, fontWeight: 600,
              padding: '4px 8px', borderRadius: 9999,
              background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
              border: '1px solid rgba(245,158,11,0.3)',
            }}>{x}</span>
          ))}
        </div>
        <button
          onClick={onGoPremium}
          style={{
            width: '100%', padding: '12px 14px',
            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(245,158,11,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          👑 Hazte Premium · 3,99€/mes
        </button>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>
          Primera semana gratis · Cancela cuando quieras
        </div>
      </div>
    </div>
  );
}

// Gráficos avanzados (mockups visuales — se ven borrosos detrás del overlay)

function HeatmapChart() {
  const days = ['L','M','X','J','V','S','D'];
  const hours = ['6','9','12','15','18','21'];
  // pseudo-random but deterministic
  const val = (d, h) => ((d*7+h*3) % 5);
  const colors = ['rgba(168,85,247,0.08)','rgba(168,85,247,0.3)','rgba(168,85,247,0.5)','rgba(168,85,247,0.75)','rgba(168,85,247,1)'];
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🗓️ Heatmap de actividad</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Cuándo completáis más tareas</div>
      </div>
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '20px repeat(6, 1fr)', gap: 3 }}>
          <div />
          {hours.map(h => <div key={h} style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>{h}h</div>)}
          {days.map((d, di) => (
            <React.Fragment key={d}>
              <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, alignSelf: 'center' }}>{d}</div>
              {hours.map((h, hi) => (
                <div key={hi} style={{
                  aspectRatio: '1', borderRadius: 3,
                  background: colors[val(di, hi)],
                }} />
              ))}
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#c4b5fd' }}>
          ⏰ Más activos los jueves a las 18-21h
        </div>
      </Card>
    </div>
  );
}

function CompletionRateChart() {
  const rows = [
    { who: 'Tú',     pct: 92, color: '#a855f7' },
    { who: 'Carlos', pct: 86, color: '#f59e0b' },
  ];
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🎯 Tasa de cumplimiento</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Tareas asignadas completadas</div>
      </div>
      <Card style={{ padding: 14 }}>
        {rows.map(r => (
          <div key={r.who} style={{ marginBottom: 10, '&:last-child': { marginBottom: 0 } }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.who}</span>
              <span style={{ color: r.color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.pct}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${r.pct}%`, height: '100%', background: r.color, borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function EquityIndexChart() {
  const score = 87;
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>⚖️ Índice de equidad</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>0 = desigual · 100 = perfecto</div>
      </div>
      <Card style={{ padding: 14, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none"
              stroke="url(#eqgrad)" strokeWidth="10"
              strokeDasharray={`${(score/100)*314} 314`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <defs>
              <linearGradient id="eqgrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Excelente</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
          ↗ +4 puntos vs mes anterior
        </div>
      </Card>
    </div>
  );
}

function TopCategoriesChart() {
  const data = [
    { cat: '🍳 Cocina',   you: 18, partner: 14 },
    { cat: '🧹 Limpieza', you: 12, partner: 12 },
    { cat: '🛒 Compras',  you:  8, partner: 10 },
    { cat: '🐕 Mascotas', you:  4, partner: 10 },
  ];
  const max = Math.max(...data.flatMap(d => [d.you, d.partner]));
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🏅 Top categorías por persona</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>¿Quién cubre qué?</div>
      </div>
      <Card style={{ padding: 14 }}>
        {data.map(d => (
          <div key={d.cat} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>{d.cat}</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ flex: `${d.you/max}`, height: 10, background: 'linear-gradient(90deg,#a855f7,#7c3aed)', borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 22 }}>{d.you}</span>
              <span style={{ fontSize: 10, color: '#6b7280' }}>·</span>
              <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>{d.partner}</span>
              <div style={{ flex: `${d.partner/max}`, height: 10, background: 'linear-gradient(90deg,#d97706,#f59e0b)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function MonthlyComparisonCard() {
  return (
    <div style={{ margin: '0 16px 14px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>💬 Insight mensual</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Resumen generado por IA</div>
      </div>
      <Card style={{ padding: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(168,85,247,0.08))' }}>
        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
          Este mes <strong style={{ color: '#f59e0b' }}>Carlos cubrió más cocina</strong> (+4 tareas); <strong style={{ color: '#a855f7' }}>tú llevaste más logística y compras</strong>. La distribución por tiempo es casi perfecta (52/48).
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, fontSize: 11 }}>
          <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ +12% equidad</span>
          <span style={{ color: '#9ca3af' }}>·</span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠ Mascotas desequilibrado</span>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { AnalyticsScreen });
