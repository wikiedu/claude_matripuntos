import express, { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AchievementEngine } from '../services/achievementEngine.js'
import { notifyTaskCompleted, notifyTaskDisputed } from '../services/notificationService.js'

const router = express.Router()
const prisma = new PrismaClient()
const achievementEngine = new AchievementEngine(prisma)

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  category: z.enum(['cocina', 'baños', 'limpieza', 'compra', 'logistica', 'cuidado', 'mantenimiento', 'jardineria', 'mascotas']),
  pointsBase: z.number().positive('Points must be positive').optional().default(1.0),
  isDefault: z.boolean().optional().default(false),
})

const createTaskLogSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  pointsBase: z.number().positive('Points must be positive'),
  modifier: z.string().optional(),
  modifierValue: z.number().optional().default(1.0),
  pointsFinal: z.number().positive('Final points must be positive'),
  notes: z.string().optional(),
})

const updateTaskLogSchema = z.object({
  status: z.enum(['pending', 'verified', 'disputed']).optional(),
  verifiedBy: z.string().optional(),
  disputeReason: z.string().optional(),
  pointsDisputed: z.number().optional(),
})

// Create task
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = createTaskSchema.parse(req.body)

    const task = await prisma.task.create({
      data: {
        coupleId: req.coupleId,
        name: data.name,
        description: data.description,
        category: data.category,
        pointsBase: new Decimal(data.pointsBase),
        isDefault: data.isDefault,
      },
    })

    res.status(201).json({
      message: 'Task created',
      task: {
        id: task.id,
        name: task.name,
        category: task.category,
        pointsBase: task.pointsBase.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to create task'
    res.status(400).json({ error: message })
  }
})

// Get all tasks for couple
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const tasks = await prisma.task.findMany({
      where: { coupleId: req.coupleId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        pointsBase: t.pointsBase.toString(),
        isDefault: t.isDefault,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks'
    res.status(400).json({ error: message })
  }
})

// Get all task logs for couple (cross-task, used by dashboard)
router.get('/all-logs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const querySchema = z.object({
      status: z.enum(['pending', 'verified', 'disputed']).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    })
    const queryResult = querySchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({ error: 'Invalid query parameters', details: queryResult.error.errors })
      return
    }
    const { status, limit, offset } = queryResult.data

    const where: Prisma.TaskLogWhereInput = {
      coupleId: req.coupleId,
    }

    if (status) {
      where.status = status
    }

    const [logs, total] = await prisma.$transaction([
      prisma.taskLog.findMany({
        where,
        include: {
          task: true,
          completedByUser: {
            select: { id: true, name: true },
          },
          verifiedByUser: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.taskLog.count({ where }),
    ])

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        taskId: l.taskId,
        task: l.task,
        date: l.date,
        pointsBase: l.pointsBase.toString(),
        modifier: l.modifier,
        modifierValue: l.modifierValue.toString(),
        pointsFinal: l.pointsFinal.toString(),
        status: l.status,
        verifiedAt: l.verifiedAt,
        disputeReason: l.disputeReason,
        completedBy: l.completedByUser ? {
          id: l.completedByUser.id,
          name: l.completedByUser.name,
        } : null,
        verifiedBy: l.verifiedByUser ? {
          id: l.verifiedByUser.id,
          name: l.verifiedByUser.name,
        } : null,
        createdAt: l.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('[all-logs]', error)
    res.status(500).json({ error: 'Failed to fetch task logs' })
  }
})

