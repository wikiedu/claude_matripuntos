// v1.6.1 — Contract tests for /api/notifications response shape. Hermetic.

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

const notificationSchema = z.object({
  id: z.string(),
  coupleId: z.string(),
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().or(z.date()),
})

const notificationListSchema = z.array(notificationSchema)

describe('GET /api/notifications — notificationListSchema', () => {
  it('accepts empty array', () => {
    expect(() => notificationListSchema.parse([])).not.toThrow()
  })

  it('accepts a valid notification', () => {
    const sample = {
      id: 'n1',
      coupleId: 'c1',
      userId: 'u1',
      type: 'event_proposed',
      title: 'Nueva actividad',
      message: 'Tu pareja ha propuesto una actividad',
      isRead: false,
      createdAt: '2026-05-01T00:00:00Z',
    }
    expect(() => notificationListSchema.parse([sample])).not.toThrow()
  })

  it('rejects notification without isRead', () => {
    const broken = {
      id: 'n1',
      coupleId: 'c1',
      userId: 'u1',
      type: 't',
      title: 't',
      message: 'm',
      createdAt: '2026-05-01T00:00:00Z',
    }
    expect(() => notificationListSchema.parse([broken as any])).toThrow()
  })
})
