import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const entryCreateSchema = z.object({
  type: z.enum(['reflection', 'photo', 'voice', 'milestone', 'letter']),
  title: z.string().max(200).nullable().optional(),
  body: z.string().max(5000).nullable().optional(),
  shared: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  promptId: z.string().nullable().optional(),
  recipientId: z.string().nullable().optional(),
})

const reactSchema = z.object({
  emoji: z.string().min(1).max(8),
})

describe('POST /api/journal/entries — entryCreateSchema', () => {
  it('accepts minimum valid', () => {
    expect(() => entryCreateSchema.parse({ type: 'reflection' })).not.toThrow()
  })

  it('accepts full payload', () => {
    expect(() => entryCreateSchema.parse({
      type: 'milestone',
      title: 'Cena del sábado',
      body: 'Sábado increíble',
      shared: true,
      tags: ['viaje', 'amor'],
    })).not.toThrow()
  })

  it('rejects invalid type', () => {
    expect(() => entryCreateSchema.parse({ type: 'random' })).toThrow()
  })

  it('rejects body > 5000 chars', () => {
    expect(() => entryCreateSchema.parse({
      type: 'reflection', body: 'x'.repeat(6000),
    })).toThrow()
  })

  it('rejects > 20 tags', () => {
    expect(() => entryCreateSchema.parse({
      type: 'reflection',
      tags: Array.from({ length: 25 }, (_, i) => `t${i}`),
    })).toThrow()
  })

  it('rejects tag > 40 chars', () => {
    expect(() => entryCreateSchema.parse({
      type: 'reflection', tags: ['x'.repeat(50)],
    })).toThrow()
  })
})

describe('POST /api/journal/entries/:id/react — reactSchema', () => {
  it('accepts emoji ❤️', () => {
    expect(() => reactSchema.parse({ emoji: '❤️' })).not.toThrow()
  })

  it('rejects empty emoji', () => {
    expect(() => reactSchema.parse({ emoji: '' })).toThrow()
  })

  it('rejects emoji > 8 chars', () => {
    expect(() => reactSchema.parse({ emoji: '🔥🔥🔥🔥🔥' })).toThrow()
  })
})
