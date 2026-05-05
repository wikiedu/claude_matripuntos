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

  // v2.5.1 audit 02 S1 — preservar "always day N" en MONTHLY/YEARLY:
  // anchorDay/anchorMonth/hours capturados del start original. En cada
  // advance MONTHLY/YEARLY recomputamos desde anchor (no desde cursor)
  // para que 31-ene → 28-feb → 31-mar (no 28-mar).
  const anchorDay = start.getUTCDate()
  const anchorMonth = start.getUTCMonth()
  const anchorHours = start.getUTCHours()
  const anchorMinutes = start.getUTCMinutes()
  const anchorSeconds = start.getUTCSeconds()
  let monthlyCount = 0
  let yearlyCount = 0

  let cursor = new Date(start)
  let safety = 0

  while (out.length < max && cursor.getTime() <= upperBound.getTime()) {
    if (safety++ > 5000) break

    let include = true
    if (rule.byday && rule.byday.length > 0) {
      include = rule.byday.includes(cursor.getUTCDay())
    }

    if (include) out.push(new Date(cursor))

    advance(cursor, rule, {
      start, anchorDay, anchorMonth,
      anchorHours, anchorMinutes, anchorSeconds,
      monthlyCount: ++monthlyCount, yearlyCount: ++yearlyCount,
    })
  }

  return out
}

interface AdvanceCtx {
  start: Date
  anchorDay: number
  anchorMonth: number
  anchorHours: number
  anchorMinutes: number
  anchorSeconds: number
  monthlyCount: number
  yearlyCount: number
}

function advance(cursor: Date, rule: ParsedRule, ctx: AdvanceCtx): void {
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
      // RFC 5545 §3.3.10: cuando el día del start no existe en el mes
      // target (ej. 31-ene → feb), clamp al último día del mes target,
      // pero el SIGUIENTE iteración se basa en el anchorDay original.
      // Así 31-ene → 28-feb → 31-mar (no 28-mar).
      monthlyAdvance(cursor, rule.interval, ctx)
      break
    case 'YEARLY':
      yearlyAdvance(cursor, rule.interval, ctx)
      break
  }
}

function monthlyAdvance(cursor: Date, interval: number, ctx: AdvanceCtx): void {
  // Calcula año/mes target desde el anchor.
  const totalMonths = ctx.start.getUTCMonth() + interval * ctx.monthlyCount
  const targetYear = ctx.start.getUTCFullYear() + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(ctx.anchorDay, lastDay)
  cursor.setTime(
    Date.UTC(targetYear, targetMonth, targetDay,
      ctx.anchorHours, ctx.anchorMinutes, ctx.anchorSeconds),
  )
}

function yearlyAdvance(cursor: Date, interval: number, ctx: AdvanceCtx): void {
  const targetYear = ctx.start.getUTCFullYear() + interval * ctx.yearlyCount
  const lastDay = new Date(Date.UTC(targetYear, ctx.anchorMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(ctx.anchorDay, lastDay)
  cursor.setTime(
    Date.UTC(targetYear, ctx.anchorMonth, targetDay,
      ctx.anchorHours, ctx.anchorMinutes, ctx.anchorSeconds),
  )
}
