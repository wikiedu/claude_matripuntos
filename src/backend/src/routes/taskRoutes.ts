import express, { Request, Response } from 'express'
import type { Prisma } from '@prisma/client'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { AchievementEngine } from '../services/achievementEngine.js'
import { notifyTaskCompleted, notifyTaskDisputed, createNotification } from '../services/notificationService.js'
import { updateDailyStreak, calculateAndSaveXP, getFactorMascotas } from '../services/gamificationService.js'
import { checkAllAchievements } from '../services/achievementCheckService.js'
import { generateOnCreate } from '../services/recurringTaskService.js'
import { calculateTaskLogPoints, TASK_MODIFIER_VALUES } from '../services/taskLogPoints.js'

const router = express.Router()
import prisma from '../lib/prisma.js'
const achievementEngine = new AchievementEngine(prisma)

// Validation schemas
const createTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required').max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  category: z.enum(['cocina', 'baños', 'limpieza', 'compra', 'logistica', 'cuidado', 'mantenimiento', 'jardineria', 'mascotas']),
  pointsBase: z.number().positive('Points must be positive').max(100).optional().default(1.0),
  isDefault: z.boolean().optional().default(false),
  defaultAssigneeId: z.string().nullable().optional(),
})

// Audit v1.4 P1-B/P1-F: the client used to send `pointsFinal` precomputed,
// which bypassed Zod's cap after the backend multiplied by streak × weekly ×
// pet factors (combined max ~2.88×). We now only accept `pointsBase` and a
// named modifier; the server computes modifierValue and pointsFinal via
// calculateTaskLogPoints. The frontend should send
// `modifier: 'extra' | 'partial'` (or omit), nothing else.

const createTaskLogSchema = z.object({
  // v2.5.5 audit 08 S1-4 — date debe ser ISO parseable y no más de 30 días
  // en el futuro. Antes aceptábamos cualquier string >0 chars; un payload
  // con `date: "futuro lejano"` rompía analytics aggregation.
  date: z.string().refine((s) => {
    const d = new Date(s)
    if (isNaN(d.getTime())) return false
    const maxFuture = Date.now() + 30 * 24 * 60 * 60 * 1000
    return d.getTime() <= maxFuture
  }, { message: 'Fecha inválida o demasiado en el futuro' }),
  pointsBase: z.number().positive('Points must be positive').max(100),
  modifier: z.enum(['none', 'extra', 'partial', 'profunda', 'complicada', 'visita']).optional(),
  notes: z.string().max(500).trim().optional(),
})

