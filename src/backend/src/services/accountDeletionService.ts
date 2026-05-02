// v1.6.1 — Account deletion con anonimización del histórico.
// Estrategia A + X (decisión brainstorm 4):
//  - Hard delete del User propio (PII limpiada, soft delete con deletedAt).
//  - User-fantasma único por couple ("Usuario eliminado") absorbe FKs:
//    PointsTransaction, Negotiation.proposedBy/respondedBy,
//    TaskLog.completedBy/verifiedBy, Event.createdBy.
//  - MoodLog, Notification, UserProfile del user → DELETE.
//  - Si era el último user activo del couple → couple.dissolvedAt.
//  - Cron de retención hard-purga el ghost tras 30d si nadie sigue activo.
//
// Idempotente: si el user ya tiene deletedAt set, retorna sin re-ejecutar.

import prisma from '../lib/prisma.js'

export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')
  if (user.deletedAt) return  // idempotente

  const coupleId = user.coupleId
  if (!coupleId) {
    // User sin couple → DELETE directo, no hay relaciones que anonimizar.
    await prisma.user.delete({ where: { id: userId } })
    return
  }

  await prisma.$transaction(async (tx) => {
    // 1. Crear o reutilizar ghost user del couple.
    let ghost = await tx.user.findFirst({
      where: { coupleId, name: 'Usuario eliminado', deletedAt: { not: null } },
    })
    if (!ghost) {
      ghost = await tx.user.create({
        data: {
          coupleId,
          email: `ghost-${coupleId}-${Date.now()}@deleted.local`, // unique constraint
          passwordHash: '',
          name: 'Usuario eliminado',
          deletedAt: new Date(),
          hasCompletedOnboarding: true,
        },
      })
    }

    // 2. Reasignar referencias críticas al ghost.
    await tx.pointsTransaction.updateMany({ where: { userId }, data: { userId: ghost.id } })
    await tx.taskLog.updateMany({ where: { completedBy: userId }, data: { completedBy: ghost.id } })
    await tx.taskLog.updateMany({ where: { verifiedBy: userId }, data: { verifiedBy: ghost.id } })
    await tx.event.updateMany({ where: { createdBy: userId }, data: { createdBy: ghost.id } })
    await tx.negotiation.updateMany({ where: { proposedBy: userId }, data: { proposedBy: ghost.id } })
    await tx.negotiation.updateMany({ where: { respondedBy: userId }, data: { respondedBy: ghost.id } })

    // 3. Borrar datos personales no históricos.
    await tx.moodLog.deleteMany({ where: { userId } })
    await tx.notification.deleteMany({ where: { userId } })
    await tx.userProfile.deleteMany({ where: { userId } })

    // 4. Soft delete + limpiar PII del user propio.
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${userId}@deleted.local`, // mantiene UNIQUE constraint
        passwordHash: '',
        name: 'Usuario eliminado',
      },
    })

    // 5. Si era el último user activo del couple, marcar dissolved.
    const activeUsers = await tx.user.count({ where: { coupleId, deletedAt: null } })
    if (activeUsers === 0) {
      await tx.couple.update({ where: { id: coupleId }, data: { dissolvedAt: new Date() } })
    }
  })
}
