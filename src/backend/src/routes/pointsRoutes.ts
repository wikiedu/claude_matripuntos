import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
import prisma from '../lib/prisma.js'

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
                category: true,
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
          category: t.taskLog.task?.category,
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

// GET /api/points/chart-data - Daily cumulative balance for last N days (default 30)
router.get('/chart-data', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const days = Math.min(parseInt(req.query.days as string || '30', 10), 90)

    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
      include: { users: { select: { id: true, name: true } } },
    })
    if (!couple || !couple.users || couple.users.length === 0) {
      res.json({ chartData: [], youName: 'Yo', partnerName: null })
      return
    }

    const you = couple.users.find(u => u.id === req.userId)!
    const partner = couple.users.find(u => u.id !== req.userId) ?? null

    // Fetch ALL transactions for this couple (no date filter — need full history for cumulative)
    const allTx = await prisma.pointsTransaction.findMany({
      where: { coupleId: req.coupleId },
      orderBy: { createdAt: 'asc' },
    })

    // Use local-date keys (YYYY-MM-DD) to avoid UTC-offset mismatches when
    // the server timezone differs from midnight (e.g. UTC+1/+2 in Spain).
    const localDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - (days - 1))
    windowStart.setHours(0, 0, 0, 0)

    // Pre-seed: cumulative sum of everything BEFORE the window
    let youRunning = 0
    let partnerRunning = 0
    for (const t of allTx) {
      if (new Date(t.createdAt) < windowStart) {
        if (t.userId === you.id) youRunning += Number(t.amount)
        else if (partner && t.userId === partner.id) partnerRunning += Number(t.amount)
      }
    }

    // Build per-day delta maps using local date keys
    const youDelta: Record<string, number> = {}
    const partnerDelta: Record<string, number> = {}
    for (const t of allTx) {
      const d = new Date(t.createdAt)
      if (d < windowStart) continue
      const key = localDateKey(d)
      if (t.userId === you.id) youDelta[key] = (youDelta[key] || 0) + Number(t.amount)
      else if (partner && t.userId === partner.id) partnerDelta[key] = (partnerDelta[key] || 0) + Number(t.amount)
    }

    // Generate one entry per day using local date keys
    const chartData = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const key = localDateKey(d)
      youRunning += youDelta[key] || 0
      partnerRunning += partnerDelta[key] || 0
      const entry: any = {
        idx: days - 1 - i,
        date: i === 0 ? 'Hoy' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        [you.name]: Math.round(youRunning),
      }
      if (partner) {
        entry[partner.name] = Math.round(partnerRunning)
      }
      chartData.push(entry)
    }

    res.json({ chartData, youName: you.name, partnerName: partner?.name ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch chart data'
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

    // v1.6.3 fix QA Bug 1: incluir profile (mood/avatar viven en UserProfile,
    // no en User) para que el frontend pueda renderizar MoodPairCard del
    // partner sin endpoint extra. Antes solo devolvíamos {id,name,email} →
    // partner.currentMood quedaba undefined y mood no se compartía.
    // v2.5.4 audit 03 S1-4 — incluimos `where: { deletedAt: null }` en
    // users para que el balance no muestre datos del ghost user del
    // partner soft-deleted.
    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            profile: {
              select: {
                currentMood: true,
                moodUpdatedAt: true,
                avatarEmoji: true,
                avatarColor: true,
              },
            },
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
        // v1.6.3: campos para MoodPairCard del partner (vienen de UserProfile)
        currentMood: otherUser?.profile?.currentMood ?? null,
        moodUpdatedAt: otherUser?.profile?.moodUpdatedAt ?? null,
        avatarEmoji: otherUser?.profile?.avatarEmoji ?? null,
        avatarColor: otherUser?.profile?.avatarColor ?? null,
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

    // Find the partner. v2.5.4 audit 03 S1-4 — filtrar deletedAt para
    // no encontrar al ghost del partner soft-deleted como destinatario.
    const users = await prisma.user.findMany({
      where: { coupleId: req.coupleId, deletedAt: null },
    })
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
// Previously this endpoint deleted the couple's entire PointsTransaction history
// on any authed caller's say-so, with no check that a reset was actually
// requested or that the caller is the partner. Audit v1.4 P0-A. Until v1.5
// ships a proper approval flow (with a ResetRequest row + signed consent), the
// endpoint is gated behind POINTS_RESET_ENABLED and requires that:
//   1. A pending reset_requested notification exists for the caller's couple.
//   2. The notification's userId === caller's userId (i.e. caller is the partner
//      who received the request, not the proposer wiping their own debt).
router.post('/reset-confirm', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    if (process.env.POINTS_RESET_ENABLED !== 'true') {
      res.status(503).json({
        error: 'Points reset is disabled pending v1.5 approval flow',
      })
      return
    }

    // v2.4 audit 01 S0-R-2: hardening del flujo:
    //   - solo notificaciones recientes (<24h) son válidas para aprobar.
    //   - exigimos `confirmText: "RESET"` en el body como doble confirmación.
    //   - capturamos el count de transacciones borradas para auditoría.
    //   - generamos notificaciones a AMBOS users tras el reset (visibility).
    if (req.body?.confirmText !== 'RESET') {
      res.status(400).json({
        error: 'Doble confirmación requerida: envía { confirmText: "RESET" } en el body',
      })
      return
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const pending = await prisma.notification.findFirst({
      where: {
        coupleId: req.coupleId,
        userId: req.userId,
        type: 'reset_requested',
        isRead: false,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!pending) {
      res.status(403).json({
        error:
          'No pending reset request found for this user (o caducó tras 24h). ' +
          'Pide a tu pareja que envíe la solicitud de nuevo.',
      })
      return
    }

    // Count antes de borrar — irá en la notificación de auditoría.
    const countBefore = await prisma.pointsTransaction.count({
      where: { coupleId: req.coupleId },
    })

    const partnerUsers = await prisma.user.findMany({
      where: { coupleId: req.coupleId, deletedAt: null },
      select: { id: true, name: true },
    })

    await prisma.$transaction([
      prisma.pointsTransaction.deleteMany({ where: { coupleId: req.coupleId } }),
      prisma.notification.updateMany({
        where: { coupleId: req.coupleId, type: 'reset_requested', isRead: false },
        data: { isRead: true },
      }),
      // Audit notif (cada user del couple ve constancia).
      ...partnerUsers.map((u) =>
        prisma.notification.create({
          data: {
            coupleId: req.coupleId!,
            userId: u.id,
            type: 'reset_completed',
            title: 'Saldo reseteado',
            message: `${countBefore} transacciones eliminadas. Saldo a cero.`,
            isRead: false,
          },
        }),
      ),
    ])

    res.status(200).json({
      message: 'Points balance reset confirmed. All transactions deleted.',
      status: 'completed',
      transactionsDeleted: countBefore,
    })
  } catch (error) {
    console.error('[reset-confirm]', error)
    res.status(500).json({ error: 'Failed to confirm reset' })
  }
})

// v2.2.6 — Saldo en rojo crónico (Claude Design canvas 09).
// Devuelve si el user lleva días consecutivos en rojo y la severity (soft/
// warn/crit) para que el dashboard renderice la card escalada apropiada.
router.get('/red-balance', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId || !req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    const { computeRedBalance } = await import('../services/redBalanceService.js')
    const status = await computeRedBalance(req.coupleId, req.userId)
    res.json({ status })
  } catch (error) {
    console.error('[red-balance]', error)
    res.status(500).json({ error: 'Failed to compute red balance' })
  }
})

export default router
