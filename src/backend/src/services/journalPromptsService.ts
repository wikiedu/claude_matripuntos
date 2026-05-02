// v2.0.2 — Selector determinístico de prompt diario.
// Hash cyrb53(coupleId + dayKey) para consistencia: ambos miembros de la
// pareja ven el mismo prompt el mismo día.
// "Skip" prompts vistos últimos 30 días con un set externo (caller side).

import { JOURNAL_PROMPTS, type JournalPromptSeed } from '../data/journalPrompts.js'

function cyrb53(str: string, seed: number = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return 4294967296 * (2097151 & h2) + (h1 >>> 0)
}

export function selectPromptForDay(
  coupleId: string,
  dayKey: string,  // 'YYYY-MM-DD'
  recentlyShownIds: Set<string> = new Set(),
): JournalPromptSeed {
  const candidates = JOURNAL_PROMPTS.filter(p => !recentlyShownIds.has(p.id))
  const pool = candidates.length > 0 ? candidates : JOURNAL_PROMPTS

  // Construir lista expandida por weight (más weight = más probabilidad).
  const expanded: JournalPromptSeed[] = []
  for (const p of pool) {
    for (let i = 0; i < p.weight; i++) expanded.push(p)
  }

  const idx = cyrb53(`${coupleId}-${dayKey}`) % expanded.length
  return expanded[idx]
}

export function dayKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10)
}
