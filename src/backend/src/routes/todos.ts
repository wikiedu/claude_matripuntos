import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import prisma from '../lib/prisma.js'

const router = express.Router()

const createTodoSchema = z.object({
  text: z.string().min(1),
  dueDate: z.string().optional(),
  isShared: z.boolean().optional().default(false),
})

const updateTodoSchema = z.object({
  text: z.string().min(1).optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  isShared: z.boolean().optional(),
})

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
    console.error('GET /todos error:', err)
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

// PUT /api/todos/:id — update (owner only)
router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!
    const todo = await prisma.todo.findFirst({ where: { id: req.params.id, userId } })
    if (!todo) { res.status(404).json({ error: 'To-do no encontrado' }); return }

    const updates = updateTodoSchema.parse(req.body)
    const data: Record<string, unknown> = { ...updates }
    if (updates.dueDate !== undefined) {
      data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
    }
    if (updates.isCompleted !== undefined) {
      data.completedAt = updates.isCompleted ? new Date() : null
    }

    const updated = await prisma.todo.update({ where: { id: todo.id }, data })
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
