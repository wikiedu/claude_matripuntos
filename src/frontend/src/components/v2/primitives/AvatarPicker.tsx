// v1.6 — AvatarPicker reutilizable.
// Reemplaza el código duplicado que vivía inline en Settings.tsx y
// StepProfile.tsx. Acepta size para variar tamaño del preview.

import { AVATAR_EMOJIS, AVATAR_COLORS } from '../../../data/avatarCatalog'

export interface AvatarPickerProps {
  emoji: string
  color: string
  onChange: (next: { emoji: string; color: string }) => void
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarPicker({ emoji, color, onChange, size = 'md' }: AvatarPickerProps) {
  const previewSize =
    size === 'lg' ? 'h-24 w-24 text-5xl' :
    size === 'sm' ? 'h-12 w-12 text-2xl' :
    'h-16 w-16 text-3xl'

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        data-testid="avatar-preview"
        className={`${previewSize} rounded-full flex items-center justify-center shadow-lg`}
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        {emoji}
      </div>

      <div className="grid grid-cols-6 gap-2 w-full">
        {AVATAR_EMOJIS.map(e => (
          <button
            key={e}
            type="button"
            data-testid={`emoji-opt-${e}`}
            data-selected={e === emoji}
            onClick={() => onChange({ emoji: e, color })}
            className={`text-2xl rounded-lg p-2 transition ${e === emoji ? 'bg-purple-500/30 ring-2 ring-purple-400' : 'hover:bg-white/5'}`}
            aria-label={`Avatar emoji ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto w-full pb-1">
        {AVATAR_COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            data-testid={`color-opt-${c.value}`}
            data-selected={c.value === color}
            onClick={() => onChange({ emoji, color: c.value })}
            className={`h-8 w-8 rounded-full flex-shrink-0 transition ${c.value === color ? 'ring-2 ring-white scale-110' : ''}`}
            style={{ background: c.value }}
            aria-label={`Color ${c.name}`}
          />
        ))}
      </div>
    </div>
  )
}
