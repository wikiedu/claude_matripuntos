import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
import prisma from '../lib/prisma.js'

// Middleware to ensure user is authenticated
router.use(authenticateToken)

// v2.7.1 audit 01 S2-R-3, S2-R-4 — schemas estrictos para Children/Pets.
// Antes los handlers chequeaban manualmente `if (!data.name || ...)` sin
// max() en strings, sin validar dateOfBirth en pasado, sin cap de hijos.
const childCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  dateOfBirth: z.string().refine((s) => {
    const d = new Date(s)
    return !isNaN(d.getTime()) && d.getTime() <= Date.now()
  }, { message: 'dateOfBirth debe ser una fecha pasada válida' }),
  livesWithUser1: z.boolean().optional(),
  livesWithUser2: z.boolean().optional(),
  hasSpecialNeeds: z.boolean().optional(),
}).strict()

const childUpdateSchema = childCreateSchema.partial().strict()

const petCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  type: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(0).max(20).optional(),
}).strict()

const petUpdateSchema = petCreateSchema.partial().strict()

const MAX_CHILDREN_PER_COUPLE = 12

/**
 * Add a child to the couple
 * POST /api/children
 */
router.post('/children', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const coupleId = (req as any).user?.coupleId as string | undefined
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const parsed = childCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors })
    }
    const data = parsed.data

    // v2.7.1 audit 01 S2-R-4 — cap defensivo. Antes no había límite y un
    // bug del frontend o un attacker podían inflar la BD con hijos
    // ficticios. 12 cubre incluso familias numerosas + adopción.
    const childCount = await prisma.child.count({ where: { coupleId } })
    if (childCount >= MAX_CHILDREN_PER_COUPLE) {
      return res.status(409).json({
        error: `Has alcanzado el máximo de ${MAX_CHILDREN_PER_COUPLE} hijos por pareja.`,
      })
    }

    const child = await prisma.child.create({
      data: {
        coupleId,
        name: data.name,
        dateOfBirth: new Date(data.dateOfBirth),
        livesWithUser1: data.livesWithUser1,
        livesWithUser2: data.livesWithUser2,
        hasSpecialNeeds: data.hasSpecialNeeds || false,
      },
    })

    await notifyPartnerOnChildChange(userId, coupleId, 'added', data.name)

    res.status(201).json({
      message: 'Child added successfully',
      child,
    })
  } catch (error) {
    console.error('Error adding child:', error)
    res.status(500).json({ error: 'Failed to add child' })
  }
})

/**
 * Get all children for a couple
 * GET /api/children
 */
router.get('/children', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const children = await prisma.child.findMany({
      where: { coupleId: user.coupleId },
      orderBy: { dateOfBirth: 'asc' },
    })

    res.json(children)
  } catch (error) {
    console.error('Error fetching children:', error)
    res.status(500).json({ error: 'Failed to fetch children' })
  }
})

/**
 * Update a child
 * PUT /api/children/:childId
 */
router.put('/children/:childId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { childId } = req.params

    const parsedBody = childUpdateSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Validation error', details: parsedBody.error.errors })
    }
    const data = parsedBody.data

    // v2.5.9 audit 01 S1-R-14 — usamos `req.coupleId` (validado por authMW)
    // y `findFirst` con scope de couple en una sola query, evitando el
    // patrón "findUnique → manual compare". Si el resource pertenece a
    // otro couple, findFirst devuelve null directamente.
    if (!req.coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, coupleId: req.coupleId },
    })

    if (!child) {
      return res.status(404).json({ error: 'Child not found' })
    }

    // Update child
    const updatedChild = await prisma.child.update({
      where: { id: childId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(typeof data.livesWithUser1 !== 'undefined' && { livesWithUser1: data.livesWithUser1 }),
        ...(typeof data.livesWithUser2 !== 'undefined' && { livesWithUser2: data.livesWithUser2 }),
        ...(typeof data.hasSpecialNeeds !== 'undefined' && { hasSpecialNeeds: data.hasSpecialNeeds }),
      },
    })

    await notifyPartnerOnChildChange(userId, req.coupleId, 'updated', updatedChild.name)

    res.json({
      message: 'Child updated successfully',
      child: updatedChild,
    })
  } catch (error) {
    console.error('Error updating child:', error)
    res.status(500).json({ error: 'Failed to update child' })
  }
})

/**
 * Delete a child
 * DELETE /api/children/:childId
 */
