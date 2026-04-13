// src/backend/src/routes/ruleProposals.ts
import express, { Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { createNotification } from '../services/notificationService.js'

const router = express.Router()

const DEFAULT_RULES = [
  { key: 'free_negotiation_rounds', value: 2, description: 'Rondas de negociación gratuitas' },
  { key: 'task_auto_verify_hours', value: 24, description: 'Horas para auto-verificar tareas' },
  { key: 'streak_multiplier_active', value: true, description: 'Multiplicador de racha activo' },
  { key: 'pets_factor_override', value: null, description: 'Factor mascotas (null = automático)' },
]

/**
 * GET /api/rules
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId) { res.status(401).json({ error: 'Authentication required' }); return }

    const proposals = await prisma.ruleProposal.findMany({
      where: { coupleId: req.coupleId, type: 'rule' },
      include: {
        proposedBy: { select: { id: true, name: true } },
        respondedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ rules: DEFAULT_RULES, proposals })
  } catch (error) {
    console.error('Error getting rules:', error)
    res.status(500).json({ error: 'Failed to get rules' })
  }
})

/**
 * POST /api/rules/propose
 */
router.post('/propose', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }

    const { type, payload, comment } = req.body
    if (!type || !payload || !comment) {
      res.status(400).json({ error: 'type, payload, and comment are required' })
      return
    }

    const proposal = await prisma.ruleProposal.create({
      data: {
        coupleId: req.coupleId,
        proposedById: req.userId,
        type,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
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
      const payloadObj = typeof payload === 'string' ? JSON.parse(payload) : payload
      const description = payloadObj.description || payloadObj.name || type
      await createNotification({
        coupleId: req.coupleId,
        userId: partner.id,
        type: 'rule_proposal',
        title: '📋 Nueva propuesta',
        message: `${proposerName} propone: ${description}`
      })
    }

    res.status(201).json(proposal)
  } catch (error) {
    console.error('Error creating rule proposal:', error)
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

/**
 * PUT /api/rules/:id/respond
 */
router.put('/:id/respond', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }

    const { status, comment } = req.body
    if (!status || !['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'status must be accepted or rejected' })
      return
    }

    const proposal = await prisma.ruleProposal.findFirst({
      where: { id: req.params.id, coupleId: req.coupleId, status: 'pending' }
    })
    if (!proposal) { res.status(404).json({ error: 'Proposal not found' }); return }
    if (proposal.proposedById === req.userId) {
      res.status(403).json({ error: 'Cannot respond to your own proposal' })
      return
    }

    const updated = await prisma.ruleProposal.update({
      where: { id: req.params.id },
      data: {
        status,
        responderComment: comment || null,
        respondedById: req.userId,
        respondedAt: new Date()
      },
      include: {
        proposedBy: { select: { id: true, name: true } },
        respondedBy: { select: { id: true, name: true } }
      }
    })

    // If accepted category proposal — create the category
    if (status === 'accepted' && proposal.type === 'category') {
      const p = JSON.parse(proposal.payload)
      await prisma.category.create({
        data: {
          coupleId: req.coupleId,
          name: p.name,
          emoji: p.emoji,
          type: p.type || 'chore',
          basePoints: p.basePoints || 10,
          isCustom: true,
          isActive: true
        }
      })
    }

    // If accepted category_edit — update the category
    if (status === 'accepted' && proposal.type === 'category_edit') {
      const p = JSON.parse(proposal.payload)
      const { categoryId, ...fields } = p
      await prisma.category.update({
        where: { id: categoryId },
        data: fields
      })
    }

    // Notify proposer
    if (proposal.proposedById) {
      const responderName = updated.respondedBy?.name || 'Tu pareja'
      const verb = status === 'accepted' ? 'aceptado' : 'rechazado'
      await createNotification({
        coupleId: req.coupleId,
        userId: proposal.proposedById,
        type: 'proposal_resolved',
        title: `${status === 'accepted' ? '✅' : '❌'} Propuesta ${verb}`,
        message: `${responderName} ha ${verb} tu propuesta.`
      })
    }

    res.json(updated)
  } catch (error) {
    console.error('Error responding to proposal:', error)
    res.status(500).json({ error: 'Failed to respond to proposal' })
  }
})

export default router
