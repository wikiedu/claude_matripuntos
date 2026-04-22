import { PrismaClient } from '@prisma/client';

const RECENT_ACTIVITY_LIMIT = 5;

// Turn snake_case activity type codes into human-readable Spanish labels.
// Known codes get a curated translation; unknown codes fall back to a
// reasonable title-cased form so we never leak "deporte_hobby" into the UI.
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  trabajo: 'Trabajo',
  deporte: 'Deporte',
  deporte_hobby: 'Deporte/Hobby',
  ocio: 'Ocio',
  familia: 'Familia',
  salud: 'Salud',
  social: 'Social',
  viaje: 'Viaje',
  estudio: 'Estudio',
  descanso: 'Descanso',
  cuidado_personal: 'Cuidado personal',
  compromiso: 'Compromiso',
  otros: 'Otros',
};

function humanizeActivityType(code?: string | null): string {
  if (!code) return 'Actividad';
  const key = code.toLowerCase();
  if (ACTIVITY_TYPE_LABELS[key]) return ACTIVITY_TYPE_LABELS[key];
  // Fallback: snake_case → Title Case With Spaces
  return key
    .split(/[_\-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

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
  coupleId: string,
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

  // Cada fila del feed refleja el delta real de la transacción para el
  // usuario nombrado (userId), no un cálculo relativo al que consulta:
  //   - Evento aceptado/forzado: el creador paga → delta = -pts (único
  //     movimiento; la pareja no tiene transacción asociada).
  //   - Evento rechazado: no hay puntos.
  //   - Tarea verificada: el ejecutor gana → delta = +pts.
  // Así "actividad aceptada" siempre se muestra en rojo/negativo bajo el
  // nombre del creador, independientemente de quién mire el dashboard.
  events.forEach(event => {
    const isRejected = event.status === 'rejected';
    const pts = isRejected
      ? 0
      : Number(event.pointsAgreed ?? event.pointsCalculated ?? 0);
    activitiesArray.push({
      id: event.id,
      type: 'event',
      name: event.title || humanizeActivityType(event.type),
      date: event.updatedAt,
      relatedId: event.id,
      delta: isRejected ? 0 : -pts,
      userId: event.createdBy ?? null,
      status: event.status ?? null,
    });
  });

  taskLogs.forEach(log => {
    const pts = Number(log.pointsFinal ?? 0);
    activitiesArray.push({
      id: log.id,
      type: 'task',
      name: log.task.name,
      date: log.verifiedAt as Date,
      relatedId: log.taskId,
      delta: pts,
      userId: log.completedBy ?? null,
      status: 'verified',
    });
  });

  negotiations.forEach(neg => {
    activitiesArray.push({
      id: neg.id,
      type: 'negotiation',
      name: `Negociación · ${humanizeActivityType(neg.event.type)}`,
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
