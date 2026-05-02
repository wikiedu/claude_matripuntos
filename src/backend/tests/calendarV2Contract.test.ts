// v2.0.1 — Contract tests hermetic para schemas /api/calendar/v2.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

// Mirror de schemas en routes/calendarV2.ts
const entryCreateSchema = z.object({
  type: z.enum(['event', 'task', 'service', 'birthday', 'holiday', 'external', 'manual']),
  title: z.string().min(1).max(280),
  date: z.string(),
  endDate: z.string().nullable().optional(),
  allDay: z.boolean().optional().default(true),
  category: z.string().max(40).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  recurrence: z.string().max(500).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const providerSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['limpieza', 'jardineria', 'cuidado_ninos', 'mantenimiento', 'otro']),
  recurrence: z.string().max(500).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
})

describe('POST /api/calendar/v2/entries — entryCreateSchema', () => {
  it('accepts minimal valid payload', () => {
    expect(() => entryCreateSchema.parse({
      type: 'manual', title: 'Cita médico', date: '2026-06-01T10:00:00Z',
    })).not.toThrow()
  })

  it('rejects invalid type', () => {
    expect(() => entryCreateSchema.parse({
      type: 'random', title: 'X', date: '2026-06-01',
    })).toThrow()
  })

  it('rejects empty title', () => {
    expect(() => entryCreateSchema.parse({
      type: 'manual', title: '', date: '2026-06-01',
    })).toThrow()
  })

  it('rejects title > 280 chars', () => {
    expect(() => entryCreateSchema.parse({
      type: 'manual', title: 'x'.repeat(300), date: '2026-06-01',
    })).toThrow()
  })

  it('accepts metadata as record', () => {
    expect(() => entryCreateSchema.parse({
      type: 'birthday', title: 'A', date: '2026-06-01',
      metadata: { childId: 'c1' },
    })).not.toThrow()
  })

  it('rejects description > 2000 chars', () => {
    expect(() => entryCreateSchema.parse({
      type: 'manual', title: 'X', date: '2026-06-01',
      description: 'x'.repeat(2500),
    })).toThrow()
  })
})

describe('POST /api/calendar/v2/service-providers — providerSchema', () => {
  it('accepts minimal valid payload', () => {
    expect(() => providerSchema.parse({
      name: 'Carmen — limpieza', type: 'limpieza',
    })).not.toThrow()
  })

  it('rejects invalid type', () => {
    expect(() => providerSchema.parse({ name: 'X', type: 'cosmico' })).toThrow()
  })

  it('rejects empty name', () => {
    expect(() => providerSchema.parse({ name: '', type: 'otro' })).toThrow()
  })

  it('accepts recurrence', () => {
    expect(() => providerSchema.parse({
      name: 'X', type: 'limpieza', recurrence: 'FREQ=WEEKLY;BYDAY=TU,TH',
    })).not.toThrow()
  })

  it('rejects notes > 1000 chars', () => {
    expect(() => providerSchema.parse({
      name: 'X', type: 'otro', notes: 'x'.repeat(1500),
    })).toThrow()
  })
})