router.delete('/children/:childId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { childId } = req.params

    // v2.5.9 audit 01 S1-R-14 — scope por req.coupleId.
    if (!req.coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, coupleId: req.coupleId },
    })

    if (!child) {
      return res.status(404).json({ error: 'Child not found' })
    }

    await prisma.child.delete({
      where: { id: childId },
    })

    await notifyPartnerOnChildChange(userId, req.coupleId, 'removed', child.name)

    res.json({ message: 'Child deleted successfully' })
  } catch (error) {
    console.error('Error deleting child:', error)
    res.status(500).json({ error: 'Failed to delete child' })
  }
})

/**
 * Add a pet to the couple
 * POST /api/pets
 */
router.post('/pets', async (req: Request, res: Response) => {
  try {
    const coupleId = (req as any).user?.coupleId as string | undefined
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const parsed = petCreateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors })
    }
    const data = parsed.data

    const pet = await prisma.pet.create({
      data: {
        coupleId,
        name: data.name,
        type: data.type,
        quantity: data.quantity ?? 1,
      },
    })

    res.status(201).json({
      message: 'Pet added successfully',
      pet,
    })
  } catch (error) {
    console.error('Error adding pet:', error)
    res.status(500).json({ error: 'Failed to add pet' })
  }
})

/**
 * Get all pets for a couple
 * GET /api/pets
 */
router.get('/pets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const pets = await prisma.pet.findMany({
      where: { coupleId: user.coupleId },
    })

    res.json(pets)
  } catch (error) {
    console.error('Error fetching pets:', error)
    res.status(500).json({ error: 'Failed to fetch pets' })
  }
})

/**
 * Update a pet
 * PUT /api/pets/:petId
 */
router.put('/pets/:petId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { petId } = req.params

    const parsedBody = petUpdateSchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Validation error', details: parsedBody.error.errors })
    }
    const data = parsedBody.data

    // v2.5.9 audit 01 S1-R-14 — scope por req.coupleId.
    if (!req.coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const pet = await prisma.pet.findFirst({
      where: { id: petId, coupleId: req.coupleId },
    })

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' })
    }

    // v2.5.9 audit 01 S1-R-13 — `data.quantity && {…}` rechazaba 0, así que
    // bajar de 1 mascota a 0 no funcionaba. Comparamos contra `undefined`
    // para distinguir "no enviado" de "enviado vacío/cero".
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
      },
    })

    res.json({
      message: 'Pet updated successfully',
      pet: updatedPet,
    })
  } catch (error) {
    console.error('Error updating pet:', error)
    res.status(500).json({ error: 'Failed to update pet' })
  }
})

/**
 * Delete a pet
 * DELETE /api/pets/:petId
 */
router.delete('/pets/:petId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { petId } = req.params

    // v2.5.9 audit 01 S1-R-14 — scope por req.coupleId.
    if (!req.coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const pet = await prisma.pet.findFirst({
      where: { id: petId, coupleId: req.coupleId },
    })

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' })
    }

    await prisma.pet.delete({
      where: { id: petId },
    })

    res.json({ message: 'Pet deleted successfully' })
  } catch (error) {
    console.error('Error deleting pet:', error)
    res.status(500).json({ error: 'Failed to delete pet' })
  }
})

// Children affect the points multiplier (childrenMultiplier in PointsCalculator),
// so the partner gets notified on every change — no silent edits.
async function notifyPartnerOnChildChange(
  actorUserId: string,
  coupleId: string,
  action: 'added' | 'updated' | 'removed',
  childName: string,
) {
  try {
    // v2.5.4 audit 03 S1-4 — filtrar deletedAt para no notificar al ghost.
    const partner = await prisma.user.findFirst({
      where: { coupleId, id: { not: actorUserId }, deletedAt: null },
      select: { id: true },
    })
    if (!partner) return
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true },
    })
    const actorName = actor?.name ?? 'Tu pareja'
    const map = {
      added:   { title: '👶 Nuevo hijo/a añadido', verb: 'ha añadido' },
      updated: { title: '👶 Hijo/a actualizado',    verb: 'ha actualizado los datos de' },
      removed: { title: '👶 Hijo/a eliminado',      verb: 'ha eliminado a' },
    } as const
    const { title, verb } = map[action]
    await prisma.notification.create({
      data: {
        coupleId,
        userId: partner.id,
        type: 'CHILDREN_CHANGED',
        title,
        message: `${actorName} ${verb} ${childName}. Esto afecta al cálculo de puntos.`,
        isRead: false,
      },
    })
  } catch (err) {
    console.error('Failed to notify partner about child change:', err)
  }
}

export default router
