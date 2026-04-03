import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create couple
  const couple = await prisma.couple.create({
    data: {
      secretKey: 'test-secret-123',
      numChildren: 0,
      language: 'es',
    },
  })
  console.log('Created couple:', couple.id)

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@test.com',
      name: 'Persona 1',
      passwordHash: await bcrypt.hash('password123', 10),
      coupleId: couple.id,
      roleInHome: 'person1',
      hasCompletedOnboarding: true,
    },
  })
  console.log('Created user1:', user1.id)

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@test.com',
      name: 'Persona 2',
      passwordHash: await bcrypt.hash('password123', 10),
      coupleId: couple.id,
      roleInHome: 'person2',
      hasCompletedOnboarding: true,
    },
  })
  console.log('Created user2:', user2.id)

  // Create test transactions over 30 days
  const now = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - (30 - i))
    
    // User 1 transaction
    await prisma.pointsTransaction.create({
      data: {
        coupleId: couple.id,
        userId: user1.id,
        type: 'task_completed',
        amount: (Math.random() * 20 - 5).toString(),
        description: `Tarea día ${i}`,
        createdAt: date,
      },
    })

    // User 2 transaction
    await prisma.pointsTransaction.create({
      data: {
        coupleId: couple.id,
        userId: user2.id,
        type: 'task_completed',
        amount: (Math.random() * 20 - 5).toString(),
        description: `Tarea día ${i} (pareja)`,
        createdAt: date,
      },
    })
  }

  console.log('Created 60 test transactions')
  console.log('\nTest login credentials:')
  console.log('Email: user1@test.com | Password: password123')
  console.log('Email: user2@test.com | Password: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
