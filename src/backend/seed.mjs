import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const couple = await prisma.couple.create({
    data: { secretKey: Math.random().toString(), numChildren: 2, language: 'es' },
  });

  const user1 = await prisma.user.create({
    data: {
      email: 'user1@test.com',
      passwordHash: '$2b$10$hashed',
      name: 'Alice',
      coupleId: couple.id,
      roleInHome: 'equal',
      hasCompletedOnboarding: true,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@test.com',
      passwordHash: '$2b$10$hashed',
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
  ]);

  await prisma.taskLog.create({
    data: { taskId: tasks[0].id, coupleId: couple.id, completedBy: user2.id, date: new Date(), pointsBase: 2.0, pointsFinal: 2.0, status: 'pending' },
  });

  await prisma.taskLog.create({
    data: { taskId: tasks[1].id, coupleId: couple.id, completedBy: user2.id, date: new Date(), pointsBase: 1.5, pointsFinal: 1.5, status: 'pending' },
  });

  const event = await prisma.event.create({
    data: { type: 'Viaje', coupleId: couple.id, createdBy: user1.id, dateStart: new Date(), dateEnd: new Date(), numChildren: 2, pointsBase: 15.0, pointsCalculated: 21.0, status: 'pending' },
  });

  await prisma.negotiation.create({
    data: { eventId: event.id, roundNumber: 1, proposedBy: user1.id, pointsProposed: 21.0, responseType: 'awaiting' },
  });

  console.log('\n✅ Ready!\n');
}

main().catch(e => { console.error(e.message); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
