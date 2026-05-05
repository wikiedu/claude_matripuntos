import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'

const router = express.Router()
import prisma from '../lib/prisma.js'

// Validation schemas
const listNotificationsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  unreadOnly: z.coerce.boolean().optional().default(false),
})

const markAsReadSchema = z.object({
  id: z.string(),
})

// GET /api/notifications - Get user's notifications
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const { limit, offset, unreadOnly } = listNotificationsSchema.parse(req.query)

    // v2.7.1 audit 01 S2-R-5 — defensa-en-profundidad: filtramos por
    // userId + coupleId. Si por bug otra ruta crease una Notification con
    // userId del user y coupleId distinto, no la veríamos aquí.
    const where: any = {
      userId: req.userId,
      coupleId: req.coupleId,
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.notification.count({ where })

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        coupleId: req.coupleId,
        isRead: false,
      },
    })

    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        relatedEventId: n.relatedEventId,
        relatedTaskLogId: n.relatedTaskLogId,
        createdAt: n.createdAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      unreadCount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    res.status(400).json({ error: message })
  }
})

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
        coupleId: req.coupleId,
        isRead: false,
      },
    })

    res.json({ unreadCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch unread count'
    res.status(400).json({ error: message })
  }
})

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // v2.5.9 audit 01 S1-R-12 — `updateMany` + `findUnique` eran 2 queries
    // y una posible race entre ellas. Con `update` + clave compuesta
    // virtual no se puede expresar (clave es única solo por id), así que
    // hacemos `updateMany` ‐ el filtro por userId actúa como guard ‐ y
    // como la query devuelve count, sabemos si se actualizó. Devolvemos
    // los datos del request original para evitar el segundo round-trip
    // y la race con un delete intermedio: el cliente sólo necesita saber
    // que isRead=true.
    const updateResult = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    })

    if (updateResult.count === 0) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    res.json({
      notification: { id: req.params.id, isRead: true },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark notification as read'
    res.status(400).json({ error: message })
  }
})

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    await prisma.notification.updateMany({
      where: {
        userId: req.userId,
        isRead: false,
      },
      data: { isRead: true },
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark all notifications as read'
    res.status(400).json({ error: message })
  }
})

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    // deleteMany con WHERE compuesto (id + userId) garantiza que no se puede
    // borrar una notificación ajena ni aunque se adivine el id.
    const deleteResult = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    })

    if (deleteResult.count === 0) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete notification'
    res.status(400).json({ error: message })
  }
})

// DELETE /api/notifications - Delete all notifications for user
router.delete('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const result = await prisma.notification.deleteMany({
      where: {
        userId: req.userId,
      },
    })

    res.json({ message: `${result.count} notifications deleted successfully` })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete notifications'
    res.status(400).json({ error: message })
  }
})

export default router
