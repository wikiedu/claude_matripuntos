interface Props {
  emoji?: string
  color?: string          // hex string
  size?: 'sm' | 'md' | 'lg'
  mood?: string | null
  className?: string
}

const sizes = {
  sm: { box: 28, emoji: 14 },
  md: { box: 36, emoji: 18 },
  lg: { box: 44, emoji: 22 },
}

export function Avatar({ emoji = '💕', color = '#7c3aed', size = 'md', mood, className = '' }: Props) {
  const s = sizes[size]
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: s.box, height: s.box }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)`, fontSize: s.emoji }}
      >
        {emoji}
      </div>
      {mood && (
        <span
          className="absolute -bottom-1 -right-1 text-xs rounded-full bg-bg-page border border-bg-page flex items-center justify-center"
          style={{ width: 16, height: 16, fontSize: 10 }}
        >{mood}</span>
      )}
    </div>
  )
}
