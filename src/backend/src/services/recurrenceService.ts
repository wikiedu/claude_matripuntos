// v2.0.1 — RRULE simplificado RFC 5545 subset.
// Soporta: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, UNTIL, COUNT, BYDAY.
// Cap de seguridad: max 365 ocurrencias generadas por expansión.

const MAX_OCCURRENCES = 365

interface ParsedRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  until?: Date
  count?: number
  byday?: number[]  // 0=Sunday, 1=Monday, ...
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

export function parseRRule(rrule: string): ParsedRule {
  const parts = rrule.split(';').map(p => p.trim()).filter(Boolean)
  const map: Record<string, string> = {}
  for (const p of parts) {
    const [k, v] = p.split('=')
    if (k && v) map[k.toUpperCase()] = v.toUpperCase()
  }

  const freq = map.FREQ as ParsedRule['freq']
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) {
    throw new Error(`Invalid FREQ: ${freq}`)
  }

  const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1
  if (interval < 1 || interval > 365) throw new Error('INTERVAL out of range')

  const result: ParsedRule = { freq, interval }
  if (map.UNTIL) {
    const u = parseUntil(map.UNTIL)
    result.until = u
  }
  if (map.COUNT) {
    const c = parseInt(map.COUNT, 10)
    if (c < 1 || c > MAX_OCCURRENCES) throw new Error('COUNT out of range')
    result.count = c
  }
  if (map.BYDAY) {
    result.byday = map.BYDAY.split(',')
      .map(d => DAY_MAP[d.trim()])
      .filter(d => d !== undefined)
  }
  return result
}

function parseUntil(s: string): Date {
  // Formato RFC 5545: YYYYMMDDTHHMMSSZ (UTC) o YYYYMMDD.
  if (s.length === 8) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T23:59:59Z`)
  }
  if (s.endsWith('Z')) {
    return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`)
  }
  throw new Error('Unsupported UNTIL format')
}

export function expandRecurrence(rrule: string, start: Date, windowDays: number = 365): Date[] {
  if (windowDays < 1 || windowDays > 365 * 6) throw new Error('windowDays out of range')
  const rule = parseRRule(rrule)
  const out: Date[] = []
  const windowEnd = new Date(start.getTime() + windowDays * 24 * 60 * 60 * 1000)
  const upperBound = rule.until && rule.until.getTime() < windowEnd.getTime() ? rule.until : windowEnd
  const max = rule.count ?? MAX_OCCURRENCES

  let cursor = new Date(start)
  let safety = 0

  while (out.length < max && cursor.getTime() <= upperBound.getTime()) {
    if (safety++ > 5000) break

    let include = true
    if (rule.byday && rule.byday.length > 0) {
      include = rule.byday.includes(cursor.getUTCDay())
    }

    if (include) out.push(new Date(cursor))

    advance(cursor, rule)
  }

  return out
}

function advance(cursor: Date, rule: ParsedRule): void {
  switch (rule.freq) {
    case 'DAILY':
      cursor.setUTCDate(cursor.getUTCDate() + rule.interval)
      break
    case 'WEEKLY':
      // Si byday → avanzamos día a día y filtramos arriba; sino, cada interval semanas.
      if (rule.byday && rule.byday.length > 0) {
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      } else {
        cursor.setUTCDate(cursor.getUTCDate() + 7 * rule.interval)
      }
      break
    case 'MONTHLY':
      cursor.setUTCMonth(cursor.getUTCMonth() + rule.interval)
      break
    case 'YEARLY':
      cursor.setUTCFullYear(cursor.getUTCFullYear() + rule.interval)
      break
  }
}
