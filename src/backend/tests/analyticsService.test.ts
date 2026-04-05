import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { getDailyBreakdown } from '../src/services/analyticsService'
import { Decimal } from '@prisma/client/runtime/library'

describe('getDailyBreakdown', () => {
  let prisma: PrismaClient
  let coupleId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    const couple = await prisma.couple.create({ data: { secretKey: `test-${Date.now()}` } })
    coupleId = couple.id
  })

  afterEach(async () => {
    await prisma.taskLog.deleteMany({ where: { coupleId } })
    await prisma.event.deleteMany({ where: { coupleId } })
    await prisma.couple.delete({ where: { id: coupleId } })
    await prisma.$disconnect()
  })

  it('returns one entry per day in range, zeros for empty days', async () => {
    const start = new Date('2026-04-01T00:00:00Z')
    const end = new Date('2026-04-03T23:59:59Z')

    const result = await getDailyBreakdown(coupleId, start, end)

    expect(result).toHaveLength(3)
    expect(result[0].date).toBe('2026-04-01')
    expect(result[0].events).toBe(0)
    expect(result[0].points).toBe(0)
    expect(result[0].tasks).toBe(0)
  })

  it('each entry has a label field', async () => {
    const start = new Date('2026-04-01T00:00:00Z')
    const end = new Date('2026-04-01T23:59:59Z')

    const result = await getDailyBreakdown(coupleId, start, end)

    expect(result).toHaveLength(1)
    expect(typeof result[0].label).toBe('string')
    expect(result[0].label.length).toBeGreaterThan(0)
  })
})
