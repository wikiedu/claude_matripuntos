import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Middleware to ensure user is authenticated
router.use(authenticateToken)

/**
 * Get all categories (base + custom) for couple
 * GET /api/categories
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const categories = await prisma.category.findMany({
      where: {
        coupleId: user.coupleId,
        isActive: true,
      },
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

/**
 * Get only base categories
 * GET /api/categories/default
 */
router.get('/default', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const baseCategories = await prisma.category.findMany({
      where: {
        coupleId: user.coupleId,
        isCustom: false,
        isActive: true,
      },
      include: {
        subcategories: true,
      },
      orderBy: { name: 'asc' },
    })

    res.json(baseCategories)
  } catch (error) {
    console.error('Error fetching base categories:', error)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

/**
 * Create custom category (couple can only add, not modify base)
 * POST /api/categories
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { name, emoji, type, basePoints, description } = req.body

    // Validate inputs
    if (!name || !emoji || !type || basePoints === undefined) {
      return res.status(400).json({
        error: 'Name, emoji, type, and basePoints are required',
      })
    }

    if (!['event', 'chore', 'service'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' })
    }

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if category with same name already exists
    const existing = await prisma.category.findFirst({
      where: {
        coupleId: user.coupleId,
        name: name.toLowerCase(),
      },
    })

    if (existing) {
      return res.status(400).json({ error: 'Category already exists' })
    }

    // Create custom category
    const category = await prisma.category.create({
      data: {
        coupleId: user.coupleId,
        name,
        emoji,
        type,
        basePoints: parseFloat(basePoints),
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
    console.error('Error creating category:', error)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

/**
 * Update custom category (only custom categories can be edited)
 * PUT /api/categories/:categoryId
 */
router.put('/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { categoryId } = req.params
    const { name, emoji, type, basePoints, description } = req.body

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get category and verify it belongs to couple
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category || category.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
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
    console.error('Error updating category:', error)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

/**
 * Delete custom category (only custom categories)
 * DELETE /api/categories/:categoryId
 */
router.delete('/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { categoryId } = req.params

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get category and verify it belongs to couple
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category || category.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
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
    console.error('Error deleting category:', error)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

/**
 * Get specific category with subcategories
 * GET /api/categories/:categoryId
 */
router.get('/:categoryId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { categoryId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subcategories: true,
      },
    })

    if (!category || category.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    res.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    res.status(500).json({ error: 'Failed to fetch category' })
  }
})

/**
 * Add subcategory to category
 * POST /api/categories/:categoryId/subcategories
 */
router.post('/:categoryId/subcategories', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const { categoryId } = req.params
    const { name, basePointsModifier } = req.body

    if (!name || basePointsModifier === undefined) {
      return res.status(400).json({ error: 'Name and basePointsModifier required' })
    }

    // Get user and category
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category || category.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
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
        basePointsModifier: parseFloat(basePointsModifier),
      },
    })

    res.status(201).json({
      message: 'Subcategory added',
      subcategory,
    })
  } catch (error) {
    console.error('Error adding subcategory:', error)
    res.status(500).json({ error: 'Failed to add subcategory' })
  }
})

export default router