const updateTaskLogSchema = z.object({
  status: z.enum(['pending', 'verified', 'disputed']).optional(),
  verifiedBy: z.string().optional(),
  // v1.6.2 fix S1-7: límite contra DoS por payload gigante.
  disputeReason: z.string().max(2000).optional(),
  // v2.5.5 audit 08 S1-4: pointsDisputed debe ser >0 y ≤100 (mismo
  // rango que pointsBase). Antes aceptaba negativos / NaN / huge values
  // que rompían el cálculo del saldo.
  pointsDisputed: z.number().positive('Points must be positive').max(100).optional(),
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
        defaultAssigneeId: data.defaultAssigneeId ?? null,
      },
    })

    res.status(201).json({
      message: 'Task created',
      task: {
        id: task.id,
        name: task.name,
        category: task.category,
        pointsBase: task.pointsBase.toString(),
        defaultAssigneeId: task.defaultAssigneeId,
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

    // Bug 2026-04-22: we used to omit scheduledFor/isRecurring from this
    // payload, which made the Tasks page unable to distinguish scheduled from
    // unscheduled tasks — every filter that checked t.scheduledFor saw
    // undefined and nothing ever landed in "Hoy" or "Esta semana", even the
    // recurring tasks created through AddTaskSheet. Expose the scheduling
    // fields so the UI can render catalog-added and custom tasks correctly.
    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        pointsBase: t.pointsBase.toString(),
        isDefault: t.isDefault,
        scheduledFor: t.scheduledFor ? t.scheduledFor.toISOString() : null,
        isRecurring: t.isRecurring,
        frequency: t.frequency,
        defaultAssigneeId: t.defaultAssigneeId,
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

    // Bug 2026-04-22: los TaskLog auto-generados por el motor de recurrencia son
    // "placeholders" para ocurrencias futuras, no tareas realmente hechas. Al
    // tener completedBy=null pasaban el filtro `completedBy !== userId` de la
    // pestaña Verificar, inundándola con 56 tareas (8 sem × daily) que nadie
    // había ejecutado. Por defecto excluimos placeholders; quien los necesite
    // (panel Recurrentes, vista semana) debe pasar ?includePlaceholders=true.
    const includePlaceholders = req.query.includePlaceholders === 'true'
    const where: Prisma.TaskLogWhereInput = {
      coupleId: req.coupleId,
      ...(includePlaceholders
        ? {}
        : {
            OR: [
              { isAutoGenerated: false },
              { completedBy: { not: null } },
            ],
          }),
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

// GET /api/tasks/logs?view=week&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/logs', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const { view, from, to } = req.query as { view?: string; from?: string; to?: string }

    if (view === 'week' && from && to) {
      const logs = await prisma.taskLog.findMany({
        where: {
          coupleId: req.coupleId,
          scheduledFor: {
            gte: new Date(from),
            lte: new Date(to + 'T23:59:59Z'),
          },
        },
        include: { task: { select: { name: true, category: true } } },
        orderBy: { scheduledFor: 'asc' },
      })
      res.json(logs)
      return
    }

    // Default: delegate to existing behavior or return error
    res.status(400).json({ error: 'Use ?view=week&from=&to= or GET /all-logs' })
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar logs' })
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

    // Calculate streak + pet multiplier before creating the log
    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
    })
    const streakDays = (couple as any)?.dailyStreakDays || 0
    const streakWeeks = (couple as any)?.weeklyStreakWeeks || 0
    const factorMascotas = await getFactorMascotas(req.coupleId)

    const { modifierName, modifierValue, pointsFinal } = calculateTaskLogPoints({
      pointsBase: data.pointsBase,
      modifier: data.modifier,
      streakDays,
      streakWeeks,
      factorMascotas,
    })

    // Bug 2026-04-22: si existe un placeholder auto-generado para esta tarea
    // en este mismo día (recurrencia que aún nadie ejecutó), lo "flipeamos"
    // actualizándolo con el usuario real y los puntos calculados. Evita
    // duplicar filas (placeholder vacío + log real) y mantiene la relación
    // placeholder → completion intacta. Si no hay placeholder (tareas
    // puntuales o recurrentes con ventana aún sin generar), crea uno nuevo.
    const targetDate = new Date(data.date)
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)

    const placeholder = await prisma.taskLog.findFirst({
      where: {
        taskId,
        coupleId: req.coupleId,
        isAutoGenerated: true,
        completedBy: null,
        scheduledFor: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { scheduledFor: 'asc' },
    })

    const taskLog = placeholder
      ? await prisma.taskLog.update({
          where: { id: placeholder.id },
          data: {
            completedBy: req.userId,
            date: targetDate,
            pointsBase: new Decimal(data.pointsBase),
            modifier: modifierName,
            modifierValue: new Decimal(modifierValue),
            pointsFinal: new Decimal(pointsFinal),
            status: 'pending',
          },
        })
      : await prisma.taskLog.create({
          data: {
            coupleId: req.coupleId,
            taskId,
            completedBy: req.userId,
            date: targetDate,
            pointsBase: new Decimal(data.pointsBase),
            modifier: modifierName,
            modifierValue: new Decimal(modifierValue),
            pointsFinal: new Decimal(pointsFinal),
            status: 'pending',
          },
        })

    // Send notification to partner
    await notifyTaskCompleted(
      taskLog.id,
      req.coupleId,
      req.userId,
      task.name
    )

    // Non-fatal gamification updates
    try {
      await updateDailyStreak(req.coupleId)
      await calculateAndSaveXP(req.coupleId)
      await checkAllAchievements(req.coupleId)
    } catch (gamErr) {
      console.error('Gamification update error (non-fatal):', gamErr)
    }

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

    // Audit v1.4 P0-C: prevent self-verification. A user cannot verify a log
    // they themselves completed — otherwise they self-award points without
    // the partner ever seeing the task. (The hourly cron auto-verifies
    // pending logs after 24h if the partner doesn't respond; that path is
    // system-level and scoped by time, not by the completer.)
    if (taskLog.completedBy && taskLog.completedBy === req.userId) {
      res.status(403).json({ error: 'No puedes verificar tus propias tareas' })
      return
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
    })

    // Audit v1.4 P0-C: wrap the verify + points transaction in one $transaction
    // so a partial failure doesn't leave a verified log without its points
    // transaction (or vice versa). Prior code ran two writes back-to-back.
    const [updated] = await prisma.$transaction([
      prisma.taskLog.update({
        where: { id: req.params.logId },
        data: {
          status: 'verified',
          verifiedBy: req.userId,
          verifiedAt: new Date(),
        },
      }),
      prisma.pointsTransaction.create({
        data: {
          coupleId: req.coupleId,
          userId: taskLog.completedBy!,
          type: 'task_completed',
          relatedTaskLogId: req.params.logId,
          amount: taskLog.pointsFinal,
          description: `Tarea verificada: ${task?.name ?? 'tarea'}`,
        },
      }),
    ])

    // Notify the original completer that their task was verified and points were awarded
    if (taskLog.completedBy && taskLog.completedBy !== req.userId) {
      const verifier = await prisma.user.findUnique({ where: { id: req.userId } })
      await createNotification({
        coupleId: req.coupleId,
        userId: taskLog.completedBy,
        type: 'TASK_VERIFIED',
        title: 'Tarea verificada',
        message: `${verifier?.name ?? 'Tu pareja'} verificó "${task?.name ?? 'tu tarea'}". +${taskLog.pointsFinal.toString()} pts`,
        relatedTaskLogId: req.params.logId,
      })
    }

    // Trigger achievement check (legacy per-user engine)
    let newAchievements: any[] = []
    if (taskLog.completedBy) {
      newAchievements = await achievementEngine.checkAchievements(
        taskLog.completedBy,
        req.coupleId,
        { type: 'task_verified', taskLogId: req.params.logId }
      )
    }

    // Non-fatal gamification updates (new system: streak, XP, couple achievements map)
    try {
      await updateDailyStreak(req.coupleId)
      await calculateAndSaveXP(req.coupleId)
      await checkAllAchievements(req.coupleId)
    } catch (gamErr) {
      console.error('Gamification update error (non-fatal):', gamErr)
    }

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

    // v2.4 audit 08 S0-4: si el TaskLog ya estaba `verified` cuando se
    // disputa, había que revertir la PointsTransaction asociada — antes
    // simplemente quedaba (saldo inflado). Lo hacemos en $transaction:
    // borramos la PT (relatedTaskLogId UNIQUE) y marcamos disputed.
    const wasVerified = taskLog.status === 'verified'
    const [updated] = await prisma.$transaction(async (tx) => {
      if (wasVerified) {
        await tx.pointsTransaction.deleteMany({
          where: {
            relatedTaskLogId: req.params.logId,
            type: 'task_completed',
          },
        })
      }
      const u = await tx.taskLog.update({
        where: { id: req.params.logId },
        data: {
          status: 'disputed',
          verifiedBy: req.userId,
          verifiedAt: new Date(),
          disputeReason: data.disputeReason,
          pointsDisputed: data.pointsDisputed ? new Decimal(data.pointsDisputed) : undefined,
        },
      })
      return [u]
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

// POST /api/tasks/:id/schedule — set scheduling/recurrence on a task
router.post('/:id/schedule', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const scheduleSchema = z.object({
      scheduledFor: z.string(),
      frequency: z.enum(['daily', 'biweekly', 'weekly', 'bimonthly', 'monthly']).optional(),
      recurrenceEnd: z.string().optional(),
      maxOccurrences: z.number().int().positive().optional(),
    })

    const data = scheduleSchema.parse(req.body)

    // Verify task belongs to couple
    const task = await prisma.task.findFirst({ where: { id: req.params.id, coupleId: req.coupleId } })
    if (!task) { res.status(404).json({ error: 'Tarea no encontrada' }); return }

    const isRecurring = !!data.frequency
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        scheduledFor: new Date(data.scheduledFor),
        isRecurring,
        frequency: data.frequency ?? null,
        recurrenceStart: isRecurring ? new Date(data.scheduledFor) : null,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
        maxOccurrences: data.maxOccurrences ?? null,
        occurrenceCount: 0,
      },
    })

    if (isRecurring) {
      await generateOnCreate(updated)
    }

    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return }
    console.error('POST /tasks/:id/schedule error:', err)
    res.status(500).json({ error: 'Error al programar tarea' })
  }
})

