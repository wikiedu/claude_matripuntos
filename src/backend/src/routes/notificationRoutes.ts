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

    const where: any = {
      userId: req.userId,
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

    // Count unread
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.userId,
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

    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    })

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    })

    res.json({
      notification: {
        id: updated.id,
        type: updated.type,
        title: updated.title,
        message: updated.message,
        isRead: updated.isRead,
        relatedEventId: updated.relatedEventId,
        relatedTaskLogId: updated.relatedTaskLogId,
        createdAt: updated.createdAt,
      },
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

    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    })

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' })
      return
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    })

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
