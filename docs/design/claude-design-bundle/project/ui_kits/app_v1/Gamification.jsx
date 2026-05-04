// Matripuntos UI kit — Achievements + Calendar screens

function AchievementBadge({ badge, earned }) {
  return (
    <div style={{
      background: earned ? 'rgba(26,16,53,0.85)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${earned ? 'rgba(245,158,11,0.3)' : 'rgba(168,85,247,0.1)'}`,
      borderRadius: 12, padding: 14, textAlign: 'center',
      opacity: earned ? 1 : 0.5,
      position: 'relative',
    }}>
      <div style={{ fontSize: 32, marginBottom: 4, filter: earned ? 'none' : 'grayscale(1)' }}>{badge.emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{badge.title}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.35 }}>{badge.description}</div>
      {earned && badge.earnedAt && (
        <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 6, fontWeight: 600 }}>✨ {badge.earnedAt}</div>
      )}
      {!earned && badge.progress != null && (
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={badge.progress} max={badge.total} tone="purple" />
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>{badge.progress}/{badge.total}</div>
        </div>
      )}
    </div>
  );
}

function AchievementsGrid({ badges }) {
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {badges.map(b => <AchievementBadge key={b.id} badge={b} earned={b.earned} />)}
    </div>
  );
}

// Calendar week strip — 7 days with each day's contribution bars
function WeekStrip({ days }) {
  const max = Math.max(...days.map(d => d.you + d.partner), 1);
  return (
    <Card style={{ margin: '0 16px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Esta semana</span>
        <Pill tone="purple">Sem 17</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, alignItems: 'end', height: 110 }}>
        {days.map((d, i) => {
          const youH  = (d.you / max) * 80;
          const partH = (d.partner / max) * 80;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch', width: 16 }}>
                <div style={{ height: youH, background: 'linear-gradient(180deg,#f59e0b,#d97706)', borderRadius: 3, minHeight: d.you ? 4 : 0 }} />
                <div style={{ height: partH, background: 'linear-gradient(180deg,#ec4899,#db2777)', borderRadius: 3, minHeight: d.partner ? 4 : 0 }} />
              </div>
              <div style={{ fontSize: 10, color: d.today ? '#f59e0b' : '#6b7280', fontWeight: d.today ? 700 : 400 }}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, fontSize: 11 }}>
        <span style={{ color: '#f59e0b' }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#f59e0b', borderRadius: 2, marginRight: 4 }} />Tú</span>
        <span style={{ color: '#ec4899' }}><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ec4899', borderRadius: 2, marginRight: 4 }} />Pareja</span>
      </div>
    </Card>
  );
}

function EventCard({ event }) {
  return (
    <Card style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#a855f7' }}>{event.day}</div>
        <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>{event.month}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid rgba(168,85,247,0.15)', paddingLeft: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{event.emoji} {event.title}</div>
        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{event.time} · {event.assignee}</div>
      </div>
      <Pill tone={event.tone || 'purple'}>{event.status}</Pill>
    </Card>
  );
}

function CalendarList({ events }) {
  return (
    <div style={{ margin: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Label>Próximos eventos</Label>
      {events.map(e => <EventCard key={e.id} event={e} />)}
    </div>
  );
}

Object.assign(window, { AchievementsGrid, AchievementBadge, WeekStrip, EventCard, CalendarList });
