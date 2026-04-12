import { useState } from 'react'
import { MoodSelector } from './MoodSelector'

interface AvatarProps {
  emoji: string
  color: string
  mood?: string | null
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean // si true, tap abre MoodSelector
  onMoodChange?: (mood: string) => void
}

const SIZE_MAP = {
  sm: { outer: 28, inner: 13, badge: 12, badgeOffset: -2 },
  md: { outer: 36, inner: 18, badge: 14, badgeOffset: -2 },
  lg: { outer: 48, inner: 24, badge: 16, badgeOffset: -3 },
}

export function Avatar({ emoji, color, mood, size = 'md', interactive = false, onMoodChange }: AvatarProps) {
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const s = SIZE_MAP[size]

  return (
    <>
      <div
        style={{ position: 'relative', display: 'inline-block', cursor: interactive ? 'pointer' : 'default' }}
        onClick={interactive ? () => setShowMoodSelector(true) : undefined}
      >
        <div
          style={{
            width: s.outer,
            height: s.outer,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: s.inner,
            userSelect: 'none',
          }}
        >
          {emoji}
        </div>
        {mood && (
          <div
            style={{
              position: 'absolute',
              bottom: s.badgeOffset,
              right: s.badgeOffset,
              width: s.badge,
              height: s.badge,
              borderRadius: '50%',
              background: 'var(--matri-bg, #0f0a1e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: s.badge * 0.7,
            }}
          >
            {mood}
          </div>
        )}
      </div>
      {interactive && showMoodSelector && (
        <MoodSelector
          current={mood ?? null}
          onSelect={(m) => {
            onMoodChange?.(m)
            setShowMoodSelector(false)
          }}
          onClose={() => setShowMoodSelector(false)}
        />
      )}
    </>
  )
}
