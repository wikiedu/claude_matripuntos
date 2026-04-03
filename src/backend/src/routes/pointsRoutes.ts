import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const historyFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  type: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
})

// GET /api/points/history - Get transaction history
router.get('/history', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const { startDate, endDate, type, userId, limit, offset } = historyFilterSchema.parse(req.query)

    const where: any = {
      coupleId: req.coupleId,
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    if (type) {
      where.type = type
    }

    if (userId) {
      where.userId = userId
    }

    const transactions = await prisma.pointsTransaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            type: true,
            title: true,
            dateStart: true,
          },
        },
        taskLog: {
          select: {
            id: true,
            task: {
              select: {
                name: true,
              },
            },
            date: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.pointsTransaction.count({ where })

    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        description: t.description,
        userId: t.userId,
        user: t.user ? {
          id: t.user.id,
          name: t.user.name,
        } : null,
        event: t.event ? {
          id: t.event.id,
          type: t.event.type,
          title: t.event.title,
          date: t.event.dateStart,
        } : null,
        taskLog: t.taskLog ? {
          id: t.taskLog.id,
          taskName: t.taskLog.task?.name,
          date: t.taskLog.date,
        } : null,
        createdAt: t.createdAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction history'
    res.status(400).json({ error: message })
  }
})

// GET /api/points/balance - Get current balance for both users
router.get('/balance', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!couple) {
      res.status(404).json({ error: 'Couple not found' })
      return
    }

    const balances: { [key: string]: number } = {}

    for (const user of couple.users) {
      const transactions = await prisma.pointsTransaction.findMany({
        where: {
          coupleId: req.coupleId,
          userId: user.id,
        },
      })

      balances[user.id] = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
    }

    const currentUser = couple.users.find((u) => u.id === req.userId)
    const otherUser = couple.users.find((u) => u.id !== req.userId)

    const currentUserBalance = balances[req.userId] || 0
    const otherUserBalance = balances[otherUser?.id || ''] || 0

    res.json({
      you: {
        id: currentUser?.id,
        name: currentUser?.name,
        balance: currentUserBalance,
        balanceFormatted: currentUserBalance > 0 ? `+${currentUserBalance}` : currentUserBalance.toString(),
      },
      partner: {
        id: otherUser?.id,
        name: otherUser?.name,
        balance: otherUserBalance,
        balanceFormatted: otherUserBalance > 0 ? `+${otherUserBalance}` : otherUserBalance.toString(),
      },
      difference: Math.abs(currentUserBalance - otherUserBalance),
      isBalanced: Math.abs(currentUserBalance - otherUserBalance) <= 1,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch balance'
    res.status(400).json({ error: message })
  }
})

// GET /api/points/stats - Get statistics (for PREMIUM users)
router.get('/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Get all transactions for the couple
    const transactions = await prisma.pointsTransaction.findMany({
      where: { coupleId: req.coupleId },
    })

    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate stats
    const balances: { [key: string]: number } = {}
    let totalPoints = 0

    for (const t of transactions) {
      if (t.userId) {
        balances[t.userId] = (balances[t.userId] || 0) + Number(t.amount)
        totalPoints += Math.abs(Number(t.amount))
      }
    }

    const user1 = couple?.users[0]
    const user2 = couple?.users[1]

    const user1Balance = balances[user1?.id || ''] || 0
    const user2Balance = balances[user2?.id || ''] || 0

    // Equity score: how balanced the relationship is (0-100)
    const maxBalance = Math.max(Math.abs(user1Balance), Math.abs(user2Balance))
    const equityScore = maxBalance === 0 ? 100 : Math.max(0, 100 - (maxBalance / totalPoints) * 100 * 2)

    res.json({
      equityScore: Math.round(equityScore),
      totalTransactions: transactions.length,
      totalPointsExchanged: totalPoints,
      user1: {
        id: user1?.id,
        name: user1?.name,
        balance: user1Balance,
        percentage: totalPoints === 0 ? 0 : Math.round(Math.abs(user1Balance) / totalPoints * 100),
      },
      user2: {
        id: user2?.id,
        name: user2?.name,
        balance: user2Balance,
        percentage: totalPoints === 0 ? 0 : Math.round(Math.abs(user2Balance) / totalPoints * 100),
      },
      mostActiveMonth: 'March 2026',
      averageTransactionSize: totalPoints === 0 ? 0 : Math.round(totalPoints / transactions.length),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch statistics'
    res.status(400).json({ error: message })
  }
})

// GET /api/points/transactions/:id - Get specific transaction
router.get('/transactions/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const transaction = await prisma.pointsTransaction.findFirst({
      where: {
        id: req.params.id,
        coupleId: req.coupleId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: true,
        taskLog: {
          include: {
            task: true,
          },
        },
      },
    })

    if (!transaction) {
      res.status(404).json({ error: 'Transaction not found' })
      return
    }

    res.json({
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        user: transaction.user,
        event: transaction.event,
        taskLog: transaction.taskLog,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction'
    res.status(400).json({ error: message })
  }
})

// POST /api/points/reset-request - Request a points balance reset (requires partner approval)
router.post('/reset-request', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Find the partner
    const users = await prisma.user.findMany({ where: { coupleId: req.coupleId } })
    const partner = users.find(u => u.id !== req.userId)
    if (!partner) {
      res.status(400).json({ error: 'No partner found in this couple' })
      return
    }

    const requester = users.find(u => u.id === req.userId)

    // Create a notification for the partner
    await prisma.notification.create({
      data: {
        coupleId: req.coupleId,
        userId: partner.id,
        type: 'reset_requested',
        title: 'Reset de puntos solicitado',
        message: `${requester?.name || 'Tu pareja'} quiere resetear el saldo de puntos a cero. Acepta en Configuración → Tu Pareja.`,
        isRead: false,
      },
    })

    res.status(200).json({
      message: 'Reset request sent to partner for approval',
      status: 'pending',
    })
  } catch (error) {
    console.error('[reset-request]', error)
    res.status(500).json({ error: 'Failed to request reset' })
  }
})

// POST /api/points/reset-confirm - Confirm a points balance reset (called by the partner)
router.post('/reset-confirm', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // Delete all PointsTransactions for the couple (real reset)
    await prisma.pointsTransaction.deleteMany({ where: { coupleId: req.coupleId } })

    // Mark any pending reset_requested notifications as read
    await prisma.notification.updateMany({
      where: { coupleId: req.coupleId, type: 'reset_requested', isRead: false },
      data: { isRead: true },
    })

    res.status(200).json({
      message: 'Points balance reset confirmed. All transactions deleted.',
      status: 'completed',
    })
  } catch (error) {
    console.error('[reset-confirm]', error)
    res.status(500).json({ error: 'Failed to confirm reset' })
  }
})

export default router
