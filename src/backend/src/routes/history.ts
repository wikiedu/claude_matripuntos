// v1.6.1 — Histórico de couples disueltos: vista read-only para el user.
// Si el user tuvo PointsTransactions en un couple disuelto, aparece como
// "Mi etapa con [partnerName]" en Settings > Pareja.

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { readBucket } from '../middleware/rateLimiter.js'
import prisma from '../lib/prisma.js'

const router = Router()
router.use(authenticateToken)

router.get('/past-couples', readBucket, async (req: Request, res: Response) => {
  const userId = req.user.id

  // Past-couples = couples con dissolvedAt donde el user (o su ghost) tuvo
  // PointsTransactions. Cubre el caso histórico desde la perspectiva del user.
  const txs = await prisma.pointsTransaction.findMany({
    where: { userId, couple: { dissolvedAt: { not: null } } },
    select: { coupleId: true },
    distinct: ['coupleId'],
  })
  const coupleIds = txs.map(t => t.coupleId)
  if (coupleIds.length === 0) return res.json({ pastCouples: [] })

  const couples = await prisma.couple.findMany({
    where: { id: { in: coupleIds } },
    include: { users: true },
  })

  const result = couples.map(c => {
    const partner = c.users.find(u => u.id !== userId)
    // v1.6.2 fix S1-5: si el partner se eliminó, anonimizar nombre. No exponer
    // PII de un user que ejerció derecho al olvido.
    const partnerName = partner?.deletedAt ? null : (partner?.name ?? 'Desconocido')
    return {
      id: c.id,
      partnerName,
      dissolvedAt: c.dissolvedAt!.toISOString(),
      createdAt: c.createdAt.toISOString(),
      finalBalance: 0,  // Cálculo agregado se difiere; placeholder no-blocking
      totalEvents: 0,
      totalTasks: 0,
    }
  })

  res.json({ pastCouples: result })
})

export default router
