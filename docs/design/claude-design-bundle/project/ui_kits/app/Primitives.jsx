// Matripuntos UI kit — shared primitives
// Drop-in reusable building blocks used by every screen.
// Pixel-match to src/frontend/src/components (dark theme).

const { useState } = React;

// ─── Card: translucent purple-black panel with soft border ──
function Card({ children, style, highlighted, ...rest }) {
  return (
    <div
      {...rest}
      style={{
        background: 'rgba(26,16,53,0.85)',
        border: `1px solid ${highlighted ? 'rgba(245,158,11,0.3)' : 'rgba(168,85,247,0.15)'}`,
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(10px)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Button: primary (amber) / secondary / purple / danger ──
function Button({ variant = 'primary', children, style, disabled, ...rest }) {
  const base = {
    font: 'inherit', fontSize: 13, fontWeight: 600,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '9px 16px', borderRadius: 10,
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'opacity 0.15s',
  };
  const variants = {
    primary:   { background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' },
    purple:    { background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#fff' },
    secondary: { background: 'rgba(26,16,53,0.85)', color: '#e2e8f0', border: '1px solid rgba(168,85,247,0.3)' },
    ghost:     { background: 'transparent', color: '#9ca3af' },
    danger:    { background: '#ef4444', color: '#fff' },
  };
  return <button {...rest} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

// ─── Pill/Badge ──
function Pill({ tone = 'amber', children, style }) {
  const tones = {
    amber:   { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', bd: 'rgba(245,158,11,0.3)' },
    purple:  { bg: 'rgba(168,85,247,0.15)', fg: '#a855f7', bd: 'rgba(168,85,247,0.3)' },
    success: { bg: 'rgba(34,197,94,0.12)',  fg: '#22c55e', bd: 'rgba(34,197,94,0.3)' },
    warn:    { bg: 'rgba(250,204,21,0.1)',  fg: '#facc15', bd: 'rgba(250,204,21,0.3)' },
    danger:  { bg: 'rgba(239,68,68,0.1)',   fg: '#f87171', bd: 'rgba(239,68,68,0.3)' },
    info:    { bg: 'rgba(96,165,250,0.1)',  fg: '#60a5fa', bd: 'rgba(96,165,250,0.25)' },
    neutral: { bg: 'rgba(255,255,255,0.06)', fg: '#e2e8f0', bd: 'rgba(255,255,255,0.1)' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      ...style,
    }}>{children}</span>
  );
}

// ─── Avatar: colored circle with emoji + optional mood badge ──
function Avatar({ emoji = '🐼', color = '#7c3aed', mood, size = 'md' }) {
  const s = { sm: { outer: 28, inner: 13, badge: 12 }, md: { outer: 36, inner: 18, badge: 14 }, lg: { outer: 48, inner: 24, badge: 16 } }[size];
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: s.outer, height: s.outer, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: s.inner,
      }}>{emoji}</div>
      {mood && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: s.badge, height: s.badge, borderRadius: '50%',
          background: '#0f0a1e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: s.badge * 0.7,
        }}>{mood}</div>
      )}
    </div>
  );
}

// ─── Progress bar ──
function ProgressBar({ value = 0, max = 100, tone = 'purple' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fills = {
    purple: 'linear-gradient(90deg,#a855f7,#7c3aed)',
    amber:  'linear-gradient(90deg,#f59e0b,#d97706)',
    indigo: 'linear-gradient(90deg,#4f46e5,#7c3aed)',
  };
  return (
    <div style={{ height: 6, background: 'rgba(168,85,247,0.1)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: fills[tone], transition: 'width 0.5s cubic-bezier(0.22,0.61,0.36,1)' }} />
    </div>
  );
}

// ─── Input / TextField ──
function Input({ style, ...rest }) {
  return (
    <input {...rest} style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(168,85,247,0.15)',
      borderRadius: 8, padding: '9px 12px',
      color: '#e2e8f0', font: 'inherit', fontSize: 13, outline: 'none',
      ...style,
    }} onFocus={e => { e.target.style.borderColor = 'rgba(245,158,11,0.5)'; }} onBlur={e => { e.target.style.borderColor = 'rgba(168,85,247,0.15)'; }} />
  );
}

// ─── Section label — tiny uppercase ──
function Label({ children, style }) {
  return (
    <div style={{
      fontSize: 10, color: '#6b7280',
      textTransform: 'uppercase', letterSpacing: '0.05em',
      fontWeight: 500,
      ...style,
    }}>{children}</div>
  );
}

// Expose globally for other Babel scripts
Object.assign(window, { Card, Button, Pill, Avatar, ProgressBar, Input, Label });
