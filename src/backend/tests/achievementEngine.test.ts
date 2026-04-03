import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { AchievementEngine } from '../src/services/achievementEngine'

describe('AchievementEngine', () => {
  let prisma: PrismaClient
  let engine: AchievementEngine
  let testCoupleId: string
  let testUserId: string

  beforeEach(async () => {
    prisma = new PrismaClient()
    engine = new AchievementEngine(prisma)

    // Create test couple
    const couple = await prisma.couple.create({
      data: {
        secretKey: `test-key-${Date.now()}`,
      },
    })
    testCoupleId = couple.id

    // Create test user
    const user = await prisma.user.create({
      data: {
        coupleId: testCoupleId,
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'test',
        name: 'Test User',
      },
    })
    testUserId = user.id
  })

  afterEach(async () => {
    // Cleanup
    await prisma.couple.delete({ where: { id: testCoupleId } })
    await prisma.$disconnect()
  })

  describe('checkPointMilestones', () => {
    it('should unlock "Primeros pasos" achievement at 50 points', async () => {
      // Create an achievement
      const achievement = await prisma.achievement.create({
        data: {
          coupleId: testCoupleId,
          type: 'solo',
          name: 'Primeros pasos',
          description: 'Reached 50 points',
          icon: '🏁',
          rarity: 'common',
        },
      })

      // Create a points transaction
      await prisma.pointsTransaction.create({
        data: {
          coupleId: testCoupleId,
          userId: testUserId,
          type: 'event_accepted',
          amount: 50,
        },
      })

      // Check achievements
      const result = await engine.checkPointMilestones(testUserId, testCoupleId)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Primeros pasos')
    })

    it('should unlock "Centinela" achievement at 250 points', async () => {
      const achievement = await prisma.achievement.create({
        data: {
          coupleId: testCoupleId,
          type: 'solo',
          name: 'Centinela',
          description: 'Reached 250 points',
          icon: '🛡️',
          rarity: 'rare',
        },
      })

      // Create multiple transactions totaling 250 points
      await prisma.pointsTransaction.create({
        data: {
          coupleId: testCoupleId,
          userId: testUserId,
          type: 'event_accepted',
          amount: 150,
        },
      })

      await prisma.pointsTransaction.create({
        data: {
          coupleId: testCoupleId,
          userId: testUserId,
          type: 'event_accepted',
          amount: 100,
        },
      })

      const result = await engine.checkPointMilestones(testUserId, testCoupleId)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Centinela')
    })

    it('should not unlock achievement if points are below threshold', async () => {
      const achievement = await prisma.achievement.create({
        data: {
          coupleId: testCoupleId,
          type: 'solo',
          name: 'Primeros pasos',
          description: 'Reached 50 points',
          icon: '🏁',
          rarity: 'common',
        },
      })

      // Create transaction with less than 50 points
      await prisma.pointsTransaction.create({
        data: {
          coupleId: testCoupleId,
          userId: testUserId,
          type: 'event_accepted',
          amount: 30,
        },
      })

      const result = await engine.checkPointMilestones(testUserId, testCoupleId)

      expect(result).toHaveLength(0)
    })

    it('should not unlock achievement twice', async () => {
      const achievement = await prisma.achievement.create({
        data: {
          coupleId: testCoupleId,
          type: 'solo',
          name: 'Primeros pasos',
          description: 'Reached 50 points',
          icon: '🏁',
          rarity: 'common',
        },
      })

      await prisma.pointsTransaction.create({
        data: {
          coupleId: testCoupleId,
          userId: testUserId,
          type: 'event_accepted',
          amount: 50,
        },
      })

      // Check first time
      const result1 = await engine.checkPointMilestones(testUserId, testCoupleId)
      expect(result1).toHaveLength(1)

      // Check second time
      const result2 = await engine.checkPointMilestones(testUserId, testCoupleId)
      expect(result2).toHaveLength(0)
    })
  })
})
