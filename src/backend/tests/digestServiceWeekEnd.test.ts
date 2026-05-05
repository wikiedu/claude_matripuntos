// v2.5.1 audit 02 S1 — tests del weekEnd ISO range.
// Helper canónico que reemplaza el getDay()-based de antes, que producía
// solapamientos/agujeros si el cron no se ejecutaba exactamente lunes.

import { describe, it, expect } from '@jest/globals'
import { lastIsoWeekRange } from '../src/services/digestService.js'

describe('lastIsoWeekRange — semana anterior canónica', () => {
  it('lunes 8am → semana anterior (lun-dom previos)', () => {
    // Lunes 4 mayo 2026 a las 8am UTC
    const now = new Date('2026-05-04T08:00:00Z')
    const { weekStart, weekEnd } = lastIsoWeekRange(now)
    expect(weekStart.toISOString()).toBe('2026-04-27T00:00:00.000Z')
    expect(weekEnd.toISOString()).toBe('2026-05-03T23:59:59.999Z')
  })

  it('martes → misma semana anterior que lunes', () => {
    const now = new Date('2026-05-05T10:00:00Z')
    const { weekStart, weekEnd } = lastIsoWeekRange(now)
    expect(weekStart.toISOString().slice(0, 10)).toBe('2026-04-27')
    expect(weekEnd.toISOString().slice(0, 10)).toBe('2026-05-03')
  })

  it('domingo → semana ANTES de la actual (no la actual)', () => {
    // Domingo 10 mayo 2026 (semana actual: 4-10 may)
    const now = new Date('2026-05-10T20:00:00Z')
    const { weekStart, weekEnd } = lastIsoWeekRange(now)
    // Debe devolver la semana anterior (27 abr - 3 may), NO la actual.
    expect(weekStart.toISOString().slice(0, 10)).toBe('2026-04-27')
    expect(weekEnd.toISOString().slice(0, 10)).toBe('2026-05-03')
  })

  it('weekEnd siempre 7 días - 1ms después de weekStart', () => {
    const now = new Date('2026-06-15T12:00:00Z')
    const { weekStart, weekEnd } = lastIsoWeekRange(now)
    expect(weekEnd.getTime() - weekStart.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1)
  })

  it('rangos no se solapan entre martes y miércoles consecutivos', () => {
    const tueRange = lastIsoWeekRange(new Date('2026-05-05T10:00:00Z'))
    const wedRange = lastIsoWeekRange(new Date('2026-05-06T10:00:00Z'))
    // Mismo rango: ambos generan digest de la semana anterior.
    expect(tueRange.weekStart.toISOString()).toBe(wedRange.weekStart.toISOString())
    expect(tueRange.weekEnd.toISOString()).toBe(wedRange.weekEnd.toISOString())
  })
})
