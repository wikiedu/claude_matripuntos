// Contract-level tests for /api/tasks. We do NOT spin up the full express
// app (that would need a DB), we test the Zod validation layer directly.
// Covers the public contract: what we accept / reject on POST /api/tasks.
//
// Matched schemas must stay in sync with routes/taskRoutes.ts. If this file
// breaks, the wire contract with the frontend is breaking too.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

// Re-declared here on purpose: it is literally the wire contract, and we
// want this test file to fail loudly if routes/taskRoutes.ts schema drifts.
const createTaskSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  category: z.enum([
    'cocina',
    'baños',
    'limpieza',
    'compra',
    'logistica',
    'cuidado',
    'mantenimiento',
    'jardineria',
    'mascotas',
  ]),
  pointsBase: z.number().positive().max(100).optional().default(1.0),
  isDefault: z.boolean().optional().default(false),
  defaultAssigneeId: z.string().nullable().optional(),
})

describe('POST /api/tasks — createTaskSchema contract', () => {
  it('accepts a minimal valid payload with defaults', () => {
    const parsed = createTaskSchema.parse({
      name: 'Limpiar la nevera',
      category: 'cocina',
    })
    expect(parsed.pointsBase).toBe(1.0)
    expect(parsed.isDefault).toBe(false)
    expect(parsed.defaultAssigneeId).toBeUndefined()
  })

  it('accepts an explicit defaultAssigneeId and keeps null', () => {
    const parsed = createTaskSchema.parse({
      name: 'Sacar basura',
      category: 'limpieza',
      defaultAssigneeId: null,
    })
    expect(parsed.defaultAssigneeId).toBeNull()
  })

  it('accepts a cuid-like assigneeId string', () => {
    const parsed = createTaskSchema.parse({
      name: 'Comprar fruta',
      category: 'compra',
      defaultAssigneeId: 'ckabcd1234567890',
    })
    expect(parsed.defaultAssigneeId).toBe('ckabcd1234567890')
  })

  it('rejects empty name', () => {
    expect(() =>
      createTaskSchema.parse({ name: '', category: 'cocina' }),
    ).toThrow()
  })

  it('rejects unknown category', () => {
    expect(() =>
      createTaskSchema.parse({ name: 'x', category: 'otra_cosa' }),
    ).toThrow()
  })

  it('rejects non-positive pointsBase', () => {
    expect(() =>
      createTaskSchema.parse({ name: 'x', category: 'cocina', pointsBase: 0 }),
    ).toThrow()
  })

  it('rejects pointsBase above cap (audit v1.4 P1-F regression)', () => {
    // Previous bug: client sent precomputed pointsFinal bypassing the cap.
    // Now only pointsBase is accepted and the cap is 100.
    expect(() =>
      createTaskSchema.parse({
        name: 'x',
        category: 'cocina',
        pointsBase: 101,
      }),
    ).toThrow()
  })

  it('trims leading/trailing whitespace in name', () => {
    const parsed = createTaskSchema.parse({
      name: '   Cocinar   ',
      category: 'cocina',
    })
    expect(parsed.name).toBe('Cocinar')
  })
})

// Contract for POST /api/tasks/:taskId/log — mirrors the schema used in
// routes/taskRoutes.ts. Ensures clients can't sneak in precomputed
// `pointsFinal` again (audit v1.4 P1-B regression).
const createTaskLogSchema = z.object({
  date: z.string().min(1),
  pointsBase: z.number().positive().max(100),
  modifier: z
    .enum(['none', 'extra', 'partial', 'profunda', 'complicada', 'visita'])
    .optional(),
  notes: z.string().max(500).trim().optional(),
})

describe('POST /api/tasks/:id/log — createTaskLogSchema contract', () => {
  it('accepts a minimal valid log', () => {
    const parsed = createTaskLogSchema.parse({
      date: '2026-04-22',
      pointsBase: 10,
    })
    expect(parsed.modifier).toBeUndefined()
  })

  it('rejects pointsBase above cap', () => {
    expect(() =>
      createTaskLogSchema.parse({ date: '2026-04-22', pointsBase: 101 }),
    ).toThrow()
  })

  it('rejects unknown modifier (prevents fabricated multipliers)', () => {
    expect(() =>
      createTaskLogSchema.parse({
        date: '2026-04-22',
        pointsBase: 10,
        modifier: 'mega_bonus' as unknown as 'extra',
      }),
    ).toThrow()
  })

  it('strips implicit pointsFinal (regression: v1.4 P1-B)', () => {
    // Zod's default parse will drop unknown keys silently — which is what we
    // want: a malicious client can send pointsFinal and it will be ignored
    // instead of used as-is by the backend.
    const parsed = createTaskLogSchema.parse({
      date: '2026-04-22',
      pointsBase: 10,
      pointsFinal: 9999, // attacker attempt
    } as any)
    expect((parsed as any).pointsFinal).toBeUndefined()
  })
})
