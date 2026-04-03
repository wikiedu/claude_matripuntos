import { PrismaClient } from '@prisma/client';

export type RecentActivityType = 'event' | 'task' | 'negotiation';

export interface RecentActivity {
  id: string;
  type: RecentActivityType;
  name: string;
  date: Date;
  relatedId: string; // For navigation
}

export async function getRecentActivity(
  prisma: PrismaClient,
  coupleId: string
): Promise<RecentActivity[]> {
  // Fetch 5 most recent accepted/rejected/forced events (dateEnd < now)
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      status: { in: ['accepted', 'rejected', 'forced'] },
      dateEnd: { lt: new Date() }
    },
    orderBy: { dateEnd: 'desc' },
    take: 5,
    select: {
      id: true,
      type: true,
      title: true,
      dateEnd: true
    }
  });

  // Fetch 5 most recent verified task logs
  const taskLogs = await prisma.taskLog.findMany({
    where: {
      coupleId,
      status: 'verified'
    },
    orderBy: { verifiedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      taskId: true,
      task: {
        select: {
          name: true
        }
      },
      verifiedAt: true
    }
  });

  // Fetch 5 most recent resolved negotiations (responseType != 'awaiting')
  const negotiations = await prisma.negotiation.findMany({
    where: {
      event: {
        coupleId
      },
      responseType: { not: 'awaiting' }
    },
    orderBy: { respondedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      eventId: true,
      event: {
        select: {
          type: true
        }
      },
      respondedAt: true
    }
  });

  // Map to RecentActivity type
  const activitiesArray: RecentActivity[] = [];

  events.forEach(event => {
    activitiesArray.push({
      id: event.id,
      type: 'event',
      name: event.title || event.type || 'Event',
      date: event.dateEnd,
      relatedId: event.id
    });
  });

  taskLogs.forEach(log => {
    activitiesArray.push({
      id: log.id,
      type: 'task',
      name: log.task.name,
      date: log.verifiedAt || new Date(),
      relatedId: log.taskId
    });
  });

  negotiations.forEach(neg => {
    activitiesArray.push({
      id: neg.id,
      type: 'negotiation',
      name: `Negotiation - ${neg.event.type || 'Event'}`,
      date: neg.respondedAt || new Date(),
      relatedId: neg.eventId
    });
  });

  // Sort DESC by date and return top 5
  return activitiesArray
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);
}
