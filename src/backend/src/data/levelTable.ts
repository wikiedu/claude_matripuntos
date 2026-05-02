// v1.7 — Tabla de niveles de pareja. Spec §4.1.
// XP requerido escala: cada nivel ~2.x el anterior, accesible a parejas
// activas en 2-4 semanas para los primeros niveles.

// 10 thresholds = uno por nivel. THRESHOLDS[i] es el XP mínimo para Lv (i+1).
// Lv 10 (Vida) = 100000 — meta aspiracional larga (~año de uso intenso).
export const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000, 24000, 100000] as const

export const LEVEL_NAMES = [
  'Vecinos', 'Amigos', 'Cómplices', 'Equipo', 'Aliados',
  'Tribu', 'Familia', 'Hogar', 'Refugio', 'Vida',
] as const

// Perks desbloqueables por nivel. El frontend mapea perk strings a recursos
// concretos (themes CSS, frames SVG, frases extra). Compatible con premium
// futuros sin romper el contrato.
export const LEVEL_PERKS: Record<number, string[]> = {
  1: [],
  2: ['theme:tribe'],
  3: ['theme:tribe', 'avatar-frame:starter'],
  4: ['theme:tribe', 'avatar-frame:bronze'],
  5: ['theme:harmony', 'avatar-frame:bronze'],
  6: ['theme:harmony', 'avatar-frame:silver'],
  7: ['theme:warmth', 'avatar-frame:silver'],
  8: ['theme:warmth', 'avatar-frame:gold'],
  9: ['theme:apex', 'avatar-frame:gold'],
  10: ['theme:apex', 'avatar-frame:diamond', 'phrases:legendary'],
}

export const MAX_LEVEL = 10