// DELETE /api/tasks/:id — remove a task and its logs (couple-scoped)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, coupleId: req.coupleId },
    })
    if (!task) {
      res.status(404).json({ error: 'Tarea no encontrada' })
      return
    }

    // Delete task logs first (FK constraint), then the task itself.
    // Related PointsTransactions (via relatedTaskLogId) are left intact as history —
    // they already credited/debited the user's balance and shouldn't disappear.
    await prisma.taskLog.deleteMany({ where: { taskId: task.id } })
    await prisma.task.delete({ where: { id: task.id } })

    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err)
    res.status(500).json({ error: 'Error al borrar tarea' })
  }
})

// ─── Recurrentes panel endpoints (Paso 2 Módulo Tareas 2.0) ───────────────────
// Una tarea se considera "recurrente" si tiene frequency != null. Si además
// isRecurring=true → activa. Si isRecurring=false → pausada (mantiene
// frequency y recurrenceEnd como registro del estado).

// GET /api/tasks/recurring — listado con stats para el panel
router.get('/recurring', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const tasks = await prisma.task.findMany({
      where: { coupleId: req.coupleId, frequency: { not: null } },
      orderBy: [{ isRecurring: 'desc' }, { name: 'asc' }],
    })

    const now = new Date()
    const taskIds = tasks.map((t) => t.id)

    // v2.5.8 audit 01 — antes: 2N queries (count + findFirst por task) → N+1.
    // Ahora: 2 queries totales agregadas por taskId. Para 50 recurring
    // tasks pasamos de 100 round-trips a 2.
    const [completedCounts, nextPlaceholders] = await Promise.all([
      prisma.taskLog.groupBy({
        by: ['taskId'],
        where: {
          taskId: { in: taskIds },
          status: { in: ['verified', 'pending'] },
          completedBy: { not: null },
        },
        _count: { _all: true },
      }),
      prisma.taskLog.findMany({
        where: {
          taskId: { in: taskIds },
          isAutoGenerated: true,
          completedBy: null,
          scheduledFor: { gte: now },
        },
        orderBy: { scheduledFor: 'asc' },
        select: { taskId: true, scheduledFor: true },
      }),
    ])

    // Index por taskId para lookup O(1).
    const countByTask = new Map(completedCounts.map((c) => [c.taskId, c._count._all]))
    const nextByTask = new Map<string, Date>()
    for (const row of nextPlaceholders) {
      // findMany devuelve ordenado por scheduledFor asc → el primero por
      // taskId es el más cercano. Map.set sólo si aún no hay entry.
      if (row.taskId && row.scheduledFor && !nextByTask.has(row.taskId)) {
        nextByTask.set(row.taskId, row.scheduledFor)
      }
    }

    const enriched = tasks.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      pointsBase: t.pointsBase.toString(),
      frequency: t.frequency,
      isActive: t.isRecurring,
      recurrenceStart: t.recurrenceStart?.toISOString() ?? null,
      recurrenceEnd: t.recurrenceEnd?.toISOString() ?? null,
      nextOccurrence: nextByTask.get(t.id)?.toISOString() ?? null,
      defaultAssigneeId: t.defaultAssigneeId,
      completedCount: countByTask.get(t.id) ?? 0,
    }))

    res.json({ tasks: enriched })
  } catch (err) {
    console.error('GET /tasks/recurring error:', err)
    res.status(500).json({ error: 'Error cargando tareas recurrentes' })
  }
})

