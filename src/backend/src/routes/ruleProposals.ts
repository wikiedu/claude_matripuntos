// src/backend/src/routes/ruleProposals.ts
import express, { Request, Response } from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'
import { logger } from '../lib/logger.js'
import { parseJsonField } from '../lib/jsonField.js'
import { createNotification } from '../services/notificationService.js'

const router = express.Router()

// Payload tipado para propuestas type='category_edit'. Solo se permiten los
// campos editables del modelo Category — nunca se escriben `fields` arbitrarios
// desde el payload (controlado por quien creó la propuesta).
const categoryEditPayloadSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).optional(),
  emoji: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  basePoints: z.coerce.number().optional(),
  description: z.string().optional(),
})

// A5-3 (p3): validación de entrada faltante. `type` se persiste y `respond` se
// ramifica por su valor → allow-list estricta. El payload se valida según el
// tipo (category necesita name/emoji; category_edit reutiliza el schema tipado;
// rule acepta un objeto arbitrario). El payload puede llegar como string JSON
// (frontend) o como objeto, así que se normaliza antes de validar.
// Payload para type='category' — campos que se usan al crear la Category.
const categoryPayloadSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  basePoints: z.coerce.number().optional(),
  description: z.string().optional(),
})

const RULE_PROPOSAL_TYPES = ['rule', 'category', 'category_edit'] as const

const proposeBaseSchema = z.object({
  type: z.enum(RULE_PROPOSAL_TYPES),
  comment: z.string().min(1).max(500),
})

// Devuelve el payload normalizado a objeto (parseando JSON si llega como string).
function normalizePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try { return JSON.parse(payload) } catch { return undefined }
  }
  return payload
}

const respondSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  comment: z.string().max(500).optional(),
})

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
    logger.error({ err: error }, 'Error getting rules')
    res.status(500).json({ error: 'Failed to get rules' })
  }
})

/**
 * POST /api/rules/propose
 */
router.post('/propose', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }

    const parsed = proposeBaseSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
      return
    }
    const { type, comment } = parsed.data

    // Validar el payload según el tipo (puede llegar como string JSON u objeto).
    const payloadObj = normalizePayload(req.body.payload)
    if (payloadObj === undefined) {
      res.status(400).json({ error: 'payload is required and must be a valid object' })
      return
    }
    if (type === 'category') {
      const r = categoryPayloadSchema.safeParse(payloadObj)
      if (!r.success) {
        res.status(400).json({ error: 'Invalid category payload', details: r.error.issues })
        return
      }
    } else if (type === 'category_edit') {
      const r = categoryEditPayloadSchema.safeParse(payloadObj)
      if (!r.success) {
        res.status(400).json({ error: 'Invalid category_edit payload', details: r.error.issues })
        return
      }
    } else if (typeof payloadObj !== 'object' || payloadObj === null || Array.isArray(payloadObj)) {
      res.status(400).json({ error: 'payload must be an object' })
      return
    }

    const proposal = await prisma.ruleProposal.create({
      data: {
        coupleId: req.coupleId,
        proposedById: req.userId,
        type,
        payload: JSON.stringify(payloadObj),
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
      const pObj = (payloadObj && typeof payloadObj === 'object') ? payloadObj as Record<string, any> : {}
      const description = pObj.description || pObj.name || type
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
    logger.error({ err: error }, 'Error creating rule proposal')
    res.status(500).json({ error: 'Failed to create proposal' })
  }
})

/**
 * PUT /api/rules/:id/respond
 */
router.put('/:id/respond', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.coupleId || !req.userId) { res.status(401).json({ error: 'Authentication required' }); return }

    const parsed = respondSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input', details: parsed.error.issues })
      return
    }
    const { status, comment } = parsed.data

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
      const p = parseJsonField<Record<string, any>>(proposal.payload, {})
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
    // A5-1 (p3): IDOR cross-couple. El categoryId viene del payload (controlado
    // por quien creó la propuesta) y debe validarse contra req.coupleId antes de
    // actualizar; si no, un user puede sobrescribir categorías de OTRA pareja.
    // Mismo patrón que categories.ts (fix audit 01 S1-R-14) + payload tipado Zod.
    if (status === 'accepted' && proposal.type === 'category_edit') {
      const raw = parseJsonField<Record<string, any>>(proposal.payload, {})
      const parsed = categoryEditPayloadSchema.safeParse(raw)
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid category_edit payload' })
        return
      }
      const { categoryId, ...fields } = parsed.data

      const cat = await prisma.category.findFirst({
        where: { id: categoryId, coupleId: req.coupleId }
      })
      if (!cat) {
        res.status(404).json({ error: 'Category not found' })
        return
      }

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
    logger.error({ err: error }, 'Error responding to proposal')
    res.status(500).json({ error: 'Failed to respond to proposal' })
  }
})

export default router
