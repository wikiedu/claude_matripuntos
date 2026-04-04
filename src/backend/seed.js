const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const couple = await prisma.couple.create({
    data: { secretKey: 'test-secret-123', numChildren: 2, language: 'es' },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Alice',
      coupleId: couple.id,
      roleInHome: 'equal',
      hasCompletedOnboarding: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      name: 'Bob',
      coupleId: couple.id,
      roleInHome: 'equal',
      hasCompletedOnboarding: true,
    },
  });

  const tasks = await Promise.all([
    prisma.task.create({
      data: { name: 'Cocina', category: 'cocina', coupleId: couple.id, pointsBase: 2.0, isDefault: true },
    }),
    prisma.task.create({
      data: { name: 'Baños', category: 'baños', coupleId: couple.id, pointsBase: 1.5, isDefault: true },
    }),
    prisma.task.create({
      data: { name: 'Limpieza', category: 'limpieza', coupleId: couple.id, pointsBase: 1.5, isDefault: true },
    }),
  ]);

  await prisma.taskLog.create({
    data: {
      taskId: tasks[0].id,
      coupleId: couple.id,
      completedByUserId: user2.id,
      date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      pointsBase: 2.0,
      pointsFinal: 2.0,
      status: 'pending',
    },
  });

  await prisma.taskLog.create({
    data: {
      taskId: tasks[1].id,
      coupleId: couple.id,
      completedByUserId: user2.id,
      date: new Date(Date.now() - 1 * 60 * 60 * 1000),
      pointsBase: 1.5,
      pointsFinal: 1.5,
      status: 'pending',
    },
  });

  const event1 = await prisma.event.create({
    data: {
      type: 'Cena fuera',
      coupleId: couple.id,
      createdByUserId: user1.id,
      dateStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() - 22 * 60 * 60 * 1000),
      numChildren: 0,
      pointsBase: 5.0,
      pointsCalculated: 5.0,
      status: 'accepted',
    },
  });

  const event2 = await prisma.event.create({
    data: {
      type: 'Viaje de negocios',
      coupleId: couple.id,
      createdByUserId: user1.id,
      dateStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      numChildren: 2,
      pointsBase: 15.0,
      pointsCalculated: 21.0,
      status: 'pending',
    },
  });

  await prisma.negotiation.create({
    data: {
      eventId: event2.id,
      roundNumber: 1,
      proposedByUserId: user1.id,
      pointsProposed: 21.0,
      responseType: 'awaiting',
    },
  });

  console.log('✅ Seed complete!');
  console.log(`\nCredentials:\nUser 1: ${user1.email} (Alice)\nUser 2: ${user2.email} (Bob)\nPassword: password123`);
  console.log(`\nData:\n- 2 pending tasks\n- 2 events (1 accepted, 1 pending)\n- Ready to test!`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
