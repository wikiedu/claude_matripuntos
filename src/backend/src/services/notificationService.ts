
import prisma from '../lib/prisma.js'

export interface CreateNotificationParams {
  coupleId: string
  userId: string
  type: string
  title: string
  message: string
  relatedEventId?: string
  relatedTaskLogId?: string
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        coupleId: params.coupleId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        relatedEventId: params.relatedEventId,
        relatedTaskLogId: params.relatedTaskLogId,
        isRead: false,
      },
    })
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

/**
 * Create a notification for both users in a couple
 */
export async function createCoupleNotification(
  coupleId: string,
  type: string,
  title: string,
  message: string,
  relatedEventId?: string,
  relatedTaskLogId?: string
): Promise<void> {
  try {
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      include: {
        users: {
          select: { id: true },
        },
      },
    })

    if (!couple) return

    // Create notification for both users
    await Promise.all(
      couple.users.map((user) =>
        createNotification({
          coupleId,
          userId: user.id,
          type,
          title,
          message,
          relatedEventId,
          relatedTaskLogId,
        })
      )
    )
  } catch (error) {
    console.error('Error creating couple notification:', error)
  }
}

/**
 * Create notification when an event is proposed
 */
export async function notifyEventProposed(
  eventId: string,
  coupleId: string,
  proposedBy: string,
  eventTitle: string
): Promise<void> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: {
        select: { id: true, name: true },
      },
    },
  })

  if (!couple) return

  const proposer = couple.users.find((u) => u.id === proposedBy)
  const otherUser = couple.users.find((u) => u.id !== proposedBy)

  if (!otherUser) return

  await createNotification({
    coupleId,
    userId: otherUser.id,
    type: 'EVENT_PROPOSED',
    title: 'Nueva actividad propuesta',
    message: `${proposer?.name} propuso una nueva actividad: "${eventTitle}"`,
    relatedEventId: eventId,
  })
}

/**
 * Create notification when an event proposal is responded to
 */
export async function notifyEventResponded(
  eventId: string,
  coupleId: string,
  respondedBy: string,
  status: string,
  eventTitle: string
): Promise<void> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: {
        select: { id: true, name: true },
      },
    },
  })

  if (!couple) return

  const responder = couple.users.find((u) => u.id === respondedBy)
  const proposer = couple.users.find((u) => u.id !== respondedBy)

  if (!proposer) return

  const statusText =
    status === 'accepted' ? 'aceptó' : status === 'rejected' ? 'rechazó' : 'contra-propuso'

  await createNotification({
    coupleId,
    userId: proposer.id,
    type: 'EVENT_RESPONSE',
    title: `Respuesta a propuesta: ${eventTitle}`,
    message: `${responder?.name} ${statusText} tu propuesta de "${eventTitle}"`,
    relatedEventId: eventId,
  })
}

/**
 * Create notification when a task is marked complete
 */
export async function notifyTaskCompleted(
  taskLogId: string,
  coupleId: string,
  completedBy: string,
  taskName: string
): Promise<void> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: {
        select: { id: true, name: true },
      },
    },
  })

  if (!couple) return

  const completer = couple.users.find((u) => u.id === completedBy)
  const otherUser = couple.users.find((u) => u.id !== completedBy)

  if (!otherUser) return

  await createNotification({
    coupleId,
    userId: otherUser.id,
    type: 'TASK_COMPLETED',
    title: 'Tarea completada',
    message: `${completer?.name} completó la tarea: "${taskName}"`,
    relatedTaskLogId: taskLogId,
  })
}

/**
 * Create notification when a task is disputed
 */
export async function notifyTaskDisputed(
  taskLogId: string,
  coupleId: string,
  disputedBy: string,
  taskName: string,
  reason: string
): Promise<void> {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleId },
    include: {
      users: {
        select: { id: true, name: true },
      },
    },
  })

  if (!couple) return

  const disputer = couple.users.find((u) => u.id === disputedBy)
  const originalCompleter = couple.users.find((u) => u.id !== disputedBy)

  if (!originalCompleter) return

  await createNotification({
    coupleId,
    userId: originalCompleter.id,
    type: 'TASK_DISPUTED',
    title: 'Tarea disputada',
    message: `${disputer?.name} cuestionó tu tarea "${taskName}": "${reason}"`,
    relatedTaskLogId: taskLogId,
  })
}

/**
 * Create notification when configuration changes
 */
export async function notifyConfigurationChanged(
  coupleId: string,
  changedBy: string,
  changeDescription: string
): Promise<void> {
  await createCoupleNotification(
    coupleId,
    'CONFIGURATION_CHANGED',
    'Configuración actualizada',
    `La configuración de la pareja fue actualizada: ${changeDescription}`
  )
}
