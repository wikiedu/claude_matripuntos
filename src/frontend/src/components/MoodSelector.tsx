const MOODS = [
  { emoji: '😊', label: 'Animado/a' },
  { emoji: '😴', label: 'Cansado/a' },
  { emoji: '😤', label: 'Estresado/a' },
  { emoji: '🥰', label: 'Contento/a' },
  { emoji: '😰', label: 'Agobiado/a' },
  { emoji: '🧘', label: 'Tranquilo/a' },
  { emoji: '😂', label: 'De buen humor' },
  { emoji: '🤯', label: 'Saturado/a' },
]

interface MoodSelectorProps {
  current: string | null
  onSelect: (mood: string) => void
  onClose: () => void
}

export function MoodSelector({ current, onSelect, onClose }: MoodSelectorProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
        }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
          background: 'var(--matri-card-bg)',
          borderTop: '1px solid var(--matri-card-border)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 16px 32px',
        }}
      >
        <p style={{ color: 'var(--matri-text)', fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
          ¿Cómo estás hoy?
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {MOODS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '10px 4px',
                borderRadius: 10,
                border: current === emoji
                  ? '2px solid var(--matri-amber)'
                  : '2px solid transparent',
                background: current === emoji
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 28 }}>{emoji}</span>
              <span style={{ fontSize: 10, color: 'var(--matri-text-2)', textAlign: 'center' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
