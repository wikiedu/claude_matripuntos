import { Router, Request, Response } from 'express'
import { requireAuth } from '../lib/requireAuth.js'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { createNotification } from '../services/notificationService.js'

const router = Router()
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

// v2.4 audit 01 S0-R-3 — schema estricto para propose-change. Antes el
// endpoint hacía `const { comment, ...fields } = req.body` y guardaba
// `fields` raw en payload JSON. Si el endpoint que aplica la propuesta
// hacía spread sobre los campos, un payload con `coupleId` podía mover
// la categoría a otro couple. Aquí limitamos los campos al subset
// permitido y dropea cualquier otro silenciosamente.
const proposeChangeSchema = z.object({
  comment: z.string().min(1).max(500),
  name: z.string().min(1).max(100).optional(),
  emoji: z.string().max(8).optional(),
  type: z.enum(['event', 'chore', 'service']).optional(),
  basePoints: z.number().min(0).max(500).optional(),
  description: z.string().max(500).optional(),
})

// v2.7.1 audit 01 S2-R-1, S2-R-2 — antes el POST /api/categories validaba
// `name`, `emoji`, `type`, `basePoints` con if-statements imperativos sin
// .max() en strings ni regex en emoji ni cap en basePoints. Adicionalmente
// el check de duplicado lowercaseaba para comparar pero guardaba el case
// original — "Cocina" y "cocina" terminaban como nombres distintos en BD.
const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  emoji: z.string().min(1).max(8),
  type: z.enum(['event', 'chore', 'service']),
  basePoints: z.number().min(0).max(500),
  description: z.string().max(500).optional(),
}).strict()

const subcategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  basePointsModifier: z.number().min(0).max(10),
}).strict()

// Middleware to ensure user is authenticated
router.use(authenticateToken)

/**
 * Get all categories (base + custom) for couple
 * GET /api/categories
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const categories = await prisma.category.findMany({
      where: {
        coupleId: requireAuth(req).coupleId,
        isActive: true,
      },
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(categories.map(cat => ({
      ...cat,
      basePoints: parseFloat(cat.basePoints.toString()),
      subcategories: cat.subcategories.map(sub => ({
        ...sub,
        basePointsModifier: parseFloat(sub.basePointsModifier.toString()),
      })),
    })))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching categories')
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

/**
 * Get only base categories
 * GET /api/categories/default
 */
router.get('/default', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const baseCategories = await prisma.category.findMany({
      where: {
        coupleId: requireAuth(req).coupleId,
        isCustom: false,
        isActive: true,
      },
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(baseCategories.map(cat => ({
      ...cat,
      basePoints: parseFloat(cat.basePoints.toString()),
      subcategories: cat.subcategories.map(sub => ({
        ...sub,
        basePointsModifier: parseFloat(sub.basePointsModifier.toString()),
      })),
    })))
  } catch (error) {
    logger.error({ err: error }, 'Error fetching base categories')
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

/**
 * Create custom category (couple can only add, not modify base)
 * POST /api/categories
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const coupleId = req.user?.coupleId as string | undefined
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const parsed = createCategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors })
    }
    const { name, emoji, type, basePoints, description } = parsed.data

    // v2.7.1 audit 01 S2-R-2 — normalizamos a `name.trim()` y comparamos
    // case-insensitive, guardando el name "limpio" (no lowercased) para
    // que la UI muestre el casing del user. Antes lowercaseamos solo para
    // el check pero guardábamos el original → "Cocina" entraba aunque
    // "cocina" ya existiese.
    const cleanName = name.trim()
    const existing = await prisma.category.findFirst({
      where: { coupleId, name: { equals: cleanName, mode: 'insensitive' } },
    })

    if (existing) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' })
    }

    const category = await prisma.category.create({
      data: {
        coupleId,
        name: cleanName,
        emoji,
        type,
        basePoints,
        description,
        isCustom: true,
        isActive: true,
      },
    })

    res.status(201).json({
      message: 'Category created successfully',
      category,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error creating category')
    res.status(500).json({ error: 'Failed to create category' })
  }
})

/**
 * Update custom category (only custom categories can be edited)
 * PUT /api/categories/:categoryId
 */
router.put('/:categoryId', async (req: Request, res: Response) => {
  try {
    const coupleId = req.user?.coupleId as string | undefined
    const { categoryId } = req.params
    const { name, emoji, type, basePoints, description } = req.body

    // v2.5.9 audit 01 S1-R-14 — scope por coupleId del JWT, evitando el
    // patrón "findUnique → manual compare" donde un user sin couple
    // (coupleId=null) podría operar sobre categorías huérfanas.
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, coupleId },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Cannot edit base categories
    if (!category.isCustom) {
      return res.status(400).json({
        error: 'Cannot modify base categories. Create a custom one instead.',
      })
    }

    // Update category
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name && { name }),
        ...(emoji && { emoji }),
        ...(type && { type }),
        ...(basePoints !== undefined && { basePoints: parseFloat(basePoints) }),
        ...(description !== undefined && { description }),
      },
      include: {
        subcategories: true,
      },
    })

    res.json({
      message: 'Category updated successfully',
      category: updated,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error updating category')
    res.status(500).json({ error: 'Failed to update category' })
  }
})