// Create task log (mark task as done)
router.post('/:taskId/log', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = createTaskLogSchema.parse(req.body)
    const taskId = req.params.taskId

    // Verify task belongs to couple
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        coupleId: req.coupleId,
      },
    })

    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const taskLog = await prisma.taskLog.create({
      data: {
        coupleId: req.coupleId,
        taskId: taskId,
        completedBy: req.userId,
        date: new Date(data.date),
        pointsBase: new Decimal(data.pointsBase),
        modifier: data.modifier,
        modifierValue: new Decimal(data.modifierValue),
        pointsFinal: new Decimal(data.pointsFinal),
        status: 'pending',
      },
    })

    // Create points transaction
    await prisma.pointsTransaction.create({
      data: {
        coupleId: req.coupleId,
        userId: req.userId,
        type: 'task_completed',
        relatedTaskLogId: taskLog.id,
        amount: new Decimal(data.pointsFinal),
        description: `Completed task: ${task.name}`,
      },
    })

    // Send notification to partner
    await notifyTaskCompleted(
      taskLog.id,
      req.coupleId,
      req.userId,
      task.name
    )

    res.status(201).json({
      message: 'Task logged',
      taskLog: {
        id: taskLog.id,
        taskId: taskLog.taskId,
        date: taskLog.date,
        pointsFinal: taskLog.pointsFinal.toString(),
        status: taskLog.status,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to create task log'
    res.status(400).json({ error: message })
  }
})

// Get task logs for a task (with optional date filtering)
router.get('/:taskId/logs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const where: any = {
      taskId: req.params.taskId,
      coupleId: req.coupleId,
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const logs = await prisma.taskLog.findMany({
      where,
      include: {
        completedByUser: true,
        verifiedByUser: true,
      },
      orderBy: { date: 'desc' },
    })

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        date: l.date,
        pointsFinal: l.pointsFinal.toString(),
        status: l.status,
        completedBy: l.completedByUser ? {
          id: l.completedByUser.id,
          name: l.completedByUser.name,
        } : null,
        verifiedBy: l.verifiedByUser ? {
          id: l.verifiedByUser.id,
          name: l.verifiedByUser.name,
        } : null,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch task logs'
    res.status(400).json({ error: message })
  }
})

// Verify task log
router.put('/:taskId/logs/:logId/verify', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const taskLog = await prisma.taskLog.findFirst({
      where: {
        id: req.params.logId,
        taskId: req.params.taskId,
        coupleId: req.coupleId,
      },
    })

    if (!taskLog) {
      res.status(404).json({ error: 'Task log not found' })
      return
    }

    const updated = await prisma.taskLog.update({
      where: { id: req.params.logId },
      data: {
        status: 'verified',
        verifiedBy: req.userId,
        verifiedAt: new Date(),
      },
    })

    // Trigger achievement check
    const newAchievements = await achievementEngine.checkAchievements(
      taskLog.completedBy,
      req.coupleId,
      { type: 'task_verified', taskLogId: req.params.logId }
    )

    res.json({
      success: true,
      taskLog: {
        id: updated.id,
        status: updated.status,
        verifiedAt: updated.verifiedAt,
      },
      newAchievements: newAchievements.map((a: any) => ({ name: a.name, rarity: a.rarity })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify task log'
    res.status(400).json({ error: message })
  }
})

// Dispute task log
router.put('/:taskId/logs/:logId/dispute', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const data = updateTaskLogSchema.parse(req.body)

    const taskLog = await prisma.taskLog.findFirst({
      where: {
        id: req.params.logId,
        taskId: req.params.taskId,
        coupleId: req.coupleId,
      },
    })

    if (!taskLog) {
      res.status(404).json({ error: 'Task log not found' })
      return
    }

    // Get task name for notification
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
    })

    const updated = await prisma.taskLog.update({
      where: { id: req.params.logId },
      data: {
        status: 'disputed',
        verifiedBy: req.userId,
        verifiedAt: new Date(),
        disputeReason: data.disputeReason,
        pointsDisputed: data.pointsDisputed ? new Decimal(data.pointsDisputed) : undefined,
      },
    })

    // Send notification to the person who completed the task
    if (task) {
      await notifyTaskDisputed(
        req.params.logId,
        req.coupleId,
        req.userId,
        task.name,
        data.disputeReason || 'No reason provided'
      )
    }

    res.json({
      message: 'Task log disputed',
      taskLog: {
        id: updated.id,
        status: updated.status,
        pointsDisputed: updated.pointsDisputed?.toString(),
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors })
      return
    }
    const message = error instanceof Error ? error.message : 'Failed to dispute task log'
    res.status(400).json({ error: message })
  }
})

export default router
