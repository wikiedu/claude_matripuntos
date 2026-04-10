import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import { ChildInput, PetInput } from '../types/v2.js'

const router = Router()
import prisma from '../lib/prisma.js'

// Middleware to ensure user is authenticated
router.use(authenticateToken)

/**
 * Add a child to the couple
 * POST /api/children
 */
router.post('/children', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const data: ChildInput = req.body

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Validate required fields
    if (!data.name || !data.dateOfBirth) {
      return res.status(400).json({ error: 'Name and dateOfBirth are required' })
    }

    // Create child
    const child = await prisma.child.create({
      data: {
        coupleId: user.coupleId,
        name: data.name,
        dateOfBirth: new Date(data.dateOfBirth),
        livesWithUser1: data.livesWithUser1,
        livesWithUser2: data.livesWithUser2,
        hasSpecialNeeds: data.hasSpecialNeeds || false,
      },
    })

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
    const data: Partial<ChildInput> = req.body

    // Verify user is part of the couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify child belongs to user's couple
    const child = await prisma.child.findUnique({
      where: { id: childId },
    })

    if (!child || child.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Update child
    const updatedChild = await prisma.child.update({
      where: { id: childId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(typeof data.livesWithUser1 !== 'undefined' && { livesWithUser1: data.livesWithUser1 }),
        ...(typeof data.livesWithUser2 !== 'undefined' && { livesWithUser2: data.livesWithUser2 }),
        ...(typeof data.hasSpecialNeeds !== 'undefined' && { hasSpecialNeeds: data.hasSpecialNeeds }),
      },
    })

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

    // Verify user is part of the couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify child belongs to user's couple
    const child = await prisma.child.findUnique({
      where: { id: childId },
    })

    if (!child || child.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    await prisma.child.delete({
      where: { id: childId },
    })

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
    const userId = (req as any).user.id
    const data: PetInput = req.body

    // Get user's couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Validate required fields
    if (!data.name || !data.type) {
      return res.status(400).json({ error: 'Name and type are required' })
    }

    // Create pet
    const pet = await prisma.pet.create({
      data: {
        coupleId: user.coupleId,
        name: data.name,
        type: data.type,
        quantity: data.quantity || 1,
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
    const data: Partial<PetInput> = req.body

    // Verify user is part of the couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify pet belongs to user's couple
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    })

    if (!pet || pet.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Update pet
    const updatedPet = await prisma.pet.update({
      where: { id: petId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.quantity && { quantity: data.quantity }),
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

    // Verify user is part of the couple
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify pet belongs to user's couple
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
    })

    if (!pet || pet.coupleId !== user.coupleId) {
      return res.status(403).json({ error: 'Unauthorized' })
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

export default router