/**
 * Delete custom category (only custom categories)
 * DELETE /api/categories/:categoryId
 */
router.delete('/:categoryId', async (req: Request, res: Response) => {
  try {
    const coupleId = req.user?.coupleId as string | undefined
    const { categoryId } = req.params

    // v2.5.9 audit 01 S1-R-14 — scope por coupleId del JWT.
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, coupleId },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Cannot delete base categories
    if (!category.isCustom) {
      return res.status(400).json({
        error: 'Cannot delete base categories',
      })
    }

    // Delete category (cascade will handle subcategories)
    await prisma.category.delete({
      where: { id: categoryId },
    })

    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    logger.error({ err: error }, 'Error deleting category')
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

/**
 * Get specific category with subcategories
 * GET /api/categories/:categoryId
 */
router.get('/:categoryId', async (req: Request, res: Response) => {
  try {
    const coupleId = req.user?.coupleId as string | undefined
    const { categoryId } = req.params

    // v2.5.9 audit 01 S1-R-14 — scope por coupleId del JWT.
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, coupleId },
      include: {
        subcategories: true,
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    res.json({
      ...category,
      basePoints: parseFloat(category.basePoints.toString()),
      subcategories: category.subcategories.map(sub => ({
        ...sub,
        basePointsModifier: parseFloat(sub.basePointsModifier.toString()),
      })),
    })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching category')
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

/**
 * Add subcategory to category
 * POST /api/categories/:categoryId/subcategories
 */
router.post('/:categoryId/subcategories', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req).userId
    const { categoryId } = req.params
    // v2.7.1 audit 01 S2-R-3 — zod schema estricto para subcategorías.
    const parsed = subcategorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.errors })
    }
    const { name, basePointsModifier } = parsed.data

    // v2.5.9 audit 01 S1-R-14 — scope por coupleId del JWT.
    const coupleId = req.user?.coupleId as string | undefined
    if (!coupleId) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, coupleId },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Only custom categories can have custom subcategories
    if (!category.isCustom) {
      return res.status(400).json({
        error: 'Cannot add subcategories to base categories',
      })
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        basePointsModifier,
      },
    })

    res.status(201).json({
      message: 'Subcategory added',
      subcategory,
    })
  } catch (error) {
    logger.error({ err: error }, 'Error adding subcategory')
    res.status(500).json({ error: 'Failed to add subcategory' })
  }
})

/**
 * POST /api/categories/propose
 */
// Audit v1.4 P2-E: authenticateToken is already applied at the router level
// via `router.use(authenticateToken)` on line 9. Re-applying it per-route
// was dead but harmless work.
router.post('/propose', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }
    const { name, emoji, type, basePoints, comment } = req.body
    if (!name || !emoji || !comment) {
      res.status(400).json({ error: 'name, emoji, and comment are required' })
      return
    }
    const proposal = await prisma.ruleProposal.create({
      data: {
        coupleId: req.coupleId,
        proposedById: req.userId,
        type: 'category',
        payload: JSON.stringify({ name, emoji, type: type || 'chore', basePoints: basePoints || 10 }),
        proposerComment: comment,
        status: 'pending'
      },
      include: { proposedBy: { select: { id: true, name: true } } }
    })

    const couple = await prisma.couple.findUnique({
      where: { id: req.coupleId },
      include: { users: { select: { id: true, name: true } } }
    })
    const partner = couple?.users.find(u => u.id !== req.userId)
    const proposerName = couple?.users.find(u => u.id === req.userId)?.name || 'Tu pareja'
    if (partner) {
      await createNotification({
        coupleId: req.coupleId,
        userId: partner.id,
        type: 'category_proposal',
        title: '📂 Nueva categoría propuesta',
        message: `${proposerName} propone nueva categoría: ${name}`
      })
    }
    res.status(201).json(proposal)
  } catch (error) {
    logger.error({ err: error }, 'Error proposing category')
    res.status(500).json({ error: 'Failed to propose category' })
  }
})

/**
 * PUT /api/categories/:id/propose-change
 */
router.put('/:id/propose-change', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }

    const parsed = proposeChangeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      })
      return
    }
    const { comment, ...fields } = parsed.data

    const category = await prisma.category.findFirst({
      where: { id: req.params.id, coupleId: req.coupleId }
    })
    if (!category) { res.status(404).json({ error: 'Category not found' }); return }

    const proposal = await prisma.ruleProposal.create({
      data: {
        coupleId: req.coupleId,
        proposedById: req.userId,
        type: 'category_edit',
        payload: JSON.stringify({ categoryId: req.params.id, ...fields }),
        proposerComment: comment,
        status: 'pending'
      }
    })
    res.status(201).json(proposal)
  } catch (error) {
    logger.error({ err: error }, 'Error proposing category change')
    res.status(500).json({ error: 'Failed to propose category change' })
  }
})

export default router