// POST /api/tasks/:id/pause — desactiva la recurrencia y borra las ocurrencias
// futuras (placeholders pending sin completar). Los logs históricos se
// conservan intactos para no perder puntos ya acreditados ni contadores.
router.post('/:id/pause', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, coupleId: req.coupleId, frequency: { not: null } },
    })
    if (!task) { res.status(404).json({ error: 'Tarea recurrente no encontrada' }); return }

    const now = new Date()

    const [deletedFuture, updated] = await prisma.$transaction([
      prisma.taskLog.deleteMany({
        where: {
          taskId: task.id,
          isAutoGenerated: true,
          completedBy: null,
          scheduledFor: { gte: now },
        },
      }),
      prisma.task.update({
        where: { id: task.id },
        data: { isRecurring: false, recurrenceEnd: now },
      }),
    ])

    res.json({
      success: true,
      deletedFutureOccurrences: deletedFuture.count,
      task: { id: updated.id, isActive: updated.isRecurring },
    })
  } catch (err) {
    console.error('POST /tasks/:id/pause error:', err)
    res.status(500).json({ error: 'Error al pausar la tarea recurrente' })
  }
})

// POST /api/tasks/:id/resume — reactiva la recurrencia desde hoy y regenera
// la ventana de placeholders. Conserva los logs históricos existentes.
router.post('/:id/resume', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const task = await prisma.task.findFirst({
      where: { id: req.params.id, coupleId: req.coupleId, frequency: { not: null } },
    })
    if (!task) { res.status(404).json({ error: 'Tarea recurrente no encontrada' }); return }

    const now = new Date()
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        isRecurring: true,
        recurrenceStart: now,
        recurrenceEnd: null,
        scheduledFor: now,
      },
    })

    await generateOnCreate(updated)

    res.json({ success: true, task: { id: updated.id, isActive: updated.isRecurring } })
  } catch (err) {
    console.error('POST /tasks/:id/resume error:', err)
    res.status(500).json({ error: 'Error al reactivar la tarea recurrente' })
  }
})

export default router
