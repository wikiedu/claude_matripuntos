import { useState } from 'react'
import { Avatar } from './Avatar'

const AVATAR_EMOJIS = ['🐼', '🦊', '🐧', '🐸', '🦄', '🐯', '🐻', '🦁', '🐨', '🐙', '🦋', '🐺', '🦝', '🐮', '🐷', '🐰']
const AVATAR_COLORS = [
  '#7c3aed', // púrpura
  '#1d4ed8', // azul
  '#be185d', // rosa
  '#15803d', // verde
  '#d97706', // amber
  '#0284c7', // cyan
  '#e11d48', // rojo
  '#374151', // gris
]

interface AvatarSelectorProps {
  currentEmoji: string
  currentColor: string
  onChange: (emoji: string, color: string) => void
}

export function AvatarSelector({ currentEmoji, currentColor, onChange }: AvatarSelectorProps) {
  const [emoji, setEmoji] = useState(currentEmoji)
  const [color, setColor] = useState(currentColor)

  const handleChange = (newEmoji: string, newColor: string) => {
    setEmoji(newEmoji)
    setColor(newColor)
    onChange(newEmoji, newColor)
  }

  return (
    <div>
      {/* Preview */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <Avatar emoji={emoji} color={color} size="lg" />
      </div>

      {/* Emoji grid */}
      <p style={{ color: 'var(--matri-text-2)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Personaje
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8, marginBottom: 16 }}>
        {AVATAR_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => handleChange(e, color)}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: e === emoji ? color : 'rgba(255,255,255,0.06)',
              border: e === emoji ? '2px solid var(--matri-amber)' : '2px solid transparent',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {e}
          </button>
        ))}
      </div>

      {/* Color grid */}
      <p style={{ color: 'var(--matri-text-2)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Color de fondo
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {AVATAR_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => handleChange(emoji, c)}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: c,
              border: c === color ? '3px solid var(--matri-amber)' : '3px solid transparent',
              cursor: 'pointer',
              outline: c === color ? '2px solid rgba(245,158,11,0.3)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}
