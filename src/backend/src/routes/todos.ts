import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

// v2.7.1 audit 01 S2-R-16 — `.strict()` rechaza cualquier campo extra
// que el frontend mande. Antes campos desconocidos pasaban silenciosos
// y, si downstream se hacía spread sobre ellos, podía haber colisión
// con campos sensibles. .strict() es defensa-en-profundidad.
const createTodoSchema = z.object({
  text: z.string().min(1).max(500),
  dueDate: z.string().optional(),
  isShared: z.boolean().optional().default(false),
}).strict()

const updateTodoSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
}).strict()

// GET /api/todos — mine + partner shared
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!
    const coupleId = req.coupleId!

    const mine = await prisma.todo.findMany({
      where: { userId },
      orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
    })

    // Find partner userId
    const couple = await prisma.couple.findUnique({
      where: { id: coupleId },
      include: { users: { select: { id: true } } },
    })
    const partnerId = couple?.users.find(u => u.id !== userId)?.id

    const partnerShared = partnerId
      ? await prisma.todo.findMany({
          where: { userId: partnerId, isShared: true },
          orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
        })
      : []

    res.json({ mine, partnerShared })
  } catch (err) {
    logger.error({ err }, 'GET /todos error')
    res.status(500).json({ error: 'Error al cargar to-dos' })
  }
})

// POST /api/todos — create todo
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!
    const coupleId = req.coupleId!
    const data = createTodoSchema.parse(req.body)

    const todo = await prisma.todo.create({
      data: {
        userId,
        coupleId,
        text: data.text,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isShared: data.isShared ?? false,
      },
    })
    res.status(201).json(todo)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return }
    res.status(500).json({ error: 'Error al crear to-do' })
  }
})

// PUT /api/todos/:id — owner can update anything; partner can only toggle
// isCompleted on shared todos (B3). Notify the owner when partner toggles.
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!
    const coupleId = req.coupleId!
    const todo = await prisma.todo.findFirst({ where: { id: req.params.id, coupleId } })
    if (!todo) { res.status(404).json({ error: 'To-do no encontrado' }); return }

    const updates = updateTodoSchema.parse(req.body)
    const isOwner = todo.userId === userId
    const isPartnerOnSharedTodo = !isOwner && todo.isShared

    if (!isOwner && !isPartnerOnSharedTodo) {
      res.status(403).json({ error: 'No puedes modificar este to-do' }); return
    }

    // Partner is restricted to flipping isCompleted on shared todos.
    if (isPartnerOnSharedTodo) {
      const touched = Object.keys(updates)
      const allowed = touched.every(k => k === 'isCompleted')
      if (!allowed || updates.isCompleted === undefined) {
        res.status(403).json({ error: 'Solo puedes marcar como completado' }); return
      }
    }

    const data: Record<string, unknown> = { ...updates }
    if (updates.dueDate !== undefined) {
      data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
    }
    if (updates.isCompleted !== undefined) {
      data.completedAt = updates.isCompleted ? new Date() : null
    }

    const updated = await prisma.todo.update({ where: { id: todo.id }, data })

    // Notify the owner when the partner toggles completion on a shared todo.
    if (isPartnerOnSharedTodo && updates.isCompleted !== undefined) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      await prisma.notification.create({
        data: {
          coupleId,
          userId: todo.userId,
          type: 'TODO_TOGGLED',
          title: updates.isCompleted ? 'To-do compartido completado' : 'To-do compartido reabierto',
          message: updates.isCompleted
            ? `${actor?.name ?? 'Tu pareja'} marcó "${todo.text}" como hecho.`
            : `${actor?.name ?? 'Tu pareja'} reabrió "${todo.text}".`,
          isRead: false,
        },
      })
    }

    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return }
    res.status(500).json({ error: 'Error al actualizar to-do' })
  }
})

// DELETE /api/todos/:id — owner only
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!
    const todo = await prisma.todo.findFirst({ where: { id: req.params.id, userId } })
    if (!todo) { res.status(404).json({ error: 'To-do no encontrado' }); return }
    await prisma.todo.delete({ where: { id: todo.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar to-do' })
  }
})

export default router
