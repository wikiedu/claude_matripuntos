// v1.6 — Catálogo único de avatares (emoji + color).
// Reemplaza las constantes locales duplicadas que existían en
// pages/Settings.tsx y components/onboarding/StepProfile.tsx.
//
// Compatible con dark theme (#0f0a1e fondo): todos los colores tienen
// contraste suficiente. AvatarPicker aplica gradient
// linear-gradient(135deg, color, colorcc).

export const AVATAR_EMOJIS: string[] = [
  // Animales — foco principal, gender-neutral
  '🐼','🦊','🐯','🐻','🐰','🦁','🐶','🐱','🐨','🐸',
  '🦄','🐧','🐢','🦉','🐙','🦋','🐝','🦔','🐹','🦦',
  // Naturaleza neutra
  '🌸','🌻','🌙','⭐','🔥','🌊','🌈','🍀',
  // Símbolos cálidos
  '💜','✨',
] // 30 total

export interface AvatarColor {
  name: string
  value: string  // hex #rrggbb
}

export const AVATAR_COLORS: AvatarColor[] = [
  { name: 'Indigo',   value: '#7c3aed' },
  { name: 'Magenta',  value: '#c026d3' },
  { name: 'Rosa',     value: '#ec4899' },
  { name: 'Coral',    value: '#f43f5e' },
  { name: 'Naranja',  value: '#f59e0b' },
  { name: 'Ámbar',    value: '#fbbf24' },
  { name: 'Lima',     value: '#84cc16' },
  { name: 'Verde',    value: '#10b981' },
  { name: 'Turquesa', value: '#06b6d4' },
  { name: 'Cielo',    value: '#0ea5e9' },
  { name: 'Azul',     value: '#3b82f6' },
  { name: 'Lila',     value: '#a855f7' },
] // 12 total
