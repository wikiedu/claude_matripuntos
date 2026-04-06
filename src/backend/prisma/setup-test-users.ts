import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating test couple and users...')

  const coupleId = 'couple_test_001'
  const user1Id = 'user_test_ana'
  const user2Id = 'user_test_carlos'
  const secretKey = 'matripuntos2026'
  const password = 'Test1234'
  const hash = await bcryptjs.hash(password, 10)

  // Create couple
  const couple = await prisma.couple.upsert({
    where: { id: coupleId },
    update: {},
    create: {
      id: coupleId,
      secretKey,
      numChildren: 1,
      language: 'es',
    },
  })

  // Create user Ana
  const ana = await prisma.user.upsert({
    where: { email: 'ana@matripuntos.com' },
    update: { passwordHash: hash },
    create: {
      id: user1Id,
      coupleId: couple.id,
      email: 'ana@matripuntos.com',
      passwordHash: hash,
      name: 'Ana',
      roleInHome: 'ambos',
      hasCompletedOnboarding: true,
    },
  })

  // Create user Carlos
  const carlos = await prisma.user.upsert({
    where: { email: 'carlos@matripuntos.com' },
    update: { passwordHash: hash },
    create: {
      id: user2Id,
      coupleId: couple.id,
      email: 'carlos@matripuntos.com',
      passwordHash: hash,
      name: 'Carlos',
      roleInHome: 'ambos',
      hasCompletedOnboarding: true,
    },
  })

  // Create default tasks for the couple
  const defaultTasks = [
    { name: 'Cocinar', category: 'cocina', pointsBase: 2.0 },
    { name: 'Limpiar baños', category: 'baños', pointsBase: 1.5 },
    { name: 'Limpieza general', category: 'limpieza', pointsBase: 1.5 },
    { name: 'Hacer la compra', category: 'compra', pointsBase: 1.0 },
    { name: 'Gestiones logísticas', category: 'logistica', pointsBase: 1.0 },
    { name: 'Cuidado de los niños', category: 'cuidado', pointsBase: 1.5 },
  ]

  for (const task of defaultTasks) {
    await prisma.task.create({
      data: {
        coupleId: couple.id,
        name: task.name,
        category: task.category,
        pointsBase: task.pointsBase,
        isDefault: true,
      },
    })
  }

  // Create couple configuration
  await prisma.configuration.upsert({
    where: { coupleId: couple.id },
    update: {},
    create: {
      coupleId: couple.id,
      tasksConfig: JSON.stringify({}),
      multipliersConfig: JSON.stringify({}),
      activityTypes: JSON.stringify([]),
    },
  })

  console.log(`✅ Couple created: ${couple.id} (secretKey: ${secretKey})`)
  console.log(`✅ User 1: ${ana.email} / ${password}`)
  console.log(`✅ User 2: ${carlos.email} / ${password}`)
  console.log('')
  console.log('📋 Test credentials:')
  console.log('   ana@matripuntos.com    →  Test1234')
  console.log('   carlos@matripuntos.com →  Test1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
