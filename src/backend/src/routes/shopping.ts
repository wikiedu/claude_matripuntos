import express, { Request, Response } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

const addItemSchema = z.object({ text: z.string().min(1) })
const updateItemSchema = z.object({
  isChecked: z.boolean().optional(),
  text: z.string().min(1).optional(),
})

// GET /api/shopping — get active list + last 4 archived
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId!

    // v2.7.1 audit 01 S2-R-17 — cap defensivo en items de la lista activa.
    // history ya tiene take:4, pero si la lista activa de un couple
    // creció a miles de items por uso prolongado, la query podría tardar.
    let active = await prisma.shoppingList.findFirst({
      where: { coupleId, isActive: true },
      include: { items: { orderBy: { createdAt: 'asc' }, take: 500 } },
    })
    if (!active) {
      active = await prisma.shoppingList.create({
        data: { coupleId },
        include: { items: true },
      })
    }

    const history = await prisma.shoppingList.findMany({
      where: { coupleId, isActive: false },
      include: { items: { orderBy: { createdAt: 'asc' } } },
      orderBy: { archivedAt: 'desc' },
      take: 4,
    })

    res.json({ active, history })
  } catch (err) {
    logger.error({ err }, 'GET /shopping error')
    res.status(500).json({ error: 'Error al cargar la lista de la compra' })
  }
})

// POST /api/shopping/items — add item to active list
router.post('/items', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId!
    const { text } = addItemSchema.parse(req.body)

    let list = await prisma.shoppingList.findFirst({ where: { coupleId, isActive: true } })
    if (!list) {
      list = await prisma.shoppingList.create({ data: { coupleId } })
    }

    const item = await prisma.shoppingItem.create({
      data: { listId: list.id, text },
    })
    res.status(201).json(item)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return }
    logger.error({ err }, 'POST /shopping/items error')
    res.status(500).json({ error: 'Error al añadir item' })
  }
})

// PUT /api/shopping/items/:id — update item (check/uncheck or rename)
router.put('/items/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId!
    const updates = updateItemSchema.parse(req.body)

    const item = await prisma.shoppingItem.findFirst({
      where: { id: req.params.id, list: { coupleId } },
    })
    if (!item) { res.status(404).json({ error: 'Item no encontrado' }); return }

    const data: Record<string, unknown> = { ...updates }
    if (updates.isChecked !== undefined) {
      data.checkedBy = updates.isChecked ? req.userId : null
      data.checkedAt = updates.isChecked ? new Date() : null
    }

    const updated = await prisma.shoppingItem.update({ where: { id: item.id }, data })
    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return }
    res.status(500).json({ error: 'Error al actualizar item' })
  }
})

// DELETE /api/shopping/items/:id
router.delete('/items/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId!
    const item = await prisma.shoppingItem.findFirst({
      where: { id: req.params.id, list: { coupleId } },
    })
    if (!item) { res.status(404).json({ error: 'Item no encontrado' }); return }
    await prisma.shoppingItem.delete({ where: { id: item.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar item' })
  }
})

// POST /api/shopping/archive — archive active list, create new empty one
router.post('/archive', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const coupleId = req.coupleId!
    const active = await prisma.shoppingList.findFirst({ where: { coupleId, isActive: true } })
    if (active) {
      await prisma.shoppingList.update({
        where: { id: active.id },
        data: { isActive: false, archivedAt: new Date() },
      })
    }
    const newList = await prisma.shoppingList.create({
      data: { coupleId },
      include: { items: true },
    })
    res.status(201).json(newList)
  } catch (err) {
    res.status(500).json({ error: 'Error al archivar lista' })
  }
})

export default router
