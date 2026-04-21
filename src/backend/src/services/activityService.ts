import { PrismaClient } from '@prisma/client';

const RECENT_ACTIVITY_LIMIT = 5;

export type RecentActivityType = 'event' | 'task' | 'negotiation';

export interface RecentActivity {
  id: string;
  type: RecentActivityType;
  name: string;
  date: Date;
  relatedId: string; // For navigation
  delta: number; // Points impact (0 if not applicable, e.g. rejections or negotiation status changes)
  userId: string | null; // Attribution: who earned / created / responded
  status: string | null; // Domain status (accepted/rejected/forced, verified, etc.)
}

export async function getRecentActivity(
  prisma: PrismaClient,
  coupleId: string
): Promise<RecentActivity[]> {
  // Fetch most recent accepted/rejected/forced events
  const events = await prisma.event.findMany({
    where: {
      coupleId,
      status: { in: ['accepted', 'rejected', 'forced'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: RECENT_ACTIVITY_LIMIT,
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      createdBy: true,
      pointsAgreed: true,
      pointsCalculated: true,
      dateEnd: true,
      updatedAt: true
    }
  });

  // Fetch most recent verified task logs
  const taskLogs = await prisma.taskLog.findMany({
    where: {
      coupleId,
      status: 'verified',
      verifiedAt: { not: null }
    },
    orderBy: { verifiedAt: 'desc' },
    take: RECENT_ACTIVITY_LIMIT,
    select: {
      id: true,
      taskId: true,
      task: {
        select: {
          name: true
        }
      },
      completedBy: true,
      pointsFinal: true,
      verifiedAt: true
    }
  });

  // Fetch most recent resolved negotiations (responseType != 'awaiting')
  const negotiations = await prisma.negotiation.findMany({
    where: {
      event: {
        coupleId
      },
      responseType: { not: 'awaiting' },
      respondedAt: { not: null }
    },
    orderBy: { respondedAt: 'desc' },
    take: RECENT_ACTIVITY_LIMIT,
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
    const creditedPoints = event.status === 'rejected'
      ? 0
      : Number(event.pointsAgreed ?? event.pointsCalculated ?? 0);
    activitiesArray.push({
      id: event.id,
      type: 'event',
      name: event.title || event.type || 'Event',
      date: event.updatedAt,
      relatedId: event.id,
      delta: creditedPoints,
      userId: event.createdBy ?? null,
      status: event.status ?? null,
    });
  });

  taskLogs.forEach(log => {
    activitiesArray.push({
      id: log.id,
      type: 'task',
      name: log.task.name,
      date: log.verifiedAt as Date,
      relatedId: log.taskId,
      delta: Number(log.pointsFinal ?? 0),
      userId: log.completedBy ?? null,
      status: 'verified',
    });
  });

  negotiations.forEach(neg => {
    activitiesArray.push({
      id: neg.id,
      type: 'negotiation',
      name: `Negotiation - ${neg.event.type || 'Event'}`,
      date: neg.respondedAt as Date,
      relatedId: neg.eventId,
      delta: 0,
      userId: null,
      status: null,
    });
  });

  // Sort DESC by date and return top items
  return activitiesArray
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);
}
